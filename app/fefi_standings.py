from datetime import datetime, timezone
from io import StringIO
import time
import re
from bs4 import BeautifulSoup
import requests
import pandas as pd
from fastapi import APIRouter, HTTPException, Query

router=APIRouter(tags=['FEFI'])
URL='https://fefi.com.ar/2026-torneo-anual-baby-futbol/h/'
UA={'User-Agent':'ElDefe/2.0 (+contacto club Defensores de Santos Lugares)'}
CATEGORIES=['GENERAL','2019','2013','2018','2014','2017','2016','2015']
_CACHE={'at':0.0,'data':None}
CACHE_SECONDS=900

def _clean(v):
    if pd.isna(v): return ''
    return ' '.join(str(v).replace('\xa0',' ').split()).strip()

def _to_int(v):
    s=_clean(v)
    try:return int(float(s))
    except:return None

def _parse_table(df):
    # Standings are the FEFI tables with exactly six columns:
    # EQUIPOS | PJ | G | E | P | Pts. Results tables have 12 columns.
    if len(df.columns)!=6:return None
    cols=[_clean(c).upper().replace('.','') for c in df.columns]
    if not any('EQUIP' in c for c in cols) or 'PJ' not in cols:return None
    sections={c:[] for c in CATEGORIES};section=None
    for _,row in df.iterrows():
        vals=[_clean(x) for x in row.tolist()[:6]]
        first=vals[0].upper()
        # FEFI uses colspan for category labels. pandas.read_html can either
        # leave the remaining cells empty or repeat the label across them.
        if first in CATEGORIES and all((not x) or x.upper()==first for x in vals[1:]):
            section=first
            continue
        if not section or not vals[0] or first in ('EQUIPOS','EQUIPO'):continue
        pj,g,e,p,pts=[_to_int(x) for x in vals[1:6]]
        if pj is None and pts is None:continue
        sections[section].append({'team':vals[0],'played':pj,'won':g,'drawn':e,'lost':p,'pts':pts})
    return sections if any(sections.values()) else None

def _load():
    now=time.time()
    if _CACHE['data'] is not None and now-_CACHE['at']<CACHE_SECONDS:return _CACHE['data']
    r=requests.get(URL,headers=UA,timeout=25);r.raise_for_status()
    tables=pd.read_html(StringIO(r.text));standings=[]
    for df in tables:
        parsed=_parse_table(df)
        if parsed:standings.append(parsed)
    names=['apertura','clausura','anual']
    data={names[i]:block for i,block in enumerate(standings[:3])}
    payload={'source_url':URL,'fetched_at':datetime.now(timezone.utc).isoformat(),'tournaments':data,'standings_tables_found':len(standings)}
    _CACHE.update(at=now,data=payload);return payload

@router.get('/standings')
def standings(tournament:str=Query('clausura'),category:str=Query('GENERAL')):
    t=tournament.strip().lower();c=category.strip().upper()
    if t not in {'apertura','clausura','anual'}:raise HTTPException(400,'Torneo inválido')
    if c not in CATEGORIES:raise HTTPException(400,'Categoría inválida')
    try:data=_load()
    except Exception as exc:raise HTTPException(502,f'No se pudo consultar FEFI: {exc}')
    block=data['tournaments'].get(t)
    if not block:return {'tournament':t,'category':c,'rows':[],'available':False,'source_url':URL,'fetched_at':data['fetched_at'],'standings_tables_found':data['standings_tables_found']}
    rows=block.get(c,[])
    rows=sorted(rows,key=lambda x:((x.get('pts') if x.get('pts') is not None else -1),(x.get('won') if x.get('won') is not None else -1)),reverse=True)
    return {'tournament':t,'category':c,'rows':rows,'available':bool(rows),'source_url':URL,'fetched_at':data['fetched_at'],'standings_tables_found':data['standings_tables_found']}


_MONTHS={'ENERO':1,'FEBRERO':2,'MARZO':3,'ABRIL':4,'MAYO':5,'JUNIO':6,'JULIO':7,'AGOSTO':8,'SEPTIEMBRE':9,'OCTUBRE':10,'NOVIEMBRE':11,'DICIEMBRE':12}

def _fixture_blocks(html:str):
    soup=BeautifulSoup(html,'html.parser');blocks=[]
    for table in soup.find_all('table'):
        txt=' '.join(table.get_text(' ',strip=True).upper().split())
        if 'LOCAL' not in txt or 'VISITANTE' not in txt or 'FECHA ' not in txt:continue
        rounds=[];current=None
        for tr in table.find_all('tr'):
            cells=[' '.join(x.get_text(' ',strip=True).split()) for x in tr.find_all(['th','td'])]
            if not cells:continue
            joined=' '.join(cells)
            m=re.search(r'Fecha\s+(\d+)\s*-\s*(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚÑáéíóúñ]+)',joined,re.I)
            if m:
                month=_MONTHS.get(m.group(3).upper())
                current={'round':int(m.group(1)),'date':f"2026-{month:02d}-{int(m.group(2)):02d}" if month else None,'matches':[]}
                rounds.append(current);continue
            if current and len(cells)>=3 and cells[1].strip().lower()=='vs':
                current['matches'].append({'home':cells[0],'away':cells[2]})
        if rounds:blocks.append(rounds)
    return blocks

@router.get('/fixture')
def fixture(tournament:str=Query('clausura'),category:str=Query('2013'),db:Session=Depends(get_db)):
    t=tournament.strip().lower()
    if t not in {'apertura','clausura'}:raise HTTPException(400,'Torneo inválido')
    if category not in CATEGORIES:raise HTTPException(400,'Categoría inválida')
    try:
        r=requests.get(URL,headers=UA,timeout=25);r.raise_for_status()
        blocks=_fixture_blocks(r.text)
    except Exception as exc:raise HTTPException(502,f'No se pudo consultar FEFI: {exc}')
    if not blocks:return {'tournament':t,'rows':[],'available':False,'source_url':URL}
    # FEFI publica Apertura primero y Clausura después.
    block=blocks[-1] if t=='clausura' else blocks[0]
    rows=[]
    for rnd in block:
        for match in rnd['matches']:
            if 'DEF. DE SANTOS LUGARES' in (match['home'].upper(),match['away'].upper()):
                result=db.query(FefiCategoryResult).filter(FefiCategoryResult.round_number==rnd['round'],FefiCategoryResult.category==category,FefiCategoryResult.external_key.like("%|CLAUSURA|%")).order_by(FefiCategoryResult.id.desc()).first() if t=='clausura' else None
                rows.append({'round':rnd['round'],'date':rnd['date'],'home':match['home'],'away':match['away'],'home_away':'local' if match['home'].upper()=='DEF. DE SANTOS LUGARES' else 'visitante','home_value':result.home_value if result else None,'away_value':result.away_value if result else None,'result_status':result.status if result else None})
                break
    return {'tournament':t,'rows':rows,'available':bool(rows),'source_url':URL}
