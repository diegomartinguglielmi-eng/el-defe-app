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
    """Extrae el fixture completo de Zona H desde la página oficial FEFI.
    FEFI usa tablas con layouts variables; detectamos partidos por texto VS y
    heredamos Fecha/fecha calendario desde las filas precedentes.
    """
    r=requests.get(URL,headers=UA,timeout=25);r.raise_for_status()
    from bs4 import BeautifulSoup
    soup=BeautifulSoup(r.text,'html.parser')
    months={'enero':'01','febrero':'02','marzo':'03','abril':'04','mayo':'05','junio':'06','julio':'07','agosto':'08','septiembre':'09','octubre':'10','noviembre':'11','diciembre':'12'}
    out=[];round_no=None;date=None
    for table in soup.find_all('table'):
        tround=round_no;tdate=date
        for row in table.find_all('tr'):
            cells=[_clean(x.get_text(' ',strip=True)) for x in row.find_all(['th','td'])]
            if not cells:continue
            joined=' '.join(cells)
            rm=re.search(r'Fecha\\s*(?:N[°º]?\\s*)?(\\d+)',joined,re.I)
            dm=re.search(r'(\\d{1,2})\\s+de\\s+([A-Za-zÁÉÍÓÚáéíóúÑñ]+)',joined,re.I)
            if rm:tround=int(rm.group(1));round_no=tround
            if dm:
                mon=months.get(dm.group(2).lower())
                if mon:tdate=f"2026-{mon}-{int(dm.group(1)):02d}";date=tdate
            # Caso normal: LOCAL | VS | VISITANTE
            vi=next((i for i,x in enumerate(cells) if re.fullmatch(r'\\s*v(?:s|s\\.)\\s*',x,re.I)),None)
            home=away=None
            if vi is not None and vi>0 and vi+1<len(cells):
                home,away=cells[vi-1],cells[vi+1]
            else:
                # Caso FEFI: VS puede quedar embebido en una única celda.
                for cell in cells:
                    mm=re.match(r'^\\s*(.+?)\\s+v(?:s|s\\.)\\s+(.+?)\\s*$',cell,re.I)
                    if mm:home,away=mm.group(1),mm.group(2);break
            if home and away and tround:
                out.append({'round':tround,'round_name':f'Fecha {tround}','date':tdate,'home':_clean(home),'away':_clean(away)})
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
    # Respaldo seguro: la base ya contiene jornadas FEFI sincronizadas que usa
    # Próxima fecha. Si el HTML oficial cambia y no se puede parsear, mostramos
    # esas jornadas persistidas en vez de dejar el fixture vacío.
    if not defe:
        try:
            from .db import SessionLocal
            from .models import Match
            db=SessionLocal()
            try:
                persisted=db.query(Match).filter(Match.competition=='FEFI').all()
                seen=set()
                for m in persisted:
                    if 'santos lugares' not in _norm_team(m.home or '') and 'santos lugares' not in _norm_team(m.away or ''):continue
                    rm=re.search(r'(\\d+)',m.round_name or '')
                    if not rm:continue
                    rnd=int(rm.group(1));key=(rnd,_norm_team(m.home or ''),_norm_team(m.away or ''))
                    if key in seen:continue
                    seen.add(key)
                    raw=str(m.date or '');md=re.search(r'(20\\d{2}-\\d{2}-\\d{2})',raw)
                    defe.append({'round':rnd,'round_name':f'Fecha {rnd}','date':md.group(1) if md else None,'home':m.home,'away':m.away})
                defe.sort(key=lambda x:x['round'])
            finally:db.close()
        except Exception as exc:
            print({'fefi_fixture_persisted_fallback_error':str(exc)})
    # Resultados Clausura oficiales FEFI: la tabla publicada usa columnas
    # 19,13,18,14,17,16,15; para Cat. 2013 corresponde la segunda columna.
    # Extraemos únicamente el cruce de Defe de cada F# y lo aplicamos al fixture.
    official_scores={}
    try:
        rr=requests.get(URL,headers=UA,timeout=25);rr.raise_for_status()
        tabs=pd.read_html(rr.text)
        for tb in tabs:
            cols=[str(x).strip() for x in tb.columns]
            # localizar tabla de resultados por encabezados de categorías
            if not ('13' in cols and any(str(x).strip() in {'F.T.','FT'} for x in cols)):continue
            ftcol=next((x for x in tb.columns if str(x).strip() in {'F.T.','FT'}),None)
            teamcol=next((x for x in tb.columns if str(x).strip().upper()=='EQUIPOS'),None)
            catcol=next((x for x in tb.columns if str(x).strip()==cat[-2:] if cat=='2013'),None)
            if ftcol is None or teamcol is None or catcol is None:continue
            rows=tb.to_dict('records')
            for i,row in enumerate(rows):
                team=_clean(row.get(teamcol,''))
                if 'santos lugares' not in _norm_team(team):continue
                rm=re.search(r'(\\d+)',str(row.get(ftcol,'')))
                if not rm:continue
                rnd=int(rm.group(1));a=row.get(catcol)
                if i+1>=len(rows):continue
                opp=_clean(rows[i+1].get(teamcol,''));b=rows[i+1].get(catcol)
                if not opp:continue
                official_scores[rnd]=(a,b,team,opp)
    except Exception as exc:
        print({'fefi_official_scores_error':str(exc)})
    if defe and official_scores:
        for x in defe:
            sc=official_scores.get(x['round'])
            if not sc:continue
            a,b,team,opp=sc
            local='santos lugares' in _norm_team(x.get('home',''))
            # fila oficial detectada tiene Defe primero; ordenar al marcador Local-Visitante
            x['home_value']=a if local else b
            x['away_value']=b if local else a

    # Último respaldo: fixture FEFI Zona H versionado en el repositorio.
    # Es la misma fuente base usada para las jornadas 1-15 de la temporada.
    if not defe:
        try:
            from pathlib import Path
            import json
            data=json.loads((Path(__file__).resolve().parents[1]/'defe-datos'/'datos.json').read_text(encoding='utf-8'))
            # localizar recursivamente la lista que contiene las jornadas FEFI
            def find_rounds(obj):
                if isinstance(obj,list) and obj and all(isinstance(z,dict) for z in obj):
                    if any('nro' in z and 'rival' in z and 'fecha' in z for z in obj):return obj
                if isinstance(obj,dict):
                    for v in obj.values():
                        got=find_rounds(v)
                        if got:return got
                if isinstance(obj,list):
                    for v in obj:
                        got=find_rounds(v)
                        if got:return got
                return None
            rounds=find_rounds(data) or []
            for z in rounds:
                if not all(k in z for k in ('nro','rival','fecha')):continue
                local=bool(z.get('local'))
                item={'round':int(z['nro']),'round_name':f"Fecha {z['nro']}",'date':z.get('fecha'),'home':'DEF. DE SANTOS LUGARES' if local else z.get('rival'),'away':z.get('rival') if local else 'DEF. DE SANTOS LUGARES'}
                # El JSON guarda marcadores por categoría en orden Defe/Rival.
                score=(z.get('marc') or {}).get(cat)
                if isinstance(score,list) and len(score)>=2:
                    defe_score,rival_score=score[0],score[1]
                    item['home_value']=defe_score if local else rival_score
                    item['away_value']=rival_score if local else defe_score
                elif isinstance(score,str) and score.strip().upper() in {'GP','NP'}:
                    # FEFI también publica resultados administrativos GP/NP.
                    defe_score=score.strip().upper()
                    rival_score='NP' if defe_score=='GP' else 'GP'
                    item['home_value']=defe_score if local else rival_score
                    item['away_value']=rival_score if local else defe_score
                defe.append(item)
        except Exception as exc:
            print({'fefi_fixture_json_fallback_error':str(exc)})
    # Campos esperados por la UI del profesor.
    for x in defe:
        x['home_away']='local' if 'santos lugares' in _norm_team(x.get('home','')) else 'visitante'
    print({'fefi_fixture_endpoint':{'parsed':len(rows),'defe':len(defe),'category':cat}})
    return {'tournament':t,'category':cat,'rows':defe,'available':bool(defe),'source_url':URL,'fetched_at':datetime.now(timezone.utc).isoformat()}
