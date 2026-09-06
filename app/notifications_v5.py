from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
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


class UrgentNoticeIn(BaseModel):
    title: str
    body: str
    competition: Optional[str] = None
    category: Optional[str] = None


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
    return event


router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


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
    return {"ok": True, "id": event.id}
