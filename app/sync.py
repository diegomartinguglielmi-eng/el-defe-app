import re
from io import StringIO
import requests
import pandas as pd
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from .models import Match, Standing, SyncRun

UA={"User-Agent":"Mozilla/5.0 ElDefe/2.0"}
TEAM_FEFI="DEF. DE SANTOS LUGARES"
TEAM_LAAMBA="Defensores de SL"
FEFI_CATEGORIES=[2019, 2013, 2018, 2014, 2017, 2016, 2015]

def clean(x): return re.sub(r"\s+", " ", str(x)).strip()
def as_int(x):
    try:
        if pd.isna(x): return None
        return int(float(str(x).strip()))
    except: return None

def upsert_match(db:Session, m):
    obj = db.query(Match).filter(Match.external_key == m["external_key"]).first()
    if not obj:
        obj = Match(**m); db.add(obj)
    else:
        for k, v in m.items():
            setattr(obj, k, v)
    db.commit()

def upsert_standing(db:Session, s):
    obj = db.query(Standing).filter(Standing.unique_key == s["unique_key"]).first()
    if not obj:
        obj = Standing(**s); db.add(obj)
    else:
        for k, v in s.items(): setattr(obj, k, v)
    db.commit()

def log(db, source, status, detail):
    db.add(SyncRun(source=source, status=status, detail=detail)); db.commit()

def sync_fefi(db:Session):
    """Sync FEFI 2026 Zone H data, normalized per category.
    
    For each category in FEFI_CATEGORIES, fetches explicit fixtures and standings
    from the official FEFI source. Preserves fixture dates and rounds. Only imports
    results and standings when explicitly present on the source page; never infers.
    """
    saved = 0
    total_matches = 0
    total_standings = 0
    errors = []
    
    for category in FEFI_CATEGORIES:
        url = f"https://fefi.com.ar/2026-torneo-anual-baby-futbol/h/categoria/{category}/"
        try:
            r = requests.get(url, headers=UA, timeout=25)
            r.raise_for_status()
            soup = BeautifulSoup(r.text, "html.parser")
            lines = [clean(x) for x in soup.get_text("\n", strip=True).splitlines() if clean(x)]
            
            months = {
                "enero": "01", "febrero": "02", "marzo": "03", "abril": "04",
                "mayo": "05", "junio": "06", "julio": "07", "agosto": "08",
                "septiembre": "09", "octubre": "10", "noviembre": "11", "diciembre": "12"
            }
            
            round_name = date = None
            
            # Parse fixtures for this category
            for i, line in enumerate(lines):
                # Match: "Fecha N - DD de MONTH"
                m = re.match(r"Fecha\s+(\d+)\s*-\s*(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚáéíóúñÑ]+)", line, re.I)
                if m:
                    round_name = f"Fecha {m.group(1)}"
                    mon = months.get(m.group(3).lower())
                    date = f"2026-{mon}-{int(m.group(2)):02d}" if mon else None
                    continue
                
                # Match fixture: "home vs away"
                if line.lower() == "vs" and round_name and i > 0 and i < len(lines) - 1:
                    h, a = lines[i-1], lines[i+1]
                    if TEAM_FEFI in (h, a):
                        external_key = f"FEFI|2026|{category}|{round_name}|{h}|{a}"
                        upsert_match(db, dict(
                            external_key=external_key,
                            competition="FEFI",
                            division=f"Zona H - {category}",
                            round_name=round_name,
                            date=date,
                            home=h,
                            away=a,
                            status="scheduled",
                            source_url=url,
                            source_kind="sync"
                        ))
                        saved += 1
                        total_matches += 1
            
            # Parse standings for this category (only if explicitly present)
            # Look for table with team names and points
            try:
                tables = pd.read_html(StringIO(r.text))
                for df in tables:
                    cols = list(df.columns)
                    teamc = next((c for c in cols if "equipo" in str(c).lower()), None)
                    ptsc = next((c for c in cols if "pts" in str(c).lower() or "puntos" in str(c).lower()), None)
                    
                    if teamc is not None and ptsc is not None:
                        for _, row in df.iterrows():
                            team = clean(row[teamc])
                            if not team or team == "nan":
                                continue
                            
                            # Only import if points are explicitly present
                            pts_val = as_int(row[ptsc])
                            if pts_val is not None:
                                unique_key = f"FEFI|2026|{category}|{team}"
                                upsert_standing(db, dict(
                                    unique_key=unique_key,
                                    competition="FEFI",
                                    division=f"Zona H - {category}",
                                    season=2026,
                                    team=team,
                                    pts=pts_val,
                                    played=as_int(row[next((c for c in cols if "j" in str(c).lower()), None)]) if any("j" in str(c).lower() for c in cols) else None,
                                    won=None,
                                    drawn=None,
                                    lost=None,
                                    gf=None,
                                    gc=None,
                                    gd=None,
                                    source_url=url
                                ))
                                total_standings += 1
            except Exception:
                # No valid standings table found; continue without standings
                pass
        
        except Exception as e:
            errors.append(f"Cat {category}: {e}")
    
    status = "ok" if not errors else "partial"
    detail = f"{saved} partidos / {total_standings} standings (categorías: {', '.join(str(c) for c in FEFI_CATEGORIES)})"
    if errors:
        detail += f" | Errores: {'; '.join(errors[:3])}"
    
    log(db, "FEFI", status, detail)
    return {"ok": not bool(errors), "status": status, "saved": saved, "matches": total_matches, "standings": total_standings, "errors": errors[:5]}

