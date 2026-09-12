import re
from io import StringIO
from urllib.parse import urljoin

import pandas as pd
import requests
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from .models import Match, Standing, SyncRun

FIXTURE_URL = "https://www.futsalargentina.com.ar/fixture.php?cat=1_1"
POSITIONS_URL = "https://www.futsalargentina.com.ar/posiciones.php?cat=1_1"
COMPETITION = "SUPERLIGA"
DIVISION = "Junior A"
TEAM = "Defensores Santos Lugares"
SEASON = 2026
SCOPE = "CURRENT"
UA = {"User-Agent": "Mozilla/5.0 ElDefe/2.4 (+club Defensores de Santos Lugares)"}


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


def _has_letters(value):
    return bool(re.search(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]", _clean(value)))


def _iso_date(value):
    text = _clean(value)
    match = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", text)
    if not match:
        match = re.search(r"(\d{1,2})/(\d{1,2})", text)
        if not match:
            return None
        day, month, year = int(match.group(1)), int(match.group(2)), SEASON
    else:
        day, month, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
    return f"{year:04d}-{month:02d}-{day:02d}"


def _round_label(html: str):
    text = _clean(BeautifulSoup(html, "html.parser").get_text(" ", strip=True))
    match = re.search(r"Junior\s+A\s*-\s*([^|]+?)(?=\s+(?:Platense|Atlanta|All Boys|Defensores|Villa|Ferro|Ituzaingo|El Talar|Pasaje|Deportivo|Cultural|Hebraica|Club Mitre)|$)", text, re.I)
    if match:
        label = _clean(match.group(1))
        if len(label) <= 40:
            return label
    match = re.search(r"Junior\s+A\s*-\s*(\d+)°\s*Fecha\s*[–-]\s*\d{1,2}/\d{1,2}", text, re.I)
    if match:
        return f"{match.group(1)}° Fecha"
    return "Fecha"


def _fixture_urls(html: str, seed_url: str):
    soup = BeautifulSoup(html, "html.parser")
    urls = {seed_url}
    for anchor in soup.find_all("a", href=True):
        href = anchor.get("href", "")
        if "fixture.php" not in href or "cat=1_1" not in href:
            continue
        if "fixture=" not in href:
            continue
        urls.add(urljoin(seed_url, href))
    return sorted(urls)


def _parse_fixture_table(html: str, source_url: str):
    soup = BeautifulSoup(html, "html.parser")
    round_label = _round_label(html)
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
            if not (_has_letters(home) and _has_letters(away)):
                continue

            date = _iso_date(date_raw)
            home_score = _int(home_raw)
            away_score = _int(away_raw)
            is_final = home_score is not None and away_score is not None
            round_name = round_label
            if time_raw and time_raw.casefold() not in {"nan", "horario"}:
                round_name += f" · {time_raw}"
            key_round = f"{date or 'SIN_FECHA'}|{round_label}"
            rows.append({
                "external_key": f"SUPERLIGA|{SEASON}|{SCOPE}|{key_round}|{home}|{away}",
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
                "source_kind": "sync_superliga_current",
            })
    return rows


def _find_col(columns, *names):
    norm = {re.sub(r"[^A-Z0-9]", "", _clean(c).upper()): c for c in columns}
    for name in names:
        key = re.sub(r"[^A-Z0-9]", "", name.upper())
        if key in norm:
            return norm[key]
    return None


def _parse_standings(html: str, source_url: str):
    try:
        all_tables = pd.read_html(StringIO(html))
    except Exception:
        return []

    for df in all_tables:
        cols = list(df.columns)
        pts = _find_col(cols, "PTS")
        pj = _find_col(cols, "PJ")
        pg = _find_col(cols, "PG")
        pe = _find_col(cols, "PE")
        pp = _find_col(cols, "PP")
        gf = _find_col(cols, "GF")
        gc = _find_col(cols, "GC")
        gd = _find_col(cols, "DG", "GD")
        if pts is None or pj is None:
            continue

        team_col = None
        for c in cols:
            values = [_clean(x) for x in df[c].tolist()]
            if any(_is_defe(x) for x in values):
                team_col = c
                break
        if team_col is None:
            continue

        rows = []
        for _, r in df.iterrows():
            team = _clean(r[team_col])
            if not team or not _has_letters(team):
                continue
            points = _int(r[pts])
            played = _int(r[pj])
            if points is None or played is None:
                continue
            rows.append({
                "unique_key": f"SUPERLIGA|{SEASON}|{SCOPE}|JUNIOR_A|{team}",
                "competition": COMPETITION,
                "division": DIVISION,
                "season": SEASON,
                "team": team,
                "pts": points,
                "played": played,
                "won": _int(r[pg]) if pg is not None else None,
                "drawn": _int(r[pe]) if pe is not None else None,
                "lost": _int(r[pp]) if pp is not None else None,
                "gf": _int(r[gf]) if gf is not None else None,
                "gc": _int(r[gc]) if gc is not None else None,
                "gd": _int(r[gd]) if gd is not None else None,
                "source_url": source_url,
            })
        if rows and any(_is_defe(x["team"]) for x in rows):
            return rows
    return []


def _fetch(url: str):
    response = requests.get(url, headers=UA, timeout=25)
    response.raise_for_status()
    return response.text


def _collect_live_data():
    fixture_html = _fetch(FIXTURE_URL)
    positions_html = _fetch(POSITIONS_URL)

    matches_by_key = {}
    fixture_urls = _fixture_urls(fixture_html, FIXTURE_URL)
    for fixture_url in fixture_urls:
        try:
            page_html = fixture_html if fixture_url == FIXTURE_URL else _fetch(fixture_url)
            for payload in _parse_fixture_table(page_html, fixture_url):
                matches_by_key[payload["external_key"]] = payload
        except Exception:
            continue

    matches = sorted(matches_by_key.values(), key=lambda x: (x.get("date") or "", x["external_key"]))
    standings = _parse_standings(positions_html, POSITIONS_URL)

    if not standings or not any(_is_defe(x["team"]) for x in standings):
        raise ValueError("La tabla oficial de SuperLiga no pudo validarse")
    if any(not _has_letters(x["team"]) for x in standings):
        raise ValueError("La tabla de SuperLiga contiene nombres de equipo inválidos")
    if not matches:
        raise ValueError("No se encontraron partidos de Defensores en el fixture oficial")
    if any(not (_is_defe(x["home"]) or _is_defe(x["away"])) for x in matches):
        raise ValueError("El fixture contiene partidos ajenos a Defensores")

    return matches, standings, fixture_urls


def sync_superliga(db: Session):
    try:
        matches, standings, fixture_urls = _collect_live_data()

        removed_matches = db.query(Match).filter(Match.competition == COMPETITION).delete(synchronize_session=False)
        removed_standings = db.query(Standing).filter(Standing.competition == COMPETITION).delete(synchronize_session=False)

        for payload in matches:
            db.add(Match(**payload))
        for payload in standings:
            db.add(Standing(**payload))
        db.commit()

        finals = sum(1 for m in matches if m["status"] == "final")
        scheduled = sum(1 for m in matches if m["status"] == "scheduled")
        defe_row = next((x for x in standings if _is_defe(x["team"])), None)
        detail = (
            f"current: {len(matches)} partidos ({finals} resultados / {scheduled} próximos), "
            f"{len(standings)} equipos; Defe {defe_row['pts']} pts / {defe_row['played']} PJ"
        )
        db.add(SyncRun(source="SUPERLIGA", status="ok", detail=detail))
        db.commit()
        return {
            "ok": True,
            "status": "ok",
            "competition": COMPETITION,
            "division": DIVISION,
            "scope": "current",
            "matches": len(matches),
            "results": finals,
            "upcoming": scheduled,
            "standings": len(standings),
            "fixture_pages": len(fixture_urls),
            "defe": defe_row,
            "source_urls": {"fixture": FIXTURE_URL, "positions": POSITIONS_URL},
            "replaced": {"matches": removed_matches, "standings": removed_standings},
            "errors": [],
        }
    except Exception as exc:
        db.rollback()
        db.add(SyncRun(source="SUPERLIGA", status="error", detail=str(exc)[:500]))
        db.commit()
        return {
            "ok": False,
            "status": "error",
            "competition": COMPETITION,
            "division": DIVISION,
            "errors": [str(exc)],
        }
