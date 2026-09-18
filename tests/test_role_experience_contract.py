"""Contratos de experiencia por rol del frontend aprobado."""
from pathlib import Path

ROLE=Path("web-role-experience.js").read_text()
AUTH=Path("app/auth.py").read_text()

def test_frontend_resolves_real_user_role():
    assert "/api/me" in ROLE
    assert "defe:role" in ROLE
    assert "data-role-only" in ROLE

def test_store_role_is_scoped_to_store_admin():
    assert 'user.role=="tienda"' in AUTH
    assert 'request.url.path.startswith("/api/store/admin")' in AUTH

def test_backend_keeps_global_role_guard():
    assert "def require_roles(*roles)" in AUTH
    assert 'raise HTTPException(status_code=403' in AUTH
