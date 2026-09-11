from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .db import get_db
from .models import Match, Standing

router = APIRouter(prefix='/api/leagues', tags=['Leagues'])


def _period_from_key(key: str | None) -> str | None:
    k=(key or '').upper()
    if '|APERTURA|' in k or '|1273|' in k:
        return 'apertura'
    if '|CLAUSURA|' in k or '|1294|' in k:
        return 'clausura'
    if '|ANUAL|' in k:
        return 'anual'
    return None


def _match_out(row: Match):
    data={c.name:getattr(row,c.name) for c in row.__table__.columns}
    data['tournament']=_period_from_key(row.external_key)
    return data


def _standing_out(row: Standing):
    data={c.name:getattr(row,c.name) for c in row.__table__.columns}
    data['tournament']=_period_from_key(row.unique_key)
    return data


@router.get('/matches')
def league_matches(
    competition: str | None = None,
    division: str | None = None,
    tournament: str | None = Query(None, pattern='^(apertura|clausura|anual)$'),
    db: Session = Depends(get_db),
):
    q=db.query(Match)
    if competition:q=q.filter(Match.competition==competition)
    if division:q=q.filter(Match.division==division)
    rows=q.all()
    out=[_match_out(x) for x in rows]
    if tournament:out=[x for x in out if x.get('tournament')==tournament]
    out.sort(key=lambda x:((x.get('date') or ''),x.get('id') or 0),reverse=True)
    return out


@router.get('/standings')
def league_standings(
    competition: str,
    division: str | None = None,
    tournament: str | None = Query(None, pattern='^(apertura|clausura|anual)$'),
    db: Session = Depends(get_db),
):
    q=db.query(Standing).filter(Standing.competition==competition)
    if division:q=q.filter(Standing.division==division)
    rows=q.all()
    out=[_standing_out(x) for x in rows]
    if tournament:out=[x for x in out if x.get('tournament')==tournament]
    out.sort(key=lambda x:((x.get('pts') if x.get('pts') is not None else -1),(x.get('gd') if x.get('gd') is not None else -999)),reverse=True)
    return out


@router.get('/tournaments')
def league_tournaments(competition: str, division: str | None = None, db: Session = Depends(get_db)):
    mq=db.query(Match).filter(Match.competition==competition)
    sq=db.query(Standing).filter(Standing.competition==competition)
    if division:
        mq=mq.filter(Match.division==division)
        sq=sq.filter(Standing.division==division)
    values=set()
    for row in mq.all():
        p=_period_from_key(row.external_key)
        if p:values.add(p)
    for row in sq.all():
        p=_period_from_key(row.unique_key)
        if p:values.add(p)
    order=['apertura','clausura','anual']
    return {'competition':competition,'division':division,'tournaments':[x for x in order if x in values]}
