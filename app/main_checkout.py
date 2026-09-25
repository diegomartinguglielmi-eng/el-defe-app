from sqlalchemy import text

from .main_v5 import app
from .db import SessionLocal
from .store_submit import router as store_submit_router
from .availability_admin_fix import router as availability_admin_fix_router
from .availability_v1 import router as availability_router
from .availability_player_v2 import router as availability_player_v2_router
from .family_manage_v1 import router as family_manage_router
from .family_catalog_v1 import router as family_catalog_router
from .family_context_v1 import router as family_context_router

app.include_router(store_submit_router)
# Debe registrarse antes del router histórico: FastAPI resuelve la primera ruta coincidente.
app.include_router(availability_admin_fix_router)
app.include_router(availability_router)
app.include_router(availability_player_v2_router)
app.include_router(family_manage_router)
app.include_router(family_catalog_router)
app.include_router(family_context_router)


@app.on_event('startup')
def family_targeting_schema():
    # create_all no altera tablas existentes; migración idempotente para staging/producción futura.
    db = SessionLocal()
    try:
        db.execute(text('ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)'))
        db.execute(text('CREATE INDEX IF NOT EXISTS ix_push_subscriptions_user_id ON push_subscriptions (user_id)'))
        db.commit()
        print({'family_targeting_schema': 'ready'}, flush=True)
    except Exception as exc:
        db.rollback()
        print({'family_targeting_schema': 'error', 'detail': str(exc)}, flush=True)
    finally:
        db.close()


@app.middleware('http')
async def log_frontend_origin(request, call_next):
    if request.url.path in ('/api/me','/api/news','/api/store/products','/api/store/orders','/api/store/orders/submit'):
        print({'frontend_probe': request.url.path,'origin': request.headers.get('origin'),'referer': request.headers.get('referer'),'sec_fetch_site': request.headers.get('sec-fetch-site'),'user_agent': request.headers.get('user-agent')}, flush=True)
    return await call_next(request)
