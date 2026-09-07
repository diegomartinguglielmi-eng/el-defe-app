from datetime import datetime, timezone
import json

from .db import Base, engine, SessionLocal
from .pending import run_fefi_pending_sync, FefiPendingChange
from .fefi_results import sync_verified_results
from .fefi_mayores import sync_fefi_mayores_b
from .superliga_sync import sync_superliga
from .sync import sync_laamba
from .data_quality import build_data_quality
from .notification_reminders import run as run_notification_reminders
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
    output = dict(result)

    db = SessionLocal()
    try:
        # Keep every structurally automatable competition fresh on the same
        # four-hour production cadence. Argenliga remains assisted/manual.
        output["laamba"] = sync_laamba(db)
        output["fefi_mayores_b"] = sync_fefi_mayores_b(db)
        output["superliga"] = sync_superliga(db)
        if not result.get("ok"):
            output["source_alert_created"] = _create_source_alert_after_two_failures(db)
        else:
            _resolve_source_alerts(db)
            output.update(sync_verified_results(db))
            output["source_health"] = "ok"

        # Produce a read-only quality snapshot on every sync so production
        # inconsistencies can be diagnosed from logs without touching the DB.
        try:
            output["data_quality"] = build_data_quality(db)
        except Exception as exc:
            db.rollback()
            output["data_quality"] = {"health": "error", "error": str(exc)}
    finally:
        db.close()

    try:
        output["reminders"] = run_notification_reminders()
    except Exception as exc:
        output["reminders"] = {"ok": False, "error": str(exc)}

    print(output)
    if not result.get("ok"):
        raise SystemExit(1)
