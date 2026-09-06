(function(){
  const API=()=>window.EL_DEFE_API_URL||'';
  const token=()=>localStorage.getItem('defe_token')||'';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  async function api(path){
    const r=await fetch(API()+path,{headers:token()?{Authorization:'Bearer '+token()}: {}});
    const j=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(j.detail||'Error');
    return j;
  }
  function fmt(v){
    if(!v)return 'Sin registro';
    const d=new Date(v);
    return Number.isNaN(d.getTime())?String(v):d.toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'});
  }
  async function render(){
    const tools=document.getElementById('adminTools');
    if(!tools||!token())return;
    let box=document.getElementById('fefiFreshnessBox');
    if(!box){
      box=document.createElement('div');box.id='fefiFreshnessBox';box.className='card';
      const ref=document.getElementById('fefiPendingBox');
      if(ref&&ref.nextSibling)tools.insertBefore(box,ref.nextSibling);else tools.appendChild(box);
    }
    box.innerHTML='<b>Salud del dato FEFI</b><div class="meta">Consultando última actualización…</div>';
    try{
      const s=await api('/api/fefi/freshness');
      const cls=s.health==='ok'?'ok':s.health==='warning'?'gold':'';
      const label=s.health==='ok'?'FUENTE OK':s.health==='warning'?'1 FALLA':'ALERTA';
      const lastSuccess=s.last_success?.created_at||null;
      const snapshot=s.last_snapshot?.fetched_at||null;
      box.innerHTML=`<div class="row"><b>Salud del dato FEFI</b><span class="badge ${cls}">${label}</span></div>
        <div class="meta" style="margin-top:8px"><b>Última sincronización exitosa:</b> ${esc(fmt(lastSuccess))}</div>
        <div class="meta"><b>Último snapshot válido:</b> ${esc(fmt(snapshot))}</div>
        <div class="meta"><b>Fallas consecutivas:</b> ${esc(s.consecutive_failures)}</div>
        ${s.health==='error'?'<div class="meta" style="margin-top:8px"><b>Se conserva el último dato publicado válido hasta que FEFI vuelva a responder.</b></div>':''}`;
    }catch(e){box.innerHTML=`<b>Salud del dato FEFI</b><div class="meta">${esc(e.message)}</div>`;}
  }
  window.defeLoadFefiFreshness=render;
  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(render,300);
    const oldShow=window.show;
    if(typeof oldShow==='function'&&!oldShow.__fefiFreshness){
      const wrapped=function(id){const r=oldShow.apply(this,arguments);if(id==='admin')setTimeout(render,100);return r;};
      wrapped.__fefiFreshness=true;window.show=wrapped;
    }
  });
})();
