import re
from io import StringIO
from datetime import datetime
import requests
import pandas as pd
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from .models import Match, Standing, SyncRun

UA={"User-Agent":"Mozilla/5.0 ElDefe/2.0"}
TEAM_FEFI="DEF. DE SANTOS LUGARES"
TEAM_LAAMBA="Defensores de SL"

def clean(x): return re.sub(r"\s+"," ",str(x)).strip()
def as_int(x):
    try:
        if pd.isna(x): return None
        return int(float(str(x).strip()))
    except: return None

def upsert_match(db:Session,m):
    obj=db.query(Match).filter(Match.external_key==m["external_key"]).first()
    if not obj:
        obj=Match(**m); db.add(obj)
    else:
        for k,v in m.items(): setattr(obj,k,v)
    db.commit()

def upsert_standing(db:Session,s):
    obj=db.query(Standing).filter(Standing.unique_key==s["unique_key"]).first()
    if not obj:
        obj=Standing(**s); db.add(obj)
    else:
        for k,v in s.items(): setattr(obj,k,v)
    db.commit()

def log(db,source,status,detail):
    db.add(SyncRun(source=source,status=status,detail=detail)); db.commit()

def sync_fefi(db:Session):
    url="https://fefi.com.ar/2026-torneo-anual-baby-futbol/h/"
    saved=0
    try:
        r=requests.get(url,headers=UA,timeout=25); r.raise_for_status()
        soup=BeautifulSoup(r.text,"html.parser")
        lines=[clean(x) for x in soup.get_text("\n",strip=True).splitlines() if clean(x)]
        months={"enero":"01","febrero":"02","marzo":"03","abril":"04","mayo":"05","junio":"06","julio":"07","agosto":"08","septiembre":"09","octubre":"10","noviembre":"11","diciembre":"12"}
        round_name=date=None
        for i,line in enumerate(lines):
            m=re.match(r"Fecha\s+(\d+)\s*-\s*(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚáéíóúñÑ]+)",line,re.I)
            if m:
                round_name=f"Fecha {m.group(1)}"; mon=months.get(m.group(3).lower()); date=f"2026-{mon}-{int(m.group(2)):02d}" if mon else None; continue
            if line.lower()=="vs" and round_name and i>0 and i<len(lines)-1:
                h,a=lines[i-1],lines[i+1]
                if TEAM_FEFI in (h,a):
                    upsert_match(db,dict(external_key=f"FEFI|2026|{round_name}|{h}|{a}",competition="FEFI",division="Zona H",round_name=round_name,date=date,home=h,away=a,status="scheduled",source_url=url,source_kind="sync")); saved+=1
        log(db,"FEFI","ok",f"{saved} partidos actualizados"); return {"ok":True,"saved":saved}
    except Exception as e:
        log(db,"FEFI","error",str(e)); return {"ok":False,"error":str(e)}

def col(cols, term):
    for c in cols:
        if term in str(c).lower(): return c

def played_col(cols):
    """Find LAAMBA played-matches column across header variants (J, PJ, P.J., Jugados)."""
    for c in cols:
        n=re.sub(r"[^a-z0-9]","",str(c).lower())
        if n in {"j","pj","jugados","partidosjugados"}: return c
    return None

def laamba_date_col(cols):
    """Return an explicit calendar-date column if LAAMBA publishes one."""
    for c in cols:
        n=re.sub(r"[^a-z0-9áéíóú]","",str(c).lower())
        if n in {"fecha","dia","día","date"}: return c
    return None

def parse_laamba_date(value):
    """Normalize common LAAMBA date formats to YYYY-MM-DD; never infer a date from round number."""
    if value is None or pd.isna(value): return None
    s=clean(value)
    if not s or s.lower()=="nan": return None
    for fmt in ("%d/%m/%Y","%d/%m/%y","%Y-%m-%d","%d-%m-%Y","%d-%m-%y"):
        try: return datetime.strptime(s[:10],fmt).strftime("%Y-%m-%d")
        except Exception: pass
    m=re.search(r"\b(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?\b",s)
    if m:
        y=m.group(3)
        if y is None: y="2026"
        elif len(y)==2: y="20"+y
        try: return datetime(int(y),int(m.group(2)),int(m.group(1))).strftime("%Y-%m-%d")
        except Exception: return None
    return None

def _prefer_laamba_candidate(current, candidate):
    """One match per division/round. A final result supersedes a scheduled fixture; otherwise latest source candidate wins."""
    if current is None: return candidate
    if candidate.get("status")=="final" and current.get("status")!="final": return candidate
    if current.get("status")=="final" and candidate.get("status")!="final": return current
    return candidate

