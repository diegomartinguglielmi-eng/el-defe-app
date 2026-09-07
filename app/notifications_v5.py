import hashlib
import json
import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from pywebpush import WebPushException, webpush
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, Session, mapped_column
from sqlalchemy.sql import func

from .auth import require_roles
from .db import Base, get_db


class NotificationEvent(Base):
    __tablename__ = "notification_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_type: Mapped[str] = mapped_column(String(40), index=True)
    title: Mapped[str] = mapped_column(String(180))
    body: Mapped[str] = mapped_column(Text)
    competition: Mapped[Optional[str]] = mapped_column(String(50), index=True)
    category: Mapped[Optional[str]] = mapped_column(String(40), index=True)
    match_id: Mapped[Optional[int]] = mapped_column(ForeignKey("matches.id"), index=True)
    urgent: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    endpoint_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    endpoint: Mapped[str] = mapped_column(Text)
    p256dh: Mapped[str] = mapped_column(Text)
    auth: Mapped[str] = mapped_column(Text)
    followed_json: Mapped[str] = mapped_column(Text, default="[]")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class UrgentNoticeIn(BaseModel):
    title: str
    body: str
    competition: Optional[str] = None
    category: Optional[str] = None


class PushKeysIn(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionIn(BaseModel):
    endpoint: str
    keys: PushKeysIn
    followed: list[str] = []


def _vapid_private_key():
    return os.getenv("VAPID_PRIVATE_KEY", "").replace("\\n", "\n").strip()


def _vapid_public_key():
    return os.getenv("VAPID_PUBLIC_KEY", "").strip()


def _vapid_subject():
    return os.getenv("VAPID_SUBJECT", "mailto:admin@defensores-sl.app").strip()


def _wants(sub: PushSubscription, event: NotificationEvent):
    if event.urgent:
        return True
    try:
        followed = set(json.loads(sub.followed_json or "[]"))
    except Exception:
        followed = set()
    if not followed:
        return True
    if event.competition == "FEFI" and event.category:
        return f"FEFI|{event.category}" in followed
    if event.competition == "FEFI":
        return any(x.startswith("FEFI|") for x in followed)
    if event.competition == "LAAMBA" and event.category:
        return f"LAAMBA|{event.category}" in followed
    if event.competition == "ARGENLIGA":
        return "ARGENLIGA|ALL" in followed
    return True


def _push_payload(event: NotificationEvent):
    return json.dumps({
        "id": event.id,
        "title": event.title,
        "body": event.body,
        "urgent": event.urgent,
        "competition": event.competition,
        "category": event.category,
        "url": "/",
    }, ensure_ascii=False)


def deliver_pushes(db: Session, event: NotificationEvent):
    private_key = _vapid_private_key()
    public_key = _vapid_public_key()
    if not private_key or not public_key:
        return {"sent": 0, "disabled": 0, "configured": False}
    rows = db.query(PushSubscription).filter(PushSubscription.enabled == True).all()
    sent = disabled = 0
    for sub in rows:
        if not _wants(sub, event):
            continue
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=_push_payload(event),
                vapid_private_key=private_key,
                vapid_claims={"sub": _vapid_subject()},
                ttl=60 if event.urgent else 3600,
            )
            sent += 1
        except WebPushException as exc:
            status = getattr(getattr(exc, "response", None), "status_code", None)
            if status in (404, 410):
                sub.enabled = False
                disabled += 1
        except Exception:
            continue
    if disabled:
        db.flush()
    return {"sent": sent, "disabled": disabled, "configured": True}


def publish_event(
    db: Session,
    *,
    event_type: str,
    title: str,
    body: str,
    competition: str | None = None,
    category: str | None = None,
    match_id: int | None = None,
    urgent: bool = False,
):
    event = NotificationEvent(
        event_type=event_type,
        title=title[:180],
        body=body,
        competition=competition,
        category=category,
        match_id=match_id,
        urgent=urgent,
    )
    db.add(event)
    db.flush()
    push_result = deliver_pushes(db, event)
    setattr(event, "push_result", push_result)
    return event


router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("/push/public-key")
def push_public_key():
    key = _vapid_public_key()
    if not key:
        raise HTTPException(status_code=503, detail="Web Push todavía no está configurado")
    return {"public_key": key}


@router.post("/push/subscribe")
def push_subscribe(payload: PushSubscriptionIn, db: Session = Depends(get_db)):
    endpoint = payload.endpoint.strip()
    if not endpoint or not payload.keys.p256dh or not payload.keys.auth:
        raise HTTPException(status_code=400, detail="Suscripción incompleta")
    endpoint_hash = hashlib.sha256(endpoint.encode("utf-8")).hexdigest()
    row = db.query(PushSubscription).filter(PushSubscription.endpoint_hash == endpoint_hash).first()
    if not row:
        row = PushSubscription(endpoint_hash=endpoint_hash, endpoint=endpoint, p256dh=payload.keys.p256dh, auth=payload.keys.auth)
        db.add(row)
    row.endpoint = endpoint
    row.p256dh = payload.keys.p256dh
    row.auth = payload.keys.auth
    row.followed_json = json.dumps(payload.followed, ensure_ascii=False)
    row.enabled = True
    db.commit()
    return {"ok": True, "background_push": True}


@router.post("/push/unsubscribe")
def push_unsubscribe(payload: PushSubscriptionIn, db: Session = Depends(get_db)):
    endpoint_hash = hashlib.sha256(payload.endpoint.strip().encode("utf-8")).hexdigest()
    row = db.query(PushSubscription).filter(PushSubscription.endpoint_hash == endpoint_hash).first()
    if row:
        row.enabled = False
        db.commit()
    return {"ok": True}


@router.get("/feed")
def notification_feed(since_id: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    limit = max(1, min(limit, 100))
    rows = (
        db.query(NotificationEvent)
        .filter(NotificationEvent.id > since_id)
        .order_by(NotificationEvent.id.asc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": x.id,
            "event_type": x.event_type,
            "title": x.title,
            "body": x.body,
            "competition": x.competition,
            "category": x.category,
            "match_id": x.match_id,
            "urgent": x.urgent,
            "created_at": x.created_at,
        }
        for x in rows
    ]


@router.post("/urgent")
def create_urgent_notice(
    payload: UrgentNoticeIn,
    db: Session = Depends(get_db),
    user=Depends(require_roles("admin", "delegado")),
):
    event = publish_event(
        db,
        event_type="urgent",
        title=payload.title.strip() or "Aviso urgente",
        body=payload.body.strip(),
        competition=payload.competition,
        category=payload.category,
        urgent=True,
    )
    db.commit()
    db.refresh(event)
    return {"ok": True, "id": event.id, "push": getattr(event, "push_result", None)}
