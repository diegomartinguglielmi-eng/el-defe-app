"""Guardrails del Punto 7: preservar UI aprobada y evitar regresiones."""
from pathlib import Path

BASE=Path("ui-operativa-base")
INDEX=(BASE/"index.html").read_text(errors="ignore")
MIDEFE=(BASE/"web-mi-defe-overlay-netlify.js").read_text(errors="ignore")

def test_approved_navigation_contract():
    assert "Mi Defe" in MIDEFE
    # Comunidad/Tienda viven en el bundle compilado; congelamos sus overlays funcionales.
    assert (BASE/"web-comms-overlay-netlify.js").is_file()
    assert (BASE/"web-store-admin-overlay-netlify.js").is_file()

def test_no_attendance_filter_regression():
    # Puede existir una copia histórica dentro de la base durable; el build final la elimina.
    workflow=Path(".github/workflows/build-defe-web.yml").read_text(errors="ignore")
    assert "rm -f /tmp/pages/web-family-delete.js /tmp/pages/web-attendance-player-filter.js" in workflow
    assert "! grep -F 'web-attendance-player-filter.js' /tmp/pages/index.html" in workflow

def test_no_planteles_in_final_navigation_overlay():
    assert "data-mi-defe-button" in MIDEFE
    assert "Mi Defe" in MIDEFE
    assert "/^Planteles?$/i" in MIDEFE

def test_durable_base_assets_exist():
    for name in ("index.html","availability-ui-netlify.js","web-mi-defe-overlay-netlify.js"):
        assert (BASE/name).is_file()
