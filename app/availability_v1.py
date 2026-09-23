from datetime import datetime, date
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, Session
from sqlalchemy.sql import func

from .auth import get_current_user, require_roles
from .db import Base, get_db
from .models import Favorite, User, Person, Team, TeamMember, CallUp, CallUpPlayer, Match, FefiCategorySchedule
from .following_v5 import _current, _events_for_selection, FOLLOW_TYPE
from .sync import sync_fefi

AR_TZ = ZoneInfo("America/Argentina/Buenos_Aires")
router = APIRouter(prefix="/api/availability", tags=["Availability"])

class AvailabilityResponse(Base):
    __tablename__ = "availability_responses"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    match_id: Mapped[int] = mapped_column(Integer, index=True)
    selection: Mapped[str] = mapped_column(String(180), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    note: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    __table_args__ = (UniqueConstraint("user_id", "match_id", "selection", name="uq_availability_user_match_selection"),)

class UserPlayerLink(Base):
    __tablename__ = "user_player_links"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id"), index=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (UniqueConstraint("user_id", "person_id", name="uq_user_player_link"),)

class UserPlayerRequest(Base):
    __tablename__ = "user_player_requests"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (UniqueConstraint("user_id", "person_id", name="uq_user_player_request"),)

class AvailabilityIn(BaseModel):
    selection: str
    status: str
    note: str | None = None
class UserPlayerLinkIn(BaseModel):
    user_id: int
    person_id: int
class PlayerRequestIn(BaseModel):
    person_id: int
class FamilyChildIn(BaseModel):
    first_name: str
    last_name: str
    competition: str
    category: str
    birth_date: str | None = None
class FamilyTeamIn(BaseModel):
    competition: str
    category: str

def _today(): return datetime.now(AR_TZ).date().isoformat()
def _next_event(db, selection):
    found=_events_for_selection(db,selection,_today()); return found[0] if found else None
def _serialize(event,response=None):
    if not event:return None
    return {**event,"response":response.status if response else None,"response_note":response.note if response else None,"response_updated_at":response.updated_at if response else None}
def _player_teams(db, person_id):
    rows=db.query(TeamMember,Team).join(Team,Team.id==TeamMember.team_id).filter(TeamMember.person_id==person_id,Team.is_active==True).order_by(Team.competition,Team.division).all()
    return [{"team_id":t.id,"competition":t.competition,"category":t.division,"season":t.season} for _,t in rows]
def _player(db,p):
    return {"person_id":p.id,"name":f"{p.first_name} {p.last_name}".strip(),"first_name":p.first_name,"last_name":p.last_name,"birth_year":p.birth_year,"birth_date":p.birth_date.isoformat() if p.birth_date else None,"teams":_player_teams(db,p.id)}
def _linked_players(db,user_id):
    rows=db.query(UserPlayerLink,Person).join(Person,Person.id==UserPlayerLink.person_id).filter(UserPlayerLink.user_id==user_id,Person.is_active==True).order_by(Person.last_name,Person.first_name).all()
    return [_player(db,p) for _,p in rows]
def _ensure_team_favorites(db,user_id,person_id):
    for team in _player_teams(db,person_id):
        selection=f"{team['competition']}|{team['category']}"
        exists=db.query(Favorite).filter(Favorite.user_id==user_id,Favorite.favorite_type==FOLLOW_TYPE,Favorite.favorite_id==selection).first()
        if not exists: db.add(Favorite(user_id=user_id,favorite_type=FOLLOW_TYPE,favorite_id=selection))
def _team_for(db,competition,category):
    competition=(competition or '').strip(); category=(category or '').strip()
    if not competition or not category: raise HTTPException(400,"Liga y categoría son obligatorias")
    team=db.query(Team).filter(Team.competition==competition,Team.division==category,Team.is_active==True).order_by(Team.season.desc()).first()
    if not team:
        team=Team(competition=competition,division=category,season=2026,is_active=True);db.add(team);db.flush()
    return team
def _assert_family_child(db,user_id,person_id):
    link=db.query(UserPlayerLink).filter(UserPlayerLink.user_id==user_id,UserPlayerLink.person_id==person_id).first()
    if not link: raise HTTPException(404,"Hijo no vinculado a esta familia")
    p=db.get(Person,person_id)
    if not p or not p.is_active: raise HTTPException(404,"Hijo inexistente")
    return p
def _add_team(db,user_id,person_id,competition,category):
    team=_team_for(db,competition,category)
    member=db.query(TeamMember).filter(TeamMember.team_id==team.id,TeamMember.person_id==person_id,TeamMember.season==team.season).first()
    if not member: db.add(TeamMember(team_id=team.id,person_id=person_id,season=team.season,member_role="player"))
    selection=f"{team.competition}|{team.division}"
    fav=db.query(Favorite).filter(Favorite.user_id==user_id,Favorite.favorite_type==FOLLOW_TYPE,Favorite.favorite_id==selection).first()
    if not fav: db.add(Favorite(user_id=user_id,favorite_type=FOLLOW_TYPE,favorite_id=selection))
    return team

def _approve(db,user_id,person_id):
    link=db.query(UserPlayerLink).filter(UserPlayerLink.user_id==user_id,UserPlayerLink.person_id==person_id).first()
    if not link: db.add(UserPlayerLink(user_id=user_id,person_id=person_id))
    _ensure_team_favorites(db,user_id,person_id)
    req=db.query(UserPlayerRequest).filter(UserPlayerRequest.user_id==user_id,UserPlayerRequest.person_id==person_id).first()
    if req: req.status="approved";req.resolved_at=datetime.now(AR_TZ)
    db.commit()

class FamilyCallupResponseIn(BaseModel):
    attendance: str


@router.get("/family/next-match/{person_id}")
def family_next_match(person_id:int,db:Session=Depends(get_db),user=Depends(get_current_user)):
    _assert_family_child(db,user.id,person_id)
    team=(db.query(Team).join(TeamMember,TeamMember.team_id==Team.id).filter(TeamMember.person_id==person_id,Team.competition=="FEFI",Team.is_active==True).order_by(Team.season.desc()).first())
    if not team:return {"match":None}
    today=_today()
    def find_match():return db.query(Match).filter(Match.competition=="FEFI",Match.division=="Zona H",Match.status=="scheduled",Match.date>=today).order_by(Match.date,Match.id).first()
    match=find_match()
    if not match:
        try:sync_fefi(db)
        except Exception:pass
        match=find_match()
    if not match:return {"match":None,"category":team.division}
    schedule=db.query(FefiCategorySchedule).filter(FefiCategorySchedule.match_id==match.id,FefiCategorySchedule.category==team.division).first()
    standard={"2019":"14:30","2013":"15:15","2018":"16:10","2014":"16:55","2017":"17:50","2016":"18:45","2015":"19:40"}
    club="DEF. DE SANTOS LUGARES"
    return {"match":{"id":match.id,"round_name":match.round_name,"date":match.date,"home":match.home,"away":match.away,"venue":match.venue,"home_away":"local" if club in (match.home or "").upper() else "visitante","category":team.division,"match_time":schedule.time if schedule and schedule.time else standard.get(team.division),"source_url":match.source_url}}


@router.get("/family/callups")
def family_callups(db:Session=Depends(get_db),user=Depends(get_current_user)):
    links=db.query(UserPlayerLink).filter(UserPlayerLink.user_id==user.id).all()
    person_ids=[x.person_id for x in links]
    if not person_ids:return {"items":[]}
    rows=(db.query(CallUpPlayer,CallUp,Person,Match,Team)
        .join(CallUp,CallUp.id==CallUpPlayer.callup_id)
        .join(Person,Person.id==CallUpPlayer.person_id)
        .join(Match,Match.id==CallUp.match_id)
        .join(Team,Team.id==CallUp.team_id)
        .filter(CallUpPlayer.person_id.in_(person_ids),CallUp.status=="published")
        .order_by(Match.date.desc(),CallUp.id.desc()).all())
    return {"items":[{"row_id":cp.id,"callup_id":c.id,"person_id":p.id,"player_name":f"{p.first_name} {p.last_name}".strip(),"category":team.division,"attendance":cp.attendance,"notes":c.notes,"match":{"id":m.id,"date":m.date,"round_name":m.round_name,"home":m.home,"away":m.away,"venue":m.venue}} for cp,c,p,m,team in rows]}


@router.patch("/family/callups/{row_id}")
def family_callup_response(row_id:int,payload:FamilyCallupResponseIn,db:Session=Depends(get_db),user=Depends(get_current_user)):
    status=(payload.attendance or "").strip().lower()
    if status not in {"yes","no","pending"}:raise HTTPException(400,"Respuesta inválida")
    cp=db.get(CallUpPlayer,row_id)
    if not cp:raise HTTPException(404,"Convocatoria inexistente")
    linked=db.query(UserPlayerLink).filter(UserPlayerLink.user_id==user.id,UserPlayerLink.person_id==cp.person_id).first()
    if not linked:raise HTTPException(403,"El jugador no pertenece a esta familia")
    cp.attendance=status;db.commit()
    return {"ok":True,"attendance":status}


@router.get("/family/setup")
def family_setup(db:Session=Depends(get_db),user=Depends(get_current_user)):
    linked=_linked_players(db,user.id)
    return {"email":user.email,"linked":linked,"pending":[],"needs_setup":len(linked)==0}

@router.post("/family/children")
def create_family_child(payload:FamilyChildIn,db:Session=Depends(get_db),user=Depends(get_current_user)):
    first=(payload.first_name or '').strip(); last=(payload.last_name or '').strip()
    if not first or not last: raise HTTPException(400,"Nombre y apellido son obligatorios")
    birth=None
    if payload.birth_date:
        try: birth=datetime.strptime(payload.birth_date,"%Y-%m-%d").date()
        except ValueError: raise HTTPException(400,"Fecha de nacimiento inválida")
    p=Person(first_name=first,last_name=last,birth_year=birth.year if birth else None,birth_date=birth,role="player",is_active=True);db.add(p);db.flush()
    db.add(UserPlayerLink(user_id=user.id,person_id=p.id));_add_team(db,user.id,p.id,payload.competition,payload.category)
    db.commit();db.refresh(p);return {"ok":True,"child":_player(db,p)}

@router.put("/family/children/{person_id}")
def update_family_child(person_id:int,payload:FamilyChildIn,db:Session=Depends(get_db),user=Depends(get_current_user)):
    p=_assert_family_child(db,user.id,person_id);first=(payload.first_name or '').strip();last=(payload.last_name or '').strip()
    if not first or not last: raise HTTPException(400,"Nombre y apellido son obligatorios")
    p.first_name=first;p.last_name=last
    if payload.birth_date:
        try: p.birth_date=datetime.strptime(payload.birth_date,"%Y-%m-%d").date();p.birth_year=p.birth_date.year
        except ValueError: raise HTTPException(400,"Fecha de nacimiento inválida")
    _add_team(db,user.id,p.id,payload.competition,payload.category);db.commit();db.refresh(p)
    return {"ok":True,"child":_player(db,p)}

@router.post("/family/children/{person_id}/teams")
def add_family_child_team(person_id:int,payload:FamilyTeamIn,db:Session=Depends(get_db),user=Depends(get_current_user)):
    p=_assert_family_child(db,user.id,person_id);_add_team(db,user.id,p.id,payload.competition,payload.category);db.commit();return {"ok":True,"child":_player(db,p)}

@router.post("/family/requests")
def request_player(payload:PlayerRequestIn,db:Session=Depends(get_db),user=Depends(get_current_user)):
    p=db.get(Person,payload.person_id)
    if not p or not p.is_active or p.role!="player":raise HTTPException(404,"Jugador inexistente")
    if db.query(UserPlayerLink).filter(UserPlayerLink.user_id==user.id,UserPlayerLink.person_id==p.id).first():return {"ok":True,"status":"approved"}
    row=db.query(UserPlayerRequest).filter(UserPlayerRequest.user_id==user.id,UserPlayerRequest.person_id==p.id).first()
    if not row: row=UserPlayerRequest(user_id=user.id,person_id=p.id,status="pending");db.add(row)
    else: row.status="pending";row.resolved_at=None
    db.commit();return {"ok":True,"status":"pending"}

@router.delete("/family/requests/{person_id}")
def cancel_request(person_id:int,db:Session=Depends(get_db),user=Depends(get_current_user)):
    row=db.query(UserPlayerRequest).filter(UserPlayerRequest.user_id==user.id,UserPlayerRequest.person_id==person_id,UserPlayerRequest.status=="pending").first()
    if row:db.delete(row);db.commit()
    return {"ok":True}

@router.get("/me")
def my_availability(db:Session=Depends(get_db),user=Depends(get_current_user)):
    items=[]
    for selection in _current(db,user.id):
        event=_next_event(db,selection)
        if not event:
            competition,category=selection.split("|",1);items.append({"available":False,"selection":selection,"competition":competition,"category":category,"response":None});continue
        response=db.query(AvailabilityResponse).filter(AvailabilityResponse.user_id==user.id,AvailabilityResponse.match_id==event["match_id"],AvailabilityResponse.selection==selection).first();items.append(_serialize(event,response))
    return {"today":_today(),"items":items}

@router.put("/{match_id}")
def set_availability(match_id:int,payload:AvailabilityIn,db:Session=Depends(get_db),user=Depends(get_current_user)):
    status=(payload.status or "").strip().lower()
    if status not in {"yes","no","maybe"}:raise HTTPException(400,"Estado inválido")
    selection=(payload.selection or "").strip()
    if selection not in _current(db,user.id):raise HTTPException(403,"La categoría no está entre tus selecciones")
    event=_next_event(db,selection)
    if not event or int(event["match_id"])!=match_id:raise HTTPException(409,"La próxima fecha cambió. Actualizá la pantalla e intentá nuevamente.")
    row=db.query(AvailabilityResponse).filter(AvailabilityResponse.user_id==user.id,AvailabilityResponse.match_id==match_id,AvailabilityResponse.selection==selection).first()
    if not row:row=AvailabilityResponse(user_id=user.id,match_id=match_id,selection=selection);db.add(row)
    row.status=status;row.note=(payload.note or "").strip()[:200] or None;db.commit();db.refresh(row)
    return {"ok":True,"match_id":match_id,"selection":selection,"status":row.status,"updated_at":row.updated_at}

@router.get("/admin/player-links")
def list_player_links(db:Session=Depends(get_db),user=Depends(require_roles("admin"))):
    users=db.query(User).filter(User.is_active==True).order_by(User.email).all()
    pending_rows=db.query(UserPlayerRequest,User,Person).join(User,User.id==UserPlayerRequest.user_id).join(Person,Person.id==UserPlayerRequest.person_id).filter(UserPlayerRequest.status=="pending").order_by(UserPlayerRequest.created_at).all()
    pending=[{"request_id":r.id,"user_id":u.id,"email":u.email,**_player(db,p)} for r,u,p in pending_rows]
    return {"items":[{"user_id":u.id,"email":u.email,"players":_linked_players(db,u.id)} for u in users],"pending":pending}

@router.post("/admin/player-links")
def add_player_link(payload:UserPlayerLinkIn,db:Session=Depends(get_db),user=Depends(require_roles("admin"))):
    if not db.get(User,payload.user_id) or not db.get(Person,payload.person_id):raise HTTPException(404,"Usuario o jugador inexistente")
    _approve(db,payload.user_id,payload.person_id);return {"ok":True}

@router.post("/admin/player-requests/{request_id}/approve")
def approve_request(request_id:int,db:Session=Depends(get_db),user=Depends(require_roles("admin"))):
    r=db.get(UserPlayerRequest,request_id)
    if not r:raise HTTPException(404,"Solicitud inexistente")
    _approve(db,r.user_id,r.person_id);return {"ok":True}

@router.post("/admin/player-requests/{request_id}/reject")
def reject_request(request_id:int,db:Session=Depends(get_db),user=Depends(require_roles("admin"))):
    r=db.get(UserPlayerRequest,request_id)
    if not r:raise HTTPException(404,"Solicitud inexistente")
    r.status="rejected";r.resolved_at=datetime.now(AR_TZ);db.commit();return {"ok":True}

@router.delete("/admin/player-links/{user_id}/{person_id}")
def delete_player_link(user_id:int,person_id:int,db:Session=Depends(get_db),user=Depends(require_roles("admin"))):
    row=db.query(UserPlayerLink).filter(UserPlayerLink.user_id==user_id,UserPlayerLink.person_id==person_id).first()
    if row:db.delete(row);db.commit()
    return {"ok":True}

@router.get("/admin")
def admin_availability(db:Session=Depends(get_db),user=Depends(require_roles("admin","delegado","dt"))):
    followers=db.query(Favorite,User).join(User,User.id==Favorite.user_id).filter(Favorite.favorite_type==FOLLOW_TYPE,User.is_active==True).all();grouped={}
    for fav,person in followers:
        selection=(fav.favorite_id or "").strip()
        if "|" not in selection:continue
        event=_next_event(db,selection)
        if not event:continue
        key=f"{selection}|{event['match_id']}";bucket=grouped.setdefault(key,{**event,"selection":selection,"followers":0,"yes":0,"no":0,"maybe":0,"pending":0,"people":[]})
        response=db.query(AvailabilityResponse).filter(AvailabilityResponse.user_id==person.id,AvailabilityResponse.match_id==event["match_id"],AvailabilityResponse.selection==selection).first();status=response.status if response else "pending";players=_linked_players(db,person.id)
        bucket["followers"]+=1;bucket[status]=bucket.get(status,0)+1;bucket["people"].append({"user_id":person.id,"email":person.email,"name":" / ".join(p["name"] for p in players) if players else None,"players":players,"status":status,"note":response.note if response else None,"updated_at":response.updated_at if response else None})
    items=list(grouped.values());items.sort(key=lambda x:((x.get("date") or "9999-99-99"),x.get("competition") or "",x.get("category") or ""));return {"today":_today(),"items":items}

@router.get("/birthdays")
def birthdays(category:str,competition:str="FEFI",db:Session=Depends(get_db),user=Depends(get_current_user)):
    category=(category or "").strip(); competition=(competition or "FEFI").strip().upper()
    if not category: raise HTTPException(status_code=400,detail="Falta categoría")
    linked=_linked_players(db,user.id)
    linked_ids={p["person_id"] for p in linked}
    allowed_family={f"{t['competition']}|{t['category']}".upper() for p in linked for t in p["teams"]}
    if allowed_family:
        if f"{competition}|{category}".upper() not in allowed_family: raise HTTPException(status_code=403,detail="Categoría no vinculada a la familia")
    elif user.role=="profe":
        from .profe_scope import profe_selections
        if f"{competition}|{category}".upper() not in {x.upper() for x in profe_selections(db,user)}: raise HTTPException(status_code=403,detail="Categoría no asignada")
    elif user.role not in ("admin","delegado"):
        raise HTTPException(status_code=403,detail="Sin acceso")
    rows=db.query(Person).join(TeamMember,TeamMember.person_id==Person.id).join(Team,Team.id==TeamMember.team_id).filter(Person.is_active==True,Person.birth_date.isnot(None),Team.is_active==True,Team.competition==competition,Team.division==category).distinct().all()
    today=datetime.now(AR_TZ).date(); out=[]
    for p in rows:
        b=p.birth_date
        try: nxt=date(today.year,b.month,b.day)
        except ValueError: nxt=date(today.year,2,28)
        if nxt<today:
            try: nxt=date(today.year+1,b.month,b.day)
            except ValueError: nxt=date(today.year+1,2,28)
        out.append({"person_id":p.id,"name":f"{p.first_name} {p.last_name}".strip(),"category":category,"day":b.day,"month":b.month,"days_until":(nxt-today).days,"is_mine":p.id in linked_ids})
    out.sort(key=lambda x:(x["days_until"],x["name"]))
    return {"category":category,"birthdays":out}


from datetime import datetime, date
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, Session
from sqlalchemy.sql import func

from .auth import get_current_user, require_roles
from .db import Base, get_db
from .models import Favorite, User, Person, Team, TeamMember, CallUp, CallUpPlayer, Match, FefiCategorySchedule
from .following_v5 import _current, _events_for_selection, FOLLOW_TYPE
from .sync import sync_fefi

AR_TZ = ZoneInfo("America/Argentina/Buenos_Aires")
router = APIRouter(prefix="/api/availability", tags=["Availability"])

class AvailabilityResponse(Base):
    __tablename__ = "availability_responses"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    match_id: Mapped[int] = mapped_column(Integer, index=True)
    selection: Mapped[str] = mapped_column(String(180), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    note: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    __table_args__ = (UniqueConstraint("user_id", "match_id", "selection", name="uq_availability_user_match_selection"),)

class UserPlayerLink(Base):
    __tablename__ = "user_player_links"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id"), index=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (UniqueConstraint("user_id", "person_id", name="uq_user_player_link"),)

class UserPlayerRequest(Base):
    __tablename__ = "user_player_requests"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (UniqueConstraint("user_id", "person_id", name="uq_user_player_request"),)

class AvailabilityIn(BaseModel):
    selection: str
    status: str
    note: str | None = None
class UserPlayerLinkIn(BaseModel):
    user_id: int
    person_id: int
class PlayerRequestIn(BaseModel):
    person_id: int
class FamilyChildIn(BaseModel):
    first_name: str
    last_name: str
    competition: str
    category: str
    birth_date: str | None = None
class FamilyTeamIn(BaseModel):
    competition: str
    category: str

def _today(): return datetime.now(AR_TZ).date().isoformat()
def _next_event(db, selection):
    found=_events_for_selection(db,selection,_today()); return found[0] if found else None
def _serialize(event,response=None):
    if not event:return None
    return {**event,"response":response.status if response else None,"response_note":response.note if response else None,"response_updated_at":response.updated_at if response else None}
def _player_teams(db, person_id):
    rows=db.query(TeamMember,Team).join(Team,Team.id==TeamMember.team_id).filter(TeamMember.person_id==person_id,Team.is_active==True).order_by(Team.competition,Team.division).all()
    return [{"team_id":t.id,"competition":t.competition,"category":t.division,"season":t.season} for _,t in rows]
def _player(db,p):
    return {"person_id":p.id,"name":f"{p.first_name} {p.last_name}".strip(),"first_name":p.first_name,"last_name":p.last_name,"birth_year":p.birth_year,"birth_date":p.birth_date.isoformat() if p.birth_date else None,"teams":_player_teams(db,p.id)}
def _linked_players(db,user_id):
    rows=db.query(UserPlayerLink,Person).join(Person,Person.id==UserPlayerLink.person_id).filter(UserPlayerLink.user_id==user_id,Person.is_active==True).order_by(Person.last_name,Person.first_name).all()
    return [_player(db,p) for _,p in rows]
def _ensure_team_favorites(db,user_id,person_id):
    for team in _player_teams(db,person_id):
        selection=f"{team['competition']}|{team['category']}"
        exists=db.query(Favorite).filter(Favorite.user_id==user_id,Favorite.favorite_type==FOLLOW_TYPE,Favorite.favorite_id==selection).first()
        if not exists: db.add(Favorite(user_id=user_id,favorite_type=FOLLOW_TYPE,favorite_id=selection))
def _team_for(db,competition,category):
    competition=(competition or '').strip(); category=(category or '').strip()
    if not competition or not category: raise HTTPException(400,"Liga y categoría son obligatorias")
    team=db.query(Team).filter(Team.competition==competition,Team.division==category,Team.is_active==True).order_by(Team.season.desc()).first()
    if not team:
        team=Team(competition=competition,division=category,season=2026,is_active=True);db.add(team);db.flush()
    return team
def _assert_family_child(db,user_id,person_id):
    link=db.query(UserPlayerLink).filter(UserPlayerLink.user_id==user_id,UserPlayerLink.person_id==person_id).first()
    if not link: raise HTTPException(404,"Hijo no vinculado a esta familia")
    p=db.get(Person,person_id)
    if not p or not p.is_active: raise HTTPException(404,"Hijo inexistente")
    return p
def _add_team(db,user_id,person_id,competition,category):
    team=_team_for(db,competition,category)
    member=db.query(TeamMember).filter(TeamMember.team_id==team.id,TeamMember.person_id==person_id,TeamMember.season==team.season).first()
    if not member: db.add(TeamMember(team_id=team.id,person_id=person_id,season=team.season,member_role="player"))
    selection=f"{team.competition}|{team.division}"
    fav=db.query(Favorite).filter(Favorite.user_id==user_id,Favorite.favorite_type==FOLLOW_TYPE,Favorite.favorite_id==selection).first()
    if not fav: db.add(Favorite(user_id=user_id,favorite_type=FOLLOW_TYPE,favorite_id=selection))
    return team

def _approve(db,user_id,person_id):
    link=db.query(UserPlayerLink).filter(UserPlayerLink.user_id==user_id,UserPlayerLink.person_id==person_id).first()
    if not link: db.add(UserPlayerLink(user_id=user_id,person_id=person_id))
    _ensure_team_favorites(db,user_id,person_id)
    req=db.query(UserPlayerRequest).filter(UserPlayerRequest.user_id==user_id,UserPlayerRequest.person_id==person_id).first()
    if req: req.status="approved";req.resolved_at=datetime.now(AR_TZ)
    db.commit()

class FamilyCallupResponseIn(BaseModel):
    attendance: str


@router.get("/family/next-match/{person_id}")
def family_next_match(person_id:int,db:Session=Depends(get_db),user=Depends(get_current_user)):
    _assert_family_child(db,user.id,person_id)
    team=(db.query(Team).join(TeamMember,TeamMember.team_id==Team.id).filter(TeamMember.person_id==person_id,Team.competition=="FEFI",Team.is_active==True).order_by(Team.season.desc()).first())
    if not team:return {"match":None}
    today=_today()
    def find_match():return db.query(Match).filter(Match.competition=="FEFI",Match.division=="Zona H",Match.status=="scheduled",Match.date>=today).order_by(Match.date,Match.id).first()
    match=find_match()
    if not match:
        try:sync_fefi(db)
        except Exception:pass
        match=find_match()
    if not match:return {"match":None,"category":team.division}
    schedule=db.query(FefiCategorySchedule).filter(FefiCategorySchedule.match_id==match.id,FefiCategorySchedule.category==team.division).first()
    standard={"2019":"14:30","2013":"15:15","2018":"16:10","2014":"16:55","2017":"17:50","2016":"18:45","2015":"19:40"}
    club="DEF. DE SANTOS LUGARES"
    return {"match":{"id":match.id,"round_name":match.round_name,"date":match.date,"home":match.home,"away":match.away,"venue":match.venue,"home_away":"local" if club in (match.home or "").upper() else "visitante","category":team.division,"match_time":schedule.time if schedule and schedule.time else standard.get(team.division),"source_url":match.source_url}}


@router.get("/family/callups")
def family_callups(db:Session=Depends(get_db),user=Depends(get_current_user)):
    links=db.query(UserPlayerLink).filter(UserPlayerLink.user_id==user.id).all()
    person_ids=[x.person_id for x in links]
    if not person_ids:return {"items":[]}
    rows=(db.query(CallUpPlayer,CallUp,Person,Match,Team)
        .join(CallUp,CallUp.id==CallUpPlayer.callup_id)
        .join(Person,Person.id==CallUpPlayer.person_id)
        .join(Match,Match.id==CallUp.match_id)
        .join(Team,Team.id==CallUp.team_id)
        .filter(CallUpPlayer.person_id.in_(person_ids),CallUp.status=="published")
        .order_by(Match.date.desc(),CallUp.id.desc()).all())
    return {"items":[{"row_id":cp.id,"callup_id":c.id,"person_id":p.id,"player_name":f"{p.first_name} {p.last_name}".strip(),"category":team.division,"attendance":cp.attendance,"notes":c.notes,"match":{"id":m.id,"date":m.date,"round_name":m.round_name,"home":m.home,"away":m.away,"venue":m.venue}} for cp,c,p,m,team in rows]}


@router.patch("/family/callups/{row_id}")
def family_callup_response(row_id:int,payload:FamilyCallupResponseIn,db:Session=Depends(get_db),user=Depends(get_current_user)):
    status=(payload.attendance or "").strip().lower()
    if status not in {"yes","no","pending"}:raise HTTPException(400,"Respuesta inválida")
    cp=db.get(CallUpPlayer,row_id)
    if not cp:raise HTTPException(404,"Convocatoria inexistente")
    linked=db.query(UserPlayerLink).filter(UserPlayerLink.user_id==user.id,UserPlayerLink.person_id==cp.person_id).first()
    if not linked:raise HTTPException(403,"El jugador no pertenece a esta familia")
    cp.attendance=status;db.commit()
    return {"ok":True,"attendance":status}


@router.get("/family/setup")
def family_setup(db:Session=Depends(get_db),user=Depends(get_current_user)):
    linked=_linked_players(db,user.id)
    return {"email":user.email,"linked":linked,"pending":[],"needs_setup":len(linked)==0}

@router.post("/family/children")
def create_family_child(payload:FamilyChildIn,db:Session=Depends(get_db),user=Depends(get_current_user)):
    first=(payload.first_name or '').strip(); last=(payload.last_name or '').strip()
    if not first or not last: raise HTTPException(400,"Nombre y apellido son obligatorios")
    birth=None
    if payload.birth_date:
        try: birth=datetime.strptime(payload.birth_date,"%Y-%m-%d").date()
        except ValueError: raise HTTPException(400,"Fecha de nacimiento inválida")
    p=Person(first_name=first,last_name=last,birth_year=birth.year if birth else None,birth_date=birth,role="player",is_active=True);db.add(p);db.flush()
    db.add(UserPlayerLink(user_id=user.id,person_id=p.id));_add_team(db,user.id,p.id,payload.competition,payload.category)
    db.commit();db.refresh(p);return {"ok":True,"child":_player(db,p)}

@router.put("/family/children/{person_id}")
def update_family_child(person_id:int,payload:FamilyChildIn,db:Session=Depends(get_db),user=Depends(get_current_user)):
    p=_assert_family_child(db,user.id,person_id);first=(payload.first_name or '').strip();last=(payload.last_name or '').strip()
    if not first or not last: raise HTTPException(400,"Nombre y apellido son obligatorios")
    p.first_name=first;p.last_name=last
    if payload.birth_date:
        try: p.birth_date=datetime.strptime(payload.birth_date,"%Y-%m-%d").date();p.birth_year=p.birth_date.year
        except ValueError: raise HTTPException(400,"Fecha de nacimiento inválida")
    _add_team(db,user.id,p.id,payload.competition,payload.category);db.commit();db.refresh(p)
    return {"ok":True,"child":_player(db,p)}

@router.post("/family/children/{person_id}/teams")
def add_family_child_team(person_id:int,payload:FamilyTeamIn,db:Session=Depends(get_db),user=Depends(get_current_user)):
    p=_assert_family_child(db,user.id,person_id);_add_team(db,user.id,p.id,payload.competition,payload.category);db.commit();return {"ok":True,"child":_player(db,p)}

@router.post("/family/requests")
def request_player(payload:PlayerRequestIn,db:Session=Depends(get_db),user=Depends(get_current_user)):
    p=db.get(Person,payload.person_id)
    if not p or not p.is_active or p.role!="player":raise HTTPException(404,"Jugador inexistente")
    if db.query(UserPlayerLink).filter(UserPlayerLink.user_id==user.id,UserPlayerLink.person_id==p.id).first():return {"ok":True,"status":"approved"}
    row=db.query(UserPlayerRequest).filter(UserPlayerRequest.user_id==user.id,UserPlayerRequest.person_id==p.id).first()
    if not row: row=UserPlayerRequest(user_id=user.id,person_id=p.id,status="pending");db.add(row)
    else: row.status="pending";row.resolved_at=None
    db.commit();return {"ok":True,"status":"pending"}

@router.delete("/family/requests/{person_id}")
def cancel_request(person_id:int,db:Session=Depends(get_db),user=Depends(get_current_user)):
    row=db.query(UserPlayerRequest).filter(UserPlayerRequest.user_id==user.id,UserPlayerRequest.person_id==person_id,UserPlayerRequest.status=="pending").first()
    if row:db.delete(row);db.commit()
    return {"ok":True}

@router.get("/me")
def my_availability(db:Session=Depends(get_db),user=Depends(get_current_user)):
    items=[]
    for selection in _current(db,user.id):
        event=_next_event(db,selection)
        if not event:
            competition,category=selection.split("|",1);items.append({"available":False,"selection":selection,"competition":competition,"category":category,"response":None});continue
        response=db.query(AvailabilityResponse).filter(AvailabilityResponse.user_id==user.id,AvailabilityResponse.match_id==event["match_id"],AvailabilityResponse.selection==selection).first();items.append(_serialize(event,response))
    return {"today":_today(),"items":items}

@router.put("/{match_id}")
def set_availability(match_id:int,payload:AvailabilityIn,db:Session=Depends(get_db),user=Depends(get_current_user)):
    status=(payload.status or "").strip().lower()
    if status not in {"yes","no","maybe"}:raise HTTPException(400,"Estado inválido")
    selection=(payload.selection or "").strip()
    if selection not in _current(db,user.id):raise HTTPException(403,"La categoría no está entre tus selecciones")
    event=_next_event(db,selection)
    if not event or int(event["match_id"])!=match_id:raise HTTPException(409,"La próxima fecha cambió. Actualizá la pantalla e intentá nuevamente.")
    row=db.query(AvailabilityResponse).filter(AvailabilityResponse.user_id==user.id,AvailabilityResponse.match_id==match_id,AvailabilityResponse.selection==selection).first()
    if not row:row=AvailabilityResponse(user_id=user.id,match_id=match_id,selection=selection);db.add(row)
    row.status=status;row.note=(payload.note or "").strip()[:200] or None;db.commit();db.refresh(row)
    return {"ok":True,"match_id":match_id,"selection":selection,"status":row.status,"updated_at":row.updated_at}

@router.get("/admin/player-links")
def list_player_links(db:Session=Depends(get_db),user=Depends(require_roles("admin"))):
    users=db.query(User).filter(User.is_active==True).order_by(User.email).all()
    pending_rows=db.query(UserPlayerRequest,User,Person).join(User,User.id==UserPlayerRequest.user_id).join(Person,Person.id==UserPlayerRequest.person_id).filter(UserPlayerRequest.status=="pending").order_by(UserPlayerRequest.created_at).all()
    pending=[{"request_id":r.id,"user_id":u.id,"email":u.email,**_player(db,p)} for r,u,p in pending_rows]
    return {"items":[{"user_id":u.id,"email":u.email,"players":_linked_players(db,u.id)} for u in users],"pending":pending}

@router.post("/admin/player-links")
def add_player_link(payload:UserPlayerLinkIn,db:Session=Depends(get_db),user=Depends(require_roles("admin"))):
    if not db.get(User,payload.user_id) or not db.get(Person,payload.person_id):raise HTTPException(404,"Usuario o jugador inexistente")
    _approve(db,payload.user_id,payload.person_id);return {"ok":True}

@router.post("/admin/player-requests/{request_id}/approve")
def approve_request(request_id:int,db:Session=Depends(get_db),user=Depends(require_roles("admin"))):
    r=db.get(UserPlayerRequest,request_id)
    if not r:raise HTTPException(404,"Solicitud inexistente")
    _approve(db,r.user_id,r.person_id);return {"ok":True}

@router.post("/admin/player-requests/{request_id}/reject")
def reject_request(request_id:int,db:Session=Depends(get_db),user=Depends(require_roles("admin"))):
    r=db.get(UserPlayerRequest,request_id)
    if not r:raise HTTPException(404,"Solicitud inexistente")
    r.status="rejected";r.resolved_at=datetime.now(AR_TZ);db.commit();return {"ok":True}

@router.delete("/admin/player-links/{user_id}/{person_id}")
def delete_player_link(user_id:int,person_id:int,db:Session=Depends(get_db),user=Depends(require_roles("admin"))):
    row=db.query(UserPlayerLink).filter(UserPlayerLink.user_id==user_id,UserPlayerLink.person_id==person_id).first()
    if row:db.delete(row);db.commit()
    return {"ok":True}

@router.get("/admin")
def admin_availability(db:Session=Depends(get_db),user=Depends(require_roles("admin","delegado","dt"))):
    followers=db.query(Favorite,User).join(User,User.id==Favorite.user_id).filter(Favorite.favorite_type==FOLLOW_TYPE,User.is_active==True).all();grouped={}
    for fav,person in followers:
        selection=(fav.favorite_id or "").strip()
        if "|" not in selection:continue
        event=_next_event(db,selection)
        if not event:continue
        key=f"{selection}|{event['match_id']}";bucket=grouped.setdefault(key,{**event,"selection":selection,"followers":0,"yes":0,"no":0,"maybe":0,"pending":0,"people":[]})
        response=db.query(AvailabilityResponse).filter(AvailabilityResponse.user_id==person.id,AvailabilityResponse.match_id==event["match_id"],AvailabilityResponse.selection==selection).first();status=response.status if response else "pending";players=_linked_players(db,person.id)
        bucket["followers"]+=1;bucket[status]=bucket.get(status,0)+1;bucket["people"].append({"user_id":person.id,"email":person.email,"name":" / ".join(p["name"] for p in players) if players else None,"players":players,"status":status,"note":response.note if response else None,"updated_at":response.updated_at if response else None})
    items=list(grouped.values());items.sort(key=lambda x:((x.get("date") or "9999-99-99"),x.get("competition") or "",x.get("category") or ""));return {"today":_today(),"items":items}

@router.get("/birthdays")
def birthdays(category:str,competition:str="FEFI",db:Session=Depends(get_db),user=Depends(get_current_user)):
    category=(category or "").strip(); competition=(competition or "FEFI").strip().upper()
    if not category: raise HTTPException(status_code=400,detail="Falta categoría")
    # La familia sólo puede consultar categorías de sus hijos; profesor/delegado/admin según su alcance operativo.
    linked=_linked_players(db,user.id)
    allowed_family={f"{t['competition']}|{t['category']}".upper() for p in linked for t in p["teams"]}
    if allowed_family:
        if f"{competition}|{category}".upper() not in allowed_family: raise HTTPException(status_code=403,detail="Categoría no vinculada a la familia")
    elif user.role=="profe":
        from .profe_scope import profe_selections
        if f"{competition}|{category}".upper() not in {x.upper() for x in profe_selections(db,user)}: raise HTTPException(status_code=403,detail="Categoría no asignada")
    elif user.role not in ("admin","delegado"):
        raise HTTPException(status_code=403,detail="Sin acceso")
    rows=db.query(Person).join(TeamMember,TeamMember.person_id==Person.id).join(Team,Team.id==TeamMember.team_id).filter(Person.is_active==True,Person.birth_date.isnot(None),Team.is_active==True,Team.competition==competition,Team.division==category).distinct().all()
    today=_today(); out=[]
    for p in rows:
        b=p.birth_date; nxt=date(today.year,b.month,b.day)
        if nxt<today: nxt=date(today.year+1,b.month,b.day)
        out.append({"person_id":p.id,"name":f"{p.first_name} {p.last_name}".strip(),"category":category,"day":b.day,"month":b.month,"days_until":(nxt-today).days})
    out.sort(key=lambda x:(x["days_until"],x["name"]))
    return {"category":category,"birthdays":out}
