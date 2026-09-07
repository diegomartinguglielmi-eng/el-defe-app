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
    }catch(e){console.warn('next match refresh failed',e);}
  }
  function init(){refresh();const oldShow=window.show;if(typeof oldShow==='function'&&!oldShow.__currentHome){const wrapped=function(id){const r=oldShow.apply(this,arguments);if(id==='home')setTimeout(refresh,0);return r};wrapped.__currentHome=true;window.show=wrapped;}}
  window.defeRefreshCurrentHome=refresh;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
