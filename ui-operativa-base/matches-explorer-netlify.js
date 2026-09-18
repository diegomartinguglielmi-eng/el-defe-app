// El Defe V10 · controlador único de Competencias
(function(){
  const state={competition:'FEFI',status:'upcoming',division:'Zona H',tournament:'clausura',rows:[],fefiCategory:'GENERAL'};
  const FEFI_CATS=['GENERAL','2019','2013','2018','2014','2017','2016','2015'];
  const apiBase=()=>window.EL_DEFE_API_URL||'';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const compLabel=c=>c==='ARGENLIGA'?'Argenliga':c==='SUPERLIGA'?'Super Liga':c;
  const tourLabel=t=>t==='apertura'?'Apertura':t==='clausura'?'Clausura':t==='anual'?'Anual':'';
  const isFinal=m=>String(m.status||'').toLowerCase()==='final'||(m.home_score!=null&&m.away_score!=null);
  const parseDate=v=>{if(!v)return null;const d=new Date(String(v).slice(0,10)+'T12:00:00');return Number.isNaN(d.getTime())?null:d;};
  const isUpcoming=m=>{if(isFinal(m))return false;const d=parseDate(m.date);if(!d)return true;const t=new Date();t.setHours(0,0,0,0);return d>=t;};
  const fmtDate=v=>{const d=parseDate(v);return d?new Intl.DateTimeFormat('es-AR',{weekday:'short',day:'2-digit',month:'short'}).format(d):'Fecha a confirmar';};
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
  const isDefe=s=>/DEF(ENSORES)?\s*(DE)?\s*(SANTOS|STOS)?\s*LUGARES|DEFENSORES\s+DE\s+SL/.test(norm(s));
  const canonicalTeam=s=>isDefe(s)?'DEFENSORES DE SANTOS LUGARES':norm(s);
  async function getJson(path){const r=await fetch(apiBase()+path,{cache:'no-store'});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.detail||'No se pudo cargar la información');return j;}

  function allDivisions(comp=state.competition){
    const vals=[...new Set(state.rows.filter(x=>x.competition===comp).map(x=>x.division).filter(Boolean))];
    if(comp==='FEFI')return ['Zona H','Mayores B · +42'].filter(x=>vals.includes(x)||x==='Zona H');
    if(comp==='SUPERLIGA')return ['Junior A'];
    if(comp==='ARGENLIGA')return vals.length?vals:['A Z1'];
    return vals.sort((a,b)=>a.localeCompare(b,'es'));
  }
  function toursFor(comp=state.competition,division=state.division){
    if(comp==='FEFI')return /Mayores B|\+42/i.test(division)?['clausura']:['apertura','clausura','anual'];
    if(comp==='LAAMBA')return ['apertura','clausura','anual'];
    return [];
  }
  function normalizeState(){
    const divs=allDivisions();
    if(!divs.includes(state.division))state.division=divs[0]||'ALL';
    const tours=toursFor();
    if(!tours.length)state.tournament='ALL';
    else if(!tours.includes(state.tournament))state.tournament=tours.includes('clausura')?'clausura':tours[0];
    if(state.competition!=='FEFI'||/Mayores B|\+42/i.test(state.division))state.fefiCategory='GENERAL';
  }
  function snapshot(){normalizeState();return {competition:state.competition,status:state.status,division:state.division,tournament:state.tournament,fefiCategory:state.fefiCategory,availableDivisions:allDivisions(),availableTournaments:toursFor(),fefiCategories:[...FEFI_CATS]};}
  function notify(){document.dispatchEvent(new CustomEvent('defe:competencias-state',{detail:snapshot()}));}
  function setCompetition(v){state.competition=v;state.division=allDivisions(v)[0]||'ALL';state.tournament='ALL';normalizeState();renderFilters();renderContent();notify();}
  function setDivision(v){state.division=v;state.tournament='ALL';normalizeState();renderFilters();renderContent();notify();}
  function setTournament(v){state.tournament=v;normalizeState();renderFilters();renderContent();notify();}
  function setStatus(v){state.status=v;renderFilters();renderContent();notify();}
  function setFefiCategory(v){state.fefiCategory=FEFI_CATS.includes(v)?v:'GENERAL';if(state.status==='standings')renderStandings();notify();}

  function ensureShell(){const target=document.getElementById('allMatches');if(!target)return null;target.innerHTML='<div id="matchExplorer"><div id="matchFilters"></div><div id="matchList"></div></div>';return target;}
  function card(m){const final=isFinal(m),venue=m.venue||'',score=final&&m.home_score!=null&&m.away_score!=null?esc(m.home_score)+' · '+esc(m.away_score):'VS';return '<div class="card" style="margin-bottom:10px"><div class="row"><div><span class="badge">'+esc(compLabel(m.competition||''))+'</span>'+(m.tournament?' <span class="badge">'+esc(tourLabel(m.tournament))+'</span>':'')+(m.division?' <span class="badge">'+esc(m.division)+'</span>':'')+'</div>'+(m.round_name?'<span class="date">'+esc(m.round_name)+'</span>':'')+'</div><div class="row" style="margin-top:9px"><b style="font-size:11px">'+esc(fmtDate(m.date))+'</b></div><div class="teams" style="margin-top:12px"><div class="team">'+esc(m.home)+'</div><div class="score '+(final?'':'vs')+'">'+score+'</div><div class="team r">'+esc(m.away)+'</div></div><div class="meta">'+(venue?'📍 '+esc(venue):'📍 Sede a confirmar')+'</div></div>';}

  function renderFilters(){
    normalizeState();const f=document.getElementById('matchFilters');if(!f)return;
    const comps=['FEFI','LAAMBA','ARGENLIGA','SUPERLIGA'];
    const divs=allDivisions(),tours=toursFor(),statuses=[['upcoming','Próximos'],['results','Resultados'],['standings','Tabla']];
    f.innerHTML='<div class="card" data-defe-legacy-controls="1" style="padding:10px"><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px">'+comps.map(c=>'<button class="'+(state.competition===c?'btn':'light')+'" data-comp="'+c+'">'+compLabel(c)+'</button>').join('')+'</div>'+(divs.length?'<select id="matchDivisionFilter" style="margin:8px 0 0">'+divs.map(d=>'<option value="'+esc(d)+'" '+(state.division===d?'selected':'')+'>'+esc(d)+'</option>').join('')+'</select>':'')+(tours.length?'<div style="display:grid;grid-template-columns:repeat('+tours.length+',1fr);gap:6px;margin-top:8px">'+tours.map(t=>'<button class="'+(state.tournament===t?'btn':'light')+'" data-tour="'+t+'">'+tourLabel(t)+'</button>').join('')+'</div>':'')+'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:8px">'+statuses.map(([k,l])=>'<button class="'+(state.status===k?'btn':'light')+'" data-status="'+k+'">'+l+'</button>').join('')+'</div></div>';
    f.querySelectorAll('[data-comp]').forEach(b=>b.onclick=()=>setCompetition(b.dataset.comp));
    f.querySelectorAll('[data-tour]').forEach(b=>b.onclick=()=>setTournament(b.dataset.tour));
    f.querySelectorAll('[data-status]').forEach(b=>b.onclick=()=>setStatus(b.dataset.status));
    const sel=document.getElementById('matchDivisionFilter');if(sel)sel.onchange=()=>setDivision(sel.value);
  }

  function standingsTable(rows,title,source){return '<div class="sectop"><h2>'+esc(title)+'</h2><span class="meta" style="margin:0">'+rows.length+' equipos</span></div><div class="card" style="padding:8px;overflow:auto"><div style="display:grid;grid-template-columns:28px minmax(130px,1fr) 34px 38px;gap:4px;padding:7px 5px;font-size:8px;font-weight:950;color:var(--mut)"><span>#</span><span>Equipo</span><span>PJ</span><span>PTS</span></div>'+rows.map((r,i)=>'<div style="display:grid;grid-template-columns:28px minmax(130px,1fr) 34px 38px;gap:4px;align-items:center;padding:9px 5px;border-top:1px solid var(--line);'+(isDefe(r.team)?'background:var(--soft);border-radius:10px;font-weight:950':'')+'"><b>'+(i+1)+'</b><span>'+esc(r.team)+(isDefe(r.team)?' <span class="badge">EL DEFE</span>':'')+'</span><span>'+(r.played??'—')+'</span><b>'+(r.pts??'—')+'</b></div>').join('')+'</div><div class="meta">'+esc(source)+'</div>';}
  function aggregateStandings(groups){
    const map=new Map();for(const rows of groups){for(const r of rows||[]){const key=canonicalTeam(r.team);if(!key)continue;const cur=map.get(key)||{team:isDefe(r.team)?'Defensores de Santos Lugares':r.team,played:0,won:0,drawn:0,lost:0,gf:0,gc:0,gd:0,pts:0};for(const k of ['played','won','drawn','lost','gf','gc','pts'])cur[k]+=Number(r[k]||0);cur.gd=cur.gf-cur.gc;map.set(key,cur);}}
    return [...map.values()].sort((a,b)=>(b.pts-a.pts)||(b.gd-a.gd)||(b.gf-a.gf)||String(a.team).localeCompare(String(b.team),'es'));
  }
  async function genericStandings(comp,division,tournament){let p='/api/leagues/standings?competition='+encodeURIComponent(comp)+'&division='+encodeURIComponent(division);if(tournament&&tournament!=='ALL')p+='&tournament='+encodeURIComponent(tournament);return getJson(p);}
  async function renderFefiStandings(){
    const list=document.getElementById('matchList');if(!list)return;
    if(/Mayores B|\+42/i.test(state.division)){
      const rows=await genericStandings('FEFI',state.division,'clausura');list.innerHTML=rows.length?standingsTable(rows,'FEFI · Mayores B +42 · Clausura','Fuente: FEFI Mayores B 2026.'):'<div class="card"><b>Tabla todavía no disponible</b></div>';return;
    }
    if(state.tournament==='anual'){
      const [a,c]=await Promise.all(FEFI_CATS.includes(state.fefiCategory)?['apertura','clausura'].map(t=>getJson('/api/fefi/standings?tournament='+t+'&category='+encodeURIComponent(state.fefiCategory))):[]);
      const rows=aggregateStandings([(a&&a.rows)||[],(c&&c.rows)||[]]);list.innerHTML=rows.length?standingsTable(rows,'FEFI Zona H · Anual · '+(state.fefiCategory==='GENERAL'?'General':state.fefiCategory),'Acumulado Apertura + Clausura. Fuente FEFI.'):'<div class="card"><b>Tabla anual todavía no disponible</b></div>';return;
    }
    const d=await getJson('/api/fefi/standings?tournament='+encodeURIComponent(state.tournament)+'&category='+encodeURIComponent(state.fefiCategory));list.innerHTML=d.available?standingsTable(d.rows||[],'FEFI Zona H · '+tourLabel(state.tournament)+' · '+(state.fefiCategory==='GENERAL'?'General':state.fefiCategory),'Fuente: FEFI oficial · Zona H 2026.'):'<div class="card"><b>Tabla todavía no disponible</b></div>';
  }
  async function renderStandings(){
    const list=document.getElementById('matchList');if(!list)return;list.innerHTML='<div class="card">Cargando tabla…</div>';
    try{
      if(state.competition==='FEFI')return await renderFefiStandings();
      if(state.competition==='LAAMBA'&&state.tournament==='anual'){
        const [a,c]=await Promise.all(['apertura','clausura'].map(t=>genericStandings('LAAMBA',state.division,t)));
        const rows=aggregateStandings([a,c]);list.innerHTML=rows.length?standingsTable(rows,'LAAMBA '+state.division+' · Anual','Acumulado Apertura + Clausura. Fuente LAAMBA.'):'<div class="card"><b>Tabla anual todavía no disponible</b></div>';return;
      }
      const rows=await genericStandings(state.competition,state.division,state.tournament);
      const title=compLabel(state.competition)+' · '+state.division+(state.tournament!=='ALL'?' · '+tourLabel(state.tournament):'');
      list.innerHTML=rows.length?standingsTable(rows,title,'Fuente oficial sincronizada por la app.'):'<div class="card"><b>Tabla todavía no disponible para este filtro</b></div>';
    }catch(e){list.innerHTML='<div class="card"><b>No se pudo cargar la tabla</b><div class="meta">'+esc(e.message)+'</div></div>';}
  }
  function renderContent(){
    if(state.status==='standings')return renderStandings();const list=document.getElementById('matchList');if(!list)return;
    let rows=state.rows.filter(m=>m.competition===state.competition&&m.division===state.division);
    if(state.tournament!=='ALL'&&state.tournament!=='anual')rows=rows.filter(m=>m.tournament===state.tournament);
    rows=rows.filter(m=>state.status==='results'?isFinal(m):isUpcoming(m));
    rows.sort((a,b)=>String(a.date||'9999').localeCompare(String(b.date||'9999'))*(state.status==='results'?-1:1));
    let empty='<div class="card"><b>No hay partidos para este filtro</b></div>';if(!rows.length&&state.competition==='ARGENLIGA'&&state.status==='upcoming')empty='<div class="card"><b>Próximo partido todavía no publicado</b></div>';
    list.innerHTML='<div class="sectop"><h2>'+(state.status==='results'?'Resultados':'Próximos partidos')+'</h2><span class="meta" style="margin:0">'+rows.length+' partido'+(rows.length===1?'':'s')+'</span></div>'+(rows.length?rows.map(card).join(''):empty);
  }
  async function load(){const target=document.getElementById('allMatches');if(!target)return;target.innerHTML='<div class="card">Cargando partidos…</div>';try{state.rows=await getJson('/api/leagues/matches');normalizeState();ensureShell();renderFilters();renderContent();notify();}catch(e){target.innerHTML='<div class="card"><b>No se pudo cargar la agenda</b><div class="meta">'+esc(e.message)+'</div></div>';}}
  window.defeCompetenciasApi={snapshot,setCompetition,setDivision,setTournament,setStatus,setFefiCategory,refresh:load};
  window.defeLoadMatchExplorer=load;
  function init(){setTimeout(load,0);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();