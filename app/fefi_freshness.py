from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from .auth import require_roles
from .db import get_db
from .models import Match, Standing, SyncRun
from .pending import FefiRawSnapshot
from .fefi_standings import router as standings_router
from .fefi_results import FefiCategoryResult, CATEGORIES as FEFI_CATEGORIES

router = APIRouter(prefix="/api/fefi", tags=["FEFI"])
router.include_router(standings_router)


def _duplicate_groups(db: Session, competition: str, division: str | None = None):
    q = db.query(
        Match.division,
        Match.round_name,
        Match.date,
        func.count(Match.id).label("n"),
    ).filter(Match.competition == competition)
    if division:
        q = q.filter(Match.division == division)
    return [
        {"division": r.division, "round_name": r.round_name, "date": r.date, "count": r.n}
        for r in q.group_by(Match.division, Match.round_name, Match.date).having(func.count(Match.id) > 1).all()
    ]


def _standing_for_defe(rows):
    aliases = ("DEFENSORES", "DEF. DE SANTOS", "DEFENSORES DE SL", "DEFENSORES SANTOS")
    for r in rows:
        name = (r.team or "").upper()
        if any(a in name for a in aliases):
            return r
    return None


@router.get("/freshness")
def fefi_freshness(
    db: Session = Depends(get_db),
    user = Depends(require_roles("admin", "delegado")),
):
    runs = (
        db.query(SyncRun)
        .filter(SyncRun.source == "FEFI_PENDING")
        .order_by(SyncRun.id.desc())
        .limit(50)
        .all()
    )
    latest = runs[0] if runs else None
    latest_success = next((r for r in runs if r.status == "ok"), None)
    consecutive_failures = 0
    for row in runs:
        if row.status == "error":
            consecutive_failures += 1
        else:
            break

    snapshot = db.query(FefiRawSnapshot).order_by(FefiRawSnapshot.id.desc()).first()

    if latest is None:
        health = "unknown"
    elif consecutive_failures >= 2:
        health = "error"
    elif consecutive_failures == 1:
        health = "warning"
    else:
        health = "ok"

    return {
        "health": health,
        "consecutive_failures": consecutive_failures,
        "latest_run": None if not latest else {
            "status": latest.status,
            "detail": latest.detail,
            "created_at": latest.created_at,
        },
        "last_success": None if not latest_success else {
            "detail": latest_success.detail,
            "created_at": latest_success.created_at,
        },
        "last_snapshot": None if not snapshot else {
            "sha256": snapshot.sha256,
            "fetched_at": snapshot.fetched_at,
        },
        "policy": "keep_last_good_state",
    }


