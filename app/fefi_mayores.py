import re
from datetime import datetime
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from .models import Match, Standing, SyncRun

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


def compact(value):
    return re.sub(r"[^A-Z0-9]", "", norm(value))


def is_defe(value):
    n = norm(value)
    return any(norm(alias) in n or n in norm(alias) for alias in TEAM_ALIASES)


def _as_int(value):
    try:
        return int(float(clean(value)))
    except Exception:
        return None


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


def _table_rows(table):
    rows = []
    for tr in table.find_all("tr"):
        cells = [clean(x.get_text(" ", strip=True)) for x in tr.find_all(["th", "td"])]
        if cells:
            rows.append(cells)
    return rows


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
                rows.append({"round_name": current_round, "date": current_date, "home": home, "away": away})
    dedup = {}
    for row in rows:
        dedup[row["round_name"]] = row
    return list(dedup.values())


def _result_tables(html):
    """FEFI result tables vary between F.T./FT and P.J./PJ headings. Detect by semantic columns."""
    soup = BeautifulSoup(html, "html.parser")
    tables = []
    for table in soup.find_all("table"):
        rows = _table_rows(table)
        if not rows:
            continue
        header = [compact(x) for x in rows[0]]
        if "EQUIPOS" in header and "GL" in header and ("FT" in header or any(x.startswith("FT") for x in header)):
            tables.append(rows)
    return tables


def _parse_clausura_results(html):
    tables = _result_tables(html)
    if len(tables) < 2:
        return []
    rows = tables[1]
    header = [compact(x) for x in rows[0]]

    def idx(token):
        for i, value in enumerate(header):
            if value == token or value.startswith(token):
                return i
        return None

    ft_i, team_i, gl_i, status_i = idx("FT"), idx("EQUIPOS"), idx("GL"), idx("ESTADO")
    if ft_i is None or team_i is None or gl_i is None:
        return []

    out = []
    i = 1
    while i < len(rows) - 1:
        a, b = rows[i], rows[i + 1]
        ft = a[ft_i] if ft_i < len(a) else ""
        ft_norm = compact(ft)
        if re.fullmatch(r"F\d+", ft_norm):
            home = a[team_i] if team_i < len(a) else ""
            away = b[team_i] if team_i < len(b) else ""
            if is_defe(home) or is_defe(away):
                hv = a[gl_i] if gl_i < len(a) else ""
                av = b[gl_i] if gl_i < len(b) else ""
                status = a[status_i] if status_i is not None and status_i < len(a) else ""
                out.append({
                    "round_name": f"Fecha {int(re.sub(r'\D', '', ft_norm))}",
                    "home": home, "away": away,
                    "home_raw": hv, "away_raw": av,
                    "home_score": _as_int(hv), "away_score": _as_int(av),
                    "source_status": status,
                })
            i += 2
            continue
        i += 1
    return out


def _standing_tables(html):
    soup = BeautifulSoup(html, "html.parser")
    tables = []
    for table in soup.find_all("table"):
        rows = _table_rows(table)
        if not rows:
            continue
        header = [compact(x) for x in rows[0]]
        if len(header) == 6 and "EQUIPOS" in header and "PJ" in header and "PTS" in header:
            tables.append(rows)
    return tables


def _parse_clausura_standings(html):
    tables = _standing_tables(html)
    if len(tables) < 2:
        return []
    rows = tables[1]
    out = []
    for row in rows[1:]:
        if len(row) < 6:
            continue
        team = clean(row[0])
        if not team or norm(team) in {"EQUIPO", "EQUIPOS", "GENERAL"}:
            continue
        played, won, drawn, lost, pts = [_as_int(x) for x in row[1:6]]
        if played is None and pts is None:
            continue
        out.append({"team": team, "played": played, "won": won, "drawn": drawn, "lost": lost, "pts": pts})
    return out


