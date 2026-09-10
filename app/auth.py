from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import func
from .config import settings
from .db import get_db
from .models import User

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)
ALGO="HS256"
CANONICAL_ADMIN_EMAIL="admin@elde.fe"

def hash_password(p): return pwd.hash(p)
def verify_password(p,h): return pwd.verify(p,h)

def _email(user):
    return str(getattr(user,"email","") or "").strip().lower()

def create_token(user:User):
    exp=datetime.now(timezone.utc)+timedelta(minutes=settings.access_token_minutes)
    email=_email(user)
    role="admin" if email==CANONICAL_ADMIN_EMAIL else user.role
    return jwt.encode({
        "sub":str(user.id),
        "email":email,
        "role":role,
        "exp":exp,
    },settings.secret_key,algorithm=ALGO)

def get_current_user(token:str|None=Depends(oauth2), db:Session=Depends(get_db)):
    if not token:
        raise HTTPException(status_code=401,detail="No autenticado")
    try:
        data=jwt.decode(token,settings.secret_key,algorithms=[ALGO])
    except Exception:
        raise HTTPException(status_code=401,detail="Token inválido")

    email=str(data.get("email") or "").strip().lower()
    role=str(data.get("role") or "").strip().lower()
    uid=data.get("sub")
    user=None

    if email:
        user=db.query(User).filter(func.lower(func.trim(User.email))==email).first()

    if user is None and uid is not None:
        try:
            user=db.get(User,int(uid))
        except (TypeError,ValueError):
            user=None

    # admin@elde.fe es la identidad administrativa oficial de la app.
    # Si existe en una base legacy como lector, la normalizamos al validar
    # una sesión correctamente firmada de esa misma identidad.
    if user is not None and _email(user)==CANONICAL_ADMIN_EMAIL:
        changed=False
        if user.role!="admin":
            user.role="admin"; changed=True
        if user.is_active is not True:
            user.is_active=True; changed=True
        if changed:
            db.commit(); db.refresh(user)
        return user

    # Compatibilidad con tokens admin anteriores: resolver primero contra
    # la identidad oficial y no contra un administrador legacy configurado.
    if user is None and role=="admin":
        user=db.query(User).filter(func.lower(func.trim(User.email))==CANONICAL_ADMIN_EMAIL).first()
        if user is not None:
            if user.role!="admin" or user.is_active is not True:
                user.role="admin"; user.is_active=True; db.commit(); db.refresh(user)
            return user

    if user is None or user.is_active is False:
        raise HTTPException(status_code=401,detail="Usuario inválido")
    return user

def require_roles(*roles):
    def dep(user:User=Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=403,detail="Sin permiso")
        return user
    return dep
