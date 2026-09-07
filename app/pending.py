from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from typing import Any

import requests
from bs4 import BeautifulSoup
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, Session, mapped_column
from sqlalchemy.sql import func

from .auth import require_roles
from .db import Base, SessionLocal, get_db
from .models import Match, SyncRun

FEFI_URL = "https://fefi.com.ar/2026-torneo-anual-baby-futbol/h/"
FEFI_CLUB = "DEF. DE SANTOS LUGARES"
FEFI_DIVISION = "Zona H"
USER_AGENT = "ElDefeApp/0.6 (+Defensores de Santos Lugares)"
MONTHS = {"enero":1,"febrero":2,"marzo":3,"abril":4,"mayo":5,"junio":6,"julio":7,"agosto":8,"septiembre":9,"octubre":10,"noviembre":11,"diciembre":12}

class FefiPendingChange(Base):
    __tablename__ = "fefi_pending_changes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    external_key: Mapped[str] = mapped_column(String(300), unique=True, index=True)
    change_type: Mapped[str] = mapped_column(String(50), index=True)
    detail: Mapped[str] = mapped_column(Text)
    before_json: Mapped[str | None] = mapped_column(Text)
    after_json: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="pending", index=True)
    source_url: Mapped[str] = mapped_column(Text, default=FEFI_URL)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

class FefiRawSnapshot(Base):
    __tablename__ = "fefi_raw_snapshots"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sha256: Mapped[str] = mapped_column(String(64), index=True)
    html: Mapped[str] = mapped_column(Text)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

def _norm(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip()).upper()

def _cells(row) -> list[str]:
    return [re.sub(r"\s+", " ", c.get_text(" ", strip=True)) for c in row.find_all(["th", "td"])]

def _round_date(label: str) -> tuple[int | None, str | None]:
    m = re.search(r"Fecha\s+(\d+)\s*-\s*(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚáéíóúÑñ]+)", label, re.I)
    if not m: return None, None
    month = MONTHS.get(m.group(3).lower())
    return int(m.group(1)), f"2026-{month:02d}-{int(m.group(2)):02d}" if month else None

def _nearby_tournament_marker(table) -> str | None:
    for node in table.find_all_previous(["h1","h2","h3","h4","h5","h6","button","a","span","div"], limit=40):
        txt = _norm(node.get_text(" ", strip=True))
        if not txt or len(txt) > 140: continue
        if "CLAUSURA" in txt: return "CLAUSURA"
        if "APERTURA" in txt: return "APERTURA"
    return None

def _prefer_clausura(candidates: list) -> list:
    marked = [(t, _nearby_tournament_marker(t)) for t in candidates]
    clausura = [t for t, marker in marked if marker == "CLAUSURA"]
    return clausura if clausura else (candidates[-1:] if candidates else [])

