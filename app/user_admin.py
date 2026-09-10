from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from .auth import hash_password, create_token, require_roles
from .db import get_db
from .models import User, AuditLog

router = APIRouter()


class RegisterIn(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str):
        value = value.strip().lower()
        if "@" not in value or "." not in value.split("@", 1)[-1]:
            raise ValueError("Email inválido")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str):
        if len(value) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return value


class RoleIn(BaseModel):
    role: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str):
        value = value.strip().lower()
        if value not in {"lector", "tienda", "admin"}:
            raise ValueError("Rol inválido")
        return value


def _audit(db: Session, user: User | None, action: str, entity_id: int | None = None, detail: str | None = None):
    db.add(AuditLog(
        user_id=user.id if user else None,
        action=action,
        entity="user",
        entity_id=str(entity_id) if entity_id is not None else None,
        detail=detail,
    ))
    db.commit()


@router.post("/api/auth/register")
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="Ese email ya está registrado")

    # El alta pública nunca puede crear administradores ni operadores de Tienda.
    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        role="lector",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    _audit(db, None, "self_register", user.id, "lector")

    return {
        "ok": True,
        "access_token": create_token(user),
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "role": user.role},
    }


@router.get("/api/admin/users")
def list_users(db: Session = Depends(get_db), admin: User = Depends(require_roles("admin"))):
    rows = db.query(User).order_by(User.created_at.desc(), User.id.desc()).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at,
        }
        for u in rows
    ]


@router.patch("/api/admin/users/{user_id}/role")
def change_role(user_id: int, payload: RoleIn, db: Session = Depends(get_db), admin: User = Depends(require_roles("admin"))):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Usuario inexistente")

    if target.id == admin.id and payload.role != "admin":
        raise HTTPException(status_code=400, detail="No podés quitarte a vos mismo el rol de administrador")

    if target.role == "admin" and payload.role != "admin":
        admin_count = db.query(User).filter(User.role == "admin", User.is_active == True).count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Debe quedar al menos un administrador activo")

    old_role = target.role
    target.role = payload.role
    db.commit()
    _audit(db, admin, "change_role", target.id, f"{old_role}->{target.role}")

    return {"ok": True, "id": target.id, "email": target.email, "role": target.role}
