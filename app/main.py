from pathlib import Path
from fastapi import FastAPI, Depends, HTTPException, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from apscheduler.schedulers.background import BackgroundScheduler
from .db import Base, engine, get_db, SessionLocal
from .models import User, Match, Standing, News, AuditLog, Team, Person, TeamMember, CallUp, CallUpPlayer, PlayerMatchStat, Suspension, Favorite, NotificationPreference, MediaItem, PlayerOfMatch
from .config import settings
from .auth import hash_password, verify_password, create_token, get_current_user, require_roles
from .schemas import UserCreate, NewsIn, MatchIn, ArgenImport, TeamIn, PersonIn, TeamMemberIn, CallUpIn, AttendanceIn, PlayerStatIn, SuspensionIn, FavoriteIn, NotificationPrefsIn, MediaIn, PlayerOfMatchIn
from .sync import sync_fefi, sync_laamba, upsert_match

BASE=Path(__file__).resolve().parent
app=FastAPI(title="El Defe API",version="4.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

scheduler=BackgroundScheduler()

def audit(db,user,action,entity,entity_id=None,detail=None):
    db.add(AuditLog(user_id=user.id if user else None,action=action,entity=entity,entity_id=str(entity_id) if entity_id else None,detail=detail))
    db.commit()

def scheduled_sync():
    db=SessionLocal()
    try:
        sync_fefi(db); sync_laamba(db)
    finally:
        db.close()

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    db=SessionLocal()
    try:
        if not db.query(User).filter(User.email==settings.admin_email).first():
            db.add(User(email=settings.admin_email,password_hash=hash_password(settings.admin_password),role="admin"))
            db.commit()
        if not db.query(News).first():
            db.add(News(title="Bienvenidos a El Defe",body="FEFI, LAAMBA y Argenliga en una sola aplicación."))
            db.commit()
    finally:
        db.close()
    if not scheduler.running:
        scheduler.add_job(scheduled_sync,"cron",hour=settings.sync_hour,minute=settings.sync_minute,id="daily-sync",replace_existing=True)
        scheduler.start()

@app.get("/api/health")
def health(): return {"ok":True,"version":"9.0","app":"El Defe"}

@app.get("/api/ready")
def ready(db:Session=Depends(get_db)):
    db.execute(__import__("sqlalchemy").text("SELECT 1"))
    return {"ready":True}

@app.post("/api/auth/login")
def login(username:str=Form(...),password:str=Form(...),db:Session=Depends(get_db)):
    u=db.query(User).filter(User.email==username).first()
    if not u or not verify_password(password,u.password_hash):
        raise HTTPException(status_code=401,detail="Credenciales inválidas")
    return {"access_token":create_token(u),"token_type":"bearer","user":{"email":u.email,"role":u.role}}

@app.get("/api/me")
def me(user=Depends(get_current_user)): return {"id":user.id,"email":user.email,"role":user.role}

@app.post("/api/users")
def create_user(payload:UserCreate,db:Session=Depends(get_db),user=Depends(require_roles("admin"))):
    if db.query(User).filter(User.email==payload.email).first():
        raise HTTPException(status_code=409,detail="Ya existe")
    u=User(email=payload.email,password_hash=hash_password(payload.password),role=payload.role)
    db.add(u);db.commit();db.refresh(u);audit(db,user,"create","user",u.id,payload.role)
    return {"ok":True,"id":u.id}


def _match_priority(m:Match):
    key=(m.external_key or "").upper()
    kind=(m.source_kind or "").lower()
    if "|CLAUSURA|" in key: return 100
    if kind=="verified_auto": return 95
    if kind=="approved_sync": return 90
    if kind=="manual": return 70
    if kind=="import": return 60
    if kind=="sync": return 10
    return 20


def _canonicalize_matches(rows:list[Match]):
    non_fefi=[m for m in rows if m.competition!="FEFI"]
    fefi=[m for m in rows if m.competition=="FEFI"]
    chosen={}
    for m in fefi:
        key=(m.division or "",m.round_name or "",m.date or "")
        current=chosen.get(key)
        if current is None or (_match_priority(m),m.id)>(_match_priority(current),current.id):
            chosen[key]=m
    out=non_fefi+list(chosen.values())
    out.sort(key=lambda m:((m.date or ""),m.id),reverse=True)
    return out

@app.get("/api/matches")
def get_matches(competition:str|None=None,division:str|None=None,db:Session=Depends(get_db)):
    q=db.query(Match)
    if competition: q=q.filter(Match.competition==competition)
    if division: q=q.filter(Match.division==division)
    rows=q.all()
    rows=_canonicalize_matches(rows)
    return [{c.name:getattr(x,c.name) for c in x.__table__.columns} for x in rows]

@app.post("/api/matches")
def add_match(payload:MatchIn,db:Session=Depends(get_db),user=Depends(require_roles("admin","delegado"))):
    key=f"MANUAL|{payload.competition}|{payload.date}|{payload.home}|{payload.away}"
    d=payload.model_dump();d.update(external_key=key,source_kind="manual",source_url=None)
    upsert_match(db,d)
    obj=db.query(Match).filter(Match.external_key==key).first()
    audit(db,user,"create_or_update","match",obj.id if obj else None,key)
    return {"ok":True}

@app.get("/api/standings")
def standings(competition:str,division:str|None=None,db:Session=Depends(get_db)):
    q=db.query(Standing).filter(Standing.competition==competition)
    if division:q=q.filter(Standing.division==division)
    rows=q.order_by(Standing.pts.desc().nullslast(),Standing.gd.desc().nullslast()).all()
    return [{c.name:getattr(x,c.name) for c in x.__table__.columns} for x in rows]

@app.get("/api/news")
def news(db:Session=Depends(get_db)):
    rows=db.query(News).order_by(News.id.desc()).all()
    return [{"id":x.id,"title":x.title,"body":x.body,"published_at":x.published_at} for x in rows]

@app.post("/api/news")
def add_news(payload:NewsIn,db:Session=Depends(get_db),user=Depends(require_roles("admin","delegado"))):
    n=News(title=payload.title,body=payload.body,author_id=user.id);db.add(n);db.commit();db.refresh(n)
    audit(db,user,"create","news",n.id,payload.title)
    return {"ok":True,"id":n.id}

@app.post("/api/sync/fefi")
def do_fefi(db:Session=Depends(get_db),user=Depends(require_roles("admin"))):
    r=sync_fefi(db);audit(db,user,"sync","FEFI",detail=str(r));return r

@app.post("/api/sync/laamba")
def do_laamba(db:Session=Depends(get_db),user=Depends(require_roles("admin"))):
    r=sync_laamba(db);audit(db,user,"sync","LAAMBA",detail=str(r));return r

@app.post("/api/sync/all")
def do_all(db:Session=Depends(get_db),user=Depends(require_roles("admin"))):
    a=sync_fefi(db);b=sync_laamba(db);audit(db,user,"sync","ALL",detail=f"{a}|{b}");return {"fefi":a,"laamba":b}

@app.post("/api/import/argenliga")
def import_argen(payload:ArgenImport,db:Session=Depends(get_db),user=Depends(require_roles("admin","delegado"))):
    n=0
    for m in payload.matches:
        d=m.model_dump()
        d.update(external_key=f"ARGENLIGA|{m.date}|{m.home}|{m.away}",competition="ARGENLIGA",division="A Z1",
                 round_name=None,venue=None,source_url=None,source_kind="import")
        upsert_match(db,d);n+=1
    audit(db,user,"import","ARGENLIGA",detail=f"{n} partidos")
    return {"ok":True,"imported":n}

@app.get("/api/audit")
def audit_log(db:Session=Depends(get_db),user=Depends(require_roles("admin"))):
    rows=db.query(AuditLog).order_by(AuditLog.id.desc()).limit(100).all()
    return [{c.name:getattr(x,c.name) for c in x.__table__.columns} for x in rows]

# ---- Módulo deportivo V5 ----

@app.get("/api/teams")
def teams(db:Session=Depends(get_db)):
    rows=db.query(Team).filter(Team.is_active==True).order_by(Team.competition,Team.division).all()
    return [{c.name:getattr(x,c.name) for c in x.__table__.columns} for x in rows]

@app.post("/api/teams")
def create_team(payload:TeamIn,db:Session=Depends(get_db),user=Depends(require_roles("admin"))):
    t=Team(**payload.model_dump());db.add(t);db.commit();db.refresh(t)
    audit(db,user,"create","team",t.id,f"{t.competition} {t.division}")
    return {"ok":True,"id":t.id}

@app.get("/api/people")
def people(role:str|None=None,db:Session=Depends(get_db)):
    q=db.query(Person).filter(Person.is_active==True)
    if role:q=q.filter(Person.role==role)
    rows=q.order_by(Person.last_name,Person.first_name).all()
    return [{c.name:getattr(x,c.name) for c in x.__table__.columns} for x in rows]

@app.post("/api/people")
def create_person(payload:PersonIn,db:Session=Depends(get_db),user=Depends(require_roles("admin","delegado","dt"))):
    p=Person(**payload.model_dump());db.add(p);db.commit();db.refresh(p);audit(db,user,"create","person",p.id,f"{p.first_name} {p.last_name}")
    return {"ok":True,"id":p.id}

@app.get("/api/teams/{team_id}/members")
def team_members(team_id:int,db:Session=Depends(get_db)):
    rows=db.query(TeamMember,Person).join(Person,TeamMember.person_id==Person.id).filter(TeamMember.team_id==team_id).all()
    return [{"membership_id":tm.id,"person_id":p.id,"first_name":p.first_name,"last_name":p.last_name,
             "role":tm.member_role,"position":p.position,"shirt_number":p.shirt_number} for tm,p in rows]

@app.post("/api/teams/{team_id}/members")
def add_team_member(team_id:int,payload:TeamMemberIn,db:Session=Depends(get_db),user=Depends(require_roles("admin","delegado","dt"))):
    exists=db.query(TeamMember).filter(TeamMember.team_id==team_id,TeamMember.person_id==payload.person_id,TeamMember.season==2026).first()
    if exists:return {"ok":True,"id":exists.id}
    tm=TeamMember(team_id=team_id,person_id=payload.person_id,season=2026,member_role=payload.member_role)
    db.add(tm);db.commit();db.refresh(tm);audit(db,user,"add_member","team",team_id,str(payload.person_id))
    return {"ok":True,"id":tm.id}

@app.post("/api/callups")
def create_callup(payload:CallUpIn,db:Session=Depends(get_db),user=Depends(require_roles("admin","delegado","dt"))):
    c=CallUp(match_id=payload.match_id,team_id=payload.team_id,created_by=user.id,status="published",notes=payload.notes)
    db.add(c);db.commit();db.refresh(c)
    for pid in payload.person_ids:
        db.add(CallUpPlayer(callup_id=c.id,person_id=pid))
    db.commit();audit(db,user,"create","callup",c.id,f"match={payload.match_id}, team={payload.team_id}")
    return {"ok":True,"id":c.id}

@app.get("/api/callups/{callup_id}")
def get_callup(callup_id:int,db:Session=Depends(get_db)):
    c=db.get(CallUp,callup_id)
    if not c:raise HTTPException(status_code=404,detail="Convocatoria inexistente")
    rows=db.query(CallUpPlayer,Person).join(Person,CallUpPlayer.person_id==Person.id).filter(CallUpPlayer.callup_id==callup_id).all()
    return {"id":c.id,"match_id":c.match_id,"team_id":c.team_id,"status":c.status,"notes":c.notes,
            "players":[{"id":cp.id,"person_id":p.id,"name":f"{p.first_name} {p.last_name}",
                        "attendance":cp.attendance,"starter":cp.starter,"minutes":cp.minutes} for cp,p in rows]}

@app.patch("/api/callup-players/{row_id}")
def update_attendance(row_id:int,payload:AttendanceIn,db:Session=Depends(get_db),user=Depends(require_roles("admin","delegado","dt"))):
    cp=db.get(CallUpPlayer,row_id)
    if not cp:raise HTTPException(status_code=404,detail="Registro inexistente")
    cp.attendance=payload.attendance;cp.starter=payload.starter;cp.minutes=payload.minutes
    db.commit();audit(db,user,"update","attendance",row_id,payload.attendance)
    return {"ok":True}

@app.post("/api/player-stats")
def add_player_stats(payload:PlayerStatIn,db:Session=Depends(get_db),user=Depends(require_roles("admin","delegado","dt"))):
    # update-or-create by match/person
    obj=db.query(PlayerMatchStat).filter(PlayerMatchStat.match_id==payload.match_id,PlayerMatchStat.person_id==payload.person_id).first()
    if not obj:
        obj=PlayerMatchStat(**payload.model_dump());db.add(obj)
    else:
        for k,v in payload.model_dump().items():setattr(obj,k,v)
    db.commit();db.refresh(obj);audit(db,user,"upsert","player_stats",obj.id,f"match={payload.match_id}")
    return {"ok":True,"id":obj.id}

@app.get("/api/suspensions")
def suspensions(active_only:bool=True,db:Session=Depends(get_db)):
    q=db.query(Suspension,Person).join(Person,Suspension.person_id==Person.id)
    if active_only:q=q.filter(Suspension.status=="active")
    rows=q.all()
    return [{"id":s.id,"person_id":p.id,"name":f"{p.first_name} {p.last_name}",
             "competition":s.competition,"reason":s.reason,"start_date":s.start_date,"end_date":s.end_date,"status":s.status} for s,p in rows]

# ---- Comunidad V6 ----

@app.get("/api/players/{person_id}/profile")
def player_profile(person_id:int, db:Session=Depends(get_db)):
    p=db.get(Person,person_id)
    if not p: raise HTTPException(status_code=404,detail="Jugador inexistente")
    stats=db.query(PlayerMatchStat,Match).join(Match,Match.id==PlayerMatchStat.match_id).filter(PlayerMatchStat.person_id==person_id).all()
    total={"matches":0,"goals":0,"assists":0,"yellow_cards":0,"red_cards":0}
    seen=set()
    for s,m in stats:
        seen.add(m.id)
        total["goals"]+=s.goals or 0; total["assists"]+=s.assists or 0
        total["yellow_cards"]+=s.yellow_cards or 0; total["red_cards"]+=s.red_cards or 0
    total["matches"]=len(seen)
    teams=db.query(TeamMember,Team).join(Team,Team.id==TeamMember.team_id).filter(TeamMember.person_id==person_id).all()
    awards=db.query(PlayerOfMatch).filter(PlayerOfMatch.person_id==person_id).count()
    media=db.query(MediaItem).filter(MediaItem.person_id==person_id,MediaItem.published==True).order_by(MediaItem.id.desc()).limit(20).all()
    return {
      "id":p.id,"first_name":p.first_name,"last_name":p.last_name,"position":p.position,
      "shirt_number":p.shirt_number,"photo_url":p.photo_url,"stats":total,"player_of_match":awards,
      "teams":[{"team_id":t.id,"competition":t.competition,"division":t.division,"season":t.season} for tm,t in teams],
      "media":[{"id":x.id,"url":x.url,"caption":x.caption,"title":x.title} for x in media]
    }

@app.get("/api/community/top-scorers")
def top_scorers(competition:str|None=None, limit:int=10, db:Session=Depends(get_db)):
    q=db.query(Person,PlayerMatchStat,Match).join(PlayerMatchStat,Person.id==PlayerMatchStat.person_id).join(Match,Match.id==PlayerMatchStat.match_id)
    if competition:q=q.filter(Match.competition==competition)
    agg={}
    for p,s,m in q.all():
        a=agg.setdefault(p.id,{"person_id":p.id,"name":f"{p.first_name} {p.last_name}","shirt_number":p.shirt_number,"goals":0,"assists":0})
        a["goals"]+=s.goals or 0;a["assists"]+=s.assists or 0
    return sorted(agg.values(),key=lambda x:(-x["goals"],-x["assists"],x["name"]))[:limit]

@app.post("/api/community/player-of-match")
def set_player_of_match(payload:PlayerOfMatchIn,db:Session=Depends(get_db),user=Depends(require_roles("admin","delegado","dt"))):
    obj=db.query(PlayerOfMatch).filter(PlayerOfMatch.match_id==payload.match_id).first()
    if not obj:
        obj=PlayerOfMatch(**payload.model_dump());db.add(obj)
    else:
        obj.person_id=payload.person_id;obj.note=payload.note
    db.commit();db.refresh(obj);audit(db,user,"upsert","player_of_match",obj.id,str(payload.match_id))
    return {"ok":True,"id":obj.id}

@app.get("/api/community/player-of-match")
def get_player_of_match(limit:int=10,db:Session=Depends(get_db)):
    rows=db.query(PlayerOfMatch,Person,Match).join(Person,Person.id==PlayerOfMatch.person_id).join(Match,Match.id==PlayerOfMatch.match_id).order_by(PlayerOfMatch.id.desc()).limit(limit).all()
    return [{"id":pom.id,"match_id":m.id,"person_id":p.id,"name":f"{p.first_name} {p.last_name}",
             "competition":m.competition,"division":m.division,"home":m.home,"away":m.away,"note":pom.note} for pom,p,m in rows]

@app.post("/api/media")
def add_media(payload:MediaIn,db:Session=Depends(get_db),user=Depends(require_roles("admin","delegado","dt"))):
    x=MediaItem(**payload.model_dump());db.add(x);db.commit();db.refresh(x);audit(db,user,"create","media",x.id,payload.url)
    return {"ok":True,"id":x.id}

@app.get("/api/media")
def media(match_id:int|None=None,person_id:int|None=None,db:Session=Depends(get_db)):
    q=db.query(MediaItem).filter(MediaItem.published==True)
    if match_id:q=q.filter(MediaItem.match_id==match_id)
    if person_id:q=q.filter(MediaItem.person_id==person_id)
    rows=q.order_by(MediaItem.id.desc()).limit(100).all()
    return [{c.name:getattr(x,c.name) for c in x.__table__.columns} for x in rows]

@app.get("/api/favorites")
def get_favorites(db:Session=Depends(get_db),user=Depends(get_current_user)):
    rows=db.query(Favorite).filter(Favorite.user_id==user.id).all()
    return [{"id":x.id,"favorite_type":x.favorite_type,"favorite_id":x.favorite_id} for x in rows]

@app.post("/api/favorites")
def add_favorite(payload:FavoriteIn,db:Session=Depends(get_db),user=Depends(get_current_user)):
    obj=db.query(Favorite).filter(Favorite.user_id==user.id,Favorite.favorite_type==payload.favorite_type,Favorite.favorite_id==payload.favorite_id).first()
    if not obj:
        obj=Favorite(user_id=user.id,**payload.model_dump());db.add(obj);db.commit();db.refresh(obj)
    return {"ok":True,"id":obj.id}

@app.delete("/api/favorites/{favorite_type}/{favorite_id}")
def delete_favorite(favorite_type:str,favorite_id:str,db:Session=Depends(get_db),user=Depends(get_current_user)):
    obj=db.query(Favorite).filter(Favorite.user_id==user.id,Favorite.favorite_type==favorite_type,Favorite.favorite_id==favorite_id).first()
    if obj:db.delete(obj);db.commit()
    return {"ok":True}

@app.get("/api/notification-preferences")
def get_notification_preferences(db:Session=Depends(get_db),user=Depends(get_current_user)):
    p=db.query(NotificationPreference).filter(NotificationPreference.user_id==user.id).first()
    if not p:
        p=NotificationPreference(user_id=user.id);db.add(p);db.commit();db.refresh(p)
    return {c.name:getattr(p,c.name) for c in p.__table__.columns}

@app.put("/api/notification-preferences")
def set_notification_preferences(payload:NotificationPrefsIn,db:Session=Depends(get_db),user=Depends(get_current_user)):
    p=db.query(NotificationPreference).filter(NotificationPreference.user_id==user.id).first()
    if not p:
        p=NotificationPreference(user_id=user.id);db.add(p)
    for k,v in payload.model_dump().items():setattr(p,k,v)
    db.commit();audit(db,user,"update","notification_preferences",p.id)
    return {"ok":True}

app.mount("/static",StaticFiles(directory=BASE/"static"),name="static")
@app.get("/")
def root(): return FileResponse(BASE/"static"/"index.html")