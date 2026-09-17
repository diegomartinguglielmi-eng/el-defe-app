from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, Session
from sqlalchemy.sql import func

from .auth import get_current_user, require_roles
from .db import Base, get_db
from .models import Favorite, User
from .following_v5 import _current, _events_for_selection, FOLLOW_TYPE

AR_TZ = ZoneInfo("America/Argentina/Buenos_Aires")
router = APIRouter(prefix="/api/availability", tags=["Availability"])


class AvailabilityResponse(Base):
    __tablename__ = "availability_responses"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    match_id: Mapped[int] = mapped_column(Integer, index=True)
    selection: Mapped[str] = mapped_column(String(180), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    note: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    __table_args__ = (UniqueConstraint("user_id", "match_id", "selection", name="uq_availability_user_match_selection"),)


class AvailabilityIn(BaseModel):
    selection: str
    status: str
    note: str | None = None


def _today() -> str:
    return datetime.now(AR_TZ).date().isoformat()


def _next_event(db: Session, selection: str):
    found = _events_for_selection(db, selection, _today())
    return found[0] if found else None


def _serialize(event, response=None):
    if not event:
        return None
    return {
        **event,
        "response": response.status if response else None,
        "response_note": response.note if response else None,
        "response_updated_at": response.updated_at if response else None,
    }


@router.get("/me")
def my_availability(db: Session = Depends(get_db), user=Depends(get_current_user)):
    items = []
    for selection in _current(db, user.id):
        event = _next_event(db, selection)
        if not event:
            competition, category = selection.split("|", 1)
            items.append({
                "available": False,
                "selection": selection,
                "competition": competition,
                "category": category,
                "response": None,
            })
            continue
        response = db.query(AvailabilityResponse).filter(
            AvailabilityResponse.user_id == user.id,
            AvailabilityResponse.match_id == event["match_id"],
            AvailabilityResponse.selection == selection,
        ).first()
        items.append(_serialize(event, response))
    return {"today": _today(), "items": items}


@router.put("/{match_id}")
def set_availability(match_id: int, payload: AvailabilityIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    status = (payload.status or "").strip().lower()
    if status not in {"yes", "no", "maybe"}:
        raise HTTPException(status_code=400, detail="Estado inválido")
    selection = (payload.selection or "").strip()
    if selection not in _current(db, user.id):
        raise HTTPException(status_code=403, detail="La categoría no está entre tus selecciones")
    event = _next_event(db, selection)
    if not event or int(event["match_id"]) != match_id:
        raise HTTPException(status_code=409, detail="La próxima fecha cambió. Actualizá la pantalla e intentá nuevamente.")
    row = db.query(AvailabilityResponse).filter(
        AvailabilityResponse.user_id == user.id,
        AvailabilityResponse.match_id == match_id,
        AvailabilityResponse.selection == selection,
    ).first()
    if not row:
        row = AvailabilityResponse(user_id=user.id, match_id=match_id, selection=selection)
        db.add(row)
    row.status = status
    row.note = (payload.note or "").strip()[:200] or None
    db.commit(); db.refresh(row)
    return {"ok": True, "match_id": match_id, "selection": selection, "status": row.status, "updated_at": row.updated_at}


@router.get("/admin")
def admin_availability(db: Session = Depends(get_db), user=Depends(require_roles("admin", "delegado", "dt"))):
    followers = db.query(Favorite, User).join(User, User.id == Favorite.user_id).filter(
        Favorite.favorite_type == FOLLOW_TYPE,
        User.is_active == True,
    ).all()
    grouped = {}
    for fav, person in followers:
        selection = (fav.favorite_id or "").strip()
        if "|" not in selection:
            continue
        event = _next_event(db, selection)
        if not event:
            continue
        key = f"{selection}|{event['match_id']}"
        bucket = grouped.setdefault(key, {
            **event,
            "selection": selection,
            "followers": 0,
            "yes": 0,
            "no": 0,
            "maybe": 0,
            "pending": 0,
            "people": [],
        })
        response = db.query(AvailabilityResponse).filter(
            AvailabilityResponse.user_id == person.id,
            AvailabilityResponse.match_id == event["match_id"],
            AvailabilityResponse.selection == selection,
        ).first()
        status = response.status if response else "pending"
        bucket["followers"] += 1
        bucket[status] = bucket.get(status, 0) + 1
        bucket["people"].append({
            "user_id": person.id,
            "email": person.email,
            "status": status,
            "note": response.note if response else None,
            "updated_at": response.updated_at if response else None,
        })
    items = list(grouped.values())
    items.sort(key=lambda x: ((x.get("date") or "9999-99-99"), x.get("competition") or "", x.get("category") or ""))
    return {"today": _today(), "items": items}
