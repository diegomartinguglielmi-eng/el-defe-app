// El Defe · checkout robusto de Tienda
(function(){
 const API='https://el-defe-v5-production.up.railway.app';
 let busy=false, productCache=null;
 const text=el=>String(el?.textContent||'').replace(/\s+/g,' ').trim();
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
 const field=(root,needle)=>{const el=[...root.querySelectorAll('input,textarea')].find(x=>norm(x.placeholder||'').includes(norm(needle)));return String(el?.value||'').trim()};
 async function products(){
   if(productCache)return productCache;
   const r=await fetch(API+'/api/store/products?checkout=capture-v7',{cache:'no-store'});
   if(!r.ok)throw new Error('No pude leer el catálogo de la Tienda.');
   const j=await r.json(); productCache=Array.isArray(j)?j:(j.products||j.items||j.data||[]); return productCache;
 }
 const productName=p=>String(p?.name||p?.nombre||p?.title||p?.product_name||'').trim();
 const productSlug=p=>norm(p?.slug||p?.id||'');
 function bySlug(catalog,slug){const n=norm(slug);return catalog.find(p=>productSlug(p)===n)||null}
 function semanticProduct(catalog,s){
   const a=norm(s);
   if(!a)return null;
   if(a.includes('camiseta')&&(a.includes('titular')||a.includes('suplente')||a.includes('alternativa')||a.includes('2026')))return bySlug(catalog,'camiseta-partido');
   if(a.includes('short'))return bySlug(catalog,'short-partido');
   if(a.includes('medias'))return bySlug(catalog,'medias');
   if(a.includes('remera')&&a.includes('entrenamiento'))return bySlug(catalog,'remera-entrenamiento');
   if(a.includes('buzo'))return bySlug(catalog,'buzo');
   if(a.includes('campera'))return bySlug(catalog,'campera');
   if(a.includes('gorra'))return bySlug(catalog,'gorra');
   return null;
 }
 function bestProduct(catalog,s){
   const semantic=semanticProduct(catalog,s); if(semantic)return semantic;
   const a=norm(s); let best=null,score=0;
   for(const p of catalog){
     const b=norm(productName(p)); if(!b)continue;
     if(a===b||a.includes(b))return p;
     const words=b.split(' ').filter(w=>w.length>2);
     const hit=words.filter(w=>a.includes(w)).length;
     const sc=words.length?hit/words.length:0;
     if(sc>score){score=sc;best=p}
   }
   return score>=0.5?best:null;
 }
 function compactRows(root){
   const rows=[];
   for(const plus of [...root.querySelectorAll('button')].filter(b=>/^\+$/.test(text(b)))){
     let el=plus.parentElement;
     let best=null;
     for(let i=0;el&&el!==root&&i<8;i++,el=el.parentElement){
       const t=text(el);
       const hasSize=/Talle\s+[^·\s]+/i.test(t);
       const hasMinus=[...el.querySelectorAll('button')].some(b=>/^[-−]$/.test(text(b)));
       if(hasSize&&hasMinus){best=el;break}
     }
     if(best&&!rows.includes(best))rows.push(best);
   }
   if(rows.length)return rows;
   return [...root.querySelectorAll('div,li')].filter(el=>{
     const t=text(el); if(!/Talle\s+[^·\s]+/i.test(t))return false;
     const bs=[...el.querySelectorAll('button')].map(text);
     return bs.some(x=>/^\+$/.test(x))&&bs.some(x=>/^[-−]$/.test(x));
   }).sort((a,b)=>text(a).length-text(b).length);
 }
 function productForRow(row,root,catalog){
   let el=row;
   for(let i=0;el&&el!==root&&i<8;i++,el=el.parentElement){
     const p=bestProduct(catalog,text(el));
     if(p)return p;
   }
   return bestProduct(catalog,text(row));
 }
 function parseRow(row,p){
   const t=text(row),sm=t.match(/Talle\s+([^·\s]+)/i); if(!sm)return null;
   let qty=1;
   const buttons=[...row.querySelectorAll('button')];
   const plus=buttons.findIndex(b=>/^\+$/.test(text(b))); const minus=buttons.findIndex(b=>/^[-−]$/.test(text(b)));
   if(plus>=0&&minus>=0){
     const lo=Math.min(plus,minus),hi=Math.max(plus,minus);
     const q=buttons.slice(lo+1,hi).map(b=>Number(text(b))).find(Number.isFinite);
     if(q>0)qty=q;
   }
   return {product_id:Number(p.id),size:sm[1].trim(),qty:qty||1};
 }
 function collectItems(root,catalog){
   const items=[],used=new Set();
   for(const row of compactRows(root)){
     const p=productForRow(row,root,catalog);
     if(!p)continue;
     const it=parseRow(row,p);
     if(!it||!Number.isFinite(it.product_id))continue;
     const allowed=Array.isArray(p.sizes)?p.sizes.map(String):[];
     if(allowed.length&&!allowed.some(s=>norm(s)===norm(it.size)))continue;
     const canonical=allowed.find(s=>norm(s)===norm(it.size)); if(canonical)it.size=canonical;
     const k=it.product_id+'|'+it.size;
     if(!used.has(k)){used.add(k);items.push(it)}
   }
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
     if(!items.length)throw new Error('No pude identificar correctamente el producto y el talle del pedido.');
     submitForm({buyer_name,buyer_phone,buyer_category,buyer_note,items:JSON.stringify(items)});
   }catch(e){busy=false;btn.disabled=false;btn.textContent=old;alert(e?.message||'No se pudo registrar el pedido.')}
 }
 document.addEventListener('click',ev=>{const btn=ev.target?.closest?.('button');if(!btn||btn.disabled)return;if(/^Registrar y enviar por WhatsApp$/i.test(text(btn)))checkout(ev,btn)},true);
 window.__DEFE_STORE_CAPTURE_V7__='2026-09-16-semantic-product-parent-match';
})();
