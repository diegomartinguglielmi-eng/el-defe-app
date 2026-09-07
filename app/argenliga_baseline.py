from sqlalchemy.orm import Session

from .models import Match

BASELINE_2026 = [
    {
        "date": "2026-03-28",
        "home": "Versailles",
        "away": "Defensores de Santos Lugares",
        "home_score": 0,
        "away_score": 4,
        "status": "final",
        "source_url": "https://www.sofascore.com/es-la/futsal/match/defensores-de-santos-lugares-versailles/aXKjsoXKj",
    },
    {
        "date": "2026-04-05",
        "home": "Defensores de Santos Lugares",
        "away": "Centro Artiguense",
        "home_score": 3,
        "away_score": 2,
        "status": "final",
        "source_url": "https://www.sofascore.com/es-la/futsal/match/defensores-de-santos-lugares-centro-artiguense/cXKjsoXKj",
    },
    {
        "date": "2026-04-11",
        "home": "Hurlingham",
        "away": "Defensores de Santos Lugares",
        "home_score": None,
        "away_score": None,
        "status": "postponed",
        "source_url": "https://www.sofascore.com/es-la/futsal/match/defensores-de-santos-lugares-hurlingham/jXKjsoXKj",
    },
    {
        "date": "2026-04-19",
        "home": "Defensores de Santos Lugares",
        "away": "Bristol",
        "home_score": 6,
        "away_score": 5,
        "status": "final",
        "source_url": "https://www.sofascore.com/es-la/futsal/match/defensores-de-santos-lugares-bristol/fXKjsoXKj",
    },
    {
        "date": "2026-04-26",
        "home": "Velez de Martinez",
        "away": "Defensores de Santos Lugares",
        "home_score": 5,
        "away_score": 5,
        "status": "final",
        "source_url": "https://www.sofascore.com/futsal/match/defensores-de-santos-lugares-velez-de-martinez/kXKjsoXKj",
    },
]


def bootstrap_argenliga_2026(db: Session) -> dict:
    existing = db.query(Match).filter(Match.competition == "ARGENLIGA").count()
    if existing:
        return {"ok": True, "created": 0, "skipped": True, "reason": "argenliga_already_present", "existing": existing}

    created = 0
    for i, item in enumerate(BASELINE_2026, start=1):
        key = f"ARGENLIGA|2026|BASELINE|{item['date']}|{item['home']}|{item['away']}"
        db.add(Match(
            external_key=key,
            competition="ARGENLIGA",
            division="A Z1",
            round_name=f"Registro {i}",
            date=item["date"],
            home=item["home"],
            away=item["away"],
            home_score=item["home_score"],
            away_score=item["away_score"],
            status=item["status"],
            venue=None,
            source_url=item["source_url"],
            source_kind="public_baseline",
        ))
        created += 1
    db.commit()
    return {"ok": True, "created": created, "skipped": False, "source": "Sofascore public 2026 baseline"}
