from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, Session, mapped_column
from .db import Base, get_db
from .auth import require_roles

class StoreProduct(Base):
    __tablename__='store_products'
    id: Mapped[int]=mapped_column(Integer,primary_key=True)
    slug: Mapped[str]=mapped_column(String(120),unique=True,index=True)
    name: Mapped[str]=mapped_column(String(180))
    category: Mapped[str]=mapped_column(String(80),index=True)
    description: Mapped[Optional[str]]=mapped_column(Text)
    image_url: Mapped[Optional[str]]=mapped_column(Text)
    price: Mapped[Optional[int]]=mapped_column(Integer)
    sizes_csv: Mapped[Optional[str]]=mapped_column(String(250))
    active: Mapped[bool]=mapped_column(Boolean,default=True,index=True)
    featured: Mapped[bool]=mapped_column(Boolean,default=False,index=True)
    sort_order: Mapped[int]=mapped_column(Integer,default=0)

class ProductIn(BaseModel):
    slug:str
    name:str
    category:str
    description:Optional[str]=None
    image_url:Optional[str]=None
    price:Optional[int]=None
    sizes:list[str]=[]
    active:bool=True
    featured:bool=False
    sort_order:int=0

def _out(x):
    return {'id':x.id,'slug':x.slug,'name':x.name,'category':x.category,'description':x.description,'image_url':x.image_url,'price':x.price,'sizes':[s for s in (x.sizes_csv or '').split(',') if s],'active':x.active,'featured':x.featured,'sort_order':x.sort_order}

router=APIRouter(prefix='/api/store',tags=['Store'])

@router.get('/products')
def products(db:Session=Depends(get_db)):
    rows=db.query(StoreProduct).filter(StoreProduct.active==True).order_by(StoreProduct.featured.desc(),StoreProduct.sort_order,StoreProduct.id).all()
    return [_out(x) for x in rows]

@router.get('/admin/products')
def admin_products(db:Session=Depends(get_db),user=Depends(require_roles('admin','delegado'))):
    rows=db.query(StoreProduct).order_by(StoreProduct.sort_order,StoreProduct.id).all();return [_out(x) for x in rows]

@router.post('/admin/products')
def create_product(payload:ProductIn,db:Session=Depends(get_db),user=Depends(require_roles('admin','delegado'))):
    if db.query(StoreProduct).filter(StoreProduct.slug==payload.slug.strip()).first(): raise HTTPException(409,'Ya existe un producto con ese identificador')
    row=StoreProduct(slug=payload.slug.strip(),name=payload.name.strip(),category=payload.category.strip(),description=payload.description,image_url=payload.image_url,price=payload.price,sizes_csv=','.join([s.strip() for s in payload.sizes if s.strip()]),active=payload.active,featured=payload.featured,sort_order=payload.sort_order)
    db.add(row);db.commit();db.refresh(row);return _out(row)

@router.put('/admin/products/{product_id}')
def update_product(product_id:int,payload:ProductIn,db:Session=Depends(get_db),user=Depends(require_roles('admin','delegado'))):
    row=db.query(StoreProduct).filter(StoreProduct.id==product_id).first()
    if not row: raise HTTPException(404,'Producto no encontrado')
    duplicate=db.query(StoreProduct).filter(StoreProduct.slug==payload.slug.strip(),StoreProduct.id!=product_id).first()
    if duplicate: raise HTTPException(409,'Ya existe un producto con ese identificador')
    row.slug=payload.slug.strip();row.name=payload.name.strip();row.category=payload.category.strip();row.description=payload.description;row.image_url=payload.image_url;row.price=payload.price;row.sizes_csv=','.join([s.strip() for s in payload.sizes if s.strip()]);row.active=payload.active;row.featured=payload.featured;row.sort_order=payload.sort_order
    db.commit();db.refresh(row);return _out(row)

@router.delete('/admin/products/{product_id}')
def delete_product(product_id:int,db:Session=Depends(get_db),user=Depends(require_roles('admin'))):
    row=db.query(StoreProduct).filter(StoreProduct.id==product_id).first()
    if not row: raise HTTPException(404,'Producto no encontrado')
    row.active=False;db.commit();return {'ok':True}

DEFAULTS=[
 ('camiseta-partido','Camiseta de partido','Partido','Camiseta oficial para llevar los colores del Defe dentro y fuera de la cancha.',['XS','S','M','L','XL','XXL']),
 ('short-partido','Short de partido','Partido','Short oficial del club.',['XS','S','M','L','XL','XXL']),
 ('medias','Medias oficiales','Partido','Medias para completar el conjunto de partido.',['Único']),
 ('remera-entrenamiento','Remera de entrenamiento','Entrenamiento','Indumentaria para entrenamiento y uso diario.',['XS','S','M','L','XL','XXL']),
 ('buzo','Buzo deportivo','Abrigo','Buzo del Defe para entrenar y acompañar al club.',['S','M','L','XL','XXL']),
 ('campera','Campera del club','Abrigo','Campera institucional del Defe.',['S','M','L','XL','XXL']),
 ('gorra','Gorra','Accesorios','Accesorio con identidad del club.',['Único'])]

def bootstrap_store(db:Session):
    if db.query(StoreProduct).count(): return {'created':0,'skipped':True}
    for i,(slug,name,cat,desc,sizes) in enumerate(DEFAULTS): db.add(StoreProduct(slug=slug,name=name,category=cat,description=desc,sizes_csv=','.join(sizes),sort_order=i))
    db.commit();return {'created':len(DEFAULTS),'skipped':False}
