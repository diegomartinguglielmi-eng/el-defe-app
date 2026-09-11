// El Defe · checkout robusto de Tienda
(function(){
 const API='https://el-defe-v5-production.up.railway.app';
 let busy=false, productCache=null;
 const text=el=>String(el?.textContent||'').replace(/\s+/g,' ').trim();
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
 const field=(root,needle)=>{const el=[...root.querySelectorAll('input,textarea')].find(x=>norm(x.placeholder||'').includes(norm(needle)));return String(el?.value||'').trim()};
 async function products(){
   if(productCache)return productCache;
   const r=await fetch(API+'/api/store/products?checkout=capture-v5',{cache:'no-store'});
   if(!r.ok)throw new Error('No pude leer el catálogo de la Tienda.');
   const j=await r.json(); productCache=Array.isArray(j)?j:(j.products||j.items||j.data||[]); return productCache;
 }
 const productName=p=>String(p?.name||p?.nombre||p?.title||p?.product_name||'').trim();
 function bestProduct(catalog,s){
   const a=norm(s); let best=null,score=0;
   for(const p of catalog){const b=norm(productName(p));if(!b)continue;if(a===b||a.includes(b))return p;const words=b.split(' ').filter(w=>w.length>2),hit=words.filter(w=>a.includes(w)).length;const sc=words.length?hit/words.length:0;if(sc>score){score=sc;best=p}}
   return score>=0.66?best:null;
 }
 function rowForProduct(root,p){
   const name=productName(p),n=norm(name); if(!n)return null;
   const nodes=[...root.querySelectorAll('div,li')].filter(el=>{const t=text(el);return /Talle\s+/i.test(t)&&norm(t).includes(n)});
   nodes.sort((a,b)=>text(a).length-text(b).length); return nodes[0]||null;
 }
 function parseRow(row,p){
   const t=text(row),sm=t.match(/Talle\s+([^·\s]+)/i); if(!sm)return null;
   let qty=1;
   const buttons=[...row.querySelectorAll('button')];
   const plus=buttons.findIndex(b=>/^\+$/.test(text(b))); const minus=buttons.findIndex(b=>/^[-−]$/.test(text(b)));
   if(plus>=0&&minus>=0){const lo=Math.min(plus,minus),hi=Math.max(plus,minus);const q=buttons.slice(lo+1,hi).map(b=>Number(text(b))).find(Number.isFinite);if(q>0)qty=q}
   const all=[...row.querySelectorAll('*')].map(x=>text(x)).filter(v=>/^\d{1,2}$/.test(v)).map(Number).filter(v=>v>0&&v<50);if(all.length)qty=all[all.length-1];
   return {product_id:Number(p.id),size:sm[1].trim(),qty:qty||1};
 }
 function collectItems(root,catalog){
   const items=[],used=new Set();
   for(const p of catalog){const row=rowForProduct(root,p);if(!row)continue;const it=parseRow(row,p);if(it&&Number.isFinite(it.product_id)){const k=it.product_id+'|'+it.size;if(!used.has(k)){used.add(k);items.push(it)}}}
   if(items.length)return items;
   const rows=[...root.querySelectorAll('div,li')].filter(el=>/Talle\s+/i.test(text(el)));
   rows.sort((a,b)=>text(a).length-text(b).length);
   for(const row of rows){const p=bestProduct(catalog,text(row));if(!p)continue;const it=parseRow(row,p);if(it){const k=it.product_id+'|'+it.size;if(!used.has(k)){used.add(k);items.push(it)}}}
   return items;
 }
 function submitForm(data){const f=document.createElement('form');f.method='POST';f.action=API+'/api/store/orders/submit';f.style.display='none';Object.entries(data).forEach(([k,v])=>{const i=document.createElement('input');i.type='hidden';i.name=k;i.value=v==null?'':String(v);f.appendChild(i)});document.body.appendChild(f);f.submit()}
 async function checkout(ev,btn){
   ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();if(busy)return;busy=true;
   const old=btn.textContent;btn.disabled=true;btn.textContent='Enviando pedido…';
   try{
     const root=btn.closest('[role="dialog"]')||btn.closest('.modal')||document.body;
     const buyer_name=field(root,'nombre'),buyer_phone=field(root,'tel'),buyer_category=field(root,'categor'),buyer_note=field(root,'observ');
     if(!buyer_name||!buyer_phone)throw new Error('Completá nombre y teléfono.');
     const catalog=await products(); const items=collectItems(root,catalog);
     if(!items.length)throw new Error('No pude identificar el producto del pedido.');
     submitForm({buyer_name,buyer_phone,buyer_category,buyer_note,items:JSON.stringify(items)});
   }catch(e){busy=false;btn.disabled=false;btn.textContent=old;alert(e?.message||'No se pudo registrar el pedido.')}
 }
 document.addEventListener('click',ev=>{const btn=ev.target?.closest?.('button');if(!btn||btn.disabled)return;if(/^Registrar y enviar por WhatsApp$/i.test(text(btn)))checkout(ev,btn)},true);
 window.__DEFE_STORE_CAPTURE_V5__='2026-09-11-catalog-row-match';
})();
