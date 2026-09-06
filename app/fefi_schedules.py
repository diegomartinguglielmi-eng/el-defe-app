from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .db import get_db
from .models import Match, FefiCategorySchedule
from .schemas import FefiScheduleIn
from .auth import require_roles

router=APIRouter(prefix="/api/fefi",tags=["FEFI schedules"])
CATEGORIES=["2019","2013","2018","2014","2017","2016","2015"]

@router.get("/schedules/{match_id}")
def get_schedule(match_id:int,db:Session=Depends(get_db)):
    m=db.get(Match,match_id)
    if not m or m.competition!="FEFI": raise HTTPException(status_code=404,detail="Partido FEFI inexistente")
    rows=db.query(FefiCategorySchedule).filter(FefiCategorySchedule.match_id==match_id).all()
    by={r.category:r for r in rows}
    return {"match":{"id":m.id,"date":m.date,"home":m.home,"away":m.away,"venue":m.venue,"round_name":m.round_name},
            "items":[{"category":c,"time":by[c].time if c in by else None,"note":by[c].note if c in by else None} for c in CATEGORIES]}

@router.put("/schedules/{match_id}")
def put_schedule(match_id:int,payload:FefiScheduleIn,db:Session=Depends(get_db),user=Depends(require_roles("admin","delegado"))):
    m=db.get(Match,match_id)
    if not m or m.competition!="FEFI": raise HTTPException(status_code=404,detail="Partido FEFI inexistente")
    invalid=[x.category for x in payload.items if x.category not in CATEGORIES]
    if invalid: raise HTTPException(status_code=400,detail="Categoría FEFI inválida")
    for x in payload.items:
        if x.time and not __import__('re').match(r'^([01]\d|2[0-3]):[0-5]\d$',x.time):
            raise HTTPException(status_code=400,detail=f"Horario inválido para {x.category}. Usar HH:MM")
        row=db.query(FefiCategorySchedule).filter(FefiCategorySchedule.match_id==match_id,FefiCategorySchedule.category==x.category).first()
        if not row:
            row=FefiCategorySchedule(match_id=match_id,category=x.category);db.add(row)
        row.time=x.time or None;row.note=x.note or None;row.updated_by=user.id
    db.commit()
    return {"ok":True,"match_id":match_id,"saved":len(payload.items)}