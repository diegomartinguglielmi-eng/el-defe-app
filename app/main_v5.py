from datetime import datetime, timezone
from pathlib import Path
from threading import Thread

from fastapi.responses import FileResponse
from sqlalchemy import text, func

from .main import app, scheduler
from .pending import router, run_fefi_pending_sync, FefiPendingChange, _apply_change
from .fefi_results import router as fefi_results_router
from .fefi_schedules import router as fefi_schedules_router
from .fefi_freshness import router as fefi_freshness_router
from .fefi_standings import router as fefi_standings_router
from .notifications_v5 import router as notifications_router
from .data_quality import router as data_quality_router
from .home_v5 import router as home_router
from .following_v5 import router as following_router
from .store_v5 import router as store_router, bootstrap_store
from .user_admin import router as user_admin_router
from .sponsors_v5 import router as sponsors_router, bootstrap_sponsors
from .league_tournaments import router as league_tournaments_router
from .league_stats import router as league_stats_router
from .db import SessionLocal
from .models import User, Match, SyncRun, Person, TeamMember, CallUpPlayer, PlayerMatchStat, Suspension, MediaItem, PlayerOfMatch
from .auth import hash_password
from .availability_v1 import UserPlayerLink, UserPlayerRequest
from .availability_player_v2 import PlayerAvailabilityResponse
from .config import settings
from .sync import sync_laamba
from .argenliga_baseline import bootstrap_argenliga_2026
from .argenliga_sync import sync_argenliga
from .fefi_mayores import sync_fefi_mayores_b
from .superliga_sync import sync_superliga

app.include_router(router);app.include_router(fefi_results_router);app.include_router(fefi_schedules_router);app.include_router(fefi_freshness_router);app.include_router(fefi_standings_router);app.include_router(notifications_router);app.include_router(data_quality_router);app.include_router(home_router);app.include_router(following_router);app.include_router(store_router);app.include_router(user_admin_router);app.include_router(sponsors_router);app.include_router(league_tournaments_router);app.include_router(league_stats_router)
BASE=Path(__file__).resolve().parent
LAAMBA_BOOTSTRAP_LOCK=2026090701;ARGENLIGA_BOOTSTRAP_LOCK=2026090702;FEFI_BOOTSTRAP_LOCK=2026090703;FEFI_MAYORES_BOOTSTRAP_LOCK=2026090704;SUPERLIGA_BOOTSTRAP_LOCK=2026090705

@app.get('/sw.js',include_in_schema=False)
def service_worker():return FileResponse(BASE/'static'/'sw.js',media_type='application/javascript',headers={'Service-Worker-Allowed':'/','Cache-Control':'no-cache'})

def _with_lock(key,fn,label):
    db=SessionLocal();locked=False
    try:
        locked=bool(db.execute(text('SELECT pg_try_advisory_lock(:k)'),{'k':key}).scalar())
        if not locked:
            print({label:{'status':'skipped','reason':'advisory_lock_busy'}})
            return
        print({label:{'status':'started'}})
        result=fn(db)
        print({label:{'status':'completed','result':result}})
    except Exception as exc:
        db.rollback();print({label:{'status':'error','detail':str(exc)}})
    finally:
        if locked:
            try:db.execute(text('SELECT pg_advisory_unlock(:k)'),{'k':key});db.commit()
            except Exception as exc:db.rollback();print({label:{'status':'unlock_error','detail':str(exc)}})
        db.close()

def _bootstrap_laamba_clausura():_with_lock(LAAMBA_BOOTSTRAP_LOCK,sync_laamba,'laamba_sync')
def _bootstrap_argenliga():
    print({'argenliga_bootstrap':{'status':'thread_started'}})
    def run(db):
        print({'argenliga_bootstrap':{'status':'baseline_started'}})
        base=bootstrap_argenliga_2026(db)
        print({'argenliga_bootstrap':{'status':'baseline_completed','result':base}})
        print({'argenliga_bootstrap':{'status':'live_started'}})
        live=sync_argenliga(db)
        print({'argenliga_bootstrap':{'status':'live_completed','result':live}})
        return {'baseline':base,'live':live}
    _with_lock(ARGENLIGA_BOOTSTRAP_LOCK,run,'argenliga_sync')
def _bootstrap_fefi_mayores():_with_lock(FEFI_MAYORES_BOOTSTRAP_LOCK,sync_fefi_mayores_b,'fefi_mayores_bootstrap')
def _bootstrap_superliga():_with_lock(SUPERLIGA_BOOTSTRAP_LOCK,sync_superliga,'superliga_bootstrap')

def _repair_fefi_baseline(db):
    changes=db.query(FefiPendingChange).filter(FefiPendingChange.status=='approved').all();repaired=0
    for change in changes:
        if '|CLAUSURA|' not in (change.external_key or ''):continue
        payload=__import__('json').loads(change.after_json)
        row=db.query(Match).filter(Match.competition=='FEFI',Match.division=='Zona H',Match.round_name==payload.get('round_name')).order_by(Match.id.desc()).first()
        if row and '|CLAUSURA|' not in (row.external_key or ''):_apply_change(db,change);repaired+=1
    if repaired:db.commit()
    return repaired

def _adopt_first_fefi_baseline(db):
    pending=db.query(FefiPendingChange).filter(FefiPendingChange.status=='pending').all();approved=db.query(FefiPendingChange).filter(FefiPendingChange.status=='approved').count()
    if approved or len(pending)!=15:return 0
    now=datetime.now(timezone.utc)
    for change in pending:_apply_change(db,change);change.status='approved';change.resolved_at=now
    db.commit();return len(pending)