def _upsert_standing(db: Session, row):
    key = f"FEFI|2026|MAYORES_B_42|CLAUSURA|{row['team']}"
    obj = db.query(Standing).filter(Standing.unique_key == key).first()
    payload = dict(unique_key=key, competition="FEFI", division=DIVISION, season=2026,
                   team=row["team"], pts=row["pts"], played=row["played"], won=row["won"],
                   drawn=row["drawn"], lost=row["lost"], gf=None, gc=None, gd=None, source_url=URL)
    if obj is None:
        db.add(Standing(**payload))
    else:
        for field, value in payload.items(): setattr(obj, field, value)


def sync_fefi_mayores_b(db: Session):
    try:
        response = requests.get(URL, headers=UA, timeout=30); response.raise_for_status(); html = response.text
        fixtures = _parse_fixture(html)
        if not fixtures:
            detail = "Mayores B +42: no se encontró a Defensores de Santos Lugares en el fixture publicado."
            db.add(SyncRun(source="FEFI_MAYORES_B", status="warning", detail=detail)); db.commit()
            return {"ok": False, "status": "warning", "matches": 0, "detail": detail}

        saved = 0
        for row in fixtures:
            key = f"FEFI|2026|MAYORES_B_42|{row['round_name']}|{row['home']}|{row['away']}"
            match = db.query(Match).filter(Match.external_key == key).first()
            payload = dict(external_key=key, competition="FEFI", division=DIVISION, round_name=row["round_name"],
                           date=row["date"], home=row["home"], away=row["away"], status="scheduled",
                           source_url=URL, source_kind="fefi_mayores_b")
            if not match: match = Match(**payload); db.add(match)
            else:
                # Do not erase a final result on the next fixture refresh.
                old_final = match.status == "final" and match.home_score is not None and match.away_score is not None
                for field, value in payload.items():
                    if old_final and field in {"status", "source_kind"}: continue
                    setattr(match, field, value)
            saved += 1

        results = _parse_clausura_results(html); finals = 0; unresolved_results = 0
        for result in results:
            match = db.query(Match).filter(Match.competition == "FEFI", Match.division == DIVISION,
                                           Match.round_name == result["round_name"]).order_by(Match.id.desc()).first()
            if not match: continue
            match.home, match.away = result["home"], result["away"]
            if result["home_score"] is not None and result["away_score"] is not None:
                match.home_score, match.away_score = result["home_score"], result["away_score"]
                match.status, match.source_kind = "final", "fefi_mayores_b_result"; finals += 1
            elif clean(result["home_raw"]) or clean(result["away_raw"]): unresolved_results += 1

        standings = _parse_clausura_standings(html)
        standings_valid = bool(standings) and any(is_defe(x["team"]) for x in standings)
        standing_rows = 0
        if standings_valid:
            for row in standings: _upsert_standing(db, row); standing_rows += 1

        result_table_count = len(_result_tables(html))
        status = "ok"; notes = []
        if result_table_count < 2: notes.append(f"resultados Clausura no identificados con seguridad (tablas={result_table_count})")
        if not standings_valid: notes.append("tabla Clausura no identificada con Defensores")
        if notes: status = "partial"
        detail = (f"Mayores B +42: {saved} fixture; {finals} resultados Clausura numéricos; "
                  f"{unresolved_results} resultados no numéricos; {standing_rows} filas tabla Clausura; "
                  f"tablas_resultados={result_table_count}. {'; '.join(notes) if notes else 'Fuente validada por estructura.'} "
                  f"{datetime.now(AR_TZ).isoformat()}")
        db.add(SyncRun(source="FEFI_MAYORES_B", status=status, detail=detail)); db.commit()
        return {"ok": True, "status": status, "matches": saved, "results": finals,
                "unresolved_results": unresolved_results, "standings": standing_rows,
                "result_tables": result_table_count, "division": DIVISION}
    except Exception as exc:
        db.rollback()
        try: db.add(SyncRun(source="FEFI_MAYORES_B", status="error", detail=str(exc))); db.commit()
        except Exception: db.rollback()
        return {"ok": False, "status": "error", "matches": 0, "error": str(exc)}
