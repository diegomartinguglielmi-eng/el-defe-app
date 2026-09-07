from datetime import datetime, timezone
from pathlib import Path
from threading import Thread

from fastapi.responses import FileResponse
from sqlalchemy import text

from .main import app, scheduler
from .pending import router, run_fefi_pending_sync, FefiPendingChange, _apply_change
from .fefi_results import router as fefi_results_router
from .fefi_schedules import router as fefi_schedules_router
from .fefi_freshness import router as fefi_freshness_router
from .notifications_v5 import router as notifications_router
from .data_quality import router as data_quality_router
from .home_v5 import router as home_router
from .db import SessionLocal
from .models import User, Match, SyncRun
from .auth import hash_password
from .config import settings
from .sync import sync_laamba
from .argenliga_baseline import bootstrap_argenliga_2026

app.include_router(router);app.include_router(fefi_results_router);app.include_router(fefi_schedules_router);app.include_router(fefi_freshness_router);app.include_router(notifications_router);app.include_router(data_quality_router);app.include_router(home_router)
BASE=Path(__file__).resolve().parent
LAAMBA_BOOTSTRAP_LOCK=2026090701;ARGENLIGA_BOOTSTRAP_LOCK=2026090702;FEFI_BOOTSTRAP_LOCK=2026090703

@app.get("/sw.js",include_in_schema=False)
def service_worker():return FileResponse(BASE/"static"/"sw.js",media_type="application/javascript",headers={"Service-Worker-Allowed":"/","Cache-Control":"no-cache"})

def _bootstrap_laamba_clausura():
    db=SessionLocal();locked=False
    try:
        locked=bool(db.execute(text("SELECT pg_try_advisory_lock(:k)"),{"k":LAAMBA_BOOTSTRAP_LOCK}).scalar())
        if not locked:return
        exists=db.query(Match).filter(Match.competition=="LAAMBA",Match.external_key.like("%|CLAUSURA|%")).first()
        print({"laamba_bootstrap":"skipped","reason":"clausura_already_present"} if exists else {"laamba_bootstrap":"completed",**sync_laamba(db)})
    except Exception as exc:print({"laamba_bootstrap":"error","detail":str(exc)})
    finally:
        if locked:
            try:db.execute(text("SELECT pg_advisory_unlock(:k)"),{"k":LAAMBA_BOOTSTRAP_LOCK});db.commit()
            except Exception:db.rollback()
        db.close()

def _bootstrap_argenliga():
    db=SessionLocal();locked=False
    try:
        locked=bool(db.execute(text("SELECT pg_try_advisory_lock(:k)"),{"k":ARGENLIGA_BOOTSTRAP_LOCK}).scalar())
        if not locked:return
        print({"argenliga_bootstrap":"completed",**bootstrap_argenliga_2026(db)})
    except Exception as exc:db.rollback();print({"argenliga_bootstrap":"error","detail":str(exc)})
    finally:
        if locked:
            try:db.execute(text("SELECT pg_advisory_unlock(:k)"),{"k":ARGENLIGA_BOOTSTRAP_LOCK});db.commit()
            except Exception:db.rollback()
        db.close()

def _repair_fefi_baseline(db):
    """Promote the already-approved first FEFI baseline to canonical Clausura keys."""
    changes=db.query(FefiPendingChange).filter(FefiPendingChange.status=="approved").all()
    repaired=0
    for change in changes:
        if "|CLAUSURA|" not in (change.external_key or ""):continue
        payload=__import__('json').loads(change.after_json)
        row=db.query(Match).filter(Match.competition=="FEFI",Match.division=="Zona H",Match.round_name==payload.get("round_name")).order_by(Match.id.desc()).first()
        if row and "|CLAUSURA|" not in (row.external_key or ""):
            _apply_change(db,change);repaired+=1
    if repaired:db.commit()
    return repaired

def _adopt_first_fefi_baseline(db):
    pending=db.query(FefiPendingChange).filter(FefiPendingChange.status=="pending").all()
    # Only auto-adopt the original 15-row baseline; later changes must stay pending for admin approval.
    approved=db.query(FefiPendingChange).filter(FefiPendingChange.status=="approved").count()
    if approved or len(pending)!=15:return 0
    now=datetime.now(timezone.utc)
    for change in pending:_apply_change(db,change);change.status="approved";change.resolved_at=now
    db.commit();return len(pending)

def _bootstrap_fefi_freshness():
    db=SessionLocal();locked=False
    try:
        locked=bool(db.execute(text("SELECT pg_try_advisory_lock(:k)"),{"k":FEFI_BOOTSTRAP_LOCK}).scalar())
        if not locked:print({"fefi_bootstrap":"skipped","reason":"another_service_is_loading"});return
        repaired=_repair_fefi_baseline(db)
        exists=db.query(SyncRun).filter(SyncRun.source=="FEFI_PENDING").first()
        if exists:
            adopted=_adopt_first_fefi_baseline(db);repaired+=_repair_fefi_baseline(db)
            print({"fefi_bootstrap":"ready","baseline_adopted":adopted,"baseline_repaired":repaired});return
        result=run_fefi_pending_sync(db);adopted=_adopt_first_fefi_baseline(db) if result.get("ok") else 0;repaired+=_repair_fefi_baseline(db)
        print({"fefi_bootstrap":"completed",**result,"baseline_adopted":adopted,"baseline_repaired":repaired})
    except Exception as exc:db.rollback();print({"fefi_bootstrap":"error","detail":str(exc)})
    finally:
        if locked:
            try:db.execute(text("SELECT pg_advisory_unlock(:k)"),{"k":FEFI_BOOTSTRAP_LOCK});db.commit()
            except Exception:db.rollback()
        db.close()

@app.on_event("startup")
def v5_startup_hardening():
    try:scheduler.remove_job("daily-sync")
    except Exception:pass
    db=SessionLocal()
    try:
        admin=db.query(User).filter(User.email==settings.admin_email).first()
        if admin:admin.password_hash=hash_password(settings.admin_password);admin.role="admin";admin.is_active=True
        legacy=db.query(User).filter(User.email=="admin@elde.fe").first()
        if legacy and legacy.email!=settings.admin_email:legacy.is_active=False;legacy.role="lector"
        db.commit()
    finally:db.close()
    Thread(target=_bootstrap_laamba_clausura,daemon=True).start();Thread(target=_bootstrap_argenliga,daemon=True).start();Thread(target=_bootstrap_fefi_freshness,daemon=True).start()
