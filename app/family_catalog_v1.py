from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .db import get_db
from .following_v5 import _options

router = APIRouter(prefix="/api/family", tags=["Family"])

LAAMBA_CATEGORIES = ["1ra", "3ra", "4ta", "5ta", "6ta", "7ma", "8va", "9na"]


@router.get("/catalog")
def family_catalog(db: Session = Depends(get_db)):
    """Catálogo jerárquico usado por el alta de hijos.

    Mantiene las opciones canónicas existentes para las ligas de dos niveles y
    explicita el tercer nivel de LAAMBA: rama (Masculino/Femenino) + categoría.
    El valor persistido de LAAMBA queda como 'Rama · Categoría' para conservar
    una selección inequívoca en favoritos, asistencia y comunicaciones.
    """
    options = _options(db)
    competitions = []
    for competition, categories in options.items():
        if competition == "LAAMBA":
            competitions.append({
                "competition": "LAAMBA",
                "mode": "branch_category",
                "branches": [
                    {"branch": "Masculino", "categories": LAAMBA_CATEGORIES},
                    {"branch": "Femenino", "categories": LAAMBA_CATEGORIES},
                ],
            })
        else:
            competitions.append({
                "competition": competition,
                "mode": "category",
                "categories": categories,
            })
    return {"competitions": competitions}
