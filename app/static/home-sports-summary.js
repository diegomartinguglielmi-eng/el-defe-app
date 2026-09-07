// El Defe · resumen deportivo personalizado en Inicio
(function(){
  const API=()=>window.EL_DEFE_API_URL||'';
  const KEY='defe_followed_v1';
  const CLUB=/DEFENSORES|DEF\. DE SANTOS LUGARES|DEFENSORES DE SL|DEF\. DE STOS?\. LUGARES/i;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}};
  async function get(path){const r=await fetch(API()+path,{cache:'no-store'}),j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.detail||'No se pudo cargar');return j;}
  function ordinal(n){return n?`${n}°`:'—'}
  function row(label,rank,pts,pj){return `<div style="display:grid;grid-template-columns:minmax(120px,1fr) 52px 52px 44px;gap:6px;align-items:center;padding:9px 0;border-top:1px solid var(--line)"><b>${esc(label)}</b><b style="text-align:center">${esc(ordinal(rank))}</b><span style="text-align:center">${pts??'—'} pts</span><span style="text-align:center">${pj??'—'} PJ</span></div>`}
  async function summaryFor(pref){
    const [comp,id]=String(pref).split('|');
    if(comp==='FEFI' && /^\d{4}$/.test(id)){
      const d=await get(`/api/fefi/standings?tournament=clausura&category=${encodeURIComponent(id)}`);
      const idx=(d.rows||[]).findIndex(r=>CLUB.test(r.team||''));
      if(idx<0)return null;const r=d.rows[idx];return {label:`FEFI ${id}`,rank:idx+1,pts:r.pts,pj:r.played};
    }
    if(comp==='LAAMBA' && id){
      const rows=await get(`/api/standings?competition=LAAMBA&division=${encodeURIComponent(id)}`);
      const idx=(rows||[]).findIndex(r=>CLUB.test(r.team||''));
      if(idx<0)return null;const r=rows[idx];return {label:`LAAMBA ${id}`,rank:idx+1,pts:r.pts,pj:r.played};
    }
    return null;
  }
  async function loadSummary(){
    const box=document.getElementById('myDefeCards');if(!box)return;
    const old=document.getElementById('sportsFormCard');if(old)old.remove();
    const prefs=read().filter(x=>/^FEFI\|\d{4}$/.test(x)||x.startsWith('LAAMBA|'));
    if(!prefs.length)return;
    const card=document.createElement('div');card.id='sportsFormCard';card.className='card';card.innerHTML='<div class="row"><b>Cómo viene</b><span class="badge">POSICIONES</span></div><div class="meta">Clausura actual de tus categorías seguidas.</div><div id="sportsFormRows"><div class="meta" style="margin-top:10px">Actualizando…</div></div>';
    box.appendChild(card);
    const target=document.getElementById('sportsFormRows');
    const data=(await Promise.all(prefs.map(p=>summaryFor(p).catch(()=>null)))).filter(Boolean);
    if(!target)return;
    target.innerHTML=data.length?`<div style="display:grid;grid-template-columns:minmax(120px,1fr) 52px 52px 44px;gap:6px;padding:10px 0 5px;font-size:8px;font-weight:950;color:var(--mut)"><span>Categoría</span><span style="text-align:center">POS</span><span style="text-align:center">PTS</span><span style="text-align:center">PJ</span></div>${data.map(x=>row(x.label,x.rank,x.pts,x.pj)).join('')}`:'<div class="meta" style="margin-top:10px">La posición todavía no está disponible para tus favoritos.</div>';
  }
  function install(){
    if(typeof window.loadPersonalHome!=='function')return false;
    if(window.loadPersonalHome.__sportsSummary)return true;
    const base=window.loadPersonalHome;
    const wrapped=async function(){const r=await base.apply(this,arguments);setTimeout(loadSummary,0);return r};
    wrapped.__sportsSummary=true;window.loadPersonalHome=wrapped;
    setTimeout(loadSummary,0);return true;
  }
  let tries=0;const t=setInterval(()=>{tries++;if(install()||tries>40)clearInterval(t)},100);
  document.addEventListener('defe:preferences-updated',()=>setTimeout(loadSummary,150));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(loadSummary,150)});
})();