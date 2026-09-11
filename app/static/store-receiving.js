// El Defe · Gestión simple Tienda ↔ familias/jugadores
(function(){
  if(window.__defeStoreReceivingLoaded)return;
  window.__defeStoreReceivingLoaded=true;
  const API=()=>String(window.EL_DEFE_API_URL||'').replace(/\/$/,'');
  const token=()=>localStorage.getItem('defe_token')||'';
  const role=()=>localStorage.getItem('defe_role')||'';
  const allowedRole=()=>['admin','delegado','tienda'].includes(role());
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money=v=>v==null?'Precio a confirmar':new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(v);
  const labels={pending:'Pendiente',confirmed:'Confirmado',ready:'Listo para retirar',delivered:'Entregado',cancelled:'Cancelado'};
  let products=[];
  let loadingOrders=false;

  async function api(path,opts={}){
    opts.headers={...(opts.headers||{})};
    if(token())opts.headers.Authorization='Bearer '+token();
    const r=await fetch(API()+path,{...opts,cache:'no-store'}),j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.detail||'Error');
    return j;
  }
  async function loadProducts(){products=await api('/api/store/admin/products');return products;}
  function productById(id){return products.find(p=>String(p.id)===String(id));}
  function currentStock(p,size){return p?.stock_managed?Number(p.inventory?.[size]||0):0;}

  function renderSizes(){
    const p=productById(document.getElementById('storeReceivingProduct')?.value),sel=document.getElementById('storeReceivingSize'),current=document.getElementById('storeReceivingCurrent'),qty=document.getElementById('storeReceivingQty');
    if(!sel)return;
    const previous=sel.value;
    sel.innerHTML=(p?.sizes||[]).map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');
    if((p?.sizes||[]).includes(previous))sel.value=previous;
    const update=()=>{const q=currentStock(p,sel.value);if(current)current.textContent=`Stock actual: ${q}`;if(qty)qty.value=String(q);};
    sel.onchange=update;update();
  }

  async function ensureStock(){
    if(!allowedRole())return;
    const card=document.getElementById('storeAdminCard');
    if(!card||document.getElementById('storeReceivingCard'))return;
    try{await loadProducts();}catch{return;}
    const box=document.createElement('div');
    box.id='storeReceivingCard';box.style.marginTop='14px';
    box.innerHTML=`<div style="padding-top:12px;border-top:1px solid var(--line)"><div class="row"><div><b>Cargar / ajustar stock</b><div class="meta">Indicá cuántas unidades querés dejar disponibles para las familias.</div></div><span class="badge">STOCK</span></div><select id="storeReceivingProduct" style="margin-top:10px">${products.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select><select id="storeReceivingSize"></select><input id="storeReceivingQty" type="number" min="0" step="1" placeholder="Stock disponible"><div id="storeReceivingCurrent" class="meta"></div><button id="storeReceivingSave" class="btn" style="margin-top:9px">Guardar stock disponible</button><div id="storeReceivingMsg" class="meta"></div></div>`;
    const anchor=document.getElementById('storeOrdersCard')||document.getElementById('storeAdminList');
    if(anchor)card.insertBefore(box,anchor);else card.appendChild(box);
    document.getElementById('storeReceivingProduct').onchange=renderSizes;renderSizes();
    document.getElementById('storeReceivingSave').onclick=async()=>{
      const msg=document.getElementById('storeReceivingMsg'),p=productById(document.getElementById('storeReceivingProduct').value),size=document.getElementById('storeReceivingSize').value,qty=Number(document.getElementById('storeReceivingQty').value);
      if(!p||!size||!Number.isInteger(qty)||qty<0){msg.textContent='Seleccioná producto, talle y una cantidad válida.';return;}
      msg.textContent='Guardando stock…';
      try{
        const fresh=await api('/api/store/admin/products'),fp=fresh.find(x=>String(x.id)===String(p.id));
        if(!fp)throw new Error('Producto no encontrado');
        const inventory={};(fp.sizes||[]).forEach(s=>inventory[s]=fp.stock_managed?Number(fp.inventory?.[s]||0):0);inventory[size]=qty;
        await api(`/api/store/admin/products/${p.id}/inventory`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({inventory})});
        msg.textContent=`Listo. Quedan ${qty} unidades disponibles en talle ${size}.`;
        await loadProducts();renderSizes();window.defeReloadStoreAdmin?.();window.defeRefreshStoreStockAlerts?.();
      }catch(e){msg.textContent=e.message;}
    };
  }

  function waPhone(value){
    let p=String(value||'').replace(/\D/g,'');
    if(p.startsWith('0'))p=p.slice(1);
    if(/^11\d{8}$/.test(p))p='549'+p;
    return p;
  }
  function orderItems(order){return (order.items||[]).map(i=>`${i.qty} x ${i.name} · Talle ${i.size}`).join('\n');}
  function readyMessage(order){return `Hola ${order.buyer_name}, tu pedido #${order.id} de Tienda El Defe ya está listo para retirar.\n\n${orderItems(order)}\n\nRetiro: Tienda del Club. ¡Te esperamos!`;}
  function generalMessage(order){return `Hola ${order.buyer_name}, te escribimos desde Tienda El Defe por tu pedido #${order.id}.\n\n${orderItems(order)}`;}
  function openBuyerWhatsApp(order,text){const phone=waPhone(order.buyer_phone);const url=phone?`https://wa.me/${phone}?text=${encodeURIComponent(text)}`:`https://wa.me/?text=${encodeURIComponent(text)}`;window.open(url,'_blank','noopener');}

  async function changeStatus(order,next,notifyReady=false){
    if(next==='cancelled'&&!window.confirm(`¿Cancelar el pedido #${order.id}? Si el stock ya fue descontado, se repondrá automáticamente.`))return;
    if(next==='delivered'&&!window.confirm(`¿Marcar el pedido #${order.id} como entregado?`))return;
    try{
      const updated=await api(`/api/store/admin/orders/${order.id}/status`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:next})});
      await renderOrders();window.defeRefreshStoreStockAlerts?.();
      if(notifyReady)openBuyerWhatsApp(updated,readyMessage(updated));
    }catch(e){window.alert(e.message);}
  }

  function actionButtons(order){
    const buttons=[];
    if(order.status==='pending')buttons.push(`<button class="btn" data-store-order-action="confirmed" data-order-id="${order.id}">Confirmar pedido</button>`);
    if(order.status==='confirmed')buttons.push(`<button class="btn" data-store-order-action="ready" data-order-id="${order.id}">Listo para retirar + WhatsApp</button>`);
    if(order.status==='ready'){
      buttons.push(`<button class="btn" data-store-order-wa="${order.id}">Avisar por WhatsApp</button>`);
      buttons.push(`<button class="btn secondary" data-store-order-action="delivered" data-order-id="${order.id}">Marcar entregado</button>`);
    }
    if(['pending','confirmed','ready'].includes(order.status))buttons.push(`<button class="btn secondary" data-store-order-action="cancelled" data-order-id="${order.id}">Cancelar</button>`);
    return buttons.join('');
  }

  async function renderOrders(){
    if(!allowedRole()||loadingOrders)return;
    const card=document.getElementById('storeAdminCard');if(!card)return;
    loadingOrders=true;
    try{
      const orders=await api('/api/store/admin/orders');
      let box=document.getElementById('storeOrdersCard');
      if(!box){box=document.createElement('div');box.id='storeOrdersCard';box.style.marginTop='14px';card.appendChild(box);}
      box.innerHTML=`<div style="padding-top:12px;border-top:1px solid var(--line)"><div class="row"><div><b>Pedidos de familias y jugadores</b><div class="meta">Confirmá, prepará y avisá cuando el pedido esté listo para retirar.</div></div><span class="badge">${orders.filter(o=>!['delivered','cancelled'].includes(o.status)).length} ACTIVOS</span></div><div id="storeFamilyOrders" style="margin-top:10px">${orders.length?orders.slice(0,50).map(o=>`<div class="card" style="margin:9px 0"><div class="row"><div><b>Pedido #${o.id} · ${esc(o.buyer_name)}</b><div class="meta">${esc(o.buyer_category||'Sin categoría')} · ${esc(o.buyer_phone||'')}</div></div><span class="badge">${esc(labels[o.status]||o.status)}</span></div><div class="meta" style="margin-top:8px">${(o.items||[]).map(i=>`${i.qty} × ${esc(i.name)} · Talle ${esc(i.size)}`).join('<br>')}</div>${o.total!=null?`<div style="font-weight:800;margin-top:7px">${money(o.total)}</div>`:''}${o.buyer_note?`<div class="meta" style="margin-top:6px">Nota: ${esc(o.buyer_note)}</div>`:''}<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px">${actionButtons(o)}<button class="btn secondary" data-store-order-contact="${o.id}">WhatsApp</button></div></div>`).join(''):'<div class="meta">Todavía no hay pedidos.</div>'}</div></div>`;
      const byId=id=>orders.find(o=>String(o.id)===String(id));
      box.querySelectorAll('[data-store-order-action]').forEach(btn=>btn.onclick=()=>{const o=byId(btn.dataset.orderId);if(o)changeStatus(o,btn.dataset.storeOrderAction,btn.dataset.storeOrderAction==='ready');});
      box.querySelectorAll('[data-store-order-wa]').forEach(btn=>btn.onclick=()=>{const o=byId(btn.dataset.storeOrderWa);if(o)openBuyerWhatsApp(o,readyMessage(o));});
      box.querySelectorAll('[data-store-order-contact]').forEach(btn=>btn.onclick=()=>{const o=byId(btn.dataset.storeOrderContact);if(o)openBuyerWhatsApp(o,generalMessage(o));});
    }catch(e){
      const box=document.getElementById('storeOrdersCard');if(box)box.innerHTML=`<div class="meta">No se pudieron cargar los pedidos: ${esc(e.message)}</div>`;
    }finally{loadingOrders=false;}
  }

  function ensure(){ensureStock();renderOrders();}
  function init(){
    const mo=new MutationObserver(()=>ensure());mo.observe(document.body,{childList:true,subtree:true});
    setTimeout(ensure,600);window.addEventListener('defe-store-admin-list-ready',()=>setTimeout(ensure,0));window.addEventListener('focus',renderOrders);
    setInterval(renderOrders,30000);window.defeReloadStoreOrders=renderOrders;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();