def col(cols, term):
    for c in cols:
        if term in str(c).lower(): return c

def sync_laamba(db:Session):
    divisions = ["1ra", "3ra", "4ta", "5ta", "6ta", "7ma", "8va"]
    ms = st = 0; errors = []
    for div in divisions:
        url = f"https://www.laamba.ar/torneoslaamba/masculino/m-elite-i/{div}/torneo/m-elitei/?db=2026"
        try:
            r = requests.get(url, headers=UA, timeout=25); r.raise_for_status()
            tables = pd.read_html(StringIO(r.text))
            ri = 0
            for df in tables:
                cols = list(df.columns); lc = col(cols, "local"); vc = col(cols, "visitante"); rc = col(cols, "resultado")
                if lc is not None and vc is not None:
                    ri += 1
                    for _, row in df.iterrows():
                        h, a = clean(row[lc]), clean(row[vc])
                        if TEAM_LAAMBA not in (h, a): continue
                        hs = aw = None; status = "scheduled"
                        if rc is not None:
                            mm = re.search(r"(\d+)\s*-\s*(\d+)", clean(row[rc]))
                            if mm: hs, aw, status = int(mm.group(1)), int(mm.group(2)), "final"
                        upsert_match(db, dict(external_key=f"LAAMBA|2026|{div}|{ri}|{h}|{a}", competition="LAAMBA",
                            division=div, round_name=f"Fecha {ri}", date=None, home=h, away=a, home_score=hs, away_score=aw,
                            status=status, source_url=url, source_kind="sync"))
                        ms += 1
                teamc = col(cols, "equipo"); ptsc = col(cols, "pts")
                if teamc is not None and ptsc is not None:
                    jc = col(cols, " j")
                    for _, row in df.iterrows():
                        team = clean(row[teamc])
                        if not team or team == "nan": continue
                        upsert_standing(db, dict(unique_key=f"LAAMBA|2026|{div}|{team}", competition="LAAMBA",
                            division=div, season=2026, team=team, pts=as_int(row[ptsc]), played=as_int(row[jc]) if jc else None,
                            won=None, drawn=None, lost=None, gf=None, gc=None, gd=None, source_url=url))
                        st += 1
        except Exception as e:
            errors.append(f"{div}: {e}")
    status = "ok" if not errors else "partial"
    log(db, "LAAMBA", status, f"{ms} partidos / {st} filas tabla")
    return {"ok": not bool(errors), "status": status, "matches": ms, "standings": st, "errors": errors[:5]}

