from sqlalchemy.orm import Session

import requests

from .models import Match, Standing, SyncRun
from .sync import (
    UA, TEAM_LAAMBA, clean, col, as_int, played_col, laamba_date_col,
    parse_laamba_date, _laamba_table_frames, _is_cross_division_context,
)

# Divisiones Elite I en las que participa el Defe.
DIVISIONS=['1ra','3ra','4ta','5ta','6ta','7ma','8va']
TOURNAMENTS={
    'APERTURA':'m-elitei',
    'CLAUSURA':'m-eliteiclausura',
}

# Promocionales LAAMBA 2026: el Defe compite en Promocionales zII.
# La web oficial publica cuatro categorías: 2016, 2017, 2018 y 2019/20.
PROMO_DIVISIONS={
    'Promocional 2016':'2016',
    'Promocional 2017':'2017',
    'Promocional 2018':'2018',
    'Promocional 2019/20':'2019-20',
}
PROMO_TOURNAMENTS={
    'APERTURA':'promocionaleszii',
    'CLAUSURA':'promocionalesziiclausura',
}


def _find_col(cols,*terms):
    for term in terms:
        found=col(cols,term)
        if found is not None:return found
    return None


def _upsert_match(db:Session,payload:dict):
    row=db.query(Match).filter(Match.external_key==payload['external_key']).first()
    if row is None:
        db.add(Match(**payload));db.commit();return
    if payload.get('date') is None and row.date:payload['date']=row.date
    if payload.get('venue') is None and row.venue:payload['venue']=row.venue
    for key,value in payload.items():setattr(row,key,value)
    db.commit()


def _upsert_standing(db:Session,payload:dict):
    row=db.query(Standing).filter(Standing.unique_key==payload['unique_key']).first()
    if row is None:db.add(Standing(**payload))
    else:
        for key,value in payload.items():setattr(row,key,value)
    db.commit()


def _sync_url(db:Session,tournament:str,division:str,url:str):
    r=requests.get(url,headers=UA,timeout=25);r.raise_for_status()
    frames=_laamba_table_frames(r.text)
    round_index=0;matches=0;standings=0

    for df,context in frames:
        if _is_cross_division_context(context):continue
        cols=list(df.columns)
        lc=_find_col(cols,'local');vc=_find_col(cols,'visitante');rc=_find_col(cols,'resultado');dc=_find_col(cols,'dirección','direccion');datec=laamba_date_col(cols)
        if lc is not None and vc is not None:
            round_index+=1
            for _,row in df.iterrows():
                home,away=clean(row[lc]),clean(row[vc])
                if TEAM_LAAMBA not in (home,away):continue
                hs=aw=None;status='scheduled'
                if rc is not None:
                    import re
                    mm=re.search(r'(\d+)\s*-\s*(\d+)',clean(row[rc]))
                    if mm:hs,aw,status=int(mm.group(1)),int(mm.group(2)),'final'
                venue=None
                if dc is not None:
                    value=clean(row[dc]);venue=None if not value or value.lower()=='nan' or value=='Fecha Libre' else value
                date=parse_laamba_date(row[datec]) if datec is not None else None
                payload={
                    'external_key':f'LAAMBA|2026|{tournament}|{division}|F{round_index}|{home}|{away}',
                    'competition':'LAAMBA','division':division,'round_name':f'Fecha {round_index}','date':date,
                    'home':home,'away':away,'home_score':hs,'away_score':aw,'status':status,'venue':venue,
                    # Distinguimos el sincronizador por períodos del sincronizador legado.
                    # Así el cleanup no borra inmediatamente los partidos recién importados.
                    'source_url':url,'source_kind':f'sync_period_{tournament.lower()}',
                }
                _upsert_match(db,payload);matches+=1

        teamc=_find_col(cols,'equipo');ptsc=_find_col(cols,'pts','puntos')
        if teamc is None or ptsc is None:continue
        pj=played_col(cols);pg=_find_col(cols,'pg','ganados');pe=_find_col(cols,'pe','empatados');pp=_find_col(cols,'pp','perdidos');gf=_find_col(cols,'gf');gc=_find_col(cols,'gc');gd=_find_col(cols,'dg','dif','diferencia')
        for _,row in df.iterrows():
            team=clean(row[teamc])
            if not team or team.lower()=='nan':continue
            points=as_int(row[ptsc]);played=as_int(row[pj]) if pj is not None else None
            if points is None and played is None:continue
            payload={
                'unique_key':f'LAAMBA|2026|{tournament}|{division}|{team}','competition':'LAAMBA','division':division,'season':2026,'team':team,
                'pts':points,'played':played,'won':as_int(row[pg]) if pg is not None else None,'drawn':as_int(row[pe]) if pe is not None else None,
                'lost':as_int(row[pp]) if pp is not None else None,'gf':as_int(row[gf]) if gf is not None else None,'gc':as_int(row[gc]) if gc is not None else None,
                'gd':as_int(row[gd]) if gd is not None else None,'source_url':url,
            }
            _upsert_standing(db,payload);standings+=1
    return {'matches':matches,'standings':standings,'source_url':url}


