from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from .db import Base, engine, SessionLocal
from .models import Match, FefiCategorySchedule, Person, Team, TeamMember, CallUp, CallUpPlayer, User, Favorite
from .profe_scope import PROFE_TEAM_FAVORITE
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


def run_birthdays(force: bool = False) -> dict:
    now = datetime.now(AR_TZ)
    if not force and now.hour != 9:
        return {"ok": True, "skipped": True, "reason": "outside_09h_window", "local_time": now.isoformat()}
    Base.metadata.create_all(bind=engine); db=SessionLocal(); created=0; pushed=0
    try:
        today=now.date()
        rows=(db.query(Person,Team).join(TeamMember,TeamMember.person_id==Person.id).join(Team,Team.id==TeamMember.team_id).filter(Person.is_active==True,Person.birth_date.isnot(None),Team.is_active==True).all())
        seen=set()
        for person,team in rows:
            if person.birth_date.month!=today.month or person.birth_date.day!=today.day: continue
            key=(person.id,team.competition,team.division)
            if key in seen: continue
            seen.add(key)
            marker=f"birthday:{today.year}:{person.id}"
            exists=db.query(NotificationEvent).filter(NotificationEvent.event_type==marker,NotificationEvent.competition==team.competition,NotificationEvent.category==team.division).first()
            if exists: continue
            event=publish_event(db,event_type=marker,title=f"🎂 ¡Hoy cumple {person.first_name}!",body=f"Mandale un saludo a {person.first_name} en su día 🎉",competition=team.competition,category=team.division,urgent=False)
            created+=1; pushed+=getattr(event,"push_result",{}).get("sent",0)
        db.commit(); return {"ok":True,"birthdays_created":created,"push_sent":pushed,"local_time":now.isoformat()}
    except Exception:
        db.rollback(); raise
    finally: db.close()


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
                for category in categories:
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


def run_callup_pending_alerts(force: bool = False, match_id: int | None = None, category: str | None = None) -> dict:
    now=datetime.now(AR_TZ); Base.metadata.create_all(bind=engine); db=SessionLocal(); created=pushed=0
    try:
        target=(now.date()+timedelta(days=3)).isoformat()
        q=db.query(Match).filter(Match.competition=="FEFI",Match.status!="final")
        if match_id is not None: q=q.filter(Match.id==match_id)
        elif force and category: q=q.filter(Match.date=="2026-09-26")
        elif not force: q=q.filter(Match.date==target)
        matches=q.all()
        categories=[str(category)] if category else FEFI_CATEGORIES
        for match in matches:
            for category in FEFI_CATEGORIES:
                team=db.query(Team).filter(Team.competition=="FEFI",Team.division==category,Team.is_active==True).order_by(Team.season.desc()).first()
                if not team: continue
                callup=db.query(CallUp).filter(CallUp.match_id==match.id,CallUp.team_id==team.id,CallUp.status=="published").order_by(CallUp.id.desc()).first()
                if not callup: continue
                rows=db.query(CallUpPlayer).filter(CallUpPlayer.callup_id==callup.id).all()
                total=len(rows); pending=sum((x.attendance or "pending")=="pending" for x in rows)
                if not total or pending/total<=0.25: continue
                marker=f"callup_72h:{match.id}:{category}" if not force else f"callup_72h_test:{match.id}:{category}"
                if db.query(NotificationEvent).filter(NotificationEvent.event_type==marker).first(): continue
                profe_ids=[uid for (uid,) in db.query(Favorite.user_id).filter(Favorite.favorite_type==PROFE_TEAM_FAVORITE,Favorite.favorite_id==f"FEFI|{category}").all()]
                profes=db.query(User).filter(User.id.in_(profe_ids),User.role=="profe",User.is_active==True).all() if profe_ids else []
                for profe in profes:
                    event=publish_event(db,event_type=marker,title=f"⚠️ Convocatoria Cat. {category}",body=f"{pending} de {total} convocados todavía no respondieron. Faltan 72 horas para el partido." if not force else f"PRUEBA · {pending} de {total} convocados todavía no respondieron.",competition="FEFI",category=category,match_id=match.id,urgent=False,target_user_id=profe.id)
                    created+=1; pushed+=getattr(event,"push_result",{}).get("sent",0)
        db.commit(); return {"ok":True,"target_date":target,"alerts_created":created,"push_sent":pushed}
    except Exception:
        db.rollback(); raise
    finally: db.close()
