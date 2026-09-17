from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, Session, mapped_column
from sqlalchemy.sql import func

from .auth import get_current_user, require_roles
from .db import Base, get_db
from .models import Person
from .availability_v1 import UserPlayerLink, AvailabilityResponse, _linked_players, _next_event

AR_TZ = ZoneInfo("America/Argentina/Buenos_Aires")
router = APIRouter(prefix="/api/availability/v2", tags=["Availability v2 - player"])


class PlayerAvailabilityResponse(Base):
    __tablename__ = "player_availability_responses"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id"), index=True)
    match_id: Mapped[int] = mapped_column(Integer, index=True)
    selection: Mapped[str] = mapped_column(String(180), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    note: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    __table_args__ = (UniqueConstraint("person_id", "match_id", "selection", name="uq_player_availability_person_match_selection"),)


class PlayerAvailabilityIn(BaseModel):
    person_id: int
    selection: str
    status: str
    note: str | None = None


def _today():
    return datetime.now(AR_TZ).date().isoformat()


def _belongs_to_selection(player: dict, selection: str) -> bool:
    if "|" not in selection:
        return False
    competition, category = [x.strip().upper() for x in selection.split("|", 1)]
    return any(
        (team.get("competition") or "").strip().upper() == competition
        and (team.get("category") or "").strip().upper() == category
        for team in (player.get("teams") or [])
    )


def _family_player(db: Session, user_id: int, person_id: int, selection: str):
    player = next((p for p in _linked_players(db, user_id) if int(p["person_id"]) == int(person_id)), None)
    if not player:
        raise HTTPException(404, "Hijo no vinculado a esta familia")
    if not _belongs_to_selection(player, selection):
        raise HTTPException(403, "El hijo no pertenece a esa liga/categoría")
    return player


def _legacy_response(db: Session, user_id: int, match_id: int, selection: str):
    return db.query(AvailabilityResponse).filter(
        AvailabilityResponse.user_id == user_id,
        AvailabilityResponse.match_id == match_id,
        AvailabilityResponse.selection == selection,
    ).first()


def _player_response(db: Session, person_id: int, match_id: int, selection: str):
    return db.query(PlayerAvailabilityResponse).filter(
        PlayerAvailabilityResponse.person_id == person_id,
        PlayerAvailabilityResponse.match_id == match_id,
        PlayerAvailabilityResponse.selection == selection,
    ).first()


def _status(db: Session, user_id: int, person_id: int, match_id: int, selection: str):
    row = _player_response(db, person_id, match_id, selection)
    if row:
        return row.status, row.note, row.updated_at, "player"
    # Compatibilidad: una respuesta histórica de la familia se usa como valor
    # inicial hasta que ese hijo responda individualmente en v2.
    legacy = _legacy_response(db, user_id, match_id, selection)
    if legacy:
        return legacy.status, legacy.note, legacy.updated_at, "legacy_family"
    return None, None, None, None


@router.get("/me")
def my_player_availability(db: Session = Depends(get_db), user=Depends(get_current_user)):
    items = []
    for player in _linked_players(db, user.id):
        for team in player.get("teams") or []:
            selection = f"{team['competition']}|{team['category']}"
            event = _next_event(db, selection)
            base = {
                "person_id": player["person_id"],
                "player_name": player["name"],
                "selection": selection,
                "competition": team["competition"],
                "category": team["category"],
            }
            if not event:
                items.append({**base, "available": False, "response": None, "response_source": None})
                continue
            status, note, updated_at, source = _status(db, user.id, player["person_id"], event["match_id"], selection)
            items.append({
                **base,
                **event,
                "available": True,
                "response": status,
                "response_note": note,
                "response_updated_at": updated_at,
                "response_source": source,
            })
    return {"today": _today(), "items": items}


@router.put("/{match_id}")
def set_player_availability(match_id: int, payload: PlayerAvailabilityIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    status = (payload.status or "").strip().lower()
    if status not in {"yes", "no", "maybe"}:
        raise HTTPException(400, "Estado inválido")
    selection = (payload.selection or "").strip()
    _family_player(db, user.id, payload.person_id, selection)
    event = _next_event(db, selection)
    if not event or int(event["match_id"]) != int(match_id):
        raise HTTPException(409, "La próxima fecha cambió. Actualizá la pantalla e intentá nuevamente.")
    row = _player_response(db, payload.person_id, match_id, selection)
    if not row:
        row = PlayerAvailabilityResponse(user_id=user.id, person_id=payload.person_id, match_id=match_id, selection=selection)
        db.add(row)
    row.user_id = user.id
    row.status = status
    row.note = (payload.note or "").strip()[:200] or None
    db.commit()
    db.refresh(row)
    return {"ok": True, "person_id": payload.person_id, "match_id": match_id, "selection": selection, "status": row.status, "updated_at": row.updated_at}


@router.get("/admin")
def admin_player_availability(db: Session = Depends(get_db), user=Depends(require_roles("admin", "delegado", "dt"))):
    links = db.query(UserPlayerLink).all()
    grouped = {}
    seen = set()
    for link in links:
        for player in _linked_players(db, link.user_id):
            if int(player["person_id"]) != int(link.person_id):
                continue
            for team in player.get("teams") or []:
                selection = f"{team['competition']}|{team['category']}"
                event = _next_event(db, selection)
                if not event:
                    continue
                identity = (player["person_id"], event["match_id"], selection)
                if identity in seen:
                    continue
                seen.add(identity)
                key = f"{selection}|{event['match_id']}"
                bucket = grouped.setdefault(key, {**event, "selection": selection, "players": 0, "yes": 0, "no": 0, "maybe": 0, "pending": 0, "people": []})
                status, note, updated_at, source = _status(db, link.user_id, player["person_id"], event["match_id"], selection)
                effective = status or "pending"
                bucket["players"] += 1
                bucket[effective] = bucket.get(effective, 0) + 1
                person = db.get(Person, player["person_id"])
                bucket["people"].append({
                    "user_id": link.user_id,
                    "person_id": player["person_id"],
                    "email": None,
                    "name": player["name"],
                    "players": [player],
                    "status": effective,
                    "note": note,
                    "updated_at": updated_at,
                    "response_source": source,
                })
    items = list(grouped.values())
    for item in items:
        item["followers"] = item["players"]  # compatibilidad con tablero actual
    items.sort(key=lambda x: ((x.get("date") or "9999-99-99"), x.get("selection") or ""))
    return {"items": items}