def _sync_one(db:Session,tournament:str,slug:str,division:str):
    url=f'https://www.laamba.ar/torneoslaamba/masculino/m-elite-i/{division}/torneo/{slug}/?db=2026'
    return _sync_url(db,tournament,division,url)


def _sync_promo(db:Session,tournament:str,slug:str,division_label:str,category_slug:str):
    url=f'https://www.laamba.ar/torneoslaamba/promocionales/promocionales-zii/{category_slug}/torneo/{slug}/?db=2026'
    return _sync_url(db,tournament,division_label,url)


def sync_laamba_periods(db:Session):
    result={};errors=[]
    for tournament,slug in TOURNAMENTS.items():
        total_m=total_s=0;division_results={}
        for division in DIVISIONS:
            try:
                part=_sync_one(db,tournament,slug,division);division_results[division]=part;total_m+=part['matches'];total_s+=part['standings']
            except Exception as exc:
                db.rollback();errors.append(f'{tournament}/{division}: {exc}')
        # Promocionales zII se integran a LAAMBA con nombres claros para el selector familiar.
        promo_slug=PROMO_TOURNAMENTS[tournament]
        for division_label,category_slug in PROMO_DIVISIONS.items():
            try:
                part=_sync_promo(db,tournament,promo_slug,division_label,category_slug);division_results[division_label]=part;total_m+=part['matches'];total_s+=part['standings']
            except Exception as exc:
                db.rollback();errors.append(f'{tournament}/{division_label}: {exc}')
        result[tournament.lower()]={'matches':total_m,'standings':total_s,'divisions':division_results}

    if result.get('clausura',{}).get('matches',0)>0:
        # Solo eliminamos registros del sincronizador legado. Los nuevos usan
        # sync_period_apertura / sync_period_clausura y deben conservarse.
        legacy_matches=db.query(Match).filter(Match.competition=='LAAMBA',Match.source_kind.in_(['sync','sync_clausura'])).delete(synchronize_session=False)
        legacy_standings=db.query(Standing).filter(Standing.competition=='LAAMBA',~Standing.unique_key.contains('|APERTURA|'),~Standing.unique_key.contains('|CLAUSURA|')).delete(synchronize_session=False)
        db.commit()
    else:legacy_matches=legacy_standings=0

    status='ok' if not errors else ('partial' if any(v['matches'] or v['standings'] for v in result.values()) else 'error')
    detail='; '.join(f"{k}: {v['matches']} partidos / {v['standings']} filas" for k,v in result.items())
    if errors:detail+=(('; ' if detail else '')+' | '.join(errors[:5]))
    db.add(SyncRun(source='LAAMBA',status=status,detail=detail));db.commit()
    return {'ok':status!='error','status':status,'tournaments':result,'legacy_removed':{'matches':legacy_matches,'standings':legacy_standings},'errors':errors[:10]}