def _upsert_laamba_match_preserving_known_fields(db:Session,cand):
    """Do not erase a known date/venue when the current LAAMBA source omits that field."""
    obj=db.query(Match).filter(Match.external_key==cand["external_key"]).first()
    if not obj:
        obj=Match(**cand); db.add(obj); db.commit(); return
    payload=dict(cand)
    if payload.get("date") is None and obj.date:
        payload["date"]=obj.date
    if payload.get("venue") is None and obj.venue:
        payload["venue"]=obj.venue
    for k,v in payload.items(): setattr(obj,k,v)
    db.commit()

def sync_laamba(db:Session):
    divisions=["1ra","3ra","4ta","5ta","6ta","7ma","8va"]
    ms=st=0; errors=[]; recovered_dates=0
    for div in divisions:
        url=f"https://www.laamba.ar/torneoslaamba/masculino/m-elite-i/{div}/torneo/m-eliteiclausura/?db=2026"
        try:
            r=requests.get(url,headers=UA,timeout=25);r.raise_for_status(); tables=pd.read_html(StringIO(r.text)); ri=0
            candidates={}
            for df in tables:
                cols=list(df.columns); lc=col(cols,"local"); vc=col(cols,"visitante"); rc=col(cols,"resultado"); dc=col(cols,"dirección") or col(cols,"direccion"); datec=laamba_date_col(cols)
                if lc is not None and vc is not None:
                    ri+=1
                    for _,row in df.iterrows():
                        h,a=clean(row[lc]),clean(row[vc])
                        if TEAM_LAAMBA not in (h,a): continue
                        hs=aw=None; status="scheduled"
                        if rc is not None:
                            mm=re.search(r"(\d+)\s*-\s*(\d+)",clean(row[rc]))
                            if mm: hs,aw,status=int(mm.group(1)),int(mm.group(2)),"final"
                        venue=None
                        if dc is not None:
                            vv=clean(row[dc]); venue=None if not vv or vv.lower()=="nan" or vv=="Fecha Libre" else vv
                        source_date=parse_laamba_date(row[datec]) if datec is not None else None
                        if source_date: recovered_dates+=1
                        cand=dict(external_key=f"LAAMBA|2026|CLAUSURA|{div}|F{ri}|{h}|{a}",competition="LAAMBA",division=div,round_name=f"Fecha {ri}",date=source_date,home=h,away=a,home_score=hs,away_score=aw,status=status,venue=venue,source_url=url,source_kind="sync_clausura")
                        candidates[ri]=_prefer_laamba_candidate(candidates.get(ri),cand)
                teamc=col(cols,"equipo");ptsc=col(cols,"pts")
                if teamc is not None and ptsc is not None:
                    jc=played_col(cols)
                    for _,row in df.iterrows():
                        team=clean(row[teamc])
                        if not team or team=="nan": continue
                        upsert_standing(db,dict(unique_key=f"LAAMBA|2026|CLAUSURA|{div}|{team}",competition="LAAMBA",division=div,season=2026,team=team,pts=as_int(row[ptsc]),played=as_int(row[jc]) if jc is not None else None,won=None,drawn=None,lost=None,gf=None,gc=None,gd=None,source_url=url)); st+=1
            for ri,cand in candidates.items():
                stale=db.query(Match).filter(Match.competition=="LAAMBA",Match.division==div,Match.round_name==f"Fecha {ri}",Match.external_key!=cand["external_key"],Match.source_kind=="sync_clausura").all()
                # Preserve known date/venue from a stale row before removing it when the source still omits those fields.
                if stale:
                    best=next((x for x in stale if x.date or x.venue),None)
                    if best:
                        if cand.get("date") is None and best.date: cand["date"]=best.date
                        if cand.get("venue") is None and best.venue: cand["venue"]=best.venue
                for row in stale: db.delete(row)
                if stale: db.commit()
                _upsert_laamba_match_preserving_known_fields(db,cand); ms+=1
        except Exception as e:
            db.rollback();errors.append(f"{div}: {e}")
    if ms>0:
        legacy_matches=db.query(Match).filter(Match.competition=="LAAMBA",Match.source_kind=="sync").delete(synchronize_session=False)
        legacy_standings=db.query(Standing).filter(Standing.competition=="LAAMBA",~Standing.unique_key.contains("|CLAUSURA|")).delete(synchronize_session=False)
        db.commit()
    else:
        legacy_matches=legacy_standings=0
    status="ok" if not errors else "partial"
    log(db,"LAAMBA",status,f"Clausura: {ms} partidos / {st} filas tabla; fechas estructuradas recuperadas {recovered_dates}; legado eliminado {legacy_matches}/{legacy_standings}")
    return {"ok":not bool(errors),"status":status,"tournament":"CLAUSURA","matches":ms,"standings":st,"structured_dates":recovered_dates,"legacy_removed":{"matches":legacy_matches,"standings":legacy_standings},"errors":errors[:5]}
