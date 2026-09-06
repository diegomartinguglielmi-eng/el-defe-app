from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .auth import require_roles
from .db import get_db
from .models import SyncRun
from .pending import FefiRawSnapshot

router = APIRouter(prefix="/api/fefi", tags=["FEFI"])


@router.get("/freshness")
def fefi_freshness(
    db: Session = Depends(get_db),
    user = Depends(require_roles("admin", "delegado")),
):
    runs = (
        db.query(SyncRun)
        .filter(SyncRun.source == "FEFI_PENDING")
        .order_by(SyncRun.id.desc())
        .limit(50)
        .all()
    )
    latest = runs[0] if runs else None
    latest_success = next((r for r in runs if r.status == "ok"), None)
    consecutive_failures = 0
    for row in runs:
        if row.status == "error":
            consecutive_failures += 1
        else:
            break

    snapshot = (
        db.query(FefiRawSnapshot)
        .order_by(FefiRawSnapshot.id.desc())
        .first()
    )

    health = "ok"
    if consecutive_failures >= 2:
        health = "error"
    elif consecutive_failures == 1:
        health = "warning"

    return {
        "health": health,
        "consecutive_failures": consecutive_failures,
        "latest_run": None if not latest else {
            "status": latest.status,
            "detail": latest.detail,
            "created_at": latest.created_at,
        },
        "last_success": None if not latest_success else {
            "detail": latest_success.detail,
            "created_at": latest_success.created_at,
        },
        "last_snapshot": None if not snapshot else {
            "sha256": snapshot.sha256,
            "fetched_at": snapshot.fetched_at,
        },
        "policy": "keep_last_good_state",
    }
