from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .auth import get_current_user
from .db import get_db
from .models import Standing
from .following_v5 import _recent_for_selection, _category_matches

router = APIRouter(prefix="/api/laamba", tags=["LAAMBA V2"])

@router.get("/family/summary/{category}")
def family_summary(category: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    category=(category or "").strip()
    if not category:
        raise HTTPException(400, "División obligatoria")
    rows=db.query(Standing).filter(Standing.competition=="LAAMBA", Standing.season==2026).all()
    rows=[r for r in rows if _category_matches("LAAMBA",category,r.division)]
    # Prefer Clausura when both periods exist; otherwise return the available table.
    clausura=[r for r in rows if "|CLAUSURA|" in (r.unique_key or "")]
    apertura=[r for r in rows if "|APERTURA|" in (r.unique_key or "")]
    chosen=clausura or apertura or rows
    chosen=sorted(chosen,key=lambda r:(-(r.pts or 0),-(r.gd or 0),-(r.gf or 0),r.team or ""))
    table=[{"position":i+1,"team":r.team,"pts":r.pts,"played":r.played,"won":r.won,"drawn":r.drawn,"lost":r.lost,"gf":r.gf,"gc":r.gc,"gd":r.gd,"source_url":r.source_url} for i,r in enumerate(chosen)]
    club=next((x for x in table if "defensores" in (x["team"] or "").lower()),None)
    recent=_recent_for_selection(db,f"LAAMBA|{category}")
    period="CLAUSURA" if clausura else ("APERTURA" if apertura else None)
    return {"competition":"LAAMBA","category":category,"season":2026,"period":period,"club":club,"table":table,"recent":recent}
