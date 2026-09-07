from .main import app, scheduler
from .pending import router
from .fefi_results import router as fefi_results_router
from .fefi_schedules import router as fefi_schedules_router
from .fefi_freshness import router as fefi_freshness_router
from .notifications_v5 import router as notifications_router
from .data_quality import router as data_quality_router
from .db import SessionLocal
from .models import User
from .auth import hash_password
from .config import settings

app.include_router(router)
app.include_router(fefi_results_router)
app.include_router(fefi_schedules_router)
app.include_router(fefi_freshness_router)
app.include_router(notifications_router)
app.include_router(data_quality_router)

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
