(function(){
  const BASE=()=>String(window.EL_DEFE_API_URL||'').replace(/\/$/,'');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money=n=>n==null?'Consultar':new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(n);
  let products=[], settings={whatsapp_number:''}, cart=[];

  async function storeApi(path,opts={}){
    opts.headers=opts.headers||{};
    const token=localStorage.getItem('defe_token')||'';
    if(token) opts.headers.Authorization='Bearer '+token;
    const r=await fetch(BASE()+path,{...opts,cache:'no-store'});
    const j=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(j.detail||'No se pudo completar la operación');
    return j;
  }

  function addCss(){
    if(document.getElementById('defe-store-css'))return;
    const s=document.createElement('style');s.id='defe-store-css';s.textContent=`
      .quick.store-enabled{grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
      .quick.store-enabled button{padding-left:2px;padding-right:2px}.quick.store-enabled small{font-size:7.7px}
      .store-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .store-card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:11px;box-shadow:var(--shadow);display:flex;flex-direction:column;min-height:220px}
      .store-photo{height:105px;border-radius:14px;background:linear-gradient(145deg,#f0eefb,#fff);display:grid;place-items:center;overflow:hidden;font-size:34px;margin-bottom:9px}
      .store-photo img{width:100%;height:100%;object-fit:cover}.store-card h3{font-size:12px;margin:0 0 4px}.store-price{font-size:14px;font-weight:950;color:var(--c);margin:6px 0}.store-card select{margin:5px 0 7px;padding:8px}
      .store-cart{position:sticky;bottom:78px;z-index:8}.store-cart .card{border:2px solid #e7e3ff}.store-line{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--line)}.store-line:last-child{border-bottom:0}.store-line b{font-size:10px}.store-line .grow{font-size:9px}.store-qty{display:flex;align-items:center;gap:6px}.store-qty button{width:28px;height:28px;border:1px solid var(--line);background:#fff;border-radius:9px;font-weight:900}
      .store-empty{text-align:center;padding:28px 12px}.store-empty span{font-size:38px;display:block;margin-bottom:8px}
      @media(max-width:360px){.quick.store-enabled{grid-template-columns:repeat(3,1fr)}.store-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function ensureStoreScreen(){
    if(document.getElementById('store'))return;
    const app=document.querySelector('.app'),nav=document.querySelector('.nav');if(!app||!nav)return;
    const sec=document.createElement('section');sec.id='store';sec.className='screen';sec.innerHTML=`<div class="sub"><button class="back" onclick="show('home')">←</button><div><h1>Tienda</h1><p>Indumentaria y accesorios del Defe</p></div></div><main class="main"><div id="storeProducts"><div class="card">Cargando tienda…</div></div><div id="storeCart" class="store-cart"></div></main>`;
    app.insertBefore(sec,nav);
  }

  function ensureStoreAccess(){
    const q=document.querySelector('#home .quick');if(!q)return;
    q.classList.add('store-enabled');
    if(!document.getElementById('storeQuickButton')){
      const b=document.createElement('button');b.id='storeQuickButton';b.setAttribute('onclick',"show('store')");b.innerHTML='<span>🛒</span><small>Tienda</small>';
      const profile=[...q.querySelectorAll('button')].find(x=>/Mi Defe/i.test(x.textContent));
      if(profile)q.insertBefore(b,profile);else q.appendChild(b);
    }
  }

  function availableSizes(p){
    const sizes=p.sizes||[];if(!p.stock_managed)return sizes;
    return sizes.filter(s=>(p.inventory?.[s]||0)>0);
  }

  function renderProducts(){
    const box=document.getElementById('storeProducts');if(!box)return;
    if(!products.length){box.innerHTML='<div class="card store-empty"><span>🛍️</span><b>Tienda en preparación</b><div class="meta">Todavía no hay productos publicados.</div></div>';return;}
    box.innerHTML='<div class="store-grid">'+products.map(p=>{
      const sizes=availableSizes(p),sold=p.stock_managed&&!sizes.length;
      const img=p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}">`:'🛍️';
      const opts=sizes.map(s=>`<option value="${esc(s)}">${esc(s)}${p.stock_managed?' · '+(p.inventory?.[s]||0)+' disp.':''}</option>`).join('');
      return `<div class="store-card"><div class="store-photo">${img}</div><span class="badge">${esc(p.category)}</span><h3>${esc(p.name)}</h3><div class="meta">${esc(p.description||'Producto oficial del club')}</div><div class="store-price">${money(p.price)}</div><div style="margin-top:auto"><select id="storeSize${p.id}" ${sold?'disabled':''}>${opts||'<option>Sin stock</option>'}</select><button class="btn" ${sold?'disabled style="opacity:.45"':''} onclick="defeStoreAdd(${p.id})">${sold?'Sin stock':'Agregar'}</button></div></div>`;
    }).join('')+'</div>';
  }

  function renderCart(){
    const box=document.getElementById('storeCart');if(!box)return;
    if(!cart.length){box.innerHTML='';return;}
    const total=cart.reduce((a,x)=>a+(x.product.price==null?0:x.product.price*x.qty),0),complete=cart.every(x=>x.product.price!=null);
    box.innerHTML=`<div class="card"><div class="row"><b>Mi pedido</b><span class="badge">${cart.reduce((a,x)=>a+x.qty,0)} items</span></div>${cart.map((x,i)=>`<div class="store-line"><div class="grow"><b>${esc(x.product.name)}</b><div class="meta">Talle ${esc(x.size)} · ${money(x.product.price)}</div></div><div class="store-qty"><button onclick="defeStoreQty(${i},-1)">−</button><b>${x.qty}</b><button onclick="defeStoreQty(${i},1)">+</button></div></div>`).join('')}<div class="row" style="margin:11px 0"><b>Total</b><b>${complete?money(total):'A confirmar'}</b></div><input id="storeBuyerName" placeholder="Nombre y apellido"><input id="storeBuyerPhone" placeholder="Teléfono / WhatsApp" inputmode="tel"><input id="storeBuyerCategory" placeholder="Categoría (opcional)"><textarea id="storeBuyerNote" placeholder="Comentario (opcional)"></textarea><button class="btn" onclick="defeStoreOrder()">Enviar pedido por WhatsApp</button><div id="storeOrderMsg" class="meta"></div></div>`;
  }

  window.defeStoreAdd=id=>{
    const p=products.find(x=>x.id===id);if(!p)return;
    const sel=document.getElementById('storeSize'+id),size=sel?.value;if(!size||size==='Sin stock')return;
    const found=cart.find(x=>x.product.id===id&&x.size===size);
    const max=p.stock_managed?(p.inventory?.[size]||0):99;
    if(found){if(found.qty<max)found.qty++;}else cart.push({product:p,size,qty:1});
    renderCart();document.getElementById('storeCart')?.scrollIntoView({behavior:'smooth',block:'end'});
  };
  window.defeStoreQty=(i,d)=>{const x=cart[i];if(!x)return;const max=x.product.stock_managed?(x.product.inventory?.[x.size]||0):99;x.qty=Math.max(0,Math.min(max,x.qty+d));if(!x.qty)cart.splice(i,1);renderCart();};

  window.defeStoreOrder=async()=>{
    const msg=document.getElementById('storeOrderMsg');
    const name=document.getElementById('storeBuyerName')?.value.trim(),phone=document.getElementById('storeBuyerPhone')?.value.trim();
    if(!name||!phone){if(msg)msg.textContent='Completá nombre y teléfono.';return;}
    try{
      if(msg)msg.textContent='Generando pedido…';
      const order=await storeApi('/api/store/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({buyer_name:name,buyer_phone:phone,buyer_category:document.getElementById('storeBuyerCategory')?.value||null,buyer_note:document.getElementById('storeBuyerNote')?.value||null,items:cart.map(x=>({product_id:x.product.id,size:x.size,qty:x.qty}))})});
      const lines=cart.map(x=>`• ${x.product.name} · ${x.size} x${x.qty}`).join('\n');
      const text=`Hola, quiero hacer el pedido #${order.id} de la Tienda del Defe:\n${lines}\n${order.total!=null?'Total: '+money(order.total):'Importe a confirmar'}\nNombre: ${name}\nTel: ${phone}`;
      cart=[];renderCart();
      const wa=String(settings.whatsapp_number||'').replace(/\D/g,'');
      if(wa)window.location.href=`https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
      else if(msg)msg.textContent='Pedido registrado. El WhatsApp de la tienda no está configurado.';
    }catch(e){if(msg)msg.textContent=e.message;}
  };

  window.defeLoadStore=async()=>{
    ensureStoreScreen();ensureStoreAccess();
    const box=document.getElementById('storeProducts');if(box)box.innerHTML='<div class="card">Cargando tienda…</div>';
    try{[products,settings]=await Promise.all([storeApi('/api/store/products'),storeApi('/api/store/settings')]);renderProducts();renderCart();}
    catch(e){if(box)box.innerHTML=`<div class="card"><b>No se pudo abrir la Tienda</b><div class="meta">${esc(e.message)}</div></div>`;}
  };

  function install(){
    addCss();ensureStoreScreen();ensureStoreAccess();
    const oldShow=window.show;
    if(typeof oldShow==='function'&&!oldShow.__storeWrapped){
      const wrapped=function(id){const r=oldShow.apply(this,arguments);if(id==='store')window.defeLoadStore();return r;};wrapped.__storeWrapped=true;window.show=wrapped;
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));else setTimeout(install,0);
})();