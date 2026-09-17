"""Contratos del Punto 4: comunicaciones derivadas del contexto familiar."""
from types import SimpleNamespace

import app.notifications_v5 as n


def event(competition=None, category=None, urgent=False):
    return SimpleNamespace(competition=competition, category=category, urgent=urgent)


def sub(user_id=10, followed_json='[]'):
    return SimpleNamespace(user_id=user_id, followed_json=followed_json)


def test_child_category_receives_only_its_communication(monkeypatch):
    monkeypatch.setattr(n, "_family_selections", lambda db, uid: {"FEFI|2013"})
    assert n._wants(None, sub(), event("FEFI", "2013"))
    assert not n._wants(None, sub(), event("FEFI", "2016"))


def test_two_children_receive_both_categories(monkeypatch):
    monkeypatch.setattr(n, "_family_selections", lambda db, uid: {"FEFI|2013", "FEFI|2016"})
    assert n._wants(None, sub(), event("FEFI", "2013"))
    assert n._wants(None, sub(), event("FEFI", "2016"))
    assert not n._wants(None, sub(), event("LAAMBA", "1ra"))


def test_removing_membership_removes_audience(monkeypatch):
    selections = {"FEFI|2013", "FEFI|2016"}
    monkeypatch.setattr(n, "_family_selections", lambda db, uid: selections)
    assert n._wants(None, sub(), event("FEFI", "2016"))
    selections.remove("FEFI|2016")
    assert not n._wants(None, sub(), event("FEFI", "2016"))


def test_competition_wide_message_reaches_any_child_in_competition(monkeypatch):
    monkeypatch.setattr(n, "_family_selections", lambda db, uid: {"LAAMBA|MASCULINO · 1RA"})
    assert n._wants(None, sub(), event("LAAMBA", None))
    assert not n._wants(None, sub(), event("FEFI", None))


def test_urgent_always_reaches_family(monkeypatch):
    monkeypatch.setattr(n, "_family_selections", lambda db, uid: set())
    assert n._wants(None, sub(), event("ARGENLIGA", "9na", urgent=True))
