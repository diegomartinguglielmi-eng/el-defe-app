(function(){
  const API=()=>window.EL_DEFE_API_URL||'';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  function niceDate(d){if(!d)return '—';try{return new Date(String(d).split('T')[0]+'T12:00:00').toLocaleDateString('es-AR',{day:'2-digit',month:'short'}).toUpperCase()}catch{return d}}
  async function refresh(){
    const hero=document.getElementById('heroMatch');if(!hero)return;
    try{
      const r=await fetch(API()+'/api/home/next-match',{cache:'no-store'});
      if(!r.ok)throw new Error('No se pudo actualizar');
      const data=await r.json(),m=data.match;
      if(!m){hero.innerHTML='<div class="meta">Sin próximos partidos cargados.</div>';return;}
      hero.innerHTML=`<div class="row"><span class="badge white">${esc(m.competition)}${m.division?' · '+esc(m.division):''}</span><span class="date">${esc(niceDate(m.date))}</span></div><div class="teams"><div class="team">${esc(m.home)}</div><div class="score vs">VS</div><div class="team r">${esc(m.away)}</div></div><div class="meta">${esc(m.round_name||'Próximo compromiso')}${m.venue?' · '+esc(m.venue):''}</div>`;
    }catch(e){hero.innerHTML='<div class="meta">No se pudo actualizar el próximo partido.</div>';}
  }
  async function fixServiceWorker(){
    if(!('serviceWorker' in navigator))return;
    try{
      const regs=await navigator.serviceWorker.getRegistrations();
      for(const reg of regs){
        const u=reg.active?.scriptURL||reg.waiting?.scriptURL||reg.installing?.scriptURL||'';
        if(u.includes('/static/sw.js'))await reg.unregister();
      }
      await navigator.serviceWorker.register('/sw.js',{scope:'/'});
    }catch(e){}
  }
  function init(){
    window.loadHome=refresh;
    refresh();
    fixServiceWorker();
    const oldShow=window.show;if(typeof oldShow==='function'&&!oldShow.__currentHome){const wrapped=function(id){const r=oldShow.apply(this,arguments);if(id==='home')setTimeout(refresh,0);return r};wrapped.__currentHome=true;window.show=wrapped;}
    const oldNav=window.nav;if(typeof oldNav==='function'&&!oldNav.__currentHome){const wrapped=function(id){const r=oldNav.apply(this,arguments);if(id==='home')setTimeout(refresh,0);return r};wrapped.__currentHome=true;window.nav=wrapped;}
  }
  window.defeRefreshCurrentHome=refresh;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
