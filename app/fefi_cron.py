from datetime import datetime, timezone
import json

from .db import Base, engine, SessionLocal
from .pending import run_fefi_pending_sync, FefiPendingChange
from .fefi_results import sync_verified_results
from .models import SyncRun


def _resolve_source_alerts(db):
    rows = db.query(FefiPendingChange).filter(
        FefiPendingChange.change_type == "source_error",
        FefiPendingChange.status == "pending",
    ).all()
    for row in rows:
        row.status = "superseded"
        row.resolved_at = datetime.now(timezone.utc)
    if rows:
        db.commit()


def _create_source_alert_after_two_failures(db):
    recent = db.query(SyncRun).filter(
        SyncRun.source == "FEFI_PENDING"
    ).order_by(SyncRun.id.desc()).limit(2).all()
    if len(recent) < 2 or any(r.status != "error" for r in recent):
        return False

    existing = db.query(FefiPendingChange).filter(
        FefiPendingChange.change_type == "source_error",
        FefiPendingChange.status == "pending",
    ).first()
    if existing:
        return False

    latest = recent[0]
    detail = "FEFI: la fuente falló en dos sincronizaciones consecutivas. Se conserva el último dato publicado válido."
    payload = {
        "source": "FEFI 2026 · Zona H",
        "status": "unavailable",
        "last_error": latest.detail,
        "policy": "keep_last_good_state",
    }
    db.add(FefiPendingChange(
        external_key=f"FEFI|SOURCE|FAILURE|{latest.id}",
        change_type="source_error",
        detail=detail,
        before_json=None,
        after_json=json.dumps(payload, ensure_ascii=False),
        status="pending",
    ))
    db.commit()
    return True


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    result = run_fefi_pending_sync()

    db = SessionLocal()
    try:
        if not result.get("ok"):
            alerted = _create_source_alert_after_two_failures(db)
            print({**result, "source_alert_created": alerted})
            raise SystemExit(1)

        _resolve_source_alerts(db)
        results = sync_verified_results(db)
        print({**result, **results, "source_health": "ok"})
    finally:
        db.close()
