from datetime import datetime, timezone
from io import StringIO
import time
import requests
import pandas as pd
from fastapi import APIRouter, HTTPException, Query
import re
import unicodedata

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


def _norm_team(v):
    s=unicodedata.normalize('NFD',_clean(v).lower())
    return ' '.join(''.join(ch for ch in s if unicodedata.category(ch)!='Mn').replace('.',' ').replace('-',' ').split())

def _fixture_rows():
    """Extrae el fixture completo de Zona H desde la página oficial FEFI."""
    r=requests.get(URL,headers=UA,timeout=25);r.raise_for_status()
    tables=pd.read_html(StringIO(r.text));months={'enero':'01','febrero':'02','marzo':'03','abril':'04','mayo':'05','junio':'06','julio':'07','agosto':'08','septiembre':'09','octubre':'10','noviembre':'11','diciembre':'12'}
    out=[]
    for df in tables:
        # Las tablas de fixture/resultados FEFI tienen columnas LOCAL / VISITANTE
        cols=[_clean(x).upper() for x in df.columns]
        if not any('LOCAL' in x for x in cols) or not any('VISIT' in x for x in cols):continue
        for _,row in df.iterrows():
            vals=[_clean(x) for x in row.tolist()]
            joined=' '.join(vals)
            rm=re.search(r'Fecha\s*(\d+)',joined,re.I)
            dm=re.search(r'(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚáéíóúÑñ]+)',joined,re.I)
            # En read_html la fecha puede estar en una fila separada; se conserva por tabla.
        # fallback DOM-like sobre el HTML para no depender de la forma del dataframe
    from bs4 import BeautifulSoup
    soup=BeautifulSoup(r.text,'html.parser');round_no=None;date=None
    for row in soup.find_all('tr'):
        cells=[_clean(x.get_text(' ',strip=True)) for x in row.find_all(['th','td'])]
        if not cells:continue
        joined=' '.join(cells)
        rm=re.search(r'Fecha\s*(\d+)',joined,re.I)
        dm=re.search(r'(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚáéíóúÑñ]+)',joined,re.I)
        if rm:
            round_no=int(rm.group(1))
            if dm:
                mon=months.get(dm.group(2).lower());date=f"2026-{mon}-{int(dm.group(1)):02d}" if mon else None
            continue
        if round_no and len(cells)>=2:
            # FEFI cambia el marcado de las filas: a veces VS viene en una celda
            # propia y otras queda embebido en el texto del partido.
            vs=next((i for i,x in enumerate(cells) if _norm_team(x)=='vs'),None)
            if vs is not None and vs>0 and vs+1<len(cells):
                home,away=cells[vs-1],cells[vs+1]
                if home and away:out.append({'round':round_no,'round_name':f'Fecha {round_no}','date':date,'home':home,'away':away})
            else:
                joined=' | '.join(cells)
                mm=re.search(r'(.+?)\\s+(?:VS|vs\\.?)\\s+(.+)',joined,re.I)
                if mm:
                    home,away=_clean(mm.group(1).split('|')[-1]),_clean(mm.group(2).split('|')[0])
                    if home and away:out.append({'round':round_no,'round_name':f'Fecha {round_no}','date':date,'home':home,'away':away})
    # dedup
    seen=set();rows=[]
    for x in out:
        k=(x['round'],_norm_team(x['home']),_norm_team(x['away']))
        if k not in seen:seen.add(k);rows.append(x)
    return rows

@router.get('/fixture')
def fixture(tournament:str=Query('clausura'),category:str=Query('GENERAL')):
    t=tournament.strip().lower();cat=category.strip().upper()
    if t not in {'apertura','clausura','anual'}:raise HTTPException(400,'Torneo inválido')
    if cat not in CATEGORIES:raise HTTPException(400,'Categoría inválida')
    try:rows=_fixture_rows()
    except Exception as exc:raise HTTPException(502,f'No se pudo consultar fixture FEFI: {exc}')
    defe=[x for x in rows if 'santos lugares' in _norm_team(x['home']) or 'santos lugares' in _norm_team(x['away'])]
    return {'tournament':t,'category':cat,'rows':defe,'available':bool(defe),'source_url':URL,'fetched_at':datetime.now(timezone.utc).isoformat()}
