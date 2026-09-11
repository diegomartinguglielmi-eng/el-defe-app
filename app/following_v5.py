from datetime import datetime
from zoneinfo import ZoneInfo
from urllib.parse import quote_plus

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .auth import get_current_user
from .db import get_db
from .home_v5 import _canonical
from .models import Favorite, FefiCategorySchedule, Match, Team

AR_TZ = ZoneInfo("America/Argentina/Buenos_Aires")
router = APIRouter(prefix="/api/following", tags=["Following"])
FOLLOW_TYPE = "team_category"
LEGACY_TYPES = {"category", "fefi_category"}
FEFI_BABY_DEFAULT = ["2013", "2014", "2015", "2016", "2017", "2018", "2019"]
ARGENLIGA_INFERIORES = ["3ra", "4ta", "5ta", "6ta", "7ma", "8va", "9na"]
COMPETITIONS = ["FEFI", "LAAMBA", "ARGENLIGA", "SUPERLIGA"]

class FollowingIn(BaseModel):
    selections: list[str] = []

def _clean_key(value: str) -> str | None:
    raw=(value or "").strip()
    if "|" not in raw:return None
    competition,category=raw.split("|",1);competition=competition.strip().upper();category=category.strip()
    if competition not in COMPETITIONS or not category:return None
    return f"{competition}|{category}"

def _migrate_legacy(db:Session,user_id:int)->int:
    created=0;rows=db.query(Favorite).filter(Favorite.user_id==user_id,Favorite.favorite_type.in_(LEGACY_TYPES)).all()
    for row in rows:
        category=(row.favorite_id or "").strip()
        if category in FEFI_BABY_DEFAULT:
            key=f"FEFI|{category}";exists=db.query(Favorite).filter(Favorite.user_id==user_id,Favorite.favorite_type==FOLLOW_TYPE,Favorite.favorite_id==key).first()
            if not exists:db.add(Favorite(user_id=user_id,favorite_type=FOLLOW_TYPE,favorite_id=key));created+=1
    if created:db.commit()
    return created

def _current(db:Session,user_id:int)->list[str]:
    _migrate_legacy(db,user_id);rows=db.query(Favorite).filter(Favorite.user_id==user_id,Favorite.favorite_type==FOLLOW_TYPE).order_by(Favorite.id).all();out=[]
    for row in rows:
        key=_clean_key(row.favorite_id)
        if key and key not in out:out.append(key)
    return out

def _options(db:Session)->dict[str,list[str]]:
    result={c:set() for c in COMPETITIONS};result["FEFI"].update(FEFI_BABY_DEFAULT);result["ARGENLIGA"].update(ARGENLIGA_INFERIORES)
    for (category,) in db.query(FefiCategorySchedule.category).distinct().all():
        if category:result["FEFI"].add(str(category).strip())
    for team in db.query(Team).filter(Team.is_active==True).all():
        comp=(team.competition or "").strip().upper();div=(team.division or "").strip()
        if comp in result and div and not(comp=="FEFI" and div.lower()=="zona h"):result[comp].add(div)
    for comp,div in db.query(Match.competition,Match.division).distinct().all():
        comp=(comp or "").strip().upper();div=(div or "").strip()
        if comp in result and div and not(comp=="FEFI" and div.lower()=="zona h"):result[comp].add(div)
    def sort_key(v:str):
        if v.isdigit():return (0,int(v))
        low=v.lower();order={"3ra":3,"4ta":4,"5ta":5,"6ta":6,"7ma":7,"8va":8,"9na":9,"1ra":1,"2da":2}
        return (1,order.get(low,999),low)
    return {k:sorted(v,key=sort_key) for k,v in result.items() if v}

def _date_parts(value:str|None)->tuple[str|None,str|None]:
    if not value:return None,None
    raw=str(value).strip();date=raw[:10] if len(raw)>=10 else raw;time=None
    if "T" in raw and len(raw.split("T",1)[1])>=5:time=raw.split("T",1)[1][:5]
    elif " " in raw:
        tail=raw.split(" ",1)[1]
        if len(tail)>=5 and tail[2:3]==":":time=tail[:5]
    return date,time