def _bootstrap_fefi_freshness():
    db=SessionLocal();locked=False
    try:
        locked=bool(db.execute(text('SELECT pg_try_advisory_lock(:k)'),{'k':FEFI_BOOTSTRAP_LOCK}).scalar())
        if not locked:return
        repaired=_repair_fefi_baseline(db);exists=db.query(SyncRun).filter(SyncRun.source=='FEFI_PENDING').first()
        if exists:
            adopted=_adopt_first_fefi_baseline(db)
            repaired+=_repair_fefi_baseline(db)
            print({'fefi_bootstrap':'ready','baseline_adopted':adopted,'baseline_repaired':repaired});return
        result=run_fefi_pending_sync(db)
        adopted=_adopt_first_fefi_baseline(db) if result.get('ok') else 0
        if adopted:repaired+=_repair_fefi_baseline(db)
        print({'fefi_bootstrap':'completed',**result,'baseline_adopted':adopted,'baseline_repaired':repaired})
    except Exception as exc:db.rollback();print({'fefi_bootstrap':'error','detail':str(exc)})
    finally:
        if locked:
            try:db.execute(text('SELECT pg_advisory_unlock(:k)'),{'k':FEFI_BOOTSTRAP_LOCK});db.commit()
            except Exception:db.rollback()
        db.close()

def _cleanup_laamba_conflicts():
    db=SessionLocal();removed=[]
    try:
        groups=(db.query(Match.division,Match.round_name,func.count(Match.id).label('n')).filter(Match.competition=='LAAMBA',Match.source_kind=='sync_clausura').group_by(Match.division,Match.round_name).having(func.count(Match.id)>1).all())
        for g in groups:
            rows=db.query(Match).filter(Match.competition=='LAAMBA',Match.division==g.division,Match.round_name==g.round_name,Match.source_kind=='sync_clausura').all();finals=[r for r in rows if r.status=='final'];scheduled=[r for r in rows if r.status!='final']
            if len(finals)==1 and scheduled:
                for row in scheduled:removed.append(row.id);db.delete(row)
        db.commit();print({'laamba_conflict_cleanup':{'removed':len(removed)}})
    except Exception as exc:db.rollback();print({'laamba_conflict_cleanup_error':str(exc)})
    finally:db.close()

def _cleanup_e2e_players():
    db=SessionLocal();removed=[]
    try:
        people=db.query(Person).filter(Person.first_name.in_(['Benjamín','Benjamin','Santiago']),Person.last_name=='E2E').all()
        for person in people:
            pid=person.id
            db.query(PlayerAvailabilityResponse).filter(PlayerAvailabilityResponse.person_id==pid).delete(synchronize_session=False)
            db.query(UserPlayerRequest).filter(UserPlayerRequest.person_id==pid).delete(synchronize_session=False)
            db.query(UserPlayerLink).filter(UserPlayerLink.person_id==pid).delete(synchronize_session=False)
            db.query(CallUpPlayer).filter(CallUpPlayer.person_id==pid).delete(synchronize_session=False)
            db.query(PlayerMatchStat).filter(PlayerMatchStat.person_id==pid).delete(synchronize_session=False)
            db.query(Suspension).filter(Suspension.person_id==pid).delete(synchronize_session=False)
            db.query(MediaItem).filter(MediaItem.person_id==pid).delete(synchronize_session=False)
            db.query(PlayerOfMatch).filter(PlayerOfMatch.person_id==pid).delete(synchronize_session=False)
            db.query(TeamMember).filter(TeamMember.person_id==pid).delete(synchronize_session=False)
            removed.append(f'{person.first_name} {person.last_name}#{pid}')
            db.delete(person)
        db.commit();print({'e2e_player_cleanup':{'removed':removed,'count':len(removed)}})
    except Exception as exc:
        db.rollback();print({'e2e_player_cleanup_error':str(exc)})
    finally:db.close()

def _bootstrap_content():
    db=SessionLocal()
    try:
        print({'store_bootstrap':bootstrap_store(db)})
        print({'sponsors_bootstrap':bootstrap_sponsors(db)})
    except Exception as exc:db.rollback();print({'content_bootstrap':'error','detail':str(exc)})
    finally:db.close()

@app.on_event('startup')
def v5_startup_hardening():
    try:scheduler.remove_job('daily-sync')
    except Exception:pass
    scheduler.add_job(_bootstrap_superliga,'interval',hours=1,id='superliga-hourly-sync',replace_existing=True,max_instances=1,coalesce=True)
    db=SessionLocal()
    try:
        admin=db.query(User).filter(User.email==settings.admin_email).first()
        if admin:admin.password_hash=hash_password(settings.admin_password);admin.role='admin';admin.is_active=True
        profe_email=getattr(settings,'profe_email','profe@elde.fe')
        profe_password=getattr(settings,'profe_password','')
        profe=db.query(User).filter(User.email==profe_email).first()
        if profe_password:
            if profe:
                profe.password_hash=hash_password(profe_password);profe.role='profe';profe.is_active=True
            else:
                db.add(User(email=profe_email,password_hash=hash_password(profe_password),role='profe',is_active=True))
        db.commit()
    finally:db.close()
    Thread(target=_bootstrap_laamba_clausura,daemon=True).start();Thread(target=_bootstrap_argenliga,daemon=True).start();Thread(target=_bootstrap_fefi_freshness,daemon=True).start();Thread(target=_bootstrap_fefi_mayores,daemon=True).start();Thread(target=_bootstrap_superliga,daemon=True).start();Thread(target=_cleanup_laamba_conflicts,daemon=True).start();Thread(target=_cleanup_e2e_players,daemon=True).start();Thread(target=_bootstrap_content,daemon=True).start()