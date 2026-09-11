from .main_v5 import app
from .store_submit import router as store_submit_router

app.include_router(store_submit_router)

@app.middleware('http')
async def log_frontend_origin(request, call_next):
    if request.url.path in ('/api/me','/api/news','/api/store/products','/api/store/orders','/api/store/orders/submit'):
        print({
            'frontend_probe': request.url.path,
            'origin': request.headers.get('origin'),
            'referer': request.headers.get('referer'),
            'sec_fetch_site': request.headers.get('sec-fetch-site'),
            'user_agent': request.headers.get('user-agent'),
        }, flush=True)
    return await call_next(request)
