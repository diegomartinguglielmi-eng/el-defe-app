from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from .db import Base, engine, SessionLocal
from .models import Match, FefiCategorySchedule
from .notifications_v5 import NotificationEvent, publish_event

AR_TZ = ZoneInfo("America/Argentina/Buenos_Aires")
FEFI_CATEGORIES = ["2019", "2013", "2018", "2014", "2017", "2016", "2015"]
FEFI_MAYORES_DIVISION = "Mayores B · +42"
FEFI_MAYORES_CATEGORY = "MAYORES_B_42"


def reminder_body(match: Match, category: str | None = None, time: str | None = None) -> str:
    base = f"Mañana: {match.home} vs {match.away}"
    if category:
        base += f" · Cat. {category}"
    if time:
        base += f" · {time} hs"
    if match.venue:
        base += f" · {match.venue}"
    return base


def run(force: bool = False) -> dict:
    now = datetime.now(AR_TZ)
    if not force and now.hour != 21:
        result = {"ok": True, "skipped": True, "reason": "outside_21h_window", "local_time": now.isoformat()}
        print(result)
        return result

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    created = 0
    try:
        target = now.date() + timedelta(days=1)
        target_s = target.isoformat()
        matches = db.query(Match).filter(
            Match.date == target_s,
            Match.status != "final",
        ).order_by(Match.id).all()

        for match in matches:
            if match.competition == "FEFI" and match.division == FEFI_MAYORES_DIVISION:
                category = FEFI_MAYORES_CATEGORY
                body = reminder_body(match, "+42 Mayores B")
                exists = db.query(NotificationEvent).filter(
                    NotificationEvent.event_type == "match_reminder",
                    NotificationEvent.match_id == match.id,
                    NotificationEvent.category == category,
                ).first()
                if not exists:
                    publish_event(
                        db,
                        event_type="match_reminder",
                        title="Mañana juega El Defe · +42 Mayores B",
                        body=body,
                        competition="FEFI",
                        category=category,
                        match_id=match.id,
                        urgent=False,
                    )
                    created += 1
            elif match.competition == "FEFI":
                schedules = db.query(FefiCategorySchedule).filter(
                    FefiCategorySchedule.match_id == match.id
                ).all()
                by_category = {x.category: x for x in schedules}
                for category in FEFI_CATEGORIES:
                    schedule = by_category.get(category)
                    body = reminder_body(match, category, schedule.time if schedule else None)
                    exists = db.query(NotificationEvent).filter(
                        NotificationEvent.event_type == "match_reminder",
                        NotificationEvent.match_id == match.id,
                        NotificationEvent.category == category,
                    ).first()
                    if not exists:
                        publish_event(
                            db,
                            event_type="match_reminder",
                            title=f"Mañana juega El Defe · Cat. {category}",
                            body=body,
                            competition="FEFI",
                            category=category,
                            match_id=match.id,
                            urgent=False,
                        )
                        created += 1
            else:
                category = match.division or None
                body = reminder_body(match, category)
                exists = db.query(NotificationEvent).filter(
                    NotificationEvent.event_type == "match_reminder",
                    NotificationEvent.match_id == match.id,
                    NotificationEvent.category == category,
                ).first()
                if not exists:
                    publish_event(
                        db,
                        event_type="match_reminder",
                        title="Mañana juega El Defe",
                        body=body,
                        competition=match.competition,
                        category=category,
                        match_id=match.id,
                        urgent=False,
                    )
                    created += 1

        db.commit()
        result = {"ok": True, "target_date": target_s, "matches": len(matches), "reminders_created": created, "local_time": now.isoformat()}
        print(result)
        return result
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run(force=True)
