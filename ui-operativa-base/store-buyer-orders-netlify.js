// El Defe · Mis pedidos + avisos de estado para compradores
(function(){
  const API='https://el-defe-v5-production.up.railway.app';
  const PHONE_KEY='defe_store_buyer_phone';
  const SEEN_KEY='defe_store_order_status_seen';
  const READ_KEY='defe_store_order_status_read';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]));
  const clean=s=>String(s||'').replace(/\D/g,'');
  const labels={pending:'Pedido recibido',confirmed:'Confirmado',ready:'Listo para retirar',delivered:'Entregado',cancelled:'Cancelado'};
  const messages={pending:'La Tienda del Club recibió tu pedido.',confirmed:'Tu pedido fue confirmado por la Tienda del Club.',ready:'¡Tu pedido ya está listo para retirar!',delivered:'Pedido entregado. ¡Gracias por acompañar al Defe!',cancelled:'El pedido fue cancelado.'};
  const steps=['pending','confirmed','ready','delivered'];
  let orders=[],initialized=false,loading=false;

  // Detección liviana y estable de la vista Tienda en esta SPA.
  // No depende de body.innerText ni de la URL, porque la navegación es interna.
  function isStore(){
    const p=(location.pathname+' '+location.hash).toLowerCase();
    if(p.includes('tienda')||p.includes('store')) return true;
    const search=Array.from(document.querySelectorAll('input')).find(i=>/buscar en la tienda/i.test(i.placeholder||''));
    if(search) return true;
    const title=Array.from(document.querySelectorAll('h1,h2,h3,[role="heading"]')).find(x=>/TIENDA DEL CLUB/i.test(x.textContent||''));
    if(title) return true;
    return false;
  }
  function phone(){return clean(localStorage.getItem(PHONE_KEY)||'')}
  function seen(){try{return JSON.parse(localStorage.getItem(SEEN_KEY)||'{}')}catch{return {}}}
  function read(){try{return JSON.parse(localStorage.getItem(READ_KEY)||'{}')}catch{return {}}}
  function save(k,v){localStorage.setItem(k,JSON.stringify(v))}
  function money(v){return v==null?'A confirmar':new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(v)}
  function date(v){try{return new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch{return ''}}

  function ensureStyle(){if(document.getElementById('defeBuyerOrdersStyle'))return;const s=document.createElement('style');s.id='defeBuyerOrdersStyle';s.textContent=`
    #defeOrdersPill{position:fixed;right:18px;top:192px;z-index:9997;border:0;border-radius:999px;background:#fff;color:#0b3a7a;box-shadow:0 8px 28px #001b4030;padding:10px 14px;font-weight:800;font:inherit;display:flex;gap:8px;align-items:center}
    #defeOrdersPill .count{min-width:20px;height:20px;border-radius:10px;background:#e53935;color:#fff;font-size:12px;display:none;align-items:center;justify-content:center}
    #defeOrdersModal{position:fixed;inset:0;z-index:10050;background:#f5f7fb;display:none;overflow:auto;color:#0d2b52;font-family:inherit}
    #defeOrdersModal.on{display:block}.dob-head{position:sticky;top:0;background:#0b4a8f;color:white;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;z-index:2}.dob-head h2{margin:0;font-size:26px}.dob-close{border:0;background:#ffffff20;color:#fff;border-radius:16px;width:46px;height:46px;font-size:26px}.dob-wrap{padding:18px 18px 110px;max-width:720px;margin:auto}.dob-phone,.dob-card{background:white;border:1px solid #dfe7f1;border-radius:22px;padding:18px;margin-bottom:14px;box-shadow:0 3px 12px #0d2b5210}.dob-phone input{width:100%;box-sizing:border-box;border:1px solid #ccd8e6;border-radius:14px;padding:14px;font-size:16px;margin:10px 0}.dob-btn{border:0;border-radius:14px;background:#145da8;color:#fff;font-weight:800;padding:13px 16px;width:100%;font-size:16px}.dob-order-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.dob-order-top b{font-size:20px}.dob-status{display:inline-flex;border-radius:999px;padding:7px 10px;font-weight:800;font-size:13px;background:#eaf3ff;color:#0b4a8f}.dob-items{margin:13px 0 4px;color:#52657d}.dob-item{padding:5px 0}.dob-total{font-weight:800;margin-top:9px}.dob-time{font-size:13px;color:#7d8b9d;margin-top:4px}.dob-timeline{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:18px 0 8px}.dob-step{text-align:center;font-size:11px;color:#98a5b5;position:relative;padding-top:22px}.dob-step:before{content:'';position:absolute;width:14px;height:14px;border-radius:50%;background:#d9e0e8;top:1px;left:50%;transform:translateX(-50%);z-index:1}.dob-step:after{content:'';position:absolute;height:3px;background:#d9e0e8;top:7px;left:-50%;right:50%}.dob-step:first-child:after{display:none}.dob-step.done{color:#0c6b47;font-weight:700}.dob-step.done:before,.dob-step.done:after{background:#21a36d}.dob-step.active{color:#0b4a8f;font-weight:900}.dob-step.active:before{background:#145da8;box-shadow:0 0 0 5px #dcecff}.dob-empty{text-align:center;padding:30px 10px;color:#6f7e91}.dob-toast{position:fixed;left:16px;right:16px;top:82px;z-index:11000;background:#0b4a8f;color:white;border-radius:18px;padding:14px 16px;box-shadow:0 8px 30px #001b4050;font-weight:700;animation:dobIn .2s ease}@keyframes dobIn{from{transform:translateY(-8px);opacity:0}to{transform:none;opacity:1}}
  `;document.head.appendChild(s)}

  function ensureUI(){ensureStyle();if(!document.getElementById('defeOrdersPill')){const b=document.createElement('button');b.id='defeOrdersPill';b.innerHTML='📦 Mis pedidos <span class="count"></span>';b.onclick=open;document.body.appendChild(b)}if(!document.getElementById('defeOrdersModal')){const m=document.createElement('div');m.id='defeOrdersModal';m.innerHTML='<div class="dob-head"><div><small>TIENDA DEL CLUB</small><h2>Mis pedidos</h2></div><button class="dob-close" aria-label="Cerrar">×</button></div><div class="dob-wrap" id="defeOrdersBody"></div>';m.querySelector('.dob-close').onclick=()=>m.classList.remove('on');document.body.appendChild(m)}updateBadge()}
  function currentUnread(){const r=read();return orders.filter(o=>r[o.id]!==o.status&&o.status!=='pending').length}
  function updateBadge(){const c=document.querySelector('#defeOrdersPill .count');if(!c)return;const n=currentUnread();c.textContent=n;c.style.display=n?'inline-flex':'none'}
  function markRead(){const r=read();orders.forEach(o=>r[o.id]=o.status);save(READ_KEY,r);updateBadge()}
  function toast(text){document.querySelectorAll('.dob-toast').forEach(x=>x.remove());const x=document.createElement('div');x.className='dob-toast';x.textContent=text;document.body.appendChild(x);setTimeout(()=>x.remove(),4500)}

  async function load(checkChanges=true){if(loading)return;const p=phone();if(!p){orders=[];render();return}loading=true;try{const r=await fetch(`${API}/api/store/orders/mine?phone=${encodeURIComponent(p)}`,{cache:'no-store'});if(!r.ok)throw 0;const next=await r.json();const old=seen();if(checkChanges&&initialized){for(const o of next){if(old[o.id]&&old[o.id]!==o.status){toast(`Pedido #${o.id}: ${labels[o.status]||o.status}`);if('Notification'in window&&Notification.permission==='granted')new Notification('Tienda del Defe',{body:`Pedido #${o.id}: ${messages[o.status]||labels[o.status]}`})}}}orders=next;const now={};next.forEach(o=>now[o.id]=o.status);save(SEEN_KEY,now);initialized=true;render();updateBadge()}catch(e){if(document.getElementById('defeOrdersModal')?.classList.contains('on')){const b=document.getElementById('defeOrdersBody');if(b)b.innerHTML='<div class="dob-card">No pudimos actualizar tus pedidos. Probá nuevamente en unos segundos.</div>'}}finally{loading=false}}

  function timeline(o){if(o.status==='cancelled')return '<div class="dob-status" style="background:#fff0f0;color:#b42318">Pedido cancelado</div>';const idx=steps.indexOf(o.status);return `<div class="dob-timeline">${steps.map((s,i)=>`<div class="dob-step ${i<idx?'done':''} ${i===idx?'active':''}">${labels[s]}</div>`).join('')}</div>`}
  function card(o){return `<div class="dob-card"><div class="dob-order-top"><div><b>Pedido #${o.id}</b><div class="dob-time">Actualizado ${date(o.updated_at)}</div></div><span class="dob-status">${esc(labels[o.status]||o.status)}</span></div>${timeline(o)}<div class="dob-items">${(o.items||[]).map(i=>`<div class="dob-item">${i.qty} × ${esc(i.name)} · talle ${esc(i.size)}</div>`).join('')}</div><div class="dob-total">Total: ${esc(money(o.total))}</div><div class="dob-time">${esc(messages[o.status]||'')}</div></div>`}
  function render(){const b=document.getElementById('defeOrdersBody');if(!b)return;const p=phone();b.innerHTML=`<div class="dob-phone"><b>Seguimiento de pedidos</b><div style="color:#6f7e91;margin-top:5px">Usamos el teléfono informado en tu compra para mostrarte el estado.</div><input id="defeBuyerPhoneInput" inputmode="tel" placeholder="Tu teléfono" value="${esc(p)}"><button class="dob-btn" id="defeBuyerPhoneSave">Ver mis pedidos</button></div>${p?(orders.length?orders.map(card).join(''):'<div class="dob-card dob-empty">Todavía no encontramos pedidos para este teléfono.</div>'):''}`;const i=document.getElementById('defeBuyerPhoneInput');const bt=document.getElementById('defeBuyerPhoneSave');if(bt)bt.onclick=()=>{const v=clean(i.value);if(v.length<8){toast('Ingresá el teléfono que usaste en la compra.');return}localStorage.setItem(PHONE_KEY,v);initialized=false;load(false)}}
  function open(){ensureUI();document.getElementById('defeOrdersModal').classList.add('on');markRead();load(false)}
  function capturePhone(){document.querySelectorAll('input').forEach(i=>{const ph=(i.placeholder||'').toLowerCase(),nm=(i.name||'').toLowerCase();if((ph.includes('tel')||ph.includes('whatsapp')||nm.includes('phone')||nm.includes('telefono'))&&!i.dataset.defePhoneWatch){i.dataset.defePhoneWatch='1';i.addEventListener('change',()=>{const v=clean(i.value);if(v.length>=8)localStorage.setItem(PHONE_KEY,v)})}})}
  function tick(){const store=isStore(),b=document.getElementById('defeOrdersPill');if(!store){if(b)b.style.display='none';return}ensureUI();capturePhone();if(document.getElementById('defeOrdersPill'))document.getElementById('defeOrdersPill').style.display='flex';load(true)}

  const init=()=>{
    tick();
    setInterval(tick,30000);
    document.addEventListener('click',()=>setTimeout(tick,350),{passive:true});
    window.addEventListener('popstate',()=>setTimeout(tick,150));
    window.addEventListener('hashchange',()=>setTimeout(tick,150));
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
