from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from .auth import require_roles
from .db import get_db
from .models import Match, Standing

router = APIRouter(prefix="/api/admin", tags=["Data quality"])


@router.get("/data-quality")
def data_quality(db: Session = Depends(get_db), user=Depends(require_roles("admin", "delegado"))):
    competitions = ["FEFI", "LAAMBA", "ARGENLIGA"]
    summary = []
    for comp in competitions:
        rows = db.query(Match).filter(Match.competition == comp).all()
        summary.append({
            "competition": comp,
            "matches": len(rows),
            "scheduled": sum(1 for x in rows if x.status != "final"),
            "final": sum(1 for x in rows if x.status == "final"),
            "missing_date": sum(1 for x in rows if not x.date),
            "missing_venue": sum(1 for x in rows if not x.venue),
        })

    duplicate_groups = (
        db.query(
            Match.competition,
            Match.division,
            Match.round_name,
            Match.date,
            func.count(Match.id).label("n"),
        )
        .group_by(Match.competition, Match.division, Match.round_name, Match.date)
        .having(func.count(Match.id) > 1)
        .all()
    )

    fefi_legacy = db.query(Match).filter(
        Match.competition == "FEFI",
        Match.source_kind == "sync",
    ).count()
    fefi_clausura = db.query(Match).filter(
        Match.competition == "FEFI",
        Match.external_key.like("%|CLAUSURA|%"),
    ).count()
    laamba_legacy = db.query(Match).filter(
        Match.competition == "LAAMBA",
        Match.source_kind == "sync",
    ).count()
    laamba_clausura = db.query(Match).filter(
        Match.competition == "LAAMBA",
        Match.external_key.like("%|CLAUSURA|%"),
    ).count()
    laamba_standings_clausura = db.query(Standing).filter(
        Standing.competition == "LAAMBA",
        Standing.unique_key.like("%|CLAUSURA|%"),
    ).count()

    return {
        "summary": summary,
        "duplicates": [
            {
                "competition": x.competition,
                "division": x.division,
                "round_name": x.round_name,
                "date": x.date,
                "count": x.n,
            }
            for x in duplicate_groups[:30]
        ],
        "sources": {
            "fefi": {"clausura": fefi_clausura, "legacy_sync": fefi_legacy},
            "laamba": {"clausura": laamba_clausura, "legacy_sync": laamba_legacy, "standings_clausura": laamba_standings_clausura},
            "argenliga": {"mode": "manual_assisted"},
        },
    }
