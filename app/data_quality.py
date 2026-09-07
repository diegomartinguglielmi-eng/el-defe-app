from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from .auth import require_roles
from .db import get_db
from .models import Match, Standing
from .fefi_results import FefiCategoryResult, CATEGORIES as FEFI_CATEGORIES

router = APIRouter(prefix="/api/admin", tags=["Data quality"])

LAAMBA_DIVISIONS = ["1ra", "3ra", "4ta", "5ta", "6ta", "7ma", "8va"]
SUPERLIGA_DIVISION = "Junior A"
FEFI_BABY_DIVISION = "Zona H"
FEFI_MAYORES_DIVISION = "Mayores B · +42"


def _norm(value):
    return " ".join(str(value or "").strip().upper().split())


def _is_defe(team: str | None) -> bool:
    t = _norm(team).replace(".", "")
    aliases = (
        "DEF DE SANTOS LUGARES",
        "DEF DE STOS LUGARES",
        "DEFENSORES DE SANTOS LUGARES",
        "DEFENSORES SANTOS LUGARES",
        "DEFENSORES DE SL",
    )
    return any(a in t or t in a for a in aliases if t)


def _match_payload(rows: list[Match]):
    return {
        "matches": len(rows),
        "final": sum(1 for x in rows if x.status == "final"),
        "scheduled": sum(1 for x in rows if x.status != "final"),
        "missing_date": sum(1 for x in rows if not x.date),
        "missing_venue": sum(1 for x in rows if not x.venue),
        "final_without_score": sum(
            1 for x in rows
            if x.status == "final" and (x.home_score is None or x.away_score is None)
        ),
        "scheduled_with_score": sum(
            1 for x in rows
            if x.status != "final" and x.home_score is not None and x.away_score is not None
        ),
    }


def _duplicate_details(rows: list[Match]):
    by_round = defaultdict(list)
    by_key = Counter()
    for x in rows:
        by_round[(x.competition, x.division or "", x.round_name or "", x.date or "")].append(x)
        by_key[x.external_key or f"ID:{x.id}"] += 1
    round_dups = []
    for key, items in by_round.items():
        if len(items) > 1:
            round_dups.append({
                "competition": key[0],
                "division": key[1],
                "round_name": key[2],
                "date": key[3] or None,
                "count": len(items),
                "ids": [x.id for x in items],
                "statuses": [x.status for x in items],
                "source_kinds": [x.source_kind for x in items],
            })
    key_dups = [{"external_key": k, "count": n} for k, n in by_key.items() if n > 1]
    return round_dups, key_dups


def _standing_info(db: Session, competition: str, division: str | None = None):
    q = db.query(Standing).filter(Standing.competition == competition)
    if division is not None:
        q = q.filter(Standing.division == division)
    rows = q.all()
    defe = next((r for r in rows if _is_defe(r.team)), None)
    return {
        "rows": len(rows),
        "defe": None if not defe else {
            "team": defe.team,
            "played": defe.played,
            "won": defe.won,
            "drawn": defe.drawn,
            "lost": defe.lost,
            "pts": defe.pts,
        },
    }


def _round_number(value: str | None):
    import re
    m = re.search(r"(\d+)", value or "")
    return int(m.group(1)) if m else None


def _fefi_baby(db: Session):
    matches = db.query(Match).filter(
        Match.competition == "FEFI",
        Match.division == FEFI_BABY_DIVISION,
    ).all()
    category_rows = db.query(FefiCategoryResult).filter(
        FefiCategoryResult.external_key.like("%|CLAUSURA|%")
    ).all()

    by_category = defaultdict(list)
    by_round = defaultdict(list)
    for row in category_rows:
        by_category[row.category].append(row)
        by_round[row.round_number].append(row)

    verified_rounds = sorted(
        rnd for rnd, rows in by_round.items()
        if len({r.category for r in rows}) == len(FEFI_CATEGORIES)
    )
    incomplete_rounds = []
    for rnd, rows in sorted(by_round.items()):
        cats = {r.category for r in rows}
        missing = [c for c in FEFI_CATEGORIES if c not in cats]
        if missing:
            incomplete_rounds.append({"round": rnd, "missing_categories": missing})

    categories = []
    for cat in FEFI_CATEGORIES:
        rows = sorted(by_category.get(cat, []), key=lambda x: x.round_number)
        rounds = [r.round_number for r in rows]
        categories.append({
            "category": cat,
            "verified_results": len(rows),
            "rounds": rounds,
            "missing_within_verified_span": (
                [r for r in range(min(rounds), max(rounds) + 1) if r not in rounds] if rounds else []
            ),
            "non_verified_status": sum(1 for r in rows if _norm(r.status) != "VERIFICADO"),
        })

    round_dups, key_dups = _duplicate_details(matches)
    return {
        **_match_payload(matches),
        "verified_rounds_complete_7_of_7": verified_rounds,
        "verified_encounters": len(verified_rounds),
        "category_rows": len(category_rows),
        "expected_category_rows_for_complete_rounds": len(verified_rounds) * len(FEFI_CATEGORIES),
        "categories": categories,
        "incomplete_verified_rounds": incomplete_rounds,
        "duplicate_rounds": round_dups,
        "duplicate_external_keys": key_dups,
        "source_mode": "automatic_official_fefi",
    }


