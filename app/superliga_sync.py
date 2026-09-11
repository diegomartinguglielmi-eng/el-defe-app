import re
from io import StringIO
from urllib.parse import urljoin

import pandas as pd
import requests
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from .models import Match, Standing, SyncRun

BASE_URL = "https://www.futsalargentina.com.ar/fixture.php?cat=1_1"
TOURNAMENTS = {"APERTURA": 1273, "CLAUSURA": 1294}
COMPETITION = "SUPERLIGA"
DIVISION = "Junior A"
TEAM = "Defensores Santos Lugares"
UA = {"User-Agent": "ElDefe/2.2 (+contacto club Defensores de Santos Lugares)"}


def _clean(value):
    if pd.isna(value):
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def _int(value):
    try:
        return int(float(_clean(value)))
    except Exception:
        return None


def _is_defe(value):
    return _clean(value).casefold() == TEAM.casefold()


def _iso_date(value):
    text = _clean(value)
    match = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", text)
    if not match:
        match = re.search(r"(\d{1,2})/(\d{1,2})", text)
        if not match:
            return None
        day, month, year = int(match.group(1)), int(match.group(2)), 2026
    else:
        day, month, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
    return f"{year:04d}-{month:02d}-{day:02d}"


def _round_from_html(html: str):
    text = _clean(BeautifulSoup(html, "html.parser").get_text(" ", strip=True))
    match = re.search(r"Junior\s+A\s*-\s*(\d+)°\s*Fecha", text, re.I)
    return int(match.group(1)) if match else None


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


def _fixture_urls(html: str, seed_url: str):
    soup = BeautifulSoup(html, "html.parser")
    urls = {seed_url}
    for anchor in soup.find_all("a", href=True):
        href = anchor.get("href", "")
        if "fixture.php" not in href or "cat=1_1" not in href or "fixture=" not in href:
            continue
        urls.add(urljoin(BASE_URL, href))
    return sorted(urls)


def _parse_fixture_table(html: str, source_url: str, tournament: str):
    soup = BeautifulSoup(html, "html.parser")
    round_number = _round_from_html(html)
    rows = []

    for table in soup.find_all("table"):
        header_text = _clean(table.get_text(" ", strip=True)).casefold()
        if "equipo" not in header_text or "sede" not in header_text or "fecha" not in header_text:
            continue

        for tr in table.find_all("tr"):
            cells = [_clean(td.get_text(" ", strip=True)) for td in tr.find_all(["td", "th"])]
            if len(cells) < 7:
                continue
            home, home_raw, away_raw, away, venue, date_raw, time_raw = cells[:7]
            if home.casefold() == "equipo" or away.casefold() == "equipo":
                continue
            if not (_is_defe(home) or _is_defe(away)):
                continue

            date = _iso_date(date_raw)
            home_score = _int(home_raw)
            away_score = _int(away_raw)
            is_final = home_score is not None and away_score is not None
            base_round = f"Fecha {round_number}" if round_number else "Fecha"
            round_name = base_round
            if time_raw and time_raw.casefold() not in {"nan", "horario"}:
                round_name += f" · {time_raw}"

            key_round = base_round if round_number else date or "SIN_FECHA"
            rows.append({
                "external_key": f"SUPERLIGA|2026|{tournament}|{key_round}|{home}|{away}",
                "competition": COMPETITION,
                "division": DIVISION,
                "round_name": round_name,
                "date": date,
                "home": home,
                "away": away,
                "home_score": home_score if is_final else None,
                "away_score": away_score if is_final else None,
                "status": "final" if is_final else "scheduled",
                "venue": venue or None,
                "source_url": source_url,
                "source_kind": f"sync_superliga_{tournament.lower()}",
            })
    return rows


def _find_col(columns, *names):
    norm = {re.sub(r"[^A-Z0-9]", "", _clean(c).upper()): c for c in columns}
    for name in names:
        key = re.sub(r"[^A-Z0-9]", "", name.upper())
        if key in norm:
            return norm[key]
    return None


def _parse_standings(html: str, source_url: str, tournament: str):
    rows = []
    try:
        tables = pd.read_html(StringIO(html))
    except Exception:
        return rows
    for df in tables:
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
            rows.append({
                "unique_key": f"SUPERLIGA|2026|{tournament}|JUNIOR_A|{team}",
                "competition": COMPETITION,
                "division": DIVISION,
                "season": 2026,
                "team": team,
                "pts": points,
                "played": played,
                "won": _int(r[pg]) if pg is not None else None,
                "drawn": _int(r[pe]) if pe is not None else None,
                "lost": _int(r[pp]) if pp is not None else None,
                "gf": None,
                "gc": None,
                "gd": None,
                "source_url": source_url,
            })
        if rows:
            break
    return rows


def _sync_tournament(db: Session, tournament: str, fixture_id: int):
    seed_url = f"{BASE_URL}&fixture={fixture_id}"
    response = requests.get(seed_url, headers=UA, timeout=25)
    response.raise_for_status()
    html = response.text

    matches_by_key = {}
    fixture_urls = _fixture_urls(html, seed_url)
    for fixture_url in fixture_urls:
        try:
            page = requests.get(fixture_url, headers=UA, timeout=25)
            page.raise_for_status()
            for payload in _parse_fixture_table(page.text, fixture_url, tournament):
                matches_by_key[payload["external_key"]] = payload
        except Exception:
            continue

    matches = list(matches_by_key.values())
    standings = _parse_standings(html, seed_url, tournament)
    for payload in matches:
        _upsert_match(db, payload)
    for payload in standings:
        _upsert_standing(db, payload)

    finals = sum(1 for m in matches if m["status"] == "final")
    scheduled = sum(1 for m in matches if m["status"] == "scheduled")
    return {"matches":len(matches),"results":finals,"upcoming":scheduled,"standings":len(standings),"fixture_pages":len(fixture_urls),"source_url":seed_url}


def sync_superliga(db: Session):
    results={}; errors=[]
    for tournament, fixture_id in TOURNAMENTS.items():
        try:
            results[tournament.lower()]=_sync_tournament(db,tournament,fixture_id)
        except Exception as exc:
            db.rollback();errors.append(f"{tournament}: {exc}")

    if results:
        legacy_matches=db.query(Match).filter(Match.competition==COMPETITION, Match.source_kind=="sync_superliga").delete(synchronize_session=False)
        legacy_standings=db.query(Standing).filter(Standing.competition==COMPETITION, Standing.unique_key.contains("|1294|")).delete(synchronize_session=False)
        db.commit()
    else:
        legacy_matches=legacy_standings=0

    status="ok" if not errors else ("partial" if results else "error")
    detail="; ".join(f"{k}: {v['matches']} partidos / {v['standings']} tabla" for k,v in results.items())
    if errors:detail+=("; " if detail else "")+" | ".join(errors[:3])
    db.add(SyncRun(source="SUPERLIGA",status=status,detail=detail or "Sin datos"));db.commit()
    return {"ok":bool(results),"status":status,"competition":COMPETITION,"division":DIVISION,"tournaments":results,"legacy_removed":{"matches":legacy_matches,"standings":legacy_standings},"errors":errors[:5]}
