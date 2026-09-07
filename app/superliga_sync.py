import re
from datetime import datetime
from io import StringIO

import pandas as pd
import requests
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from .models import Match, Standing, SyncRun

URL = "https://www.futsalargentina.com.ar/fixture.php?cat=1_1&fixture=1294"
COMPETITION = "SUPERLIGA"
DIVISION = "Junior A"
TEAM = "Defensores Santos Lugares"
UA = {"User-Agent": "ElDefe/2.0 (+contacto club Defensores de Santos Lugares)"}


def _clean(value):
    if pd.isna(value):
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def _int(value):
    try:
        return int(float(_clean(value)))
    except Exception:
        return None


def _upsert_match(db: Session, payload: dict):
    row = db.query(Match).filter(Match.external_key == payload["external_key"]).first()
    if row is None:
        row = Match(**payload)
        db.add(row)
    else:
        for key, value in payload.items():
            setattr(row, key, value)
    db.commit()


def _upsert_standing(db: Session, payload: dict):
    row = db.query(Standing).filter(Standing.unique_key == payload["unique_key"]).first()
    if row is None:
        row = Standing(**payload)
        db.add(row)
    else:
        for key, value in payload.items():
            setattr(row, key, value)
    db.commit()


def _parse_matches(html: str):
    soup = BeautifulSoup(html, "html.parser")
    headings = soup.find_all(["h3", "h4"])
    current_round = None
    current_date = None
    rows = []

    round_re = re.compile(r"Junior\s+A\s*-\s*(\d+)°\s*Fecha\s*[–-]\s*(\d{1,2})/(\d{1,2})", re.I)
    for node in headings:
        text = _clean(node.get_text(" ", strip=True))
        m = round_re.search(text)
        if m:
            current_round = f"Fecha {m.group(1)}"
            current_date = f"2026-{int(m.group(3)):02d}-{int(m.group(2)):02d}"
            continue
        if not current_round or " - " not in text:
            continue
        home, away = [_clean(x) for x in text.split(" - ", 1)]
        if TEAM.lower() not in (home.lower(), away.lower()):
            continue
        rows.append({
            "external_key": f"SUPERLIGA|1294|{current_round}|{home}|{away}",
            "competition": COMPETITION,
            "division": DIVISION,
            "round_name": current_round,
            "date": current_date,
            "home": home,
            "away": away,
            "home_score": None,
            "away_score": None,
            "status": "scheduled",
            "venue": None,
            "source_url": URL,
            "source_kind": "sync_superliga",
        })
    return rows


def _find_col(columns, *names):
    norm = {re.sub(r"[^A-Z0-9]", "", _clean(c).upper()): c for c in columns}
    for name in names:
        key = re.sub(r"[^A-Z0-9]", "", name.upper())
        if key in norm:
            return norm[key]
    return None


def _parse_standings(html: str):
    rows = []
    for df in pd.read_html(StringIO(html)):
        cols = list(df.columns)
        pts = _find_col(cols, "PTS")
        pj = _find_col(cols, "PJ")
        pg = _find_col(cols, "PG")
        pe = _find_col(cols, "PE")
        pp = _find_col(cols, "PP")
        if pts is None or pj is None:
            continue

        team_col = None
        for c in cols:
            if c not in {pts, pj, pg, pe, pp}:
                sample = " ".join(_clean(x) for x in df[c].head(6).tolist())
                if any(ch.isalpha() for ch in sample):
                    team_col = c
                    break
        if team_col is None:
            continue

        for _, r in df.iterrows():
            team = _clean(r[team_col])
            if not team or team.lower() in {"nan", "equipo", "zona a", "a"}:
                continue
            points = _int(r[pts])
            played = _int(r[pj])
            if points is None and played is None:
                continue
            won = _int(r[pg]) if pg is not None else None
            drawn = _int(r[pe]) if pe is not None else None
            lost = _int(r[pp]) if pp is not None else None
            rows.append({
                "unique_key": f"SUPERLIGA|1294|JUNIOR_A|{team}",
                "competition": COMPETITION,
                "division": DIVISION,
                "season": 2026,
                "team": team,
                "pts": points,
                "played": played,
                "won": won,
                "drawn": drawn,
                "lost": lost,
                "gf": None,
                "gc": None,
                "gd": None,
                "source_url": URL,
            })
        if rows:
            break
    return rows


def sync_superliga(db: Session):
    try:
        response = requests.get(URL, headers=UA, timeout=25)
        response.raise_for_status()
        html = response.text

        matches = _parse_matches(html)
        standings = _parse_standings(html)
        for payload in matches:
            _upsert_match(db, payload)
        for payload in standings:
            _upsert_standing(db, payload)

        db.add(SyncRun(
            source="SUPERLIGA",
            status="ok",
            detail=f"Junior A: {len(matches)} partidos de Defe / {len(standings)} filas de tabla",
        ))
        db.commit()
        return {"ok": True, "competition": COMPETITION, "division": DIVISION, "matches": len(matches), "standings": len(standings), "source_url": URL}
    except Exception as exc:
        db.rollback()
        db.add(SyncRun(source="SUPERLIGA", status="error", detail=str(exc)))
        db.commit()
        return {"ok": False, "error": str(exc), "source_url": URL}