@router.get("/quality")
def sports_data_quality(
    db: Session = Depends(get_db),
    user = Depends(require_roles("admin", "delegado")),
):
    alerts = []

    # FEFI Baby: one verified row per played round and category.
    fefi_by_category = []
    for category in FEFI_CATEGORIES:
        rows = db.query(FefiCategoryResult).filter(
            FefiCategoryResult.category == category,
            FefiCategoryResult.external_key.like("%|CLAUSURA|%"),
        ).order_by(FefiCategoryResult.round_number).all()
        rounds = sorted({r.round_number for r in rows})
        missing = []
        if rounds:
            missing = [n for n in range(1, max(rounds) + 1) if n not in rounds]
        duplicate_rounds = (
            db.query(FefiCategoryResult.round_number, func.count(FefiCategoryResult.id).label("n"))
            .filter(
                FefiCategoryResult.category == category,
                FefiCategoryResult.external_key.like("%|CLAUSURA|%"),
            )
            .group_by(FefiCategoryResult.round_number)
            .having(func.count(FefiCategoryResult.id) > 1)
            .all()
        )
        fefi_by_category.append({
            "category": category,
            "verified_results": len(rows),
            "rounds": rounds,
            "missing_rounds_until_latest_imported": missing,
            "duplicate_rounds": [{"round": r.round_number, "count": r.n} for r in duplicate_rounds],
        })
        if missing or duplicate_rounds:
            alerts.append({"competition": "FEFI", "scope": category, "type": "data_integrity", "detail": "Faltan fechas importadas o hay duplicados."})

    # LAAMBA: inspect every configured division separately.
    laamba = []
    for div in ["1ra", "3ra", "4ta", "5ta", "6ta", "7ma", "8va"]:
        matches = db.query(Match).filter(Match.competition == "LAAMBA", Match.division == div).all()
        standings = db.query(Standing).filter(Standing.competition == "LAAMBA", Standing.division == div).all()
        defe_standing = _standing_for_defe(standings)
        dup = _duplicate_groups(db, "LAAMBA", div)
        item = {
            "division": div,
            "matches": len(matches),
            "final": sum(1 for m in matches if m.status == "final"),
            "scheduled": sum(1 for m in matches if m.status != "final"),
            "missing_date": sum(1 for m in matches if not m.date),
            "missing_venue": sum(1 for m in matches if not m.venue),
            "duplicates": dup,
            "standings_rows": len(standings),
            "defe_played": None if not defe_standing else defe_standing.played,
            "defe_points": None if not defe_standing else defe_standing.pts,
        }
        laamba.append(item)
        if dup:
            alerts.append({"competition": "LAAMBA", "scope": div, "type": "duplicate", "detail": f"{len(dup)} grupos duplicados."})
        if matches and item["missing_date"] == len(matches):
            alerts.append({"competition": "LAAMBA", "scope": div, "type": "source_limitation", "detail": "La fuente no está entregando fechas estructuradas para los partidos cargados."})

    # Super Liga Junior A.
    super_matches = db.query(Match).filter(Match.competition == "SUPERLIGA", Match.division == "Junior A").all()
    super_standings = db.query(Standing).filter(Standing.competition == "SUPERLIGA", Standing.division == "Junior A").all()
    super_dup = _duplicate_groups(db, "SUPERLIGA", "Junior A")
    superliga = {
        "division": "Junior A",
        "matches": len(super_matches),
        "final": sum(1 for m in super_matches if m.status == "final"),
        "scheduled": sum(1 for m in super_matches if m.status != "final"),
        "missing_date": sum(1 for m in super_matches if not m.date),
        "missing_venue": sum(1 for m in super_matches if not m.venue),
        "duplicates": super_dup,
        "standings_rows": len(super_standings),
        "rounds": sorted({m.round_name for m in super_matches if m.round_name}),
    }
    if super_dup:
        alerts.append({"competition": "SUPERLIGA", "scope": "Junior A", "type": "duplicate", "detail": f"{len(super_dup)} grupos duplicados."})

    # FEFI Mayores B +42: fixture exists, result/standings parser is not implemented yet.
    mayores = db.query(Match).filter(Match.competition == "FEFI", Match.division == "Mayores B · +42").all()
    mayores_dup = _duplicate_groups(db, "FEFI", "Mayores B · +42")
    fefi_mayores = {
        "division": "Mayores B · +42",
        "matches": len(mayores),
        "final": sum(1 for m in mayores if m.status == "final"),
        "scheduled": sum(1 for m in mayores if m.status != "final"),
        "missing_date": sum(1 for m in mayores if not m.date),
        "missing_venue": sum(1 for m in mayores if not m.venue),
        "duplicates": mayores_dup,
        "results_supported": False,
        "standings_supported": False,
        "limitation": "El sincronizador actual de +42 importa fixture, pero todavía no resultados ni tabla.",
    }
    if mayores:
        alerts.append({"competition": "FEFI", "scope": "+42", "type": "functional_gap", "detail": fefi_mayores["limitation"]})

    # Argenliga is intentionally manual/assisted.
    argen = db.query(Match).filter(Match.competition == "ARGENLIGA").all()
    argen_dup = _duplicate_groups(db, "ARGENLIGA")
    argenliga = {
        "mode": "manual_assisted",
        "matches": len(argen),
        "final": sum(1 for m in argen if m.status == "final"),
        "scheduled": sum(1 for m in argen if m.status != "final"),
        "missing_date": sum(1 for m in argen if not m.date),
        "missing_venue": sum(1 for m in argen if not m.venue),
        "duplicates": argen_dup,
    }

    # Global invariants.
    scheduled_with_score = db.query(Match).filter(
        Match.status != "final",
        Match.home_score.isnot(None),
        Match.away_score.isnot(None),
    ).count()
    final_without_score = db.query(Match).filter(
        Match.status == "final",
        (Match.home_score.is_(None) | Match.away_score.is_(None)),
    ).count()
    if scheduled_with_score:
        alerts.append({"competition": "GLOBAL", "scope": "matches", "type": "status_score_mismatch", "detail": f"{scheduled_with_score} partidos programados tienen marcador."})
    if final_without_score:
        alerts.append({"competition": "GLOBAL", "scope": "matches", "type": "status_score_mismatch", "detail": f"{final_without_score} partidos finales no tienen marcador completo."})

    health = "ok" if not alerts else ("warning" if all(a["type"] in {"source_limitation", "functional_gap"} for a in alerts) else "attention")
    return {
        "health": health,
        "alerts": alerts,
        "fefi_baby": fefi_by_category,
        "laamba": laamba,
        "superliga": superliga,
        "fefi_mayores_b_42": fefi_mayores,
        "argenliga": argenliga,
        "global_checks": {
            "scheduled_with_score": scheduled_with_score,
            "final_without_score": final_without_score,
        },
    }
