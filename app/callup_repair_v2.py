from sqlalchemy import func

from .availability_player_v2 import PlayerAvailabilityResponse
from .db import SessionLocal
from .models import CallUp, CallUpPlayer, Team, TeamMember
from .profe_scope import normalize_selection


def repair_empty_sent_callups():
    """Recupera jugadores de convocatorias enviadas que quedaron vacías por el flujo legacy.

    Sólo incorpora personas que ya tienen una respuesta persistida para el mismo
    partido + competencia/categoría y que siguen perteneciendo al plantel vigente.
    Nunca agrega automáticamente a todo el plantel.
    """
    db = SessionLocal()
    repaired_callups = 0
    restored_players = 0
    try:
        rows = (
            db.query(CallUp, Team)
            .join(Team, Team.id == CallUp.team_id)
            .filter(CallUp.status == "sent")
            .all()
        )
        for callup, team in rows:
            if db.query(CallUpPlayer).filter(CallUpPlayer.callup_id == callup.id).first():
                continue

            selection = normalize_selection(f"{team.competition}|{team.division}")
            competition, category = selection.split("|", 1)
            selection_teams = (
                db.query(Team)
                .filter(
                    func.upper(Team.competition) == competition,
                    func.upper(Team.division) == category,
                    Team.is_active == True,
                )
                .all()
            )
            team_ids = [x.id for x in selection_teams]
            if not team_ids:
                continue
            roster_ids = {
                x.person_id
                for x in db.query(TeamMember)
                .filter(TeamMember.team_id.in_(team_ids))
                .all()
            }
            if not roster_ids:
                continue

            responses = (
                db.query(PlayerAvailabilityResponse)
                .filter(
                    PlayerAvailabilityResponse.match_id == callup.match_id,
                    PlayerAvailabilityResponse.selection == selection,
                    PlayerAvailabilityResponse.person_id.in_(roster_ids),
                    PlayerAvailabilityResponse.status.in_(["yes", "no", "maybe"]),
                )
                .all()
            )
            if not responses:
                continue

            for response in responses:
                db.add(
                    CallUpPlayer(
                        callup_id=callup.id,
                        person_id=response.person_id,
                        attendance=response.status,
                    )
                )
                restored_players += 1
            repaired_callups += 1

        if repaired_callups:
            db.commit()
        print({
            "callup_repair_v2": {
                "repaired_callups": repaired_callups,
                "restored_players": restored_players,
            }
        })
    except Exception as exc:
        db.rollback()
        print({"callup_repair_v2_error": str(exc)})
    finally:
        db.close()
