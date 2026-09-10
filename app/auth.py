from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, Request
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

    if user is not None and _email(user)==CANONICAL_ADMIN_EMAIL:
        changed=False
        if user.role!="admin":
            user.role="admin"; changed=True
        if user.is_active is not True:
            user.is_active=True; changed=True
        if changed:
            db.commit(); db.refresh(user)
        return user

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
    def dep(request:Request, user:User=Depends(get_current_user)):
        # El rol Tienda sólo hereda permisos operativos equivalentes a delegado
        # dentro de /api/store/admin. Nunca obtiene permisos administrativos globales.
        if user.role=="tienda" and request.url.path.startswith("/api/store/admin") and "delegado" in roles:
            return user
        if user.role not in roles:
            raise HTTPException(status_code=403,detail="Sin permiso")
        return user
    return dep
