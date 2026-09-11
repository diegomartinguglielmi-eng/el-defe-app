from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, Session, mapped_column
from .db import Base, get_db, SessionLocal
from .auth import require_roles
from .main import app

class Sponsor(Base):
    __tablename__='sponsors'
    id: Mapped[int]=mapped_column(Integer,primary_key=True)
    name: Mapped[str]=mapped_column(String(180),index=True)
    category: Mapped[Optional[str]]=mapped_column(String(120))
    logo_url: Mapped[Optional[str]]=mapped_column(Text)
    short_mark: Mapped[Optional[str]]=mapped_column(String(12))
    website_url: Mapped[Optional[str]]=mapped_column(Text)
    instagram_url: Mapped[Optional[str]]=mapped_column(Text)
    facebook_url: Mapped[Optional[str]]=mapped_column(Text)
    whatsapp_url: Mapped[Optional[str]]=mapped_column(Text)
    primary_url: Mapped[Optional[str]]=mapped_column(Text)
    active: Mapped[bool]=mapped_column(Boolean,default=True,index=True)
    featured: Mapped[bool]=mapped_column(Boolean,default=False,index=True)
    sort_order: Mapped[int]=mapped_column(Integer,default=0,index=True)

class SponsorIn(BaseModel):
    name:str
    category:Optional[str]=None
    logo_url:Optional[str]=None
    short_mark:Optional[str]=None
    website_url:Optional[str]=None
    instagram_url:Optional[str]=None
    facebook_url:Optional[str]=None
    whatsapp_url:Optional[str]=None
    primary_url:Optional[str]=None
    active:bool=True
    featured:bool=False
    sort_order:int=0

def _clean_url(value:Optional[str])->Optional[str]:
    value=(value or '').strip()
    if not value:return None
    if value.startswith(('http://','https://','mailto:','tel:')):return value
    if value.startswith('wa.me/') or value.startswith('www.'):return 'https://'+value
    return value

def _out(x:Sponsor):
    return {'id':x.id,'name':x.name,'category':x.category,'logo_url':x.logo_url,'short_mark':x.short_mark,'website_url':x.website_url,'instagram_url':x.instagram_url,'facebook_url':x.facebook_url,'whatsapp_url':x.whatsapp_url,'primary_url':x.primary_url,'active':x.active,'featured':x.featured,'sort_order':x.sort_order}

def _apply(row:Sponsor,p:SponsorIn):
    name=p.name.strip()
    if not name:raise HTTPException(400,'El nombre del sponsor es obligatorio')
    row.name=name;row.category=(p.category or '').strip() or None;row.logo_url=(p.logo_url or '').strip() or None
    row.short_mark=((p.short_mark or '').strip() or ''.join(w[:1] for w in name.split()[:2])).upper()[:12] or None
    row.website_url=_clean_url(p.website_url);row.instagram_url=_clean_url(p.instagram_url);row.facebook_url=_clean_url(p.facebook_url);row.whatsapp_url=_clean_url(p.whatsapp_url);row.primary_url=_clean_url(p.primary_url)
    row.active=bool(p.active);row.featured=bool(p.featured);row.sort_order=int(p.sort_order or 0);return row

router=APIRouter(prefix='/api/sponsors',tags=['Sponsors'])

@router.get('')
def public_sponsors(db:Session=Depends(get_db)):
    return [_out(x) for x in db.query(Sponsor).filter(Sponsor.active==True).order_by(Sponsor.featured.desc(),Sponsor.sort_order,Sponsor.id).all()]

@router.get('/admin')
def admin_sponsors(db:Session=Depends(get_db),user=Depends(require_roles('admin'))):
    return [_out(x) for x in db.query(Sponsor).order_by(Sponsor.sort_order,Sponsor.id).all()]

@router.post('/admin')
def create_sponsor(payload:SponsorIn,db:Session=Depends(get_db),user=Depends(require_roles('admin'))):
    row=_apply(Sponsor(),payload);db.add(row);db.commit();db.refresh(row);return _out(row)

@router.put('/admin/{sponsor_id}')
def update_sponsor(sponsor_id:int,payload:SponsorIn,db:Session=Depends(get_db),user=Depends(require_roles('admin'))):
    row=db.query(Sponsor).filter(Sponsor.id==sponsor_id).first()
    if not row:raise HTTPException(404,'Sponsor no encontrado')
    _apply(row,payload);db.commit();db.refresh(row);return _out(row)

@router.delete('/admin/{sponsor_id}')
def deactivate_sponsor(sponsor_id:int,db:Session=Depends(get_db),user=Depends(require_roles('admin'))):
    row=db.query(Sponsor).filter(Sponsor.id==sponsor_id).first()
    if not row:raise HTTPException(404,'Sponsor no encontrado')
    row.active=False;db.commit();return {'ok':True}

DEFAULT_SPONSORS=[('JM Distribuidora','Distribución','JM'),('Wimer','Servicios','W'),('La Milagrosa Papelería','Papelería','LM'),('Matafuegos CADECI','Seguridad','MC'),('VA','Servicios','VA'),('Shop Ferretero','Ferretería','SF'),('Ascensores Pastorino','Ascensores','AP'),('Lo de Abru','Beauty Bar','LA')]

def bootstrap_sponsors(db:Session):
    if db.query(Sponsor).count():return {'created':0,'skipped':True}
    for i,(name,category,mark) in enumerate(DEFAULT_SPONSORS):db.add(Sponsor(name=name,category=category,short_mark=mark,active=True,featured=i<6,sort_order=i))
    db.commit();return {'created':len(DEFAULT_SPONSORS),'skipped':False}

app.include_router(router)

@app.on_event('startup')
def sponsors_startup():
    db=SessionLocal()
    try:bootstrap_sponsors(db)
    finally:db.close()
