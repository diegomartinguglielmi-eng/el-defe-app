from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, Session, mapped_column

from .db import Base, get_db
from .auth import require_roles
from .store_v5 import StoreProduct, StoreInventory


class StoreStockReceipt(Base):
    __tablename__ = 'store_stock_receipts'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey('store_products.id', ondelete='CASCADE'), index=True)
    size: Mapped[str] = mapped_column(String(80))
    quantity: Mapped[int] = mapped_column(Integer)
    supplier: Mapped[Optional[str]] = mapped_column(String(180))
    reference: Mapped[Optional[str]] = mapped_column(String(180))
    note: Mapped[Optional[str]] = mapped_column(Text)
    created_by: Mapped[Optional[str]] = mapped_column(String(180))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)


class StockReceiptIn(BaseModel):
    product_id: int
    size: str
    quantity: int
    supplier: Optional[str] = None
    reference: Optional[str] = None
    note: Optional[str] = None


router = APIRouter(prefix='/api/store', tags=['Store inventory'])


def _out(x: StoreStockReceipt, product_name: str):
    return {
        'id': x.id,
        'product_id': x.product_id,
        'product_name': product_name,
        'size': x.size,
        'quantity': x.quantity,
        'supplier': x.supplier,
        'reference': x.reference,
        'note': x.note,
        'created_by': x.created_by,
        'created_at': x.created_at.isoformat() if x.created_at else None,
    }


@router.get('/admin/stock-receipts')
def list_stock_receipts(db: Session = Depends(get_db), user=Depends(require_roles('admin', 'delegado'))):
    rows = (
        db.query(StoreStockReceipt, StoreProduct)
        .join(StoreProduct, StoreStockReceipt.product_id == StoreProduct.id)
        .order_by(StoreStockReceipt.created_at.desc(), StoreStockReceipt.id.desc())
        .limit(100)
        .all()
    )
    return [_out(r, p.name) for r, p in rows]


@router.post('/admin/stock-receipts')
def create_stock_receipt(payload: StockReceiptIn, db: Session = Depends(get_db), user=Depends(require_roles('admin', 'delegado'))):
    if payload.quantity <= 0:
        raise HTTPException(400, 'La cantidad recibida debe ser mayor a cero')

    product = db.query(StoreProduct).filter(StoreProduct.id == payload.product_id).first()
    if not product:
        raise HTTPException(404, 'Producto no encontrado')

    sizes = [s for s in (product.sizes_csv or '').split(',') if s]
    size = payload.size.strip()
    if size not in sizes:
        raise HTTPException(400, f'Talle inválido para {product.name}')

    inventory = (
        db.query(StoreInventory)
        .filter(StoreInventory.product_id == product.id, StoreInventory.size == size)
        .first()
    )
    if inventory:
        inventory.quantity = max(0, int(inventory.quantity or 0)) + payload.quantity
    else:
        inventory = StoreInventory(product_id=product.id, size=size, quantity=payload.quantity)
        db.add(inventory)

    receipt = StoreStockReceipt(
        product_id=product.id,
        size=size,
        quantity=payload.quantity,
        supplier=(payload.supplier or '').strip() or None,
        reference=(payload.reference or '').strip() or None,
        note=(payload.note or '').strip() or None,
        created_by=getattr(user, 'email', None),
    )
    db.add(receipt)
    db.commit()
    db.refresh(receipt)
    return {
        'ok': True,
        'receipt': _out(receipt, product.name),
        'stock': max(0, int(inventory.quantity or 0)),
    }
