from datetime import datetime, timezone
from io import StringIO
import time
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
    if len(df.columns)<6:return None
    cols=[_clean(c).upper() for c in df.columns]
    if not any('EQUIP' in c for c in cols) or not any(c in ('PJ','P.J.') or 'PJ' in c for c in cols):return None
    sections={c:[] for c in CATEGORIES};section=None
    for _,row in df.iterrows():
        vals=[_clean(x) for x in row.tolist()[:6]]
        first=vals[0].upper()
        if first in CATEGORIES and all(not x for x in vals[1:]):section=first;continue
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
    data={};names=['apertura','clausura','anual']
    for i,block in enumerate(standings[:3]):data[names[i]]=block
    payload={'source_url':URL,'fetched_at':datetime.now(timezone.utc).isoformat(),'tournaments':data}
    _CACHE.update(at=now,data=payload);return payload

@router.get('/standings')
def standings(tournament:str=Query('clausura'),category:str=Query('GENERAL')):
    t=tournament.strip().lower();c=category.strip().upper()
    if t not in {'apertura','clausura','anual'}:raise HTTPException(400,'Torneo inválido')
    if c not in CATEGORIES:raise HTTPException(400,'Categoría inválida')
    try:data=_load()
    except Exception as exc:raise HTTPException(502,f'No se pudo consultar FEFI: {exc}')
    block=data['tournaments'].get(t)
    if not block:return {'tournament':t,'category':c,'rows':[],'available':False,'source_url':URL,'fetched_at':data['fetched_at']}
    rows=block.get(c,[])
    rows=sorted(rows,key=lambda x:((x.get('pts') if x.get('pts') is not None else -1),(x.get('won') if x.get('won') is not None else -1)),reverse=True)
    return {'tournament':t,'category':c,'rows':rows,'available':bool(rows),'source_url':URL,'fetched_at':data['fetched_at']}
