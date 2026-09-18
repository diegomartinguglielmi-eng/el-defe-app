// El Defe · Panel operativo nativo de Tienda 2026-09-15
(() => {
  const API='https://el-defe-v5-production.up.railway.app';
  const token=()=>localStorage.getItem('defe_auth_token')||localStorage.getItem('defe_token')||'';
  const role=()=>String(localStorage.getItem('defe_role')||'').toLowerCase();
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money=v=>v==null?'A confirmar':new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(v);
  const canUse=()=>['tienda','admin','delegado'].includes(role())&&!!token();

  async function api(path,opts={}){
    const headers={...(opts.headers||{}),Authorization:'Bearer '+token()};
    const r=await fetch(API+path,{...opts,headers,cache:'no-store'});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.detail||`Error ${r.status}`);
    return j;
  }

  function close(){document.querySelector('[data-defe-store-manager]')?.remove()}
  function toast(msg,ok=true){const el=document.querySelector('[data-store-toast]');if(!el)return;el.textContent=msg;el.style.color=ok?'#16865b':'#b42318';}

  function shell(){
    close();
    const root=document.createElement('div');
    root.dataset.defeStoreManager='1';
    root.style.cssText='position:fixed;inset:0;z-index:100200;background:#f3f6fa;color:#17365f;overflow:auto;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif';
    root.innerHTML=`
      <div style="position:sticky;top:0;z-index:3;background:#0b4a8f;color:#fff;padding:16px 18px;box-shadow:0 4px 16px #0002">
        <div style="max-width:760px;margin:auto;display:flex;align-items:center;gap:12px">
          <button data-store-back style="width:40px;height:40px;border:1px solid #ffffff44;border-radius:12px;background:#ffffff16;color:#fff;font-size:22px">←</button>
          <div style="flex:1"><div style="font-size:12px;opacity:.8;font-weight:800">EL DEFE</div><div style="font-size:22px;font-weight:950">Administración de Tienda</div></div>
          <span style="font-size:11px;font-weight:900;background:#eaf6ef;color:#16865b;padding:7px 10px;border-radius:999px">TIENDA</span>
        </div>
      </div>
      <main style="max-width:760px;margin:auto;padding:16px 16px 90px">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
          <button data-tab="products" style="padding:12px 8px;border:0;border-radius:14px;background:#0b4a8f;color:#fff;font-weight:900">Productos</button>
          <button data-tab="orders" style="padding:12px 8px;border:1px solid #d8e1eb;border-radius:14px;background:#fff;color:#17365f;font-weight:900">Pedidos</button>
          <button data-tab="settings" style="padding:12px 8px;border:1px solid #d8e1eb;border-radius:14px;background:#fff;color:#17365f;font-weight:900">WhatsApp</button>
        </div>
        <div data-store-toast style="min-height:22px;font-size:13px;font-weight:800;margin:2px 2px 10px"></div>
        <section data-pane="products"></section>
        <section data-pane="orders" style="display:none"></section>
        <section data-pane="settings" style="display:none"></section>
      </main>`;
    document.body.appendChild(root);
    root.querySelector('[data-store-back]').onclick=close;
    root.querySelectorAll('[data-tab]').forEach(btn=>btn.onclick=()=>switchTab(btn.dataset.tab));
    return root;
  }

  function switchTab(name){
    const root=document.querySelector('[data-defe-store-manager]');if(!root)return;
    root.querySelectorAll('[data-pane]').forEach(p=>p.style.display=p.dataset.pane===name?'block':'none');
    root.querySelectorAll('[data-tab]').forEach(b=>{const on=b.dataset.tab===name;b.style.background=on?'#0b4a8f':'#fff';b.style.color=on?'#fff':'#17365f';b.style.border=on?'0':'1px solid #d8e1eb'});
    if(name==='products')loadProducts();
    if(name==='orders')loadOrders();
    if(name==='settings')loadSettings();
  }

  async function loadProducts(){
    const pane=document.querySelector('[data-pane="products"]');if(!pane)return;
    pane.innerHTML='<div style="padding:24px;text-align:center;color:#718096">Cargando productos…</div>';
    try{
      const rows=await api('/api/store/admin/products');
      pane.innerHTML=`<button data-new-product style="width:100%;padding:14px;border:0;border-radius:14px;background:#16865b;color:#fff;font-weight:950;font-size:15px;margin-bottom:12px">+ Nuevo producto</button><div data-product-form></div><div>${rows.map(productCard).join('')||'<div style="background:#fff;border:1px solid #dbe3ec;border-radius:16px;padding:18px;color:#718096">No hay productos cargados.</div>'}</div>`;
      pane.querySelector('[data-new-product]').onclick=()=>openProductForm();
      pane.querySelectorAll('[data-edit-product]').forEach(b=>b.onclick=()=>openProductForm(rows.find(x=>String(x.id)===b.dataset.editProduct)));
      pane.querySelectorAll('[data-stock-product]').forEach(b=>b.onclick=()=>openStockForm(rows.find(x=>String(x.id)===b.dataset.stockProduct)));
    }catch(e){pane.innerHTML=`<div style="background:#fff;border-radius:16px;padding:18px;color:#b42318">${esc(e.message)}</div>`}
  }

  function productCard(p){
    const total=Object.values(p.inventory||{}).reduce((a,b)=>a+Number(b||0),0);
    const stock=p.stock_managed?`${total} u.`:'Sin control';
    return `<div style="background:#fff;border:1px solid #dbe3ec;border-radius:16px;padding:15px;margin-bottom:10px;box-shadow:0 4px 16px #00000008">
      <div style="display:flex;gap:12px;align-items:flex-start">
        ${p.image_url?`<img src="${esc(p.image_url)}" alt="" style="width:64px;height:64px;border-radius:12px;object-fit:cover;background:#eef3f8">`:'<div style="width:64px;height:64px;border-radius:12px;background:#eef3f8;display:grid;place-items:center;font-size:28px">👕</div>'}
        <div style="flex:1;min-width:0"><div style="font-size:16px;font-weight:950">${esc(p.name)}</div><div style="font-size:12px;color:#718096;margin-top:3px">${esc(p.category)} · ${money(p.price)}</div><div style="font-size:12px;margin-top:6px"><b>Stock:</b> ${esc(stock)} ${p.active?'':' · OCULTO'} ${p.featured?' · DESTACADO':''}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px"><button data-edit-product="${p.id}" style="padding:11px;border:1px solid #d8e1eb;border-radius:12px;background:#fff;color:#17365f;font-weight:900">Editar</button><button data-stock-product="${p.id}" style="padding:11px;border:0;border-radius:12px;background:#eaf2fb;color:#0b4a8f;font-weight:900">Stock</button></div>
    </div>`;
  }

  function openProductForm(p=null){
    const box=document.querySelector('[data-product-form]');if(!box)return;
    const sizes=(p?.sizes||[]).join(', ');
    box.innerHTML=`<div style="background:#fff;border:1px solid #cfdbe7;border-radius:16px;padding:15px;margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:16px">${p?'Editar producto':'Nuevo producto'}</b><button data-close-form style="border:0;background:#eef3f8;border-radius:999px;width:34px;height:34px">×</button></div>
      <label style="font-size:12px;font-weight:900">Nombre</label><input data-f="name" value="${esc(p?.name||'')}" style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #d8e1eb;border-radius:11px;margin:5px 0 10px">
      <label style="font-size:12px;font-weight:900">Categoría</label><input data-f="category" value="${esc(p?.category||'')}" style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #d8e1eb;border-radius:11px;margin:5px 0 10px">
      <label style="font-size:12px;font-weight:900">Precio ARS</label><input data-f="price" type="number" min="0" value="${p?.price??''}" placeholder="Vacío = a confirmar" style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #d8e1eb;border-radius:11px;margin:5px 0 10px">
      <label style="font-size:12px;font-weight:900">Talles / variantes</label><input data-f="sizes" value="${esc(sizes)}" placeholder="S, M, L, XL" style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #d8e1eb;border-radius:11px;margin:5px 0 10px">
      <label style="font-size:12px;font-weight:900">Foto (URL)</label><input data-f="image" value="${esc(p?.image_url||'')}" style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #d8e1eb;border-radius:11px;margin:5px 0 10px">
      <label style="font-size:12px;font-weight:900">Descripción</label><textarea data-f="desc" style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #d8e1eb;border-radius:11px;margin:5px 0 10px;min-height:80px">${esc(p?.description||'')}</textarea>
      <label style="display:flex;justify-content:space-between;align-items:center;margin:8px 0">Visible <input data-f="active" type="checkbox" ${p?.active!==false?'checked':''}></label>
      <label style="display:flex;justify-content:space-between;align-items:center;margin:8px 0 14px">Destacado <input data-f="featured" type="checkbox" ${p?.featured?'checked':''}></label>
      <button data-save-product style="width:100%;padding:13px;border:0;border-radius:12px;background:#0b4a8f;color:#fff;font-weight:950">Guardar producto</button><div data-form-msg style="font-size:12px;margin-top:8px"></div></div>`;
    box.querySelector('[data-close-form]').onclick=()=>box.innerHTML='';
    box.querySelector('[data-save-product]').onclick=async()=>{
      const get=n=>box.querySelector(`[data-f="${n}"]`);
      const name=get('name').value.trim(),category=get('category').value.trim(),sizes=get('sizes').value.split(',').map(x=>x.trim()).filter(Boolean);
      const msg=box.querySelector('[data-form-msg]');
      if(!name||!category||!sizes.length){msg.textContent='Completá nombre, categoría y al menos un talle/variante.';msg.style.color='#b42318';return}
      const slug=p?.slug||name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      const payload={slug,name,category,description:get('desc').value.trim()||null,image_url:get('image').value.trim()||null,price:get('price').value===''?null:Number(get('price').value),sizes,active:get('active').checked,featured:get('featured').checked,sort_order:p?.sort_order||0};
      try{msg.textContent='Guardando…';msg.style.color='#718096';await api(p?`/api/store/admin/products/${p.id}`:'/api/store/admin/products',{method:p?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});toast('Producto guardado.');await loadProducts()}catch(e){msg.textContent=e.message;msg.style.color='#b42318'}
    };
    box.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function openStockForm(p){
    const box=document.querySelector('[data-product-form]');if(!box)return;
    const sizes=p?.sizes||[];
    box.innerHTML=`<div style="background:#fff;border:1px solid #cfdbe7;border-radius:16px;padding:15px;margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:center"><div><b style="font-size:16px">Stock · ${esc(p.name)}</b><div style="font-size:12px;color:#718096">Cantidad disponible por talle/variante</div></div><button data-close-stock style="border:0;background:#eef3f8;border-radius:999px;width:34px;height:34px">×</button></div><div style="margin-top:12px">${sizes.map(s=>`<label style="display:grid;grid-template-columns:1fr 100px;align-items:center;gap:10px;margin:8px 0"><b>${esc(s)}</b><input data-size="${esc(s)}" type="number" min="0" value="${Number(p.inventory?.[s]||0)}" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #d8e1eb;border-radius:10px"></label>`).join('')}</div><button data-save-stock style="width:100%;padding:13px;border:0;border-radius:12px;background:#16865b;color:#fff;font-weight:950;margin-top:10px">Guardar stock</button><div data-stock-msg style="font-size:12px;margin-top:8px"></div></div>`;
    box.querySelector('[data-close-stock]').onclick=()=>box.innerHTML='';
    box.querySelector('[data-save-stock]').onclick=async()=>{const inventory={};box.querySelectorAll('[data-size]').forEach(i=>inventory[i.dataset.size]=Math.max(0,Number(i.value||0)));const msg=box.querySelector('[data-stock-msg]');try{msg.textContent='Guardando…';await api(`/api/store/admin/products/${p.id}/inventory`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({inventory})});toast('Stock actualizado.');await loadProducts()}catch(e){msg.textContent=e.message;msg.style.color='#b42318'}};
    box.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function loadOrders(){
    const pane=document.querySelector('[data-pane="orders"]');if(!pane)return;
    pane.innerHTML='<div style="padding:24px;text-align:center;color:#718096">Cargando pedidos…</div>';
    try{const rows=await api('/api/store/admin/orders');pane.innerHTML=rows.map(orderCard).join('')||'<div style="background:#fff;border:1px solid #dbe3ec;border-radius:16px;padding:18px;color:#718096">Todavía no hay pedidos.</div>';pane.querySelectorAll('[data-order-status]').forEach(b=>b.onclick=()=>changeOrder(b.dataset.orderId,b.dataset.orderStatus))}catch(e){pane.innerHTML=`<div style="background:#fff;border-radius:16px;padding:18px;color:#b42318">${esc(e.message)}</div>`}
  }

  function orderCard(o){
    const labels={pending:'Pendiente',confirmed:'Confirmado',ready:'Listo para retirar',delivered:'Entregado',cancelled:'Cancelado'};
    const next={pending:['confirmed','cancelled'],confirmed:['ready','cancelled'],ready:['delivered','cancelled'],delivered:[],cancelled:[]}[o.status]||[];
    const items=(o.items||[]).map(i=>`${i.qty}× ${i.name} (${i.size})`).join('<br>');
    return `<div style="background:#fff;border:1px solid #dbe3ec;border-radius:16px;padding:15px;margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:10px"><div><b>Pedido #${o.id}</b><div style="font-size:13px;margin-top:4px">${esc(o.buyer_name)} · ${esc(o.buyer_phone)}</div></div><span style="font-size:11px;font-weight:900;background:#eef3f8;border-radius:999px;padding:7px 9px;height:max-content">${esc(labels[o.status]||o.status)}</span></div><div style="font-size:12px;color:#52667d;line-height:1.55;margin:10px 0">${items}</div><div style="font-weight:950;margin-bottom:10px">${money(o.total)}</div>${next.length?`<div style="display:grid;grid-template-columns:repeat(${next.length},1fr);gap:8px">${next.map(s=>`<button data-order-status="${s}" data-order-id="${o.id}" style="padding:11px;border:${s==='cancelled'?'1px solid #e2b8b8':'0'};border-radius:12px;background:${s==='cancelled'?'#fff':'#0b4a8f'};color:${s==='cancelled'?'#b42318':'#fff'};font-weight:900">${s==='confirmed'?'Confirmar':s==='ready'?'Listo':s==='delivered'?'Entregar':'Cancelar'}</button>`).join('')}</div>`:''}</div>`;
  }

  async function changeOrder(id,status){try{await api(`/api/store/admin/orders/${id}/status`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});toast('Pedido actualizado.');await loadOrders();}catch(e){toast(e.message,false)}}

  async function loadSettings(){
    const pane=document.querySelector('[data-pane="settings"]');if(!pane)return;
    pane.innerHTML='<div style="padding:24px;text-align:center;color:#718096">Cargando…</div>';
    try{const s=await api('/api/store/admin/settings');pane.innerHTML=`<div style="background:#fff;border:1px solid #dbe3ec;border-radius:16px;padding:16px"><b style="font-size:16px">WhatsApp de la Tienda</b><div style="font-size:12px;color:#718096;margin:5px 0 12px">Número al que llegan las consultas y reservas.</div><input data-wa value="${esc(s.whatsapp_number||'')}" inputmode="numeric" style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #d8e1eb;border-radius:11px;margin-bottom:10px"><button data-save-wa style="width:100%;padding:13px;border:0;border-radius:12px;background:#0b4a8f;color:#fff;font-weight:950">Guardar WhatsApp</button><div data-wa-msg style="font-size:12px;margin-top:8px"></div></div>`;pane.querySelector('[data-save-wa]').onclick=async()=>{const msg=pane.querySelector('[data-wa-msg]');try{await api('/api/store/admin/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({whatsapp_number:pane.querySelector('[data-wa]').value})});msg.textContent='Guardado.';msg.style.color='#16865b'}catch(e){msg.textContent=e.message;msg.style.color='#b42318'}}}catch(e){pane.innerHTML=`<div style="background:#fff;border-radius:16px;padding:18px;color:#b42318">${esc(e.message)}</div>`}
  }

  function open(){
    if(!canUse())return;
    document.querySelector('[data-defe-account-modal]')?.remove();
    shell();
    loadProducts();
  }

  // Intercepta el botón del modal de cuenta antes del handler anterior,
  // evitando que la navegación de la app vuelva a Inicio.
  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-store-admin]');
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    open();
  },true);

  window.defeOpenNativeStoreManager=open;
})();