def _is_defe(name:str|None)->bool:
    low=(name or "").lower();return "defensores" in low or low.strip() in {"defe","def. de santos lugares","defensores de sl"}

def _maps_url(query:str|None)->str|None:
    return "https://www.google.com/maps/search/?api=1&query="+quote_plus(query) if query else None

def _event_from_match(db:Session,m:Match,competition:str,category:str)->dict:
    date,time=_date_parts(m.date);note=None
    if competition=="FEFI" and category.isdigit():
        sched=db.query(FefiCategorySchedule).filter(FefiCategorySchedule.match_id==m.id,FefiCategorySchedule.category==category).first()
        if sched:time=sched.time or time;note=sched.note
    local=_is_defe(m.home);club=m.home or None;venue=(m.venue or "").strip() or None;address=venue
    if not address and competition=="FEFI" and local:address="Ernesto Sábato 3162, Santos Lugares, Buenos Aires"
    rival=m.away if local else m.home
    return {"match_id":m.id,"competition":competition,"category":category,"selection":f"{competition}|{category}","date":date,"time":time,"rival":rival,"home":m.home,"away":m.away,"local":local,"club":club,"venue":venue,"address":address,"maps_url":_maps_url(address or venue or club),"round_name":m.round_name,"status":m.status,"note":note,"source_url":m.source_url}

def _events_for_selection(db:Session,selection:str,today:str)->list[dict]:
    competition,category=selection.split("|",1);rows=_canonical(db.query(Match).filter(Match.competition==competition).all());candidates=[]
    for m in rows:
        date,_=_date_parts(m.date)
        if not date or date<today or (m.status or "").lower()=="final" or (m.home_score is not None and m.away_score is not None):continue
        if competition=="FEFI" and category.isdigit():
            if (m.division or "").lower() not in {"zona h","h"}:continue
        elif (m.division or "").strip().lower()!=category.strip().lower():continue
        candidates.append(_event_from_match(db,m,competition,category))
    candidates.sort(key=lambda x:((x["date"] or "9999-99-99"),(x["time"] or "99:99"),x["match_id"]));return candidates

@router.get("/options")
def following_options(db:Session=Depends(get_db)):
    grouped=_options(db);return {"competitions":[{"competition":comp,"categories":grouped.get(comp,[])} for comp in COMPETITIONS if grouped.get(comp)]}

@router.get("/me")
def get_following(db:Session=Depends(get_db),user=Depends(get_current_user)):
    selections=_current(db,user.id);return {"selections":selections,"count":len(selections)}

@router.put("/me")
def set_following(payload:FollowingIn,db:Session=Depends(get_db),user=Depends(get_current_user)):
    clean=[]
    for value in payload.selections:
        key=_clean_key(value)
        if key and key not in clean:clean.append(key)
    db.query(Favorite).filter(Favorite.user_id==user.id,Favorite.favorite_type==FOLLOW_TYPE).delete(synchronize_session=False)
    for key in clean:db.add(Favorite(user_id=user.id,favorite_type=FOLLOW_TYPE,favorite_id=key))
    db.commit();return {"ok":True,"selections":clean,"count":len(clean)}

@router.get("/next")
def next_followed(limit:int=10,db:Session=Depends(get_db),user=Depends(get_current_user)):
    limit=max(1,min(limit,30));selections=_current(db,user.id);today=datetime.now(AR_TZ).date().isoformat();events=[]
    for selection in selections:events.extend(_events_for_selection(db,selection,today))
    first_by_selection={}
    for event in events:first_by_selection.setdefault(event["selection"],event)
    ordered=sorted(first_by_selection.values(),key=lambda x:((x["date"] or "9999-99-99"),(x["time"] or "99:99"),x["competition"],x["category"]))
    return {"today":today,"selections":selections,"events":ordered[:limit]}
