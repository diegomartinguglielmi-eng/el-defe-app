import hashlib
import json
import os
import base64
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from pywebpush import WebPushException, webpush
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, Session, mapped_column
from sqlalchemy.sql import func
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization

from .auth import get_current_user, require_roles
from .db import Base, get_db
from .family_context_v1 import family_context
from .profe_scope import profe_selections, selection_allowed

class NotificationEvent(Base):
    __tablename__ = "notification_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_type: Mapped[str] = mapped_column(String(40), index=True)
    title: Mapped[str] = mapped_column(String(180)); body: Mapped[str] = mapped_column(Text)
    competition: Mapped[Optional[str]] = mapped_column(String(50), index=True); category: Mapped[Optional[str]] = mapped_column(String(40), index=True)
    match_id: Mapped[Optional[int]] = mapped_column(ForeignKey("matches.id"), index=True); urgent: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    endpoint_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True); endpoint: Mapped[str] = mapped_column(Text)
    p256dh: Mapped[str] = mapped_column(Text); auth: Mapped[str] = mapped_column(Text); followed_json: Mapped[str] = mapped_column(Text, default="[]")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now()); updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PushVapidConfig(Base):
    __tablename__ = "push_vapid_config"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    private_key: Mapped[str] = mapped_column(Text)
    public_key: Mapped[str] = mapped_column(Text)
    subject: Mapped[str] = mapped_column(String(180), default="mailto:admin@defensores-sl.app")

class UrgentNoticeIn(BaseModel):
    title: str; body: str; competition: Optional[str] = None; category: Optional[str] = None
class CommunicationNoticeIn(BaseModel):
    title: str; body: str; competition: Optional[str] = None; category: Optional[str] = None; priority: Optional[str] = None
class PushKeysIn(BaseModel): p256dh: str; auth: str
class PushSubscriptionIn(BaseModel):
    endpoint: str; keys: PushKeysIn; followed: list[str] = []

def _env_vapid():
    return (os.getenv("VAPID_PRIVATE_KEY", "").replace("\\n", "\n").strip(), os.getenv("VAPID_PUBLIC_KEY", "").strip(), os.getenv("VAPID_SUBJECT", "mailto:admin@defensores-sl.app").strip())

def _vapid(db):
    private_key, public_key, subject = _env_vapid()
    if private_key and public_key: return private_key, public_key, subject
    row=db.query(PushVapidConfig).filter(PushVapidConfig.id==1).first()
    if not row:
        key=ec.generate_private_key(ec.SECP256R1())
        private_key=key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()).decode()
        raw=key.public_key().public_bytes(serialization.Encoding.X962,serialization.PublicFormat.UncompressedPoint)
        public_key=base64.urlsafe_b64encode(raw).rstrip(b"=").decode()
        row=PushVapidConfig(id=1,private_key=private_key,public_key=public_key,subject=subject); db.add(row); db.commit(); db.refresh(row)
    return row.private_key,row.public_key,row.subject

def _family_selections(db, user_id):
    if not user_id: return set()
    try: return {x.upper() for x in family_context(db, user_id)["selections"]}
    except Exception: return set()

def _wants(db, sub, event):
    if event.urgent: return True
    competition=(event.competition or "").upper().strip(); category=(event.category or "").strip()
    family = _family_selections(db, sub.user_id)
    assigned=set()
    if sub.user_id:
        try:
            from .models import User
            sub_user=db.get(User,sub.user_id)
            if sub_user and sub_user.role == "profe": assigned={x.upper() for x in profe_selections(db,sub_user)}
        except Exception: assigned=set()
    if assigned:
        if competition and category: return f"{competition}|{category}".upper() in assigned
        if competition: return any(x.startswith(f"{competition}|") for x in assigned)
        return True
    if family:
        if competition and category: return f"{competition}|{category}".upper() in family
        if competition: return any(x.startswith(f"{competition}|") for x in family)
        return True
    try: followed={x.upper() for x in json.loads(sub.followed_json or "[]")}
    except Exception: followed=set()
    if not followed: return True
    if competition and category: return f"{competition}|{category}".upper() in followed or f"{competition}|ALL" in followed
    if competition: return any(x.startswith(f"{competition}|") for x in followed)
    return True

def _push_payload(event): return json.dumps({"id":event.id,"title":event.title,"body":event.body,"urgent":event.urgent,"competition":event.competition,"category":event.category,"match_id":event.match_id,"url":"/el-defe-app/"},ensure_ascii=False)

def deliver_pushes(db, event):
    private_key, public_key, subject=_vapid(db)
    rows=db.query(PushSubscription).filter(PushSubscription.enabled==True).all(); sent=disabled=failed=eligible=0; first_error=None
    for sub in rows:
        if not _wants(db,sub,event): continue
        eligible+=1
        try:
            webpush(subscription_info={"endpoint":sub.endpoint,"keys":{"p256dh":sub.p256dh,"auth":sub.auth}},data=_push_payload(event),vapid_private_key=private_key,vapid_claims={"sub":subject},ttl=60 if event.urgent else 3600); sent+=1
        except WebPushException as exc:
            failed+=1; status=getattr(getattr(exc,"response",None),"status_code",None); first_error=first_error or f"WebPush {status or 'error'}: {str(exc)[:180]}"
            if status in (404,410): sub.enabled=False; disabled+=1
        except Exception as exc:
            failed+=1; first_error=first_error or f"{type(exc).__name__}: {str(exc)[:180]}"
    if disabled: db.flush()
    return {"sent":sent,"failed":failed,"disabled":disabled,"eligible":eligible,"configured":True,"error":first_error}

