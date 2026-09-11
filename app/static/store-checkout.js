// El Defe · checkout robusto de Tienda
(function(){
 const API='https://el-defe-v5-production.up.railway.app';
 let busy=false, productCache=null;
 const text=el=>String(el?.textContent||'').replace(/\s+/g,' ').trim();
 const leafs=root=>[...root.querySelectorAll('*')].filter(x=>x.children.length===0);
 const field=(root,needle)=>{const el=[...root.querySelectorAll('input,textarea')].find(x=>String(x.placeholder||'').toLowerCase().includes(needle));return String(el?.value||'').trim()};
 async function products(){
   if(productCache)return productCache;
   const r=await fetch(API+'/api/store/products?checkout=capture-v3',{cache:'no-store'});
   if(!r.ok)throw new Error('No pude leer el catálogo de la Tienda.');
   productCache=await r.json();return productCache;
 }
 function itemBox(root,name){
   const exact=leafs(root).find(x=>text(x)===name);if(!exact)return null;
   let n=exact;
   for(let i=0;i<8&&n&&n!==root;i++,n=n.parentElement){const t=text(n);if(/Talle\s+/i.test(t)&&/[+＋]/.test(t)&&/[-−]/.test(t))return n}
   return exact.parentElement;
 }
 function parseItem(box,p){
   const t=text(box),sm=t.match(/Talle\s+([^·\s]+)/i);if(!sm)return null;
   const nums=leafs(box).map(x=>text(x)).filter(v=>/^\d{1,2}$/.test(v)).map(Number).filter(v=>v>0&&v<50);
   let qty=nums.length?nums[nums.length-1]:0;
   if(!qty){const q=t.match(/[-−]\s*(\d{1,2})\s*[+＋]/);if(q)qty=Number(q[1])}
   return qty?{product_id:Number(p.id),size:sm[1].trim(),qty}:null;
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
     const root=btn.closest('[role="dialog"]')||btn.parentElement?.parentElement?.parentElement||document.body;
     const buyer_name=field(root,'nombre y apellido'),buyer_phone=field(root,'teléfono'),buyer_category=field(root,'categoría'),buyer_note=field(root,'observ');
     if(!buyer_name||!buyer_phone)throw new Error('Completá nombre y teléfono.');
     const ps=await products(),items=[];
     for(const p of ps){const box=itemBox(root,String(p.name||''));if(!box)continue;const it=parseItem(box,p);if(it)items.push(it)}
     if(!items.length)throw new Error('No pude identificar el producto del pedido.');
     submitForm({buyer_name,buyer_phone,buyer_category,buyer_note,items:JSON.stringify(items)});
   }catch(e){busy=false;btn.disabled=false;btn.textContent=old;alert(e?.message||'No se pudo registrar el pedido.')}
 }
 document.addEventListener('click',ev=>{
   const btn=ev.target?.closest?.('button');if(!btn||btn.disabled)return;
   if(/^Registrar y enviar por WhatsApp$/i.test(text(btn)))checkout(ev,btn);
 },true);
 window.__DEFE_STORE_CAPTURE_V3__='2026-09-11-1455';
})();
