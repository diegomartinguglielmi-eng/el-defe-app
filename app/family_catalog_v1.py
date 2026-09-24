from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .db import get_db
from .following_v5 import _options

router = APIRouter(prefix="/api/family", tags=["Family"])

LAAMBA_CATEGORIES = ["1ra", "3ra", "4ta", "5ta", "6ta", "7ma", "8va"]
LAAMBA_PROMO_CATEGORIES = ["Promocional 2016", "Promocional 2017", "Promocional 2018", "Promocional 2019/20"]
ARGENLIGA_CATEGORIES = ["1ra", "3ra", "4ta", "5ta", "6ta", "7ma", "8va", "9na"]


@router.get("/catalog")
def family_catalog(db: Session = Depends(get_db)):
    """Catálogo jerárquico usado por el alta de hijos.

    LAAMBA y ARGENLIGA usan tres niveles: liga, rama y categoría.
    El valor persistido queda como 'Rama · Categoría' para conservar una
    selección inequívoca en favoritos, asistencia y comunicaciones.
    """
    options = _options(db)
    competitions = []
    for competition, categories in options.items():
        if competition == "LAAMBA":
            competitions.append({
                "competition": "LAAMBA",
                "mode": "branch_category",
                "branches": [
                    {"branch": "Masculino · M-Elite I", "categories": LAAMBA_CATEGORIES},
                    {"branch": "Promocionales · Zona II", "categories": LAAMBA_PROMO_CATEGORIES},
                ],
            })
        elif competition == "ARGENLIGA":
            competitions.append({
                "competition": "ARGENLIGA",
                "mode": "branch_category",
                "branches": [
                    {"branch": "Masculino", "categories": ARGENLIGA_CATEGORIES},
                ],
            })
        else:
            competitions.append({
                "competition": competition,
                "mode": "category",
                "categories": categories,
            })
    return {"competitions": competitions}
