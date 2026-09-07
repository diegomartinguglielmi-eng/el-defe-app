from pathlib import Path
from threading import Thread

from fastapi.responses import FileResponse

from .main import app, scheduler
from .pending import router
from .fefi_results import router as fefi_results_router
from .fefi_schedules import router as fefi_schedules_router
from .fefi_freshness import router as fefi_freshness_router
from .notifications_v5 import router as notifications_router
from .data_quality import router as data_quality_router
from .db import SessionLocal
from .models import User, Match
from .auth import hash_password
from .config import settings
from .sync import sync_laamba

app.include_router(router)
app.include_router(fefi_results_router)
app.include_router(fefi_schedules_router)
app.include_router(fefi_freshness_router)
app.include_router(notifications_router)
app.include_router(data_quality_router)

BASE = Path(__file__).resolve().parent


@app.get("/sw.js", include_in_schema=False)
def service_worker():
    return FileResponse(
        BASE / "static" / "sw.js",
        media_type="application/javascript",
        headers={"Service-Worker-Allowed": "/", "Cache-Control": "no-cache"},
    )


def _bootstrap_laamba_clausura():
    db = SessionLocal()
    try:
        exists = db.query(Match).filter(
            Match.competition == "LAAMBA",
            Match.external_key.like("%|CLAUSURA|%"),
        ).first()
        if not exists:
            sync_laamba(db)
    except Exception as exc:
        print({"laamba_bootstrap": "error", "detail": str(exc)})
    finally:
        db.close()


@app.on_event("startup")
def v5_startup_hardening():
    try:
        scheduler.remove_job("daily-sync")
    except Exception:
        pass

    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == settings.admin_email).first()
        if admin:
            admin.password_hash = hash_password(settings.admin_password)
            admin.role = "admin"
            admin.is_active = True
        legacy = db.query(User).filter(User.email == "admin@elde.fe").first()
        if legacy and legacy.email != settings.admin_email:
            legacy.is_active = False
            legacy.role = "lector"
        db.commit()
    finally:
        db.close()

    Thread(target=_bootstrap_laamba_clausura, daemon=True).start()
