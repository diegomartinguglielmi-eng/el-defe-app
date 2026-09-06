from .db import Base, engine
from .pending import run_fefi_pending_sync

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    result = run_fefi_pending_sync()
    print(result)
    if not result.get("ok"):
        raise SystemExit(1)
