import re
from datetime import datetime
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from .models import Match, SyncRun

URL = "https://fefi.com.ar/2026-futbol-sala-mayores-fefi/mayores-b/"
UA = {"User-Agent": "Mozilla/5.0 ElDefe/2.0 (+https://el-defe-v5-production.up.railway.app/)"}
DIVISION = "Mayores B · +42"
AR_TZ = ZoneInfo("America/Argentina/Buenos_Aires")
TEAM_ALIASES = (
    "DEF. DE STOS. LUGARES",
    "DEF. DE SANTOS LUGARES",
    "DEFENSORES DE SANTOS LUGARES",
    "DEFENSORES SANTOS LUGARES",
)


def clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def norm(value):
    return clean(value).upper().replace(".", "")


def is_defe(value):
    n = norm(value)
    return any(norm(alias) in n or n in norm(alias) for alias in TEAM_ALIASES)


def _extract_date(text):
    months = {
        "enero": 1, "febrero": 2, "marzo": 3, "abril": 4,
        "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
        "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
    }
    m = re.search(r"(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚáéíóúñÑ]+)", text, re.I)
    if not m:
        return None
    month = months.get(m.group(2).lower())
    if not month:
        return None
    return f"2026-{month:02d}-{int(m.group(1)):02d}"


def _parse_fixture(html):
    soup = BeautifulSoup(html, "html.parser")
    lines = [clean(x) for x in soup.get_text("\n", strip=True).splitlines() if clean(x)]
    current_round = None
    current_date = None
    rows = []
    for i, line in enumerate(lines):
        m = re.match(r"Fecha\s+(\d+)(?:\s*-\s*(.*))?$", line, re.I)
        if m:
            current_round = f"Fecha {int(m.group(1))}"
            current_date = _extract_date(m.group(2) or "")
            continue
        if line.lower() == "vs" and current_round and 0 < i < len(lines) - 1:
            home, away = lines[i - 1], lines[i + 1]
            if is_defe(home) or is_defe(away):
                rows.append({
                    "round_name": current_round,
                    "date": current_date,
                    "home": home,
                    "away": away,
                })
    # Some FEFI pages repeat fixture blocks; keep one row per round.
    dedup = {}
    for row in rows:
        dedup[row["round_name"]] = row
    return list(dedup.values())


def sync_fefi_mayores_b(db: Session):
    try:
        response = requests.get(URL, headers=UA, timeout=30)
        response.raise_for_status()
        fixtures = _parse_fixture(response.text)
        if not fixtures:
            detail = "Mayores B +42: no se encontró a Defensores de Santos Lugares en el fixture publicado."
            db.add(SyncRun(source="FEFI_MAYORES_B", status="warning", detail=detail))
            db.commit()
            return {"ok": False, "status": "warning", "matches": 0, "detail": detail}

        saved = 0
        for row in fixtures:
            key = f"FEFI|2026|MAYORES_B_42|{row['round_name']}|{row['home']}|{row['away']}"
            match = db.query(Match).filter(Match.external_key == key).first()
            payload = dict(
                external_key=key,
                competition="FEFI",
                division=DIVISION,
                round_name=row["round_name"],
                date=row["date"],
                home=row["home"],
                away=row["away"],
                status="scheduled",
                source_url=URL,
                source_kind="fefi_mayores_b",
            )
            if not match:
                match = Match(**payload)
                db.add(match)
            else:
                for field, value in payload.items():
                    setattr(match, field, value)
            saved += 1

        db.add(SyncRun(
            source="FEFI_MAYORES_B",
            status="ok",
            detail=f"Mayores B +42: {saved} partidos de Defensores actualizados. {datetime.now(AR_TZ).isoformat()}",
        ))
        db.commit()
        return {"ok": True, "status": "ok", "matches": saved, "division": DIVISION}
    except Exception as exc:
        db.rollback()
        try:
            db.add(SyncRun(source="FEFI_MAYORES_B", status="error", detail=str(exc)))
            db.commit()
        except Exception:
            db.rollback()
        return {"ok": False, "status": "error", "matches": 0, "error": str(exc)}