def _laamba(db: Session):
    divisions = []
    all_rows = []
    for div in LAAMBA_DIVISIONS:
        rows = db.query(Match).filter(Match.competition == "LAAMBA", Match.division == div).all()
        all_rows.extend(rows)
        rounds = sorted(r for r in {_round_number(x.round_name) for x in rows} if r is not None)
        dup_rounds, _ = _duplicate_details(rows)
        divisions.append({
            "division": div,
            **_match_payload(rows),
            "rounds": rounds,
            "duplicate_rounds": dup_rounds,
            "standings": _standing_info(db, "LAAMBA", div),
        })
    round_dups, key_dups = _duplicate_details(all_rows)
    return {
        "divisions": divisions,
        "total": _match_payload(all_rows),
        "duplicate_rounds": round_dups,
        "duplicate_external_keys": key_dups,
        "source_mode": "automatic_laamba_clausura",
        "known_source_limitation": "La fuente puede no publicar fecha calendario estructurada; date nulo no implica por sí solo bug.",
    }


def _superliga(db: Session):
    rows = db.query(Match).filter(
        Match.competition == "SUPERLIGA",
        Match.division == SUPERLIGA_DIVISION,
    ).all()
    round_dups, key_dups = _duplicate_details(rows)
    rounds = sorted(r for r in {_round_number(x.round_name) for x in rows} if r is not None)
    missing_time = sum(1 for x in rows if not (x.round_name and "·" in x.round_name))
    return {
        **_match_payload(rows),
        "rounds": rounds,
        "missing_time": missing_time,
        "duplicate_rounds": round_dups,
        "duplicate_external_keys": key_dups,
        "standings": _standing_info(db, "SUPERLIGA", SUPERLIGA_DIVISION),
        "source_mode": "automatic_futsal_argentina_round_pages",
    }


def _fefi_mayores(db: Session):
    rows = db.query(Match).filter(
        Match.competition == "FEFI",
        Match.division == FEFI_MAYORES_DIVISION,
    ).all()
    round_dups, key_dups = _duplicate_details(rows)
    return {
        **_match_payload(rows),
        "rounds": sorted(r for r in {_round_number(x.round_name) for x in rows} if r is not None),
        "duplicate_rounds": round_dups,
        "duplicate_external_keys": key_dups,
        "results_implemented": False,
        "standings_implemented": False,
        "source_mode": "automatic_fixture_only",
        "known_gap": "El parser actual de +42 carga fixture; resultados y tabla todavía no están implementados.",
    }


def _argenliga(db: Session):
    rows = db.query(Match).filter(Match.competition == "ARGENLIGA").all()
    round_dups, key_dups = _duplicate_details(rows)
    return {
        **_match_payload(rows),
        "duplicate_rounds": round_dups,
        "duplicate_external_keys": key_dups,
        "missing_time": sum(1 for x in rows if not (x.round_name and "·" in x.round_name)),
        "source_mode": "manual_assisted",
        "standings_implemented": False,
        "known_gap": "Sin fuente estructurada confiable: próximos, horario, sede y tabla pueden requerir carga asistida.",
    }


def build_data_quality(db: Session):
    fefi = _fefi_baby(db)
    laamba = _laamba(db)
    superliga = _superliga(db)
    mayores = _fefi_mayores(db)
    argenliga = _argenliga(db)

    all_matches = db.query(Match).all()
    global_round_dups, global_key_dups = _duplicate_details(all_matches)
    global_issues = {
        "final_without_score": sum(
            1 for x in all_matches
            if x.status == "final" and (x.home_score is None or x.away_score is None)
        ),
        "scheduled_with_score": sum(
            1 for x in all_matches
            if x.status != "final" and x.home_score is not None and x.away_score is not None
        ),
        "duplicate_round_groups": len(global_round_dups),
        "duplicate_external_keys": len(global_key_dups),
    }

    severity = "ok"
    if global_issues["scheduled_with_score"] or global_issues["duplicate_external_keys"]:
        severity = "error"
    elif global_issues["duplicate_round_groups"] or fefi["incomplete_verified_rounds"]:
        severity = "warning"

    return {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "health": severity,
        "global": global_issues,
        "competitions": {
            "fefi_baby": fefi,
            "laamba": laamba,
            "superliga": superliga,
            "fefi_mayores_42": mayores,
            "argenliga": argenliga,
        },
        "policy": {
            "source_limitations_are_not_bugs": True,
            "no_invented_dates_scores_or_venues": True,
        },
    }


@router.get("/data-quality")
def data_quality(db: Session = Depends(get_db), user=Depends(require_roles("admin", "delegado"))):
    return build_data_quality(db)
