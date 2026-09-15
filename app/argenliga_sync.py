import re
from datetime import datetime
from io import StringIO
from zoneinfo import ZoneInfo

import pandas as pd
import requests
from sqlalchemy.orm import Session

from .models import Match, Standing, SyncRun, Team

SOFASCORE_URL='https://www.sofascore.com/es-la/futsal/tournament/argentina/argenliga/34170'
SOFASCORE_API='https://www.sofascore.com/api/v1'
SOFASCORE_TEAM_ID=1214864
SOFASCORE_TOURNAMENT_ID=34170
SEGUNDO_PALO_URL='https://www.segundopalo.com/es/competencia/22/argenliga-a'
COMPETITION='ARGENLIGA';DIVISION='A Z1';TEAM='Defensores de Santos Lugares'
ARGENLIGA_INFERIORES=['3ra','4ta','5ta','6ta','7ma','8va','9na']
UA={'User-Agent':'Mozilla/5.0 ElDefe/2.5 (+Club Defensores de Santos Lugares)'}
TZ=ZoneInfo('America/Argentina/Buenos_Aires')


def clean(x):
    if pd.isna(x):return ''
    return re.sub(r'\s+',' ',str(x)).strip()

def as_int(x):
    try:return int(float(clean(x)))
    except:return None


def _find_col(cols,*terms):
    for c in cols:
        n=re.sub(r'[^a-z0-9]','',clean(c).lower())
        if n in terms:return c
    return None


def _upsert_standing(db,p):
    row=db.query(Standing).filter(Standing.unique_key==p['unique_key']).first()
    if not row:db.add(Standing(**p))
    else:
        for k,v in p.items():setattr(row,k,v)


def _ensure_argenliga_teams(db:Session):
    created=0
    for division in ARGENLIGA_INFERIORES:
        row=(db.query(Team).filter(
            Team.competition==COMPETITION,
            Team.division==division,
            Team.season==2026,
        ).first())
        if not row:
            db.add(Team(competition=COMPETITION,division=division,season=2026,gender='masculino',is_active=True))
            created+=1
        else:
            row.is_active=True
            if not row.gender:row.gender='masculino'
    return created


def _request_json(url):
    r=requests.get(url,headers=UA,timeout=25)
    r.raise_for_status()
    return r.json()


def _event_is_argenliga(event):
    tournament=event.get('tournament') or {}
    unique=tournament.get('uniqueTournament') or {}
    if unique.get('id')==SOFASCORE_TOURNAMENT_ID:return True
    names=' '.join(str(x or '') for x in [tournament.get('name'),unique.get('name')]).casefold()
    return 'argenliga' in names


def _event_payload(event):
    home=(event.get('homeTeam') or {}).get('name') or ''
    away=(event.get('awayTeam') or {}).get('name') or ''
    if not home or not away:return None
    ts=event.get('startTimestamp')
    if not ts:return None
    dt=datetime.fromtimestamp(int(ts),tz=TZ)
    date=dt.strftime('%Y-%m-%d')
    status=(event.get('status') or {}).get('type') or ''
    finished=status in {'finished','afterpenalties','afterextra'} or (event.get('status') or {}).get('code')==100
    hs=(event.get('homeScore') or {}).get('current') if finished else None
    aws=(event.get('awayScore') or {}).get('current') if finished else None
    round_info=event.get('roundInfo') or {}
    round_value=round_info.get('round') or round_info.get('name')
    round_name=f"Fecha {round_value}" if round_value and str(round_value).isdigit() else (str(round_value) if round_value else 'Argenliga')
    if dt.strftime('%H:%M')!='00:00':round_name+=f" · {dt.strftime('%H:%M')}"
    event_id=event.get('id')
    return {
        'external_key':f'ARGENLIGA|2026|SOFASCORE|{event_id or date}|{home}|{away}',
        'competition':COMPETITION,
        'division':DIVISION,
        'round_name':round_name,
        'date':date,
        'home':home,
        'away':away,
        'home_score':as_int(hs) if finished else None,
        'away_score':as_int(aws) if finished else None,
        'status':'final' if finished else ('postponed' if status in {'postponed','canceled','cancelled'} else 'scheduled'),
        'venue':None,
        'source_url':f"https://www.sofascore.com/{event.get('slug','')}/{event.get('customId','')}" if event.get('customId') else SOFASCORE_URL,
        'source_kind':'sync_argenliga_sofascore',
    }


