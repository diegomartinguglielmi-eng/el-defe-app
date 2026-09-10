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

def hash_password(p): return pwd.hash(p)
def verify_password(p,h): return pwd.verify(p,h)

def create_token(user:User):
    exp=datetime.now(timezone.utc)+timedelta(minutes=settings.access_token_minutes)
    return jwt.encode({
        "sub":str(user.id),
        "email":user.email.strip().lower(),
        "role":user.role,
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

    # 1) Identidad estable por email firmado.
    if email:
        user=db.query(User).filter(func.lower(func.trim(User.email))==email).first()

    # 2) Compatibilidad por ID para tokens antiguos.
    if user is None and uid is not None:
        try:
            user=db.get(User,int(uid))
        except (TypeError,ValueError):
            user=None

    # 3) Un token firmado con rol admin se resuelve contra el administrador
    # configurado del servicio. Esto cubre tokens anteriores sin claim email o
    # con un sub obsoleto después de recreaciones/migraciones de la base.
    admin_email=str(settings.admin_email or "").strip().lower()
    if user is None and role=="admin" and admin_email:
        user=db.query(User).filter(func.lower(func.trim(User.email))==admin_email).first()

    # 4) Si el token firmado representa al admin configurado y la fila no
    # existe, recreamos únicamente esa identidad administrativa.
    if user is None and role=="admin" and admin_email and (not email or email==admin_email):
        user=User(
            email=settings.admin_email,
            password_hash=hash_password(settings.admin_password),
            role="admin",
            is_active=True,
        )
        db.add(user)
        try:
            db.commit()
            db.refresh(user)
        except Exception:
            db.rollback()
            user=db.query(User).filter(func.lower(func.trim(User.email))==admin_email).first()

    if user is None or user.is_active is False:
        raise HTTPException(status_code=401,detail="Usuario inválido")
    return user

def require_roles(*roles):
    def dep(user:User=Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=403,detail="Sin permiso")
        return user
    return dep
