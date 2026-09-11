import re
import time
from io import StringIO

import pandas as pd
import requests
from fastapi import APIRouter, HTTPException, Query

UA={'User-Agent':'Mozilla/5.0 ElDefe/2.3 (+club Defensores de Santos Lugares)'}
router=APIRouter(prefix='/api/leagues/stats',tags=['League stats'])
CACHE_SECONDS=900
_CACHE={}

LAAMBA_SLUGS={'apertura':'m-elitei','clausura':'m-eliteiclausura'}
SUPERLIGA_URLS={
    'scorers':'https://www.futsalargentina.com.ar/goleadores.php?cat=1_1',
    'best_player':'https://www.futsalargentina.com.ar/mejor-jugador.php?cat=1_1',
    'goalkeeping':'https://www.futsalargentina.com.ar/valla-menos-vencida.php?cat=1_1',
}


def clean(v):
    if pd.isna(v):return ''
    return re.sub(r'\s+',' ',str(v)).strip()


def norm(v):
    return re.sub(r'[^a-z0-9]','',clean(v).lower())


def number(v):
    s=clean(v).replace(',','.')
    try:
        n=float(re.search(r'-?\d+(?:\.\d+)?',s).group())
        return int(n) if n.is_integer() else n
    except Exception:return None


def fetch_html(url):
    now=time.time();hit=_CACHE.get(url)
    if hit and now-hit['at']<CACHE_SECONDS:return hit['html']
    r=requests.get(url,headers=UA,timeout=25);r.raise_for_status();_CACHE[url]={'at':now,'html':r.text};return r.text


def tables(html):
    try:return pd.read_html(StringIO(html))
    except Exception:return []


def find_col(cols,*tokens):
    mapping={norm(c):c for c in cols}
    for token in tokens:
        t=norm(token)
        for n,c in mapping.items():
            if t==n or t in n:return c
    return None


def parse_people_table(df,value_tokens):
    cols=list(df.columns)
    name=find_col(cols,'apellido y nombre','jugador','nombre')
    team=find_col(cols,'equipo','club')
    value=find_col(cols,*value_tokens)
    if name is None or value is None:return []
    out=[]
    for _,r in df.iterrows():
        person=clean(r[name]);val=number(r[value])
        if not person or val is None:continue
        out.append({'name':person,'team':clean(r[team]) if team is not None else None,'value':val})
    return out


def parse_superliga():
    sections=[]
    specs=[
        ('scorers','Goleadores',('goles','gol')),
        ('best_player','Mejor jugador',('cantidad','votos')),
        ('goalkeeping','Valla menos vencida',('promedio',)),
    ]
    for key,label,tokens in specs:
        url=SUPERLIGA_URLS[key]
        try:html=fetch_html(url)
        except Exception:continue
        rows=[]
        for df in tables(html):
            rows=parse_people_table(df,tokens)
            if rows:break
            if key=='goalkeeping':
                cols=list(df.columns);team=find_col(cols,'equipo');value=find_col(cols,'promedio')
                if team is not None and value is not None:
                    for _,r in df.iterrows():
                        name=clean(r[team]);val=number(r[value])
                        if name and val is not None:rows.append({'name':name,'team':None,'value':val})
                    if rows:break
        if rows:sections.append({'key':key,'label':label,'rows':rows[:50],'source_url':url})
    return sections


def laamba_url(division,tournament):
    slug=LAAMBA_SLUGS.get(tournament)
    if not slug:return None
    return f'https://www.laamba.ar/torneoslaamba/masculino/m-elite-i/{division}/torneo/{slug}/?db=2026'


def parse_laamba(division,tournament):
    url=laamba_url(division,tournament)
    if not url:return []
    html=fetch_html(url);sections=[]
    for df in tables(html):
        cols=list(df.columns)
        name=find_col(cols,'jugador','apellido y nombre','nombre')
        team=find_col(cols,'equipo','club')
        goals=find_col(cols,'goles','gol')
        yellow=find_col(cols,'amarillas','amarilla','tarjetas amarillas')
        red=find_col(cols,'rojas','roja','tarjetas rojas')
        if name is None:continue
        if goals is not None:
            rows=[]
            for _,r in df.iterrows():
                person=clean(r[name]);val=number(r[goals])
                if person and val is not None:rows.append({'name':person,'team':clean(r[team]) if team is not None else None,'value':val})
            if rows:sections.append({'key':'scorers','label':'Goleadores','rows':rows[:50],'source_url':url})
        if yellow is not None or red is not None:
            rows=[]
            for _,r in df.iterrows():
                person=clean(r[name])
                if not person:continue
                y=number(r[yellow]) if yellow is not None else None;rr=number(r[red]) if red is not None else None
                if (y or 0)==0 and (rr or 0)==0:continue
                rows.append({'name':person,'team':clean(r[team]) if team is not None else None,'yellow':y or 0,'red':rr or 0})
            if rows:sections.append({'key':'cards','label':'Tarjetas','rows':rows[:50],'source_url':url})
    dedup={}
    for s in sections:
        if s['key'] not in dedup or len(s['rows'])>len(dedup[s['key']]['rows']):dedup[s['key']]=s
    return list(dedup.values())


@router.get('')
def league_stats(
    competition:str,
    division:str|None=None,
    tournament:str|None=Query(None,pattern='^(apertura|clausura|anual)$'),
):
    comp=competition.strip().upper()
    try:
        if comp=='LAAMBA':
            if not division or not tournament or tournament=='anual':return {'available':False,'sections':[],'scope':'period'}
            sections=parse_laamba(division,tournament)
            return {'available':bool(sections),'sections':sections,'scope':tournament}
        if comp=='SUPERLIGA':
            if tournament=='apertura':return {'available':False,'sections':[],'scope':'current'}
            sections=parse_superliga()
            return {'available':bool(sections),'sections':sections,'scope':'current'}
        return {'available':False,'sections':[],'scope':None}
    except requests.RequestException as exc:
        raise HTTPException(502,f'No se pudo consultar la fuente pública: {exc}')
