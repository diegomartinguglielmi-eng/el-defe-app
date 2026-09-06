from .main import app, scheduler
from .pending import router

app.include_router(router)

@app.on_event("startup")
def disable_legacy_direct_sync():
    # V5 replaces the original direct-publish daily job with a Railway cron
    # that creates approval-pending changes instead.
    try:
        scheduler.remove_job("daily-sync")
    except Exception:
        pass
