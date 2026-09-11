import json
from urllib.parse import parse_qs, quote

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
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


@router.post('/orders/submit')
async def submit_order(request: Request, db: Session = Depends(get_db)):
    """Checkout robusto para PWA/Android.

    Usa un POST HTML tradicional y redirige a WhatsApp. No depende de fetch,
    CORS ni del service worker del frontend.
    """
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
    for item in incoming:
        try:
            product_id = int(item.get('product_id'))
            size = str(item.get('size') or '')
            qty = int(item.get('qty') or 0)
        except Exception:
            raise HTTPException(400, 'Ítem inválido')
        if qty < 1:
            raise HTTPException(400, 'Cantidad inválida')

        product = db.query(StoreProduct).filter(
            StoreProduct.id == product_id,
            StoreProduct.active == True,
        ).first()
        if not product:
            raise HTTPException(400, 'Producto no disponible')

        allowed_sizes = [s for s in (product.sizes_csv or '').split(',') if s]
        if size not in allowed_sizes:
            raise HTTPException(400, f'Talle inválido para {product.name}')

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
