from app.db import SessionLocal
from app.sync import sync_laamba
from app.data_quality import build_data_quality


def main():
    db = SessionLocal()
    try:
        sync_result = sync_laamba(db)
        q = build_data_quality(db)
        laamba = q["competitions"]["laamba"]
        print("LAAMBA_SYNC", sync_result, flush=True)
        print(
            "LAAMBA_DIVS",
            [
                (
                    d["division"],
                    d["matches"],
                    d["final"],
                    d["scheduled"],
                    len(d["duplicate_rounds"]),
                    d["standings"]["rows"],
                )
                for d in laamba["divisions"]
            ],
            flush=True,
        )
        print("LAAMBA_TOTAL", laamba["total"], flush=True)
        print("GLOBAL", q["health"], q["global"], flush=True)
    finally:
        db.close()


if __name__ == "__main__":
    main()
