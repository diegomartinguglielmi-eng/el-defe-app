from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .auth import require_roles
from .db import get_db
from .models import Favorite, User
from .following_v5 import FOLLOW_TYPE
from .availability_v1 import AvailabilityResponse, _next_event, _linked_players

router = APIRouter(prefix="/api/availability", tags=["Availability"])


def _players_for_selection(db, user_id: int, selection: str):
    if "|" not in selection:
        return []
    competition, category = [x.strip().upper() for x in selection.split("|", 1)]
    players = _linked_players(db, user_id)
    return [
        p for p in players
        if any(
            (team.get("competition") or "").strip().upper() == competition
            and (team.get("category") or "").strip().upper() == category
            for team in (p.get("teams") or [])
        )
    ]


@router.get("/admin")
def admin_availability_filtered(
    db: Session = Depends(get_db),
    user=Depends(require_roles("admin", "profe", "delegado", "dt")),
):
    followers = (
        db.query(Favorite, User)
        .join(User, User.id == Favorite.user_id)
        .filter(Favorite.favorite_type == FOLLOW_TYPE, User.is_active == True)
        .all()
    )
    grouped = {}
    for fav, person in followers:
        selection = (fav.favorite_id or "").strip()
        if "|" not in selection:
            continue
        event = _next_event(db, selection)
        if not event:
            continue

        # Asistencia es de jugadores, no de cuentas. Una cuenta administrativa,
        # de Tienda o cualquier usuario sin hijo/jugador vinculado a esta
        # liga/categoría no debe alterar jugadores, pendientes ni porcentajes.
        players = _players_for_selection(db, person.id, selection)
        if not players:
            continue

        key = f"{selection}|{event['match_id']}"
        bucket = grouped.setdefault(
            key,
            {**event, "selection": selection, "followers": 0, "yes": 0, "no": 0, "maybe": 0, "pending": 0, "people": []},
        )
        response = (
            db.query(AvailabilityResponse)
            .filter(
                AvailabilityResponse.user_id == person.id,
                AvailabilityResponse.match_id == event["match_id"],
                AvailabilityResponse.selection == selection,
            )
            .first()
        )
        status = response.status if response else "pending"

        # El modelo actual guarda una respuesta por cuenta/categoría. Para las
        # métricas contamos los jugadores vinculados de esa cuenta; la respuesta
        # de la familia aplica a esos jugadores.
        player_count = len(players)
        bucket["followers"] += player_count
        bucket[status] = bucket.get(status, 0) + player_count
        bucket["people"].append(
            {
                "user_id": person.id,
                "email": person.email,
                "name": " / ".join(p["name"] for p in players),
                "players": players,
                "status": status,
                "note": response.note if response else None,
                "updated_at": response.updated_at if response else None,
            }
        )
    items = list(grouped.values())
    items.sort(key=lambda x: ((x.get("date") or "9999-99-99"), x.get("selection") or ""))
    return {"items": items}
