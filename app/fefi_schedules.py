from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .db import get_db
from .models import Match, FefiCategorySchedule
from .schemas import FefiScheduleIn
from .auth import require_roles
from .notifications_v5 import publish_event

router=APIRouter(prefix="/api/fefi",tags=["FEFI schedules"])
CATEGORIES=["2019","2013","2018","2014","2017","2016","2015"]
STANDARD_TIMES={
    "2019":"14:30",
    "2013":"15:15",
    "2018":"16:10",
    "2014":"16:55",
    "2017":"17:50",
    "2016":"18:45",
    "2015":"19:40",
}

@router.get("/schedules/{match_id}")
def get_schedule(match_id:int,db:Session=Depends(get_db)):
    m=db.get(Match,match_id)
    if not m or m.competition!="FEFI": raise HTTPException(status_code=404,detail="Partido FEFI inexistente")
    rows=db.query(FefiCategorySchedule).filter(FefiCategorySchedule.match_id==match_id).all()
    by={r.category:r for r in rows}
    items=[]
    for c in CATEGORIES:
        row=by.get(c)
        if row:
            items.append({"category":c,"time":row.time,"note":row.note,"source":"override"})
        else:
            items.append({"category":c,"time":STANDARD_TIMES[c],"note":"Horario base FEFI","source":"base"})
    return {"match":{"id":m.id,"date":m.date,"home":m.home,"away":m.away,"venue":m.venue,"round_name":m.round_name},"items":items}

@router.put("/schedules/{match_id}")
def put_schedule(match_id:int,payload:FefiScheduleIn,db:Session=Depends(get_db),user=Depends(require_roles("admin","delegado"))):
    m=db.get(Match,match_id)
    if not m or m.competition!="FEFI": raise HTTPException(status_code=404,detail="Partido FEFI inexistente")
    invalid=[x.category for x in payload.items if x.category not in CATEGORIES]
    if invalid: raise HTTPException(status_code=400,detail="Categoría FEFI inválida")
    changed=[]
    for x in payload.items:
        if x.time and not __import__('re').match(r'^([01]\d|2[0-3]):[0-5]\d$',x.time):
            raise HTTPException(status_code=400,detail=f"Horario inválido para {x.category}. Usar HH:MM")
        row=db.query(FefiCategorySchedule).filter(FefiCategorySchedule.match_id==match_id,FefiCategorySchedule.category==x.category).first()
        effective_before=(row.time if row else STANDARD_TIMES[x.category])
        before_note=(row.note if row else "Horario base FEFI")
        new_time=x.time or None
        new_note=x.note or None

        # Saving the unchanged base value does not need an override row.
        if not row and new_time==STANDARD_TIMES[x.category] and (not new_note or new_note=="Horario base FEFI"):
            continue

        if not row:
            row=FefiCategorySchedule(match_id=match_id,category=x.category);db.add(row)
        row.time=new_time;row.note=new_note;row.updated_by=user.id
        if effective_before!=new_time or before_note!=new_note:
            changed.append((x.category,effective_before,new_time,new_note))

    for cat,before_time,new_time,note in changed:
        body=f"{m.round_name or 'Próxima fecha'} · Cat. {cat}: {new_time or 'horario a confirmar'}"
        if new_time: body+=" hs"
        if before_time: body+=f" (antes {before_time} hs)"
        if note: body+=f" · {note}"
        publish_event(db,event_type="schedule_change",title="Cambio de horario FEFI",body=body,competition="FEFI",category=cat,match_id=m.id)
    db.commit()
    return {"ok":True,"match_id":match_id,"saved":len(payload.items),"changed":len(changed)}
