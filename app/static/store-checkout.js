// El Defe · checkout robusto de Tienda
(function(){
 const API='https://el-defe-v5-production.up.railway.app';
 let busy=false, productCache=null;
 const text=el=>String(el?.textContent||'').replace(/\s+/g,' ').trim();
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
 const leafs=root=>[...root.querySelectorAll('*')].filter(x=>x.children.length===0);
 const field=(root,needle)=>{const el=[...root.querySelectorAll('input,textarea')].find(x=>norm(x.placeholder||'').includes(norm(needle)));return String(el?.value||'').trim()};
 async function products(){
   if(productCache)return productCache;
   const r=await fetch(API+'/api/store/products?checkout=capture-v4',{cache:'no-store'});
   if(!r.ok)throw new Error('No pude leer el catálogo de la Tienda.');
   const j=await r.json();
   productCache=Array.isArray(j)?j:(j.products||j.items||j.data||[]);
   return productCache;
 }
 function productName(p){return String(p?.name||p?.nombre||p?.title||p?.product_name||'').trim()}
 function findProduct(catalog,visibleName){
   const a=norm(visibleName); if(!a)return null;
   let p=catalog.find(x=>norm(productName(x))===a); if(p)return p;
   p=catalog.find(x=>{const b=norm(productName(x));return b&&(a.includes(b)||b.includes(a))}); if(p)return p;
   const aw=a.split(' ').filter(Boolean);
   let best=null,bestScore=0;
   for(const x of catalog){const bw=norm(productName(x)).split(' ').filter(Boolean);if(!bw.length)continue;const score=bw.filter(w=>aw.includes(w)).length/Math.max(bw.length,aw.length);if(score>bestScore){best=x;bestScore=score}}
   return bestScore>=0.6?best:null;
 }
 function cartRows(root){
   const out=[];
   const candidates=[...root.querySelectorAll('div,li')];
   for(const el of candidates){
     const t=text(el); if(!/Talle\s+[^·]+\s*·/i.test(t))continue;
     if(!/[+＋]/.test(t)||!/[-−]/.test(t))continue;
     if([...el.children].some(c=>/Talle\s+[^·]+\s*·/i.test(text(c))&&/[+＋]/.test(text(c))&&/[-−]/.test(text(c))))continue;
     out.push(el);
   }
   return [...new Set(out)];
 }
 function visibleItem(row){
   const t=text(row);
   const sm=t.match(/Talle\s+([^·\s]+)/i); if(!sm)return null;
   const before=t.split(/Talle\s+/i)[0].trim();
   const name=before.replace(/\$\s*[\d\.]+(?:,\d+)?\s*$/,'').trim();
   const nums=leafs(row).map(x=>text(x)).filter(v=>/^\d{1,2}$/.test(v)).map(Number).filter(v=>v>0&&v<50);
   let qty=nums.length?nums[nums.length-1]:0;
   if(!qty){const q=t.match(/[-−]\s*(\d{1,2})\s*[+＋]/);if(q)qty=Number(q[1])}
   return name&&qty?{name,size:sm[1].trim(),qty}:null;
 }
 function submitForm(data){
   const f=document.createElement('form');f.method='POST';f.action=API+'/api/store/orders/submit';f.style.display='none';
   Object.entries(data).forEach(([k,v])=>{const i=document.createElement('input');i.type='hidden';i.name=k;i.value=v==null?'':String(v);f.appendChild(i)});
   document.body.appendChild(f);f.submit();
 }
 async function checkout(ev,btn){
   ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
   if(busy)return;busy=true;
   const old=btn.textContent;btn.disabled=true;btn.textContent='Enviando pedido…';
   try{
     const root=btn.closest('[role="dialog"]')||btn.closest('.modal')||btn.parentElement?.parentElement?.parentElement||document.body;
     const buyer_name=field(root,'nombre'),buyer_phone=field(root,'tel'),buyer_category=field(root,'categor'),buyer_note=field(root,'observ');
     if(!buyer_name||!buyer_phone)throw new Error('Completá nombre y teléfono.');
     const catalog=await products(),items=[];
     const parsed=cartRows(root).map(visibleItem).filter(Boolean);
     for(const x of parsed){const p=findProduct(catalog,x.name);if(p)items.push({product_id:Number(p.id),size:x.size,qty:x.qty})}
     if(!items.length)throw new Error('No pude identificar el producto del pedido.');
     submitForm({buyer_name,buyer_phone,buyer_category,buyer_note,items:JSON.stringify(items)});
   }catch(e){busy=false;btn.disabled=false;btn.textContent=old;alert(e?.message||'No se pudo registrar el pedido.')}
 }
 document.addEventListener('click',ev=>{
   const btn=ev.target?.closest?.('button');if(!btn||btn.disabled)return;
   if(/^Registrar y enviar por WhatsApp$/i.test(text(btn)))checkout(ev,btn);
 },true);
 window.__DEFE_STORE_CAPTURE_V4__='2026-09-11-product-match';
})();