def publish_event(db,*,event_type,title,body,competition=None,category=None,match_id=None,urgent=False):
    event=NotificationEvent(event_type=event_type,title=title[:180],body=body,competition=competition,category=category,match_id=match_id,urgent=urgent); db.add(event); db.flush(); setattr(event,"push_result",deliver_pushes(db,event)); return event

router=APIRouter(prefix="/api/notifications",tags=["Notifications"])

@router.get("/push/public-key")
def push_public_key(db:Session=Depends(get_db)):
    _, key, _ = _vapid(db)
    return {"public_key":key}

@router.post("/push/subscribe")
def push_subscribe(payload:PushSubscriptionIn,db:Session=Depends(get_db),user=Depends(get_current_user)):
    endpoint=payload.endpoint.strip()
    if not endpoint or not payload.keys.p256dh or not payload.keys.auth: raise HTTPException(status_code=400,detail="Suscripción incompleta")
    endpoint_hash=hashlib.sha256(endpoint.encode()).hexdigest(); row=db.query(PushSubscription).filter(PushSubscription.endpoint_hash==endpoint_hash).first()
    if not row: row=PushSubscription(endpoint_hash=endpoint_hash,endpoint=endpoint,p256dh=payload.keys.p256dh,auth=payload.keys.auth); db.add(row)
    row.user_id=user.id; row.endpoint=endpoint; row.p256dh=payload.keys.p256dh; row.auth=payload.keys.auth; row.followed_json=json.dumps(payload.followed,ensure_ascii=False); row.enabled=True; db.commit()
    return {"ok":True,"background_push":True,"targeting":"family" if family_context(db,user.id)["children"] else "legacy"}

@router.post("/push/unsubscribe")
def push_unsubscribe(payload:PushSubscriptionIn,db:Session=Depends(get_db),user=Depends(get_current_user)):
    h=hashlib.sha256(payload.endpoint.strip().encode()).hexdigest(); row=db.query(PushSubscription).filter(PushSubscription.endpoint_hash==h).first()
    if row and (row.user_id is None or row.user_id==user.id): row.enabled=False; db.commit()
    return {"ok":True}

@router.get("/feed")
def notification_feed(since_id:int=0,limit:int=50,db:Session=Depends(get_db),user=Depends(get_current_user)):
    limit=max(1,min(limit,100)); rows=db.query(NotificationEvent).filter(NotificationEvent.id>since_id).order_by(NotificationEvent.id.asc()).limit(limit).all(); family=_family_selections(db,user.id); assigned=profe_selections(db,user) if user.role == "profe" else set()
    def visible(x):
        if user.role == "profe":
            comp=(x.competition or "").upper().strip(); cat=(x.category or "").upper().strip()
            if not comp and not cat: return True
            return bool(comp and cat and f"{comp}|{cat}" in assigned)
        if x.urgent or not family: return True
        comp=(x.competition or "").upper().strip(); cat=(x.category or "").strip()
        if comp and cat: return f"{comp}|{cat}".upper() in family
        if comp: return any(s.startswith(f"{comp}|") for s in family)
        return True
    rows=[x for x in rows if visible(x)]
    return [{"id":x.id,"event_type":x.event_type,"title":x.title,"body":x.body,"competition":x.competition,"category":x.category,"match_id":x.match_id,"urgent":x.urgent,"created_at":x.created_at} for x in rows]

@router.post("/communication")
def create_communication_notice(payload:CommunicationNoticeIn,db:Session=Depends(get_db),user=Depends(require_roles("admin","profe","delegado"))):
    if not selection_allowed(db, user, payload.competition, payload.category): raise HTTPException(status_code=403,detail="Ese equipo/categoría no está asignado a este Profe")
    priority=(payload.priority or "Información").strip(); title=payload.title.strip() or "Nueva comunicación"; body=payload.body.strip()
    if not body: raise HTTPException(status_code=400,detail="El mensaje no puede estar vacío")
    event=publish_event(db,event_type="communication",title=title,body=body,competition=payload.competition,category=payload.category,urgent=False); db.commit(); db.refresh(event)
    return {"ok":True,"id":event.id,"priority":priority,"push":getattr(event,"push_result",None)}

@router.post("/urgent")
def create_urgent_notice(payload:UrgentNoticeIn,db:Session=Depends(get_db),user=Depends(require_roles("admin","profe","delegado"))):
    if not selection_allowed(db, user, payload.competition, payload.category): raise HTTPException(status_code=403,detail="Ese equipo/categoría no está asignado a este Profe")
    event=publish_event(db,event_type="urgent",title=payload.title.strip() or "Aviso urgente",body=payload.body.strip(),competition=payload.competition,category=payload.category,urgent=True); db.commit(); db.refresh(event)
    return {"ok":True,"id":event.id,"push":getattr(event,"push_result",None)}
