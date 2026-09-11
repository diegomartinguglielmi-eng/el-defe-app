import json
from urllib.parse import parse_qs, quote

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from .db import get_db
from .store_v5 import (
    DEFAULT_STORE_WHATSAPP,
    StoreInventory,
    StoreOrder,
    StoreProduct,
    _clean_phone,
    _setting,
)

router = APIRouter(prefix='/api/store', tags=['Store checkout'])


def _money(value):
    if value is None:
        return 'a confirmar'
    return '$' + f'{int(value):,}'.replace(',', '.')


def _first(item, *keys, default=None):
    for key in keys:
        value = item.get(key)
        if value not in (None, ''):
            return value
    return default


@router.post('/orders/submit')
async def submit_order(request: Request, db: Session = Depends(get_db)):
    raw = (await request.body()).decode('utf-8', errors='replace')
    form = {k: v[-1] if v else '' for k, v in parse_qs(raw, keep_blank_values=True).items()}

    buyer_name = (form.get('buyer_name') or '').strip()
    buyer_phone = (form.get('buyer_phone') or '').strip()
    buyer_category = (form.get('buyer_category') or '').strip() or None
    buyer_note = (form.get('buyer_note') or '').strip() or None

    if not buyer_name or not _clean_phone(buyer_phone):
        raise HTTPException(400, 'Completá nombre y teléfono')

    try:
        incoming = json.loads(form.get('items') or '[]')
    except Exception:
        raise HTTPException(400, 'Pedido inválido')
    if not isinstance(incoming, list) or not incoming:
        raise HTTPException(400, 'El pedido está vacío')

    items = []
    total = 0
    complete = True
    for pos, item in enumerate(incoming, start=1):
        if not isinstance(item, dict):
            raise HTTPException(400, f'Ítem {pos} inválido')

        raw_size = _first(item, 'size', 'talle', 'medida', 'variant', default='')
        raw_qty = _first(item, 'qty', 'cant', 'cantidad', 'quantity', default=None)
        size = str(raw_size or '').strip()
        try:
            qty = int(raw_qty)
        except Exception:
            raise HTTPException(400, f'Cantidad inválida en ítem {pos}')
        if qty < 1:
            raise HTTPException(400, f'Cantidad inválida en ítem {pos}')

        product = None
        raw_id = _first(item, 'product_id', 'productoId', 'id', 'slug', default=None)
        if raw_id not in (None, '', 'null'):
            try:
                product_id = int(raw_id)
                product = db.query(StoreProduct).filter(
                    StoreProduct.id == product_id,
                    StoreProduct.active == True,
                ).first()
            except Exception:
                product = None

            if not product:
                slug = str(raw_id).strip()
                if slug:
                    product = db.query(StoreProduct).filter(
                        StoreProduct.slug == slug,
                        StoreProduct.active == True,
                    ).first()

        if not product:
            product_name = str(_first(item, 'product_name', 'name', 'nombre', default='') or '').strip()
            if product_name:
                product = db.query(StoreProduct).filter(
                    func.lower(StoreProduct.name) == product_name.lower(),
                    StoreProduct.active == True,
                ).first()

        if not product:
            raise HTTPException(400, f'Producto no disponible en ítem {pos}')

        allowed_sizes = [s.strip() for s in (product.sizes_csv or '').split(',') if s.strip()]
        if size not in allowed_sizes:
            raise HTTPException(400, f'Talle inválido para {product.name}: {size or "sin talle"}')

        managed = db.query(StoreInventory).filter(StoreInventory.product_id == product.id).first() is not None
        inv = db.query(StoreInventory).filter(
            StoreInventory.product_id == product.id,
            StoreInventory.size == size,
        ).first()
        if managed and (not inv or inv.quantity < qty):
            raise HTTPException(409, f'Stock insuficiente: {product.name} talle {size}')

        subtotal = product.price * qty if product.price is not None else None
        if subtotal is None:
            complete = False
        else:
            total += subtotal
        items.append({
            'product_id': product.id,
            'name': product.name,
            'size': size,
            'qty': qty,
            'unit_price': product.price,
            'subtotal': subtotal,
        })

    order = StoreOrder(
        buyer_name=buyer_name,
        buyer_phone=buyer_phone,
        buyer_category=buyer_category,
        buyer_note=buyer_note,
        items_json=json.dumps(items, ensure_ascii=False),
        total=total if complete else None,
        status='pending',
        stock_applied=False,
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    lines = [
        f'Hola! Pedido #{order.id} de la tienda del Defe.',
        f'Soy {buyer_name}' + (f' ({buyer_category})' if buyer_category else '') + f'. Tel: {buyer_phone}',
        '',
    ]
    for item in items:
        price = _money(item['subtotal']) if item['subtotal'] is not None else 'a confirmar'
        lines.append(f"• {item['qty']} x {item['name']} — talle {item['size']} — {price}")
    lines += [
        '',
        ('Total: ' + _money(order.total)) if order.total is not None else 'Total: a confirmar',
        'Retiro por la Tienda del Club',
    ]
    if buyer_note:
        lines.append(f'Nota: {buyer_note}')
    lines += ['', 'Pedido registrado. ¿Me confirman cuándo está listo para retirar?']

    whatsapp = _clean_phone(_setting(db, 'whatsapp_number', DEFAULT_STORE_WHATSAPP))
    target = f'https://wa.me/{whatsapp}?text={quote(chr(10).join(lines))}'
    return RedirectResponse(target, status_code=303)
