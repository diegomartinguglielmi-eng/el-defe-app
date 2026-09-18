from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .auth import get_current_user
from .db import get_db

router = APIRouter(prefix="/api/family", tags=["Family context"])


def family_context(db: Session, user_id: int):
    # Import diferido: availability depende de following/home; evita ciclo durante bootstrap.
    from .availability_v1 import _linked_players
    children = []
    selections = []
    seen = set()
    for player in _linked_players(db, user_id):
        teams = []
        for team in player.get("teams") or []:
            competition = (team.get("competition") or "").strip()
            category = (team.get("category") or "").strip()
            if not competition or not category:
                continue
            selection = f"{competition}|{category}"
            teams.append({**team, "selection": selection})
            if selection.upper() not in seen:
                seen.add(selection.upper())
                selections.append(selection)
        children.append({"person_id": player["person_id"], "name": player["name"], "teams": teams})
    return {"children": children, "selections": selections}


@router.get("/context")
def my_family_context(db: Session = Depends(get_db), user=Depends(get_current_user)):
    from .availability_v1 import _next_event
    ctx = family_context(db, user.id)
    next_matches = []
    for child in ctx["children"]:
        for team in child["teams"]:
            event = _next_event(db, team["selection"])
            if event:
                next_matches.append({"person_id": child["person_id"], "player_name": child["name"], "competition": team["competition"], "category": team["category"], "selection": team["selection"], **event})
    next_matches.sort(key=lambda x: ((x.get("date") or "9999-99-99"), (x.get("time") or "99:99"), x["player_name"]))
    return {**ctx, "next_matches": next_matches}