def parse_fefi(html: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")
    venues: dict[str, dict[str, str]] = {}; fixtures: list[dict[str, Any]] = []
    tables = soup.find_all("table")
    for table in tables:
        text = _norm(table.get_text(" ", strip=True))
        if "DIRECCIÓN" in text or "DIRECCION" in text:
            for row in table.find_all("tr"):
                cs = _cells(row)
                if len(cs) >= 3 and _norm(cs[0]) not in {"CLUB","EQUIPO","NOMBRE"}:
                    name = _norm(cs[0])
                    if name: venues[name] = {"name":name,"address":cs[1].strip(),"locality":cs[2].strip()}
    fixture_candidates=[]
    for table in tables:
        text=_norm(table.get_text(" ",strip=True))
        if "LOCAL" in text and "VISITANTE" in text and " VS " in f" {text} ": fixture_candidates.append(table)
    for table in _prefer_clausura(fixture_candidates):
        current_round=current_date=None
        for row in table.find_all("tr"):
            cs=_cells(row)
            if not cs: continue
            joined=" ".join(cs)
            if re.search(r"Fecha\s+\d+\s*-",joined,re.I): current_round,current_date=_round_date(joined); continue
            if current_round and len(cs)>=3 and _norm(cs[1])=="VS":
                home,away=_norm(cs[0]),_norm(cs[2])
                if FEFI_CLUB in (home,away):
                    venue=venues.get(home)
                    fixtures.append({"round":current_round,"round_name":f"Fecha {current_round}","date":current_date,"home":home,"away":away,"venue":None if not venue else f"{venue['name']} · {venue['address']} · {venue['locality']}"})
    unique={item["round"]:item for item in fixtures}
    return {"fixtures":[unique[k] for k in sorted(unique)],"venues":venues,"tournament":"CLAUSURA"}

def _match_payload(match: Match | None):
    if not match:return None
    return {"round_name":match.round_name,"date":match.date,"home":match.home,"away":match.away,"venue":match.venue,"status":match.status}

def _same(a,b):
    if not a:return False
    return all((a.get(k) or None)==(b.get(k) or None) for k in ("round_name","date","home","away","venue"))

def _pending_key(round_number:int,payload:dict[str,Any])->str:
    digest=hashlib.sha1(json.dumps(payload,sort_keys=True,ensure_ascii=False).encode()).hexdigest()[:12]
    return f"FEFI|2026|H|CLAUSURA|F{round_number}|{digest}"

def run_fefi_pending_sync(db:Session|None=None):
    own_db=db is None
    if own_db:db=SessionLocal()
    assert db is not None
    try:
        response=requests.get(FEFI_URL,timeout=30,headers={"User-Agent":USER_AGENT,"Accept":"text/html,application/xhtml+xml"});response.raise_for_status();html=response.text
        sha=hashlib.sha256(html.encode()).hexdigest();db.add(FefiRawSnapshot(sha256=sha,html=html));db.commit()
        parsed=parse_fefi(html);created=unchanged=0
        for item in parsed["fixtures"]:
            current=db.query(Match).filter(Match.competition=="FEFI",Match.division==FEFI_DIVISION,Match.round_name==item["round_name"]).order_by(Match.id.desc()).first()
            before=_match_payload(current);proposed={"round_name":item["round_name"],"date":item["date"],"home":item["home"],"away":item["away"],"venue":item["venue"],"status":"scheduled"}
            if _same(before,proposed):unchanged+=1;continue
            key=_pending_key(item["round"],proposed)
            if db.query(FefiPendingChange).filter(FefiPendingChange.external_key==key).first():continue
            older=db.query(FefiPendingChange).filter(FefiPendingChange.status=="pending",FefiPendingChange.detail.like(f"Fecha {item['round']}:%")).all()
            for row in older:row.status="superseded";row.resolved_at=datetime.now(timezone.utc)
            detail=f"Fecha {item['round']}: {item['home']} vs {item['away']} · {item['date'] or 'fecha s/d'}"
            db.add(FefiPendingChange(external_key=key,change_type="fixture",detail=detail,before_json=json.dumps(before,ensure_ascii=False) if before else None,after_json=json.dumps(proposed,ensure_ascii=False),status="pending"));created+=1
        db.add(SyncRun(source="FEFI_PENDING",status="ok",detail=f"Clausura: {created} cambios nuevos; {unchanged} sin cambios"));db.commit()
        return {"ok":True,"tournament":"CLAUSURA","fixtures":len(parsed["fixtures"]),"changes_created":created,"unchanged":unchanged,"snapshot_sha256":sha}
    except Exception as exc:
        db.rollback()
        try:db.add(SyncRun(source="FEFI_PENDING",status="error",detail=str(exc)[:1000]));db.commit()
        except Exception:db.rollback()
        return {"ok":False,"error":str(exc)}
    finally:
        if own_db:db.close()

def _apply_change(db:Session,change:FefiPendingChange):
    payload=json.loads(change.after_json)
    match=db.query(Match).filter(Match.competition=="FEFI",Match.division==FEFI_DIVISION,Match.round_name==payload["round_name"]).order_by(Match.id.desc()).first()
    round_match=re.search(r"(\d+)",payload["round_name"] or "")
    round_number=round_match.group(1) if round_match else payload["round_name"].replace(" ","")
    clausura_key=f"FEFI|2026|H|CLAUSURA|F{round_number}"
    if not match:
        match=Match(external_key=clausura_key,competition="FEFI",division=FEFI_DIVISION,source_url=FEFI_URL,source_kind="approved_sync",home=payload["home"],away=payload["away"]);db.add(match)
    else:
        # Existing legacy rows become the canonical Clausura row instead of remaining anonymous sync data.
        match.external_key=clausura_key
    for field in ("round_name","date","home","away","venue","status"):setattr(match,field,payload.get(field))
    match.source_url=FEFI_URL;match.source_kind="approved_sync"
    return match

router=APIRouter(prefix="/api/fefi",tags=["FEFI"])
@router.get("/pending")
def pending_changes(db:Session=Depends(get_db),user=Depends(require_roles("admin","delegado"))):
    rows=db.query(FefiPendingChange).filter(FefiPendingChange.status=="pending").order_by(FefiPendingChange.detected_at.desc()).all();return [{"id":r.id,"type":r.change_type,"detail":r.detail,"before":json.loads(r.before_json) if r.before_json else None,"after":json.loads(r.after_json),"status":r.status,"detected_at":r.detected_at} for r in rows]
@router.get("/status")
def fefi_status(db:Session=Depends(get_db),user=Depends(require_roles("admin","delegado"))):
    latest=db.query(SyncRun).filter(SyncRun.source=="FEFI_PENDING").order_by(SyncRun.id.desc()).first();pending=db.query(FefiPendingChange).filter(FefiPendingChange.status=="pending").count();return {"source":"FEFI 2026 · Zona H · Clausura","pending":pending,"last_run":None if not latest else {"status":latest.status,"detail":latest.detail,"created_at":latest.created_at},"schedule":"cada 4 horas"}
@router.post("/run")
def run_now(db:Session=Depends(get_db),user=Depends(require_roles("admin"))):return run_fefi_pending_sync(db)
@router.post("/pending/{change_id}/approve")
def approve_change(change_id:int,db:Session=Depends(get_db),user=Depends(require_roles("admin","delegado"))):
    change=db.get(FefiPendingChange,change_id)
    if not change or change.status!="pending":raise HTTPException(status_code=404,detail="Cambio pendiente inexistente")
    match=_apply_change(db,change);change.status="approved";change.resolved_at=datetime.now(timezone.utc);db.commit();db.refresh(match);return {"ok":True,"match_id":match.id}
@router.post("/pending/{change_id}/reject")
def reject_change(change_id:int,db:Session=Depends(get_db),user=Depends(require_roles("admin","delegado"))):
    change=db.get(FefiPendingChange,change_id)
    if not change or change.status!="pending":raise HTTPException(status_code=404,detail="Cambio pendiente inexistente")
    change.status="rejected";change.resolved_at=datetime.now(timezone.utc);db.commit();return {"ok":True}
