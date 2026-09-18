"""Contratos mínimos del Punto 3: las cuatro ligas deben conservar soporte canónico.
No reemplaza las pruebas de datos en vivo; evita regresiones estructurales del backend.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def test_four_competitions_are_represented_in_backend_sources():
    corpus = "\n".join(
        p.read_text(encoding="utf-8", errors="ignore")
        for p in (ROOT / "app").glob("*.py")
    ).upper()
    for league in ("FEFI", "LAAMBA", "ARGENLIGA", "SUPER LIGA"):
        assert league in corpus, f"Falta soporte explícito para {league}"


def test_public_match_and_standing_contracts_exist():
    main = text("app/main.py")
    assert '@app.get("/api/matches")' in main
    assert '@app.get("/api/standings")' in main
    assert "competition:str|None=None" in main
    assert "division:str|None=None" in main


def test_home_keeps_global_fallback_and_family_personalization():
    home = text("app/home_v5.py")
    assert '@router.get("/next-match")' in home
    assert '@router.get("/personalized")' in home
    assert '"next_matches": family_matches' in home
    assert '"fallback": not bool(family_matches)' in home


def test_family_context_is_the_shared_selection_source():
    ctx = text("app/family_context_v1.py")
    assert 'selection = f"{competition}|{category}"' in ctx
    assert '"children": children' in ctx
    assert '"selections": selections' in ctx
