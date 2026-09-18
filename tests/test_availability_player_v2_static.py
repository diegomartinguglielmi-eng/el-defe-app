from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
code = (ROOT / 'app' / 'availability_player_v2.py').read_text(encoding='utf-8')
main = (ROOT / 'app' / 'main_checkout.py').read_text(encoding='utf-8')

assert 'class PlayerAvailabilityResponse' in code
assert 'person_id' in code
assert 'UniqueConstraint("person_id", "match_id", "selection"' in code
assert '@router.get("/me")' in code
assert '@router.put("/{match_id}")' in code
assert '@router.get("/admin")' in code
assert 'legacy_family' in code
assert '_family_player' in code
assert 'availability_player_v2_router' in main
assert 'include_router(availability_player_v2_router)' in main
print('ASISTENCIA_POR_HIJO_V2_OK')
