// El Defe V5: la web usa la API del mismo origen.
window.EL_DEFE_API_URL = "";

(function(){
  const token=()=>localStorage.getItem('defe_token')||'';
  const role=()=>localStorage.getItem('defe_role')||'';
  async function fefiApi(path, opts={}){
    opts.headers=opts.headers||{};
    if(token()) opts.headers.Authorization='Bearer '+token();
    const r=await fetch((window.EL_DEFE_API_URL||'')+path,opts);
    const j=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(j.detail||'Error');
    return j;
  }
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  async function loadFefiAdmin(){
    const box=document.getElementById('fefiPendingBox');
    if(!box || !token()) return;
    box.innerHTML='<b>Sincronización FEFI</b><div class="meta">Consultando cambios detectados…</div>';
    try{
      const [status,rows]=await Promise.all([fefiApi('/api/fefi/status'),fefiApi('/api/fefi/pending')]);
      const last=status.last_run;
      box.innerHTML=`<div class="row"><b>Sincronización FEFI</b><span class="badge ${status.pending?'gold':'ok'}">${status.pending} pendiente${status.pending===1?'':'s'}</span></div>
        <div class="meta" style="margin:7px 0 10px">Zona H · ${esc(status.schedule)}${last?' · '+esc(last.detail):''}</div>
        <button class="light" onclick="window.defeRunFefi()">↻ Revisar FEFI ahora</button>
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
  window.defeResolveFefi=async(id,action)=>{
    try{await fefiApi(`/api/fefi/pending/${id}/${action}`,{method:'POST'});await loadFefiAdmin();if(window.loadMatches)window.loadMatches();}
    catch(e){alert(e.message)}
  };
  window.defeRunFefi=async()=>{
    try{await fefiApi('/api/fefi/run',{method:'POST'});await loadFefiAdmin();}
    catch(e){alert(e.message)}
  };
  window.defeOpenAdmin=()=>{if(window.show){window.show('admin');loadFefiAdmin();}};
  document.addEventListener('DOMContentLoaded',()=>{
    const tools=document.getElementById('adminTools');
    if(tools && !document.getElementById('fefiPendingBox')){
      const card=document.createElement('div');card.id='fefiPendingBox';card.className='card';
      card.innerHTML='<b>Sincronización FEFI</b><div class="meta">Iniciá sesión para ver cambios.</div>';
      tools.insertBefore(card,tools.firstChild);
    }
    const prefs=document.getElementById('prefsBox');
    if(prefs && ['admin','delegado'].includes(role()) && !document.getElementById('defeAdminButton')){
      const card=document.createElement('div');card.className='card';card.id='defeAdminButton';
      card.innerHTML='<button class="btn" onclick="window.defeOpenAdmin()">⚙ Abrir Gestión</button>';
      prefs.appendChild(card);
    }
    const old=window.refreshAdmin;
    if(typeof old==='function') window.refreshAdmin=function(){old();loadFefiAdmin();};
  });
})();
