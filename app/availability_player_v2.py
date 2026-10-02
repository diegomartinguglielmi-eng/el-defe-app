from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, Session, mapped_column
from sqlalchemy.sql import func

from .auth import get_current_user, require_roles
from .db import Base, get_db
from .models import User, Team, TeamMember, Person, CallUp, CallUpPlayer, Match
from .availability_v1 import UserPlayerLink, AvailabilityResponse, _linked_players, _next_event
from .profe_scope import profe_selections, normalize_selection
from .notifications_v5 import publish_event

AR_TZ = ZoneInfo("America/Argentina/Buenos_Aires")
router = APIRouter(prefix="/api/availability/v2", tags=["Availability v2 - player"])

class PlayerAvailabilityResponse(Base):
    __tablename__ = "player_availability_responses"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id"), index=True)
    match_id: Mapped[int] = mapped_column(Integer, index=True)
    selection: Mapped[str] = mapped_column(String(180), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    note: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    __table_args__ = (UniqueConstraint("person_id", "match_id", "selection", name="uq_player_availability_person_match_selection"),)

class PlayerAvailabilityIn(BaseModel):
    person_id: int
    selection: str
    status: str
    note: str | None = None

class ArgenligaProgrammingIn(BaseModel):
    opponent: str
    match_date: str
    home_away: str = "local"
    venue: str | None = None
    location: str
    round_name: str | None = None
    times: dict[str, str]

@router.get("/admin/argenliga/programming")
def list_argenliga_programming(db: Session = Depends(get_db), user=Depends(require_roles("admin"))):
    rows=db.query(Match).filter(func.upper(Match.competition)=="ARGENLIGA", Match.status!="final", Match.date>=_today()).order_by(Match.date, Match.division).all()
    items=[]
    for m in rows:
        match_time=""
        if (m.source_url or "").startswith("manual://argenliga?time="): match_time=(m.source_url or "").split("time=",1)[1]
        local=(m.home or "").upper().startswith("DEF.")
        opponent=m.away if local else m.home
        items.append({"id":m.id,"category":m.division,"opponent":opponent,"match_date":m.date,"match_time":match_time,"home_away":"local" if local else "visitante","location":m.venue,"round_name":m.round_name})
    return {"matches":items}

@router.post("/admin/argenliga/programming")
def create_argenliga_programming(payload: ArgenligaProgrammingIn, db: Session = Depends(get_db), user=Depends(require_roles("admin"))):
    categories = ["8VA", "7MA", "6TA", "5TA", "4TA", "3RA", "1RA"]
    opponent = payload.opponent.strip(); location = payload.location.strip()
    if not opponent or not payload.match_date or not location: raise HTTPException(400, "Completá rival, fecha y ubicación validada")
    created=[]
    for category in categories:
        match_time=(payload.times.get(category) or "").strip()
        if not match_time: raise HTTPException(400, f"Falta el horario de {category}")
        team=db.query(Team).filter(func.upper(Team.competition)=="ARGENLIGA", func.upper(Team.division)==category, Team.is_active==True).first()
        if not team:
            team=Team(competition="ARGENLIGA", division=category, season=2026, is_active=True); db.add(team); db.flush()
        local=(payload.home_away or "local").lower()=="local"
        home="DEF. DE SANTOS LUGARES" if local else opponent; away=opponent if local else "DEF. DE SANTOS LUGARES"
        external_key=f"ARGENLIGA|MANUAL|{payload.match_date}|{category}|{home}|{away}"
        match=db.query(Match).filter(Match.external_key==external_key).first()
        if not match:
            match=Match(external_key=external_key,competition="ARGENLIGA",division=category,round_name=payload.round_name or None,date=payload.match_date,home=home,away=away,status="scheduled",venue=location,source_kind="manual_admin"); db.add(match); db.flush()
        else:
            match.round_name=payload.round_name or match.round_name; match.date=payload.match_date; match.home=home; match.away=away; match.venue=location; match.status="scheduled"
        match.source_url=f"manual://argenliga?time={match_time}"
        event=publish_event(db,event_type="programming",title=f"Argenliga · {category}",body=f"Nueva fecha vs {opponent} · {payload.match_date} {match_time} hs",competition="ARGENLIGA",category=category,match_id=match.id)
        created.append({"category":category,"match_id":match.id,"time":match_time,"push":getattr(event,"push_result",None)})
    db.commit(); return {"ok":True,"competition":"ARGENLIGA","matches":created}

def _today(): return datetime.now(AR_TZ).date().isoformat()
def _belongs_to_selection(player: dict, selection: str) -> bool:
    if "|" not in selection: return False
    competition, category = [x.strip().upper() for x in selection.split("|", 1)]
    return any((team.get("competition") or "").strip().upper()==competition and (team.get("category") or "").strip().upper()==category for team in (player.get("teams") or []))
def _family_player(db,user_id,person_id,selection):
    player=next((p for p in _linked_players(db,user_id) if int(p["person_id"])==int(person_id)),None)
    if not player: raise HTTPException(404,"Hijo no vinculado a esta familia")
    if not _belongs_to_selection(player,selection): raise HTTPException(403,"El hijo no pertenece a esa liga/categoría")
    return player
def _legacy_response(db,user_id,match_id,selection): return db.query(AvailabilityResponse).filter(AvailabilityResponse.user_id==user_id,AvailabilityResponse.match_id==match_id,AvailabilityResponse.selection==selection).first()
def _player_response(db,person_id,match_id,selection): return db.query(PlayerAvailabilityResponse).filter(PlayerAvailabilityResponse.person_id==person_id,PlayerAvailabilityResponse.match_id==match_id,PlayerAvailabilityResponse.selection==selection).first()
def _status(db,user_id,person_id,match_id,selection):
    row=_player_response(db,person_id,match_id,selection)
    if row:return row.status,row.note,row.updated_at,"player"
    legacy=_legacy_response(db,user_id,match_id,selection)
    if legacy:return legacy.status,legacy.note,legacy.updated_at,"legacy_family"
    return None,None,None,None

def _selection_teams(db, competition, category):
    return db.query(Team).filter(func.upper(Team.competition)==competition,func.upper(Team.division)==category,Team.is_active==True).order_by(Team.season.desc(),Team.id.desc()).all()

def _selection_roster_ids(db, teams):
    ids=[t.id for t in teams]
    return {x.person_id for x in db.query(TeamMember).filter(TeamMember.team_id.in_(ids)).all()} if ids else set()

def _callup_player(db, match_id, selection, person_id):
    key=normalize_selection(selection)
    if "|" not in key:return None
    competition,category=key.split("|",1); teams=_selection_teams(db,competition,category)
    if not teams:return None
    team_ids=[t.id for t in teams]
    return db.query(CallUpPlayer,CallUp).join(CallUp,CallUp.id==CallUpPlayer.callup_id).filter(CallUp.match_id==int(match_id),CallUp.team_id.in_(team_ids),CallUp.status=="sent",CallUpPlayer.person_id==int(person_id)).order_by(CallUp.id.desc()).first()

def _sync_callup_from_response(db, user_id, person_id, match_id, selection):
    pair=_callup_player(db,match_id,selection,person_id)
    if not pair:return None
    cp,_=pair; status,_,_,_=_status(db,user_id,person_id,match_id,selection)
    if status in {"yes","no","maybe"} and cp.attendance!=status: cp.attendance=status
    return cp

@router.get("/me")
def my_player_availability(db:Session=Depends(get_db),user=Depends(get_current_user)):
    items=[]
    for player in _linked_players(db,user.id):
        for team in player.get("teams") or []:
            selection=f"{team['competition']}|{team['category']}"; event=_next_event(db,selection); base={"person_id":player["person_id"],"player_name":player["name"],"selection":selection,"competition":team["competition"],"category":team["category"]}
            if not event: items.append({**base,"available":False,"response":None,"response_source":None}); continue
            status,note,updated_at,source=_status(db,user.id,player["person_id"],event["match_id"],selection)
            items.append({**base,**event,"available":True,"response":status,"response_note":note,"response_updated_at":updated_at,"response_source":source})
    return {"today":_today(),"items":items}

@router.put("/{match_id}")
def set_player_availability(match_id:int,payload:PlayerAvailabilityIn,db:Session=Depends(get_db),user=Depends(get_current_user)):
    status=(payload.status or "").strip().lower()
    if status not in {"yes","no","maybe"}: raise HTTPException(400,"Estado inválido")
    selection=normalize_selection((payload.selection or "").strip()); _family_player(db,user.id,payload.person_id,selection); event=_next_event(db,selection)
    if not event or int(event["match_id"])!=int(match_id): raise HTTPException(409,"La próxima fecha cambió. Actualizá la pantalla e intentá nuevamente.")
    pair=_callup_player(db,match_id,selection,payload.person_id)
    if not pair: raise HTTPException(409,"El jugador todavía no fue convocado para este partido")
    cp,_=pair
    row=_player_response(db,payload.person_id,match_id,selection)
    if not row: row=PlayerAvailabilityResponse(user_id=user.id,person_id=payload.person_id,match_id=match_id,selection=selection); db.add(row)
    row.user_id=user.id; row.status=status; row.note=(payload.note or "").strip()[:200] or None; cp.attendance=status; db.commit(); db.refresh(row)
    return {"ok":True,"person_id":payload.person_id,"match_id":match_id,"selection":selection,"status":row.status,"updated_at":row.updated_at}

@router.get("/admin")
def admin_player_availability(db:Session=Depends(get_db),user=Depends(require_roles("admin","profe","delegado","dt"))):
    links=db.query(UserPlayerLink).all(); grouped,seen={},set(); emails={u.id:u.email for u in db.query(User).filter(User.id.in_({link.user_id for link in links})).all()} if links else {}
    for link in links:
        for player in _linked_players(db,link.user_id):
            if int(player["person_id"])!=int(link.person_id): continue
            for team in player.get("teams") or []:
                selection=f"{team['competition']}|{team['category']}"; event=_next_event(db,selection)
                if not event: continue
                identity=(player["person_id"],event["match_id"],selection)
                if identity in seen: continue
                seen.add(identity); key=f"{selection}|{event['match_id']}"; bucket=grouped.setdefault(key,{**event,"selection":selection,"players":0,"yes":0,"no":0,"maybe":0,"pending":0,"people":[]})
                status,note,updated_at,source=_status(db,link.user_id,player["person_id"],event["match_id"],selection); effective=status or "pending"; bucket["players"]+=1; bucket[effective]=bucket.get(effective,0)+1; bucket["people"].append({"user_id":link.user_id,"person_id":player["person_id"],"email":emails.get(link.user_id),"name":player["name"],"players":[player],"status":effective,"note":note,"updated_at":updated_at,"response_source":source})
    items=list(grouped.values())
    if user.role=="profe": items=[item for item in items if normalize_selection(item.get("selection") or "") in profe_selections(db,user)]
    for item in items:item["followers"]=item["players"]
    items.sort(key=lambda x:((x.get("date") or "9999-99-99"),x.get("selection") or "")); return {"items":items}

@router.get("/profe/roster")
def profe_roster_v2(selection:str,db:Session=Depends(get_db),user=Depends(require_roles("profe","admin","delegado","dt"))):
    key=normalize_selection(selection)
    if user.role=="profe" and key not in profe_selections(db,user): raise HTTPException(403,"Equipo fuera del alcance del profesor")
    if "|" not in key: raise HTTPException(400,"Liga y categoría inválidas")
    competition,category=key.split("|",1); teams=_selection_teams(db,competition,category)
    if not teams:return {"selection":key,"team_id":None,"items":[]}
    rows=db.query(TeamMember,Person).join(Person,Person.id==TeamMember.person_id).filter(TeamMember.team_id.in_([t.id for t in teams]),Person.is_active==True).order_by(Person.last_name,Person.first_name).all(); seen=set(); items=[]
    for tm,p in rows:
        if p.id in seen:continue
        seen.add(p.id); items.append({"person_id":p.id,"name":f"{p.first_name} {p.last_name}".strip(),"member_role":tm.member_role})
    return {"selection":key,"team_id":teams[0].id,"items":items}

class ProfeCallupIn(BaseModel):
    selection:str
    person_ids:list[int]
    notes:str|None=None

@router.post("/profe/callup")
def save_profe_callup(payload:ProfeCallupIn,db:Session=Depends(get_db),user=Depends(require_roles("profe","admin","delegado","dt"))):
    key=normalize_selection(payload.selection)
    if user.role=="profe" and key not in profe_selections(db,user): raise HTTPException(403,"Equipo fuera del alcance del profesor")
    if "|" not in key: raise HTTPException(400,"Liga y categoría inválidas")
    competition,category=key.split("|",1); event=_next_event(db,key)
    if event and not event.get("match_id") and competition=="FEFI":
        external_key="FEFI|FALLBACK|"+str(event.get("date") or "")+"|"+str(event.get("round_name") or "")+"|"+str(event.get("home") or "")+"|"+str(event.get("away") or ""); match=db.query(Match).filter(Match.external_key==external_key).first()
        if not match:
            match=Match(external_key=external_key,competition="FEFI",division=category,round_name=event.get("round_name"),date=event.get("date"),home=event.get("home") or "DEF. DE SANTOS LUGARES",away=event.get("away") or "A CONFIRMAR",home_score=None,away_score=None,status=event.get("status") or "scheduled",venue=event.get("venue") or event.get("address"),source_url=event.get("source_url"),source_kind="official_fallback"); db.add(match); db.flush()
        event=dict(event); event["match_id"]=match.id
    if not event or not event.get("match_id"): raise HTTPException(409,"No hay un próximo partido persistido para convocar")
    teams=_selection_teams(db,competition,category)
    if not teams: raise HTTPException(404,"Plantel inexistente")
    team_ids=[t.id for t in teams]; valid=_selection_roster_ids(db,teams); chosen={int(x) for x in payload.person_ids if int(x) in valid}
    # A callup belongs to the professor who sends it. Do not reuse a staging/QA
    # professor's row for the real professor, otherwise Family will correctly hide it.
    row=db.query(CallUp).filter(
        CallUp.match_id==int(event["match_id"]),
        CallUp.team_id.in_(team_ids),
        CallUp.created_by==user.id
    ).order_by(CallUp.id.desc()).first()
    if not row:
        row=CallUp(match_id=int(event["match_id"]),team_id=teams[0].id,created_by=user.id,status="draft"); db.add(row); db.flush()
    row.status="sent"; row.created_by=user.id; row.notes=(payload.notes or "").strip()[:1000] or None
    # A newly sent callup starts pending. Responses from another/QA callup for the
    # same match must not pre-confirm players before the family answers this callup.
    db.query(PlayerAvailabilityResponse).filter(
        PlayerAvailabilityResponse.match_id==int(event["match_id"]),
        PlayerAvailabilityResponse.selection==key,
        PlayerAvailabilityResponse.person_id.in_(chosen)
    ).delete(synchronize_session=False)
    existing={x.person_id:x for x in db.query(CallUpPlayer).filter(CallUpPlayer.callup_id==row.id).all()}
    for person_id in chosen:
        if person_id not in existing:
            cp=CallUpPlayer(callup_id=row.id,person_id=person_id,attendance="pending"); db.add(cp); db.flush()
            cp.attendance="pending"
    for person_id,item in existing.items():
        if person_id not in chosen: db.delete(item)
    db.commit(); return {"ok":True,"callup_id":row.id,"selection":key,"status":"sent","players":len(chosen)}

@router.get("/profe/callup")
def get_profe_callup(selection:str,db:Session=Depends(get_db),user=Depends(require_roles("profe","admin","delegado","dt"))):
    key=normalize_selection(selection)
    if user.role=="profe" and key not in profe_selections(db,user): raise HTTPException(403,"Equipo fuera del alcance del profesor")
    if "|" not in key: raise HTTPException(400,"Liga y categoría inválidas")
    competition,category=key.split("|",1); event=_next_event(db,key); teams=_selection_teams(db,competition,category)
    if not event or not teams:return {"selection":key,"callup":None}
    team_ids=[t.id for t in teams]; row=None
    if event.get("match_id"): row=db.query(CallUp).filter(CallUp.match_id==int(event["match_id"]),CallUp.team_id.in_(team_ids)).order_by(CallUp.id.desc()).first()
    elif competition=="FEFI": row=db.query(CallUp).join(Match,Match.id==CallUp.match_id).filter(CallUp.team_id.in_(team_ids),Match.competition=="FEFI",Match.date==event.get("date"),Match.status!="final").order_by(CallUp.id.desc()).first()
    if not row or row.status!="sent":return {"selection":key,"callup":None}
    # Staging QA must never make a real professor's board look as if they sent a callup.
    # A callup is visible to a professor only when it was sent by that same professor.
    if user.role=="profe" and int(row.created_by or 0)!=int(user.id):
        return {"selection":key,"callup":None}
    if not event.get("match_id"): event=dict(event); event["match_id"]=row.match_id
    people=db.query(CallUpPlayer,Person).join(Person,Person.id==CallUpPlayer.person_id).filter(CallUpPlayer.callup_id==row.id).order_by(Person.last_name,Person.first_name).all(); items=[]; changed=False
    for cp,p in people:
        prior=_player_response(db,p.id,row.match_id,key)
        if prior and prior.status in {"yes","no","maybe"} and cp.attendance!=prior.status:
            cp.attendance=prior.status; changed=True
        items.append({"row_id":cp.id,"person_id":p.id,"name":f"{p.first_name} {p.last_name}".strip(),"attendance":cp.attendance})
    if changed: db.commit()
    counts={s:sum(1 for x in items if x["attendance"]==s) for s in ("yes","no","maybe","pending")}
    return {"selection":key,"callup":{"id":row.id,"status":row.status,"notes":row.notes,"match":event,"players":items,"counts":counts}}

class FamilyCallupAttendanceIn(BaseModel): attendance:str

@router.get("/family/callups")
def family_callups_v2(db:Session=Depends(get_db),user=Depends(get_current_user)):
    linked={int(p["person_id"]):p for p in _linked_players(db,user.id)}
    if not linked:return {"items":[]}
    rows=db.query(CallUpPlayer,CallUp,Team,Person).join(CallUp,CallUp.id==CallUpPlayer.callup_id).join(Team,Team.id==CallUp.team_id).join(Person,Person.id==CallUpPlayer.person_id).filter(CallUpPlayer.person_id.in_(linked.keys()),CallUp.status=="sent").order_by(CallUp.id.desc()).all(); items=[]; changed=False
    for cp,callup,team,person in rows:
        selection=normalize_selection(f"{team.competition}|{team.division}"); player=linked.get(int(person.id))
        if not player or not _belongs_to_selection(player,selection):continue
        # Family must only see a callup that is actually the current match for this selection.
        current_event=_next_event(db,selection)
        current_match_id=current_event.get("match_id") if current_event else None
        if current_match_id is None or int(callup.match_id)!=int(current_match_id):
            continue
        # A family can answer only a callup actually sent by a real professor assigned
        # to this selection. This prevents staging/QA or foreign-professor callups from
        # appearing as active confirmations.
        sender=db.get(User,callup.created_by) if callup.created_by else None
        if sender is None or sender.role!="profe" or selection not in profe_selections(db,sender):
            continue
        # Never expose the staging-only QA professor's synthetic callups to families.
        import os
        qa_profe_email=os.getenv("STAGING_QA_PROFE_EMAIL","profe.laamba.qa@invalid.local").strip().lower()
        if str(sender.email or "").strip().lower()==qa_profe_email:
            continue
        prior=_player_response(db,person.id,callup.match_id,selection)
        if prior and prior.status in {"yes","no","maybe"} and cp.attendance!=prior.status: cp.attendance=prior.status; changed=True
        items.append({"row_id":cp.id,"callup_id":callup.id,"person_id":person.id,"player_name":f"{person.first_name} {person.last_name}".strip(),"competition":team.competition,"category":team.division,"selection":selection,"attendance":cp.attendance,"notes":callup.notes,"match_id":callup.match_id})
    if changed: db.commit()
    return {"items":items}

@router.patch("/family/callups/{row_id}")
def answer_family_callup_v2(row_id:int,payload:FamilyCallupAttendanceIn,db:Session=Depends(get_db),user=Depends(get_current_user)):
    attendance=(payload.attendance or "").strip().lower()
    if attendance not in {"yes","no","maybe"}:raise HTTPException(400,"Estado inválido")
    row=db.query(CallUpPlayer,CallUp,Team).join(CallUp,CallUp.id==CallUpPlayer.callup_id).join(Team,Team.id==CallUp.team_id).filter(CallUpPlayer.id==row_id).first()
    if not row:raise HTTPException(404,"Convocatoria inexistente")
    cp,callup,team=row; player=next((p for p in _linked_players(db,user.id) if int(p["person_id"])==int(cp.person_id)),None); selection=normalize_selection(f"{team.competition}|{team.division}")
    if not player or not _belongs_to_selection(player,selection):raise HTTPException(403,"La convocatoria no pertenece a esta familia")
    cp.attendance=attendance
    response=_player_response(db,cp.person_id,callup.match_id,selection)
    if not response: response=PlayerAvailabilityResponse(user_id=user.id,person_id=cp.person_id,match_id=callup.match_id,selection=selection); db.add(response)
    response.user_id=user.id; response.status=attendance
    db.commit(); return {"ok":True,"row_id":cp.id,"selection":selection,"attendance":cp.attendance}
