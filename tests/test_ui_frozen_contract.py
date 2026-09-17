"""Guardrails del Punto 7: preservar UI aprobada y evitar regresiones."""
from pathlib import Path

BASE=Path("ui-operativa-base")
INDEX=(BASE/"index.html").read_text(errors="ignore")
MIDEFE=(BASE/"web-mi-defe-overlay-netlify.js").read_text(errors="ignore")

def test_approved_navigation_contract():
    assert "Mi Defe" in MIDEFE
    assert "Comunidad" in INDEX
    assert "Tienda" in INDEX

def test_no_attendance_filter_regression():
    assert not Path("web-attendance-player-filter.js").exists()

def test_no_planteles_in_final_navigation_overlay():
    # El overlay reemplaza el antiguo acceso Planteles por Mi Defe.
    assert "data-mi-defe-button" in MIDEFE
    assert "Mi Defe" in MIDEFE

def test_durable_base_assets_exist():
    for name in ("index.html","availability-ui-netlify.js","web-mi-defe-overlay-netlify.js"):
        assert (BASE/name).is_file()
