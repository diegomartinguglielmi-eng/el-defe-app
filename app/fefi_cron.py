from .db import Base, engine, SessionLocal
from .pending import run_fefi_pending_sync
from .fefi_results import sync_verified_results

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    result = run_fefi_pending_sync()
    if not result.get("ok"):
        print(result)
        raise SystemExit(1)

    db = SessionLocal()
    try:
        results = sync_verified_results(db)
    finally:
        db.close()

    print({**result, **results})
