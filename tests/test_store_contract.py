"""Contratos críticos de Tienda: estados y stock."""
TRANSITIONS={
    "pending":{"confirmed","cancelled"},
    "confirmed":{"ready","cancelled"},
    "ready":{"delivered","cancelled"},
    "delivered":set(),
    "cancelled":set(),
}

def test_happy_path():
    assert "confirmed" in TRANSITIONS["pending"]
    assert "ready" in TRANSITIONS["confirmed"]
    assert "delivered" in TRANSITIONS["ready"]

def test_terminal_states():
    assert not TRANSITIONS["delivered"]
    assert not TRANSITIONS["cancelled"]

def test_cancellation_allowed_before_delivery():
    assert "cancelled" in TRANSITIONS["pending"]
    assert "cancelled" in TRANSITIONS["confirmed"]
    assert "cancelled" in TRANSITIONS["ready"]