def _collect_matches():
    found={}
    # Varias páginas para no depender de una única ventana de 5/10 partidos.
    for direction in ('last','next'):
        for page in range(0,6):
            url=f'{SOFASCORE_API}/team/{SOFASCORE_TEAM_ID}/events/{direction}/{page}'
            try:data=_request_json(url)
            except Exception:
                break
            events=data.get('events') or []
            if not events:break
            for event in events:
                if not _event_is_argenliga(event):continue
                payload=_event_payload(event)
                if payload and payload['date'].startswith('2026-'):
                    found[payload['external_key']]=payload
            if not data.get('hasNextPage',False):break
    return sorted(found.values(),key=lambda x:(x['date'],x['external_key']))


def _collect_standings():
    r=requests.get(SOFASCORE_URL,headers=UA,timeout=25);r.raise_for_status();html=r.text
    standings=[]
    for df in pd.read_html(StringIO(html)):
        cols=list(df.columns);pts=_find_col(cols,'pts','puntos');pj=_find_col(cols,'p','pj','jugados','partidosjugados')
        if pts is None:continue
        team_col=None
        for c in cols:
            if c in {pts,pj}:continue
            sample=' '.join(clean(v) for v in df[c].head(20))
            if any(ch.isalpha() for ch in sample):team_col=c;break
        if team_col is None:continue
        for _,row in df.iterrows():
            team=clean(row[team_col]);points=as_int(row[pts])
            if not team or points is None:continue
            standings.append(dict(unique_key=f'ARGENLIGA|2026|AZ1|{team}',competition=COMPETITION,division=DIVISION,season=2026,team=team,pts=points,played=as_int(row[pj]) if pj is not None else None,won=None,drawn=None,lost=None,gf=None,gc=None,gd=None,source_url=SOFASCORE_URL))
        if standings:break
    return standings


def sync_argenliga(db:Session):
    try:
        created_teams=_ensure_argenliga_teams(db)
        standings=_collect_standings()
        matches=_collect_matches()

        # Solo reemplazamos el baseline viejo cuando la fuente devuelve una temporada
        # mínimamente consistente. Así evitamos dejar la app vacía ante un bloqueo externo.
        replaced_matches=0
        if len(matches)>=4 and any(m['status']=='final' for m in matches):
            replaced_matches=db.query(Match).filter(Match.competition==COMPETITION).delete(synchronize_session=False)
            for p in matches:db.add(Match(**p))

        for p in standings:_upsert_standing(db,p)

        finals=sum(1 for m in matches if m['status']=='final')
        upcoming=sum(1 for m in matches if m['status']=='scheduled')
        status='ok' if standings and matches else ('partial' if standings or matches else 'error')
        detail=(f'A Z1: {len(standings)} filas de tabla; {len(matches)} partidos 2026 '
                f'({finals} resultados / {upcoming} próximos); inferiores activas 3ra-9na; '
                f'equipos nuevos={created_teams}; reemplazados={replaced_matches}')
        db.add(SyncRun(source='ARGENLIGA',status=status,detail=detail))
        db.commit()
        return {
            'ok':status!='error','status':status,'standings':len(standings),
            'matches':len(matches),'results':finals,'upcoming':upcoming,
            'inferiores':ARGENLIGA_INFERIORES,'teams_created':created_teams,
            'replaced_matches':replaced_matches,'source_url':SOFASCORE_URL,
            'secondary_source_url':SEGUNDO_PALO_URL,
        }
    except Exception as exc:
        db.rollback();db.add(SyncRun(source='ARGENLIGA',status='error',detail=str(exc)[:500]));db.commit();return {'ok':False,'error':str(exc),'source_url':SOFASCORE_URL}
