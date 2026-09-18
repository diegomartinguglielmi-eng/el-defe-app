"""Contratos puros del Punto 4: comunicaciones derivadas del contexto familiar.

Estas pruebas validan la regla de audiencia sin importar FastAPI/pywebpush/DB.
La integración del router se valida por separado.
"""


def wants(family, competition=None, category=None, urgent=False):
    if urgent:
        return True
    competition = (competition or "").upper().strip()
    category = (category or "").strip()
    family = {x.upper() for x in family}
    if family:
        if competition and category:
            return f"{competition}|{category}".upper() in family
        if competition:
            return any(x.startswith(f"{competition}|") for x in family)
        return True
    return True


def test_child_category_receives_only_its_communication():
    family = {"FEFI|2013"}
    assert wants(family, "FEFI", "2013")
    assert not wants(family, "FEFI", "2016")


def test_two_children_receive_both_categories():
    family = {"FEFI|2013", "FEFI|2016"}
    assert wants(family, "FEFI", "2013")
    assert wants(family, "FEFI", "2016")
    assert not wants(family, "LAAMBA", "1ra")


def test_removing_membership_removes_audience():
    family = {"FEFI|2013", "FEFI|2016"}
    assert wants(family, "FEFI", "2016")
    family.remove("FEFI|2016")
    assert not wants(family, "FEFI", "2016")


def test_competition_wide_message_reaches_any_child_in_competition():
    family = {"LAAMBA|MASCULINO · 1RA"}
    assert wants(family, "LAAMBA", None)
    assert not wants(family, "FEFI", None)


def test_urgent_always_reaches_family():
    assert wants(set(), "ARGENLIGA", "9na", urgent=True)
