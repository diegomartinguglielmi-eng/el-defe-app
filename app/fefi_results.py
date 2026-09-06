from __future__ import annotations

import re
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup
from fastapi import APIRouter, Depends
from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, Session, mapped_column
from sqlalchemy.sql import func

from .db import Base, get_db
from .models import Match, SyncRun

FEFI_URL = "https://fefi.com.ar/2026-torneo-anual-baby-futbol/h/"
FEFI_CLUB = "DEF. DE SANTOS LUGARES"
FEFI_DIVISION = "Zona H"
USER_AGENT = "ElDefeApp/0.6 (+Defensores de Santos Lugares)"
CATEGORIES = ["2019", "2013", "2018", "2014", "2017", "2016", "2015"]


def _norm(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip()).upper()


def _cells(row) -> list[str]:
    return [re.sub(r"\s+", " ", c.get_text(" ", strip=True)) for c in row.find_all(["th", "td"])]


def _nearby_tournament_marker(table) -> str | None:
    for node in table.find_all_previous(["h1","h2","h3","h4","h5","h6","button","a","span","div"], limit=40):
        txt = _norm(node.get_text(" ", strip=True))
        if not txt or len(txt) > 140:
            continue
        if "CLAUSURA" in txt:
            return "CLAUSURA"
        if "APERTURA" in txt:
            return "APERTURA"
    return None


def _prefer_clausura(candidates: list) -> list:
    marked = [(t, _nearby_tournament_marker(t)) for t in candidates]
    clausura = [t for t, marker in marked if marker == "CLAUSURA"]
    if clausura:
        return clausura
    return candidates[-1:] if candidates else []


class FefiCategoryResult(Base):
    __tablename__ = "fefi_category_results"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    external_key: Mapped[str] = mapped_column(String(300), unique=True, index=True)
    round_number: Mapped[int] = mapped_column(Integer, index=True)
    category: Mapped[str] = mapped_column(String(20), index=True)
    home: Mapped[str] = mapped_column(String(200))
    away: Mapped[str] = mapped_column(String(200))
    home_value: Mapped[str | None] = mapped_column(String(30))
    away_value: Mapped[str | None] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(30), default="Publicado")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


def parse_fefi_results(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    candidates = []
    for table in soup.find_all("table"):
        text = _norm(table.get_text(" ", strip=True))
        if ("F.T." in text or "EQUIPOS" in text) and "ESTADO" in text:
            candidates.append(table)

    out: list[dict] = []
    for table in _prefer_clausura(candidates):
        rows = [_cells(tr) for tr in table.find_all("tr")]
        rows = [r for r in rows if r]
        i = 0
        while i < len(rows) - 1:
            a, b = rows[i], rows[i + 1]
            if a and re.fullmatch(r"F\d+", _norm(a[0])) and len(a) >= 11:
                rnd = int(re.sub(r"\D", "", a[0]))
                team_a = _norm(a[1])
                team_b = _norm(b[0]) if b else ""
                if FEFI_CLUB in (team_a, team_b):
                    values_a = a[2:9]
                    values_b = b[1:8]
                    status = a[-1] if len(a) >= 12 else "Publicado"
                    points_a = None
                    points_b = None
                    try: points_a = int(a[10])
                    except Exception: pass
                    try: points_b = int(b[9])
                    except Exception: pass
                    out.append({
                        "round": rnd,
                        "home": team_a,
                        "away": team_b,
                        "scores_home": values_a,
                        "scores_away": values_b,
                        "points_home": points_a,
                        "points_away": points_b,
                        "status": status or "Publicado",
                    })
                i += 2
                continue
            i += 1
    dedup = {r["round"]: r for r in out}
    return [dedup[k] for k in sorted(dedup)]


def sync_verified_results(db: Session, html: str | None = None) -> dict:
    if html is None:
        response = requests.get(FEFI_URL, timeout=30, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"})
        response.raise_for_status()
        html = response.text
    parsed = parse_fefi_results(html)
    verified = 0
    category_rows = 0
    for result in parsed:
        if _norm(result.get("status")) != "VERIFICADO":
            continue
        verified += 1
        for idx, category in enumerate(CATEGORIES):
            key = f"FEFI|2026|H|CLAUSURA|F{result['round']}|{category}"
            row = db.query(FefiCategoryResult).filter(FefiCategoryResult.external_key == key).first()
            if not row:
                row = FefiCategoryResult(external_key=key,round_number=result["round"],category=category,home=result["home"],away=result["away"])
                db.add(row)
            row.home = result["home"]
            row.away = result["away"]
            row.home_value = result["scores_home"][idx] if idx < len(result["scores_home"]) else None
            row.away_value = result["scores_away"][idx] if idx < len(result["scores_away"]) else None
            row.status = "Verificado"
            category_rows += 1

        round_name = f"Fecha {result['round']}"
        match = db.query(Match).filter(Match.competition == "FEFI",Match.division == FEFI_DIVISION,Match.round_name == round_name).order_by(Match.id.desc()).first()
        if not match:
            match = Match(external_key=f"FEFI|2026|H|CLAUSURA|{round_name}",competition="FEFI",division=FEFI_DIVISION,round_name=round_name,home=result["home"],away=result["away"],source_url=FEFI_URL,source_kind="verified_auto")
            db.add(match)
        match.home = result["home"]
        match.away = result["away"]
        match.home_score = result["points_home"]
        match.away_score = result["points_away"]
        match.status = "final"
        match.source_url = FEFI_URL
        match.source_kind = "verified_auto"

    db.add(SyncRun(source="FEFI_RESULTS", status="ok", detail=f"Clausura: {verified} resultados verificados; {category_rows} filas de categoría"))
    db.commit()
    return {"tournament":"CLAUSURA","verified_results": verified, "category_rows": category_rows}


router = APIRouter(prefix="/api/fefi", tags=["FEFI"])


@router.get("/results/{round_number}")
def category_results(round_number: int, db: Session = Depends(get_db)):
    rows = db.query(FefiCategoryResult).filter(
        FefiCategoryResult.round_number == round_number,
        FefiCategoryResult.external_key.like("%|CLAUSURA|%")
    ).order_by(FefiCategoryResult.id).all()
    return [{"round":r.round_number,"category":r.category,"home":r.home,"away":r.away,"home_value":r.home_value,"away_value":r.away_value,"status":r.status} for r in rows]
