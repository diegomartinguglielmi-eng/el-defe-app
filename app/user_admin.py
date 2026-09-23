from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from .auth import hash_password, create_token, require_roles
from .db import get_db
from .models import User, AuditLog, Favorite, Person, Team, TeamMember
from .profe_scope import PROFE_TEAM_FAVORITE, normalize_selection, profe_selections

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


class ProfeTeamsIn(BaseModel):
    selections: list[str]

    @field_validator("selections")
    @classmethod
    def validate_selections(cls, values: list[str]):
        cleaned = []
        for value in values:
            key = normalize_selection(value)
            if not key:
                raise ValueError("Equipo/categoría inválido")
            if key not in cleaned:
                cleaned.append(key)
        return cleaned


class RoleIn(BaseModel):
    role: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str):
        value = value.strip().lower()
        if value not in {"lector", "tienda", "profe", "admin"}:
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
            "first_name": u.first_name,
            "last_name": u.last_name,
            "phone": u.phone,
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


@router.get("/api/profe/squad")
def get_profe_squad(category: str, db: Session = Depends(get_db), profe: User = Depends(require_roles("profe"))):
    category = (category or "").strip()
    selection = normalize_selection(f"FEFI|{category}")
    if not selection or selection not in profe_selections(db, profe):
        raise HTTPException(status_code=403, detail="Categoría no asignada al profesor")
    rows = (db.query(Person, Team)
        .join(TeamMember, TeamMember.person_id == Person.id)
        .join(Team, Team.id == TeamMember.team_id)
        .filter(Person.is_active == True, Team.is_active == True, Team.competition == "FEFI", Team.division == category)
        .order_by(Person.last_name, Person.first_name)
        .all())
    players = []
    seen = set()
    for person, team in rows:
        if person.id in seen:
            continue
        seen.add(person.id)
        players.append({"id": person.id, "person_id": person.id, "full_name": f"{person.first_name} {person.last_name}".strip(), "category": team.division})
    return {"category": category, "players": players}


@router.get("/api/profe/me")
def get_current_profe(db: Session = Depends(get_db), profe: User = Depends(require_roles("profe"))):
    selections = sorted(profe_selections(db, profe))
    return {
        "id": profe.id,
        "email": profe.email,
        "role": profe.role,
        "first_name": profe.first_name,
        "last_name": profe.last_name,
        "phone": profe.phone,
        "selections": selections,
        "categories": [value.split("|", 1)[1] for value in selections if "|" in value],
    }


@router.get("/api/admin/users/{user_id}/profe-teams")
def get_profe_teams(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_roles("admin"))):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Usuario inexistente")
    return {"user_id": target.id, "email": target.email, "role": target.role, "selections": sorted(profe_selections(db, target))}


@router.put("/api/admin/users/{user_id}/profe-teams")
def set_profe_teams(user_id: int, payload: ProfeTeamsIn, db: Session = Depends(get_db), admin: User = Depends(require_roles("admin"))):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Usuario inexistente")
    if target.role != "profe":
        raise HTTPException(status_code=400, detail="El usuario no tiene rol Profe")
    db.query(Favorite).filter(Favorite.user_id == target.id, Favorite.favorite_type == PROFE_TEAM_FAVORITE).delete(synchronize_session=False)
    for selection in payload.selections:
        db.add(Favorite(user_id=target.id, favorite_type=PROFE_TEAM_FAVORITE, favorite_id=selection))
    db.commit()
    _audit(db, admin, "set_profe_teams", target.id, ",".join(payload.selections))
    return {"ok": True, "user_id": target.id, "selections": sorted(payload.selections)}
