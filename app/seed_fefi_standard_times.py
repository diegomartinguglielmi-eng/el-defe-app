from .db import Base, engine, SessionLocal
from .models import Match, FefiCategorySchedule

STANDARD_TIMES = {
    "2019": "14:30",
    "2013": "15:15",
    "2018": "16:10",
    "2014": "16:55",
    "2017": "17:50",
    "2016": "18:45",
    "2015": "19:40",
}


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    created = 0
    preserved = 0
    matches = 0
    try:
        rows = db.query(Match).filter(Match.competition == "FEFI").all()
        for match in rows:
            matches += 1
            for category, standard_time in STANDARD_TIMES.items():
                row = db.query(FefiCategorySchedule).filter(
                    FefiCategorySchedule.match_id == match.id,
                    FefiCategorySchedule.category == category,
                ).first()
                if row:
                    # Never overwrite a manually confirmed exception.
                    preserved += 1
                    continue
                db.add(FefiCategorySchedule(
                    match_id=match.id,
                    category=category,
                    time=standard_time,
                    note="Horario base FEFI",
                    updated_by=None,
                ))
                created += 1
        db.commit()
        print({"ok": True, "matches": matches, "created": created, "preserved": preserved})
    finally:
        db.close()


if __name__ == "__main__":
    main()
