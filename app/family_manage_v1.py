from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .auth import get_current_user
from .db import get_db
from .models import Favorite, Person, Team, TeamMember
from .availability_v1 import UserPlayerLink
from .following_v5 import FOLLOW_TYPE

router = APIRouter(prefix="/api/availability/family", tags=["Family management"])


def _child(db: Session, user_id: int, person_id: int):
    link = db.query(UserPlayerLink).filter(
        UserPlayerLink.user_id == user_id,
        UserPlayerLink.person_id == person_id,
    ).first()
    person = db.get(Person, person_id)
    if not link or not person or not person.is_active:
        raise HTTPException(404, "Hijo no vinculado a esta familia")
    return link, person


def _remove_favorite_if_unused(db: Session, user_id: int, selection: str, excluding_person_id: int | None = None):
    competition, category = selection.split("|", 1)
    q = db.query(TeamMember).join(Team, Team.id == TeamMember.team_id).join(
        UserPlayerLink, UserPlayerLink.person_id == TeamMember.person_id
    ).filter(
        UserPlayerLink.user_id == user_id,
        Team.competition == competition,
        Team.division == category,
        Team.is_active == True,
    )
    if excluding_person_id is not None:
        q = q.filter(TeamMember.person_id != excluding_person_id)
    if not q.first():
        db.query(Favorite).filter(
            Favorite.user_id == user_id,
            Favorite.favorite_type == FOLLOW_TYPE,
            Favorite.favorite_id == selection,
        ).delete(synchronize_session=False)


@router.delete("/children/{person_id}/teams/{team_id}")
def remove_child_team(person_id: int, team_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    _child(db, user.id, person_id)
    team = db.get(Team, team_id)
    if not team:
        raise HTTPException(404, "Liga/categoría inexistente")
    member = db.query(TeamMember).filter(
        TeamMember.person_id == person_id,
        TeamMember.team_id == team_id,
    ).first()
    if not member:
        raise HTTPException(404, "El hijo no pertenece a esa liga/categoría")
    selection = f"{team.competition}|{team.division}"
    db.delete(member)
    db.flush()
    _remove_favorite_if_unused(db, user.id, selection)
    db.commit()
    return {"ok": True, "removed": selection}


@router.delete("/children/{person_id}")
def remove_child(person_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    link, person = _child(db, user.id, person_id)
    teams = db.query(TeamMember, Team).join(Team, Team.id == TeamMember.team_id).filter(
        TeamMember.person_id == person_id
    ).all()
    selections = [f"{team.competition}|{team.division}" for _, team in teams]
    for member, _ in teams:
        db.delete(member)
    db.delete(link)
    person.is_active = False
    db.flush()
    for selection in selections:
        _remove_favorite_if_unused(db, user.id, selection, excluding_person_id=person_id)
    db.commit()
    return {"ok": True, "person_id": person_id}
