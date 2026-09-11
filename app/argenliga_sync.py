import re
from io import StringIO
import pandas as pd
import requests
from sqlalchemy.orm import Session
from .models import Match, Standing, SyncRun

URL='https://www.sofascore.com/es-la/futsal/tournament/argentina/argenliga/34170'
COMPETITION='ARGENLIGA';DIVISION='A Z1';TEAM='Defensores de Santos Lugares'
UA={'User-Agent':'Mozilla/5.0 ElDefe/2.2'}

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

def sync_argenliga(db:Session):
    try:
        r=requests.get(URL,headers=UA,timeout=25);r.raise_for_status();html=r.text
        standings=[]
        for df in pd.read_html(StringIO(html)):
            cols=list(df.columns);pts=_find_col(cols,'pts','puntos');pj=_find_col(cols,'p','pj','jugados','partidosjugados')
            if pts is None:continue
            team_col=None
            for c in cols:
                if c in {pts,pj}:continue
                sample=' '.join(clean(v) for v in df[c].head(8))
                if any(ch.isalpha() for ch in sample):team_col=c;break
            if team_col is None:continue
            for _,row in df.iterrows():
                team=clean(row[team_col]);points=as_int(row[pts])
                if not team or points is None:continue
                standings.append(dict(unique_key=f'ARGENLIGA|2026|AZ1|{team}',competition=COMPETITION,division=DIVISION,season=2026,team=team,pts=points,played=as_int(row[pj]) if pj is not None else None,won=None,drawn=None,lost=None,gf=None,gc=None,gd=None,source_url=URL))
            if standings:break
        for p in standings:_upsert_standing(db,p)
        db.add(SyncRun(source='ARGENLIGA',status='ok' if standings else 'partial',detail=f'A Z1: {len(standings)} filas de tabla pública actualizadas; partidos conservados desde baseline verificado.'))
        db.commit();return {'ok':bool(standings),'standings':len(standings),'source_url':URL}
    except Exception as exc:
        db.rollback();db.add(SyncRun(source='ARGENLIGA',status='error',detail=str(exc)));db.commit();return {'ok':False,'error':str(exc),'source_url':URL}
