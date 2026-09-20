from sqlalchemy.orm import Session

from .models import Favorite, User

PROFE_TEAM_FAVORITE = "profe_team"


def normalize_selection(value: str) -> str:
    raw = (value or "").strip()
    if "|" not in raw:
        return ""
    competition, category = [x.strip() for x in raw.split("|", 1)]
    if not competition or not category:
        return ""
    return f"{competition.upper()}|{category.upper()}"


def profe_selections(db: Session, user: User) -> set[str]:
    if getattr(user, "role", "") != "profe":
        return set()
    rows = db.query(Favorite).filter(
        Favorite.user_id == user.id,
        Favorite.favorite_type == PROFE_TEAM_FAVORITE,
    ).all()
    return {normalize_selection(row.favorite_id) for row in rows if normalize_selection(row.favorite_id)}


def selection_allowed(db: Session, user: User, competition: str | None, category: str | None) -> bool:
    if getattr(user, "role", "") != "profe":
        return True
    key = normalize_selection(f"{competition or ''}|{category or ''}")
    return bool(key and key in profe_selections(db, user))
