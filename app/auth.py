from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
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
        "email":user.email,
        "role":user.role,
        "exp":exp,
    },settings.secret_key,algorithm=ALGO)

def get_current_user(token:str|None=Depends(oauth2), db:Session=Depends(get_db)):
    if not token:
        raise HTTPException(status_code=401,detail="No autenticado")
    try:
        data=jwt.decode(token,settings.secret_key,algorithms=[ALGO])
        uid=int(data["sub"])
        email=(data.get("email") or "").strip().lower()
    except Exception:
        raise HTTPException(status_code=401,detail="Token inválido")

    user=db.get(User,uid)

    # Si la base fue recreada o cambió el ID interno, recuperamos la sesión
    # por el email firmado dentro del JWT. Esto evita invalidar sesiones
    # válidas por cambios de infraestructura.
    if (not user or not user.is_active) and email:
        user=db.query(User).filter(User.email==email).first()

    if not user or not user.is_active:
        raise HTTPException(status_code=401,detail="Usuario inválido")
    return user

def require_roles(*roles):
    def dep(user:User=Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=403,detail="Sin permiso")
        return user
    return dep
