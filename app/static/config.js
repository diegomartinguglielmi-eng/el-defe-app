// El Defe V5: la web usa la API del mismo origen.
window.EL_DEFE_API_URL = "";

(function(){
  const token=()=>localStorage.getItem('defe_token')||'';
  const role=()=>localStorage.getItem('defe_role')||'';
  async function api(path, opts={}){
    opts.headers=opts.headers||{};
    if(token()) opts.headers.Authorization='Bearer '+token();
    const r=await fetch((window.EL_DEFE_API_URL||'')+path,opts);
    const j=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(j.detail||'Error');
    return j;
  }
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function intOrNull(v){const x=String(v??'').trim();return /^-?\d+$/.test(x)?Number(x):null;}

  // ---------- FEFI: resultados por categoría ----------
  function ensureFefiResultScreen(){
    if(document.getElementById('fefiResults')) return;
    const app=document.querySelector('.app');
    const nav=document.querySelector('.nav');
    if(!app||!nav) return;
    const section=document.createElement('section');
    section.id='fefiResults';section.className='screen';
    section.innerHTML=`<div class="sub"><button class="back" onclick="show('matches')">←</button><div><h1>FEFI</h1><p id="fefiResultsSubtitle">Resultados por categoría</p></div></div><main class="main"><div id="fefiResultsBody"><div class="card">Cargando…</div></div></main>`;
    app.insertBefore(section,nav);
  }

  window.defeOpenFefiResults=async(roundNumber)=>{
    ensureFefiResultScreen();
    if(window.show) window.show('fefiResults');
    const body=document.getElementById('fefiResultsBody');
    const sub=document.getElementById('fefiResultsSubtitle');
    if(sub) sub.textContent=`Zona H · Fecha ${roundNumber}`;
    body.innerHTML='<div class="card">Consultando resultado oficial…</div>';
    try{
      const rows=await api(`/api/fefi/results/${roundNumber}`);
      if(!rows.length){
        body.innerHTML='<div class="card"><b>Resultado todavía no verificado</b><div class="meta">El detalle por categoría se publica automáticamente cuando FEFI lo informa como Verificado.</div></div>';
        return;
      }
      const first=rows[0];
      body.innerHTML=`<div class="card" style="background:linear-gradient(135deg,#fff,#f6f4ff)">
        <div class="row"><span class="badge ok">VERIFICADO</span><span class="date">Fecha ${roundNumber}</span></div>
        <div class="teams" style="margin-top:12px"><div class="team">${esc(first.home)}</div><div class="score vs">VS</div><div class="team r">${esc(first.away)}</div></div>
        <div class="meta">Resultado oficial FEFI · Zona H</div>
      </div>
      <div class="card" style="padding:7px 13px">
        ${rows.map(r=>`<div style="display:grid;grid-template-columns:55px 1fr 42px 42px;gap:7px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)">
          <b style="font-size:11px">${esc(r.category)}</b><span class="meta" style="margin:0">Categoría</span>
          <b style="text-align:center;font-size:15px">${esc(r.home_value??'—')}</b><b style="text-align:center;font-size:15px">${esc(r.away_value??'—')}</b>
        </div>`).join('')}
      </div>`;
    }catch(e){body.innerHTML=`<div class="card"><b>No se pudo abrir el detalle</b><div class="meta">${esc(e.message)}</div></div>`;}
  };

  function patchMatchCards(){
    if(typeof window.mcard!=='function' || window.mcard.__defeV5) return;
    const original=window.mcard;
    const enhanced=function(m){
      let html=original(m);
      if(m && m.competition==='FEFI' && m.status==='final' && m.round_name){
        const mm=String(m.round_name).match(/(\d+)/);
        if(mm){
          const idx=html.lastIndexOf('</div>');
          if(idx>-1) html=html.slice(0,idx)+`<button class="light" style="margin-top:10px" onclick="defeOpenFefiResults(${Number(mm[1])})">Ver resultado por categorías</button>`+html.slice(idx);
        }
      }
      return html;
    };
    enhanced.__defeV5=true;window.mcard=enhanced;
  }

  // ---------- Gestión FEFI ----------
  async function loadFefiAdmin(){
    const box=document.getElementById('fefiPendingBox');
    if(!box || !token()) return;
    box.innerHTML='<b>Sincronización FEFI</b><div class="meta">Consultando cambios detectados…</div>';
    try{
      const [status,rows]=await Promise.all([api('/api/fefi/status'),api('/api/fefi/pending')]);
      const last=status.last_run;
      box.innerHTML=`<div class="row"><b>Sincronización FEFI</b><span class="badge ${status.pending?'gold':'ok'}">${status.pending} pendiente${status.pending===1?'':'s'}</span></div>
        <div class="meta" style="margin:7px 0 10px">Zona H · ${esc(status.schedule)}${last?' · '+esc(last.detail):''}</div>
        ${role()==='admin'?'<button class="light" onclick="window.defeRunFefi()">↻ Revisar FEFI ahora</button>':''}
        <div id="fefiPendingList" style="margin-top:9px"></div>`;
      const list=document.getElementById('fefiPendingList');
      list.innerHTML=rows.length?rows.map(x=>`<div style="border-top:1px solid var(--line);padding:10px 0">
        <b style="font-size:11px">${esc(x.detail)}</b>
        <div class="meta">Detectado automáticamente. No se publica hasta aprobar.</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px">
          <button class="light" onclick="window.defeResolveFefi(${x.id},'reject')">Rechazar</button>
          <button class="btn" onclick="window.defeResolveFefi(${x.id},'approve')">Aprobar</button>
        </div></div>`).join(''):'<div class="meta">No hay cambios pendientes.</div>';
    }catch(e){box.innerHTML=`<b>Sincronización FEFI</b><div class="meta">${esc(e.message)}</div>`;}
  }
  window.defeResolveFefi=async(id,action)=>{try{await api(`/api/fefi/pending/${id}/${action}`,{method:'POST'});await loadFefiAdmin();if(window.loadMatches)window.loadMatches();}catch(e){alert(e.message)}};
  window.defeRunFefi=async()=>{try{await api('/api/fefi/run',{method:'POST'});await loadFefiAdmin();}catch(e){alert(e.message)}};

  // ---------- Gestión LAAMBA + Argenliga ----------
  function ensureSourcesCard(){
    const tools=document.getElementById('adminTools');
    if(!tools || document.getElementById('competitionSourcesBox')) return;
    const card=document.createElement('div');card.id='competitionSourcesBox';card.className='card';
    card.innerHTML=`<b>Fuentes de competencia</b>
      <div class="meta" style="margin-bottom:10px">Actualizar LAAMBA desde su sitio e importar Argenliga con una carga controlada.</div>
      <div id="sourceStatus" class="meta">Consultando estado…</div>
      ${role()==='admin'?'<button class="light" style="margin-top:9px" onclick="defeSyncLaamba()">↻ Actualizar LAAMBA ahora</button>':''}
      <div style="border-top:1px solid var(--line);margin:13px 0 10px"></div>
      <b style="font-size:11px">Importar Argenliga</b>
      <div class="meta">Una línea por partido: fecha | local | visitante | goles local | goles visitante. Los goles pueden dejarse vacíos.</div>
      <textarea id="argenImportText" rows="6" placeholder="2026-09-12 | Defensores de Santos Lugares | Rival | 4 | 2"></textarea>
      <button class="btn" onclick="defeImportArgenliga()">Validar e importar</button>
      <div id="argenImportMsg" class="meta"></div>`;
    const fefi=document.getElementById('fefiPendingBox');
    if(fefi && fefi.nextSibling) tools.insertBefore(card,fefi.nextSibling); else tools.insertBefore(card,tools.firstChild);
    loadSourceStatus();
  }
  async function loadSourceStatus(){
    const box=document.getElementById('sourceStatus');if(!box)return;
    try{
      const [l,a]=await Promise.all([api('/api/matches?competition=LAAMBA'),api('/api/matches?competition=ARGENLIGA')]);
      const lf=l.filter(x=>x.status==='final').length, af=a.filter(x=>x.status==='final').length;
      box.innerHTML=`<span class="badge ok">LAAMBA ${l.length}</span> <span class="badge">Argenliga ${a.length}</span><div class="meta">Finalizados: LAAMBA ${lf} · Argenliga ${af}</div>`;
    }catch(e){box.textContent=e.message;}
  }
  window.defeSyncLaamba=async()=>{
    const box=document.getElementById('sourceStatus');if(box)box.textContent='Actualizando LAAMBA…';
    try{const r=await api('/api/sync/laamba',{method:'POST'});if(box)box.innerHTML=`LAAMBA: ${esc(r.matches??0)} partidos · ${esc(r.standings??0)} filas de tabla${r.status==='partial'?' · revisión parcial':''}`;await loadSourceStatus();if(window.loadMatches)window.loadMatches();}
    catch(e){if(box)box.textContent=e.message;}
  };
  window.defeImportArgenliga=async()=>{
    const ta=document.getElementById('argenImportText'),msg=document.getElementById('argenImportMsg');
    const lines=(ta?.value||'').split(/\n/).map(x=>x.trim()).filter(Boolean);
    if(!lines.length){msg.textContent='Pegá al menos un partido.';return;}
    const matches=[];const errors=[];
    lines.forEach((line,i)=>{
      const p=line.split('|').map(x=>x.trim());
      if(p.length<3 || !p[1] || !p[2]){errors.push(`Línea ${i+1}: faltan local/visitante`);return;}
      const hs=intOrNull(p[3]),as=intOrNull(p[4]);
      if((p[3]&&hs===null)||(p[4]&&as===null)){errors.push(`Línea ${i+1}: goles inválidos`);return;}
      matches.push({date:p[0]||null,home:p[1],away:p[2],home_score:hs,away_score:as,status:(hs!==null&&as!==null)?'final':'scheduled'});
    });
    if(errors.length){msg.innerHTML=`<b>Revisar antes de importar</b><br>${errors.map(esc).join('<br>')}`;return;}
    msg.textContent=`Validado: ${matches.length} partido${matches.length===1?'':'s'}. Importando…`;
    try{
      const r=await api('/api/import/argenliga',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({matches})});
      msg.innerHTML=`<b>Importación correcta:</b> ${esc(r.imported)} partido${r.imported===1?'':'s'}.`;ta.value='';await loadSourceStatus();if(window.loadMatches)window.loadMatches();
    }catch(e){msg.textContent=e.message;}
  };

  function ensureAdminAccess(){
    const prefs=document.getElementById('prefsBox');
    if(prefs && ['admin','delegado'].includes(role()) && !document.getElementById('defeAdminButton')){
      const card=document.createElement('div');card.className='card';card.id='defeAdminButton';card.innerHTML='<button class="btn" onclick="window.defeOpenAdmin()">⚙ Abrir Gestión</button>';prefs.appendChild(card);
    }
  }
  window.defeOpenAdmin=()=>{if(window.show){window.show('admin');loadFefiAdmin();ensureSourcesCard();}};

  document.addEventListener('DOMContentLoaded',()=>{
    ensureFefiResultScreen();patchMatchCards();
    const tools=document.getElementById('adminTools');
    if(tools && !document.getElementById('fefiPendingBox')){
      const card=document.createElement('div');card.id='fefiPendingBox';card.className='card';card.innerHTML='<b>Sincronización FEFI</b><div class="meta">Iniciá sesión para ver cambios.</div>';tools.insertBefore(card,tools.firstChild);
    }
    ensureAdminAccess();
    const oldAdmin=window.refreshAdmin;
    if(typeof oldAdmin==='function') window.refreshAdmin=function(){oldAdmin();loadFefiAdmin();ensureSourcesCard();};
    const oldProfile=window.refreshProfile;
    if(typeof oldProfile==='function') window.refreshProfile=async function(){const r=await oldProfile();ensureAdminAccess();return r;};
  });
})();
