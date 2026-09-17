from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .auth import get_current_user
from .db import get_db
from .models import Match
from .family_context_v1 import family_context
from .availability_v1 import _next_event

AR_TZ = ZoneInfo("America/Argentina/Buenos_Aires")
router = APIRouter(prefix="/api/home", tags=["Home"])


def _priority(m: Match) -> int:
    key = (m.external_key or "").upper(); kind = (m.source_kind or "").lower()
    if "|CLAUSURA|" in key: return 100
    if kind == "verified_auto": return 95
    if kind == "approved_sync": return 90
    if kind == "manual": return 70
    if kind == "import": return 60
    if kind == "sync_clausura": return 55
    if kind == "sync": return 10
    return 20


def _canonical(rows: list[Match]) -> list[Match]:
    chosen = {}
    for m in rows:
        key = (m.competition, m.division or "", m.round_name or "", m.date or "") if m.competition == "FEFI" else (m.competition, m.division or "", m.date or "", m.home or "", m.away or "")
        cur = chosen.get(key)
        if cur is None or (_priority(m), m.id) > (_priority(cur), cur.id): chosen[key] = m
    return list(chosen.values())


def _global_next(db: Session):
    today = datetime.now(AR_TZ).date().isoformat(); candidates = []
    for m in _canonical(db.query(Match).all()):
        if not m.date: continue
        match_date = str(m.date).split("T")[0]
        if match_date < today or (m.status or "").lower() == "final": continue
        if m.home_score is not None and m.away_score is not None: continue
        candidates.append(m)
    candidates.sort(key=lambda m: (str(m.date).split("T")[0], m.id))
    return today, candidates[0] if candidates else None


@router.get("/next-match")
def next_match(db: Session = Depends(get_db)):
    today, m = _global_next(db)
    return {"today": today, "match": ({c.name: getattr(m, c.name) for c in m.__table__.columns} if m else None)}


@router.get("/personalized")
def personalized_home(db: Session = Depends(get_db), user=Depends(get_current_user)):
    today, global_match = _global_next(db)
    ctx = family_context(db, user.id)
    family_matches = []
    for child in ctx["children"]:
        for team in child["teams"]:
            event = _next_event(db, team["selection"])
            if not event: continue
            family_matches.append({"person_id": child["person_id"], "player_name": child["name"], "competition": team["competition"], "category": team["category"], "selection": team["selection"], **event})
    family_matches.sort(key=lambda x: ((x.get("date") or "9999-99-99"), (x.get("time") or "99:99"), x["player_name"]))
    return {
        "today": today,
        "personalized": bool(ctx["children"]),
        "children": ctx["children"],
        "next_matches": family_matches,
        "primary_match": family_matches[0] if family_matches else ({c.name: getattr(global_match, c.name) for c in global_match.__table__.columns} if global_match else None),
        "fallback": not bool(family_matches),
    }
