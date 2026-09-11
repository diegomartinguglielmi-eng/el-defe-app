from .main_v5 import app
from .store_submit import router as store_submit_router

app.include_router(store_submit_router)
