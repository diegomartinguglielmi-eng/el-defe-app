from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .db import get_db
from .models import Match

AR_TZ = ZoneInfo("America/Argentina/Buenos_Aires")
router = APIRouter(prefix="/api/home", tags=["Home"])


def _priority(m: Match) -> int:
    key = (m.external_key or "").upper()
    kind = (m.source_kind or "").lower()
    if "|CLAUSURA|" in key:
        return 100
    if kind == "verified_auto":
        return 95
    if kind == "approved_sync":
        return 90
    if kind == "manual":
        return 70
    if kind == "import":
        return 60
    if kind == "sync_clausura":
        return 55
    if kind == "sync":
        return 10
    return 20


def _canonical(rows: list[Match]) -> list[Match]:
    chosen = {}
    for m in rows:
        if m.competition == "FEFI":
            key = (m.competition, m.division or "", m.round_name or "", m.date or "")
        else:
            key = (m.competition, m.division or "", m.date or "", m.home or "", m.away or "")
        cur = chosen.get(key)
        if cur is None or (_priority(m), m.id) > (_priority(cur), cur.id):
            chosen[key] = m
    return list(chosen.values())


@router.get("/next-match")
def next_match(db: Session = Depends(get_db)):
    today = datetime.now(AR_TZ).date().isoformat()
    rows = db.query(Match).all()
    candidates = []
    for m in _canonical(rows):
        if not m.date:
            continue
        match_date = str(m.date).split("T")[0]
        if match_date < today:
            continue
        if (m.status or "").lower() == "final":
            continue
        if m.home_score is not None and m.away_score is not None:
            continue
        candidates.append(m)
    candidates.sort(key=lambda m: (str(m.date).split("T")[0], m.id))
    if not candidates:
        return {"today": today, "match": None}
    m = candidates[0]
    return {
        "today": today,
        "match": {c.name: getattr(m, c.name) for c in m.__table__.columns},
    }
