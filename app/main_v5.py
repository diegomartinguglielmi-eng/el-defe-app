from .main import app, scheduler
from .pending import router
from .fefi_results import router as fefi_results_router
from .db import SessionLocal
from .models import User
from .auth import hash_password
from .config import settings

app.include_router(router)
app.include_router(fefi_results_router)

@app.on_event("startup")
def v5_startup_hardening():
    # V5 replaces the original direct-publish daily job with a Railway cron
    # that creates approval-pending changes instead.
    try:
        scheduler.remove_job("daily-sync")
    except Exception:
        pass

    # Rotate the configured administrator password on deploy and disable the
    # legacy development account if a different production email is used.
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
