// El Defe · Home operativo exclusivo para perfil Tienda
(function(){
  if(window.__defeStoreDashboardLoaded)return;
  window.__defeStoreDashboardLoaded=true;

  const API='https://el-defe-v5-production.up.railway.app';
  const token=()=>localStorage.getItem('defe_auth_token')||localStorage.getItem('defe_token')||'';
  const role=()=>String(localStorage.getItem('defe_role')||'').toLowerCase();
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]));
  const fmtDate=v=>{try{return new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch{return ''}};
  const labels={pending:'Pendiente',confirmed:'Confirmado',ready:'Listo para retirar',delivered:'Entregado',cancelled:'Cancelado'};
  let loading=false,lastLoad=0;

  async function api(path){
    const r=await fetch(API+path,{headers:{Authorization:'Bearer '+token()},cache:'no-store'});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.detail||`Error ${r.status}`);
    return j;
  }

  function style(){
    if(document.getElementById('defeStoreDashboardStyle'))return;
    const s=document.createElement('style');s.id='defeStoreDashboardStyle';s.textContent=`
      #defeStoreDashboard{position:fixed;inset:0;z-index:100150;background:#f3f6fa;color:#17365f;overflow:auto;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
      .dsd-head{position:sticky;top:0;z-index:4;background:linear-gradient(135deg,#0a3f7c,#0b579f);color:#fff;padding:18px 18px 16px;box-shadow:0 4px 18px #001a3420}
      .dsd-headin{max-width:780px;margin:auto;display:flex;align-items:center;gap:12px}.dsd-brand{flex:1}.dsd-brand small{font-size:11px;letter-spacing:.08em;opacity:.82;font-weight:800}.dsd-brand h1{margin:2px 0 0;font-size:26px;line-height:1.05}.dsd-pill{background:#e8f7ef;color:#16865b;font-weight:900;font-size:12px;padding:8px 11px;border-radius:999px}.dsd-account{border:1px solid #ffffff4a;background:#ffffff18;color:#fff;border-radius:13px;padding:9px 11px;font-weight:800}
      .dsd-main{max-width:780px;margin:auto;padding:18px 16px 104px}.dsd-title{display:flex;justify-content:space-between;align-items:end;margin:2px 2px 12px}.dsd-title h2{margin:0;font-size:23px}.dsd-title span{font-size:12px;color:#6e7e91}
      .dsd-kpis{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.dsd-kpi{border:1px solid #dbe4ee;background:#fff;border-radius:18px;padding:15px;box-shadow:0 4px 14px #001a3408}.dsd-kpi b{display:block;font-size:28px;color:#0b4a8f}.dsd-kpi span{font-size:12px;color:#66788e;font-weight:750}.dsd-kpi.warn b{color:#bf6b00}.dsd-kpi.good b{color:#16865b}.dsd-kpi.danger b{color:#b42318}
      .dsd-card{background:#fff;border:1px solid #dbe4ee;border-radius:20px;padding:16px;margin-top:14px;box-shadow:0 4px 14px #001a3408}.dsd-card h3{margin:0 0 12px;font-size:18px}.dsd-attn{display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-top:1px solid #edf1f5}.dsd-attn:first-of-type{border-top:0;padding-top:0}.dsd-dot{width:10px;height:10px;border-radius:50%;background:#f3a320;margin-top:6px;flex:0 0 auto}.dsd-attn strong{display:block}.dsd-meta{font-size:12px;color:#748397;margin-top:3px}.dsd-link{border:0;background:#edf5ff;color:#0b4a8f;border-radius:11px;padding:8px 10px;font-weight:900;margin-left:auto;white-space:nowrap}
      .dsd-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.dsd-action{border:1px solid #d8e3ee;background:#fff;border-radius:18px;padding:16px;text-align:left;color:#17365f;min-height:92px}.dsd-action i{font-style:normal;font-size:24px;display:block;margin-bottom:8px}.dsd-action b{display:block;font-size:15px}.dsd-action small{color:#708096}.dsd-activity{padding:10px 0;border-top:1px solid #edf1f5}.dsd-activity:first-of-type{border-top:0}.dsd-activity b{font-size:14px}.dsd-empty{color:#78879a;text-align:center;padding:18px 6px}
      .dsd-nav{position:fixed;left:0;right:0;bottom:0;z-index:100160;background:#fff;border-top:1px solid #dce5ee;display:grid;grid-template-columns:repeat(3,1fr);padding:8px 12px calc(8px + env(safe-area-inset-bottom));box-shadow:0 -6px 20px #001a3410}.dsd-nav button{border:0;background:transparent;color:#7b899a;padding:7px 1px;font-size:11px;font-weight:850}.dsd-nav button i{display:block;font-style:normal;font-size:21px;margin-bottom:3px}.dsd-nav button.active{color:#0b4a8f}.dsd-refresh{border:0;background:#eaf2fb;color:#0b4a8f;border-radius:12px;padding:8px 10px;font-weight:900}.dsd-error{background:#fff0f0;color:#b42318;border:1px solid #f1cccc;border-radius:14px;padding:12px;margin-top:12px}
    `;document.head.appendChild(s);
  }

  function ensure(){
    if(role()!=='tienda'||!token())return;
    style();
    if(document.getElementById('defeStoreDashboard'))return;
    const root=document.createElement('div');root.id='defeStoreDashboard';
    root.innerHTML=`
      <header class="dsd-head"><div class="dsd-headin"><div class="dsd-brand"><small>CLUB ATLÉTICO DEFENSORES DE SANTOS LUGARES</small><h1>Panel de Tienda</h1></div><span class="dsd-pill">TIENDA</span><button class="dsd-account" data-account>Mi cuenta</button></div></header>
      <main class="dsd-main">
        <div class="dsd-title"><div><h2>Hoy en la Tienda</h2><span>Pedidos, stock y tareas que necesitan atención.</span></div><button class="dsd-refresh" data-refresh>↻</button></div>
        <div data-summary><div class="dsd-empty">Cargando panel…</div></div>
      </main>
      <nav class="dsd-nav">
        <button class="active" data-go="panel"><i>▦</i>Panel</button>
        <button data-go="gestion"><i>▤</i>Gestión</button>
        <button data-go="account"><i>○</i>Cuenta</button>
      </nav>`;
    document.body.appendChild(root);
    root.querySelector('[data-refresh]').onclick=()=>load(true);
    root.querySelector('[data-account]').onclick=()=>account();
    root.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
    load(true);
  }

  function account(){
    if(!confirm('¿Querés cerrar la sesión de Tienda?'))return;
    ['defe_role','defe_token','defe_auth_token'].forEach(k=>localStorage.removeItem(k));
    sessionStorage.clear();
    document.getElementById('defeStoreDashboard')?.remove();
    location.reload();
  }

  function openManager(tab='products'){
    if(typeof window.defeOpenNativeStoreManager!=='function')return;
    document.getElementById('defeStoreDashboard').style.display='none';
    window.defeOpenNativeStoreManager();
    setTimeout(()=>{
      const b=document.querySelector(`[data-defe-store-manager] [data-tab="${tab}"]`);if(b)b.click();
      const back=document.querySelector('[data-defe-store-manager] [data-store-back]');
      if(back&&!back.dataset.dsdBack){back.dataset.dsdBack='1';back.addEventListener('click',()=>setTimeout(()=>{const d=document.getElementById('defeStoreDashboard');if(d){d.style.display='block';load(true)}},30));}
    },80);
  }
  function go(where){if(where==='panel'){load(true);return}if(where==='gestion'){openManager('products');return}if(where==='account'){account();return}}

  function lowStock(products){
    const out=[];
    products.filter(p=>p.active!==false&&p.stock_managed).forEach(p=>Object.entries(p.inventory||{}).forEach(([size,q])=>{q=Number(q||0);if(q<=2)out.push({name:p.name,size,qty:q})}));
    return out.sort((a,b)=>a.qty-b.qty);
  }
  function orderItem(o){const first=(o.items||[])[0]||{};return `${first.qty||1}× ${first.name||'Producto'}${first.size?` (${first.size})`:''}`}

  function render(orders,products){
    const box=document.querySelector('#defeStoreDashboard [data-summary]');if(!box)return;
    const pending=orders.filter(o=>o.status==='pending');
    const confirmed=orders.filter(o=>o.status==='confirmed');
    const ready=orders.filter(o=>o.status==='ready');
    const lows=lowStock(products);
    const attn=[
      ...pending.slice(0,3).map(o=>({kind:'order',text:`Pedido #${o.id} pendiente de confirmación`,meta:`${o.buyer_name||o.name||'Comprador'} · ${orderItem(o)}`,tab:'orders'})),
      ...ready.slice(0,2).map(o=>({kind:'ready',text:`Pedido #${o.id} listo para retirar`,meta:`${o.buyer_name||o.name||'Comprador'}`,tab:'orders'})),
      ...lows.slice(0,3).map(x=>({kind:'stock',text:`Stock bajo · ${x.name}`,meta:`${x.size}: ${x.qty} unidad${x.qty===1?'':'es'}`,tab:'products'}))
    ];
    const recent=[...orders].sort((a,b)=>new Date(b.updated_at||b.created_at||0)-new Date(a.updated_at||a.created_at||0)).slice(0,6);
    box.innerHTML=`
      <div class="dsd-kpis">
        <div class="dsd-kpi warn"><b>${pending.length}</b><span>Pedidos pendientes</span></div>
        <div class="dsd-kpi"><b>${confirmed.length}</b><span>Para preparar</span></div>
        <div class="dsd-kpi good"><b>${ready.length}</b><span>Listos para retirar</span></div>
        <div class="dsd-kpi ${lows.length?'danger':''}"><b>${lows.length}</b><span>Stock crítico</span></div>
      </div>
      <section class="dsd-card"><h3>Necesitan atención</h3>${attn.length?attn.map(a=>`<div class="dsd-attn"><span class="dsd-dot" style="background:${a.kind==='stock'?'#b42318':a.kind==='ready'?'#16865b':'#f3a320'}"></span><div><strong>${esc(a.text)}</strong><div class="dsd-meta">${esc(a.meta)}</div></div><button class="dsd-link" data-open-tab="${a.tab}">Ver</button></div>`).join(''):'<div class="dsd-empty">No hay tareas urgentes en este momento.</div>'}</section>
      <div class="dsd-actions">
        <button class="dsd-action" data-open-tab="products"><i>▤</i><b>Abrir gestión</b><small>Productos, pedidos y WhatsApp</small></button>
        <button class="dsd-action" data-refresh-card><i>↻</i><b>Actualizar panel</b><small>Refrescar la información</small></button>
      </div>
      <section class="dsd-card"><h3>Actividad reciente</h3>${recent.length?recent.map(o=>`<div class="dsd-activity"><b>Pedido #${o.id} · ${esc(labels[o.status]||o.status)}</b><div class="dsd-meta">${esc(o.buyer_name||o.name||'Comprador')} · ${esc(orderItem(o))} · ${fmtDate(o.updated_at||o.created_at)}</div></div>`).join(''):'<div class="dsd-empty">Todavía no hay actividad registrada.</div>'}</section>`;
    box.querySelectorAll('[data-open-tab]').forEach(b=>b.onclick=()=>openManager(b.dataset.openTab));
    box.querySelector('[data-refresh-card]')?.addEventListener('click',()=>load(true));
  }

  async function load(force=false){
    if(loading)return;if(!force&&Date.now()-lastLoad<15000)return;loading=true;
    try{const [orders,products]=await Promise.all([api('/api/store/admin/orders'),api('/api/store/admin/products')]);lastLoad=Date.now();render(Array.isArray(orders)?orders:[],Array.isArray(products)?products:[])}
    catch(e){const box=document.querySelector('#defeStoreDashboard [data-summary]');if(box)box.innerHTML=`<div class="dsd-error">No pudimos cargar el panel: ${esc(e.message)}</div>`}
    finally{loading=false}
  }

  function boot(){
    if(role()==='tienda'&&token())ensure();
    setInterval(()=>{if(role()==='tienda'&&token()){ensure();load(false)}else document.getElementById('defeStoreDashboard')?.remove()},15000);
    window.addEventListener('defe-store-auth-ready',()=>setTimeout(ensure,50));
    window.addEventListener('focus',()=>{ensure();load(false)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
