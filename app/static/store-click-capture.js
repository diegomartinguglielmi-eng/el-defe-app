// El Defe · checkout de Tienda V3
// Intercepta el click antes de React y envía el pedido por POST HTML tradicional.
(function(){
  const API='https://el-defe-v5-production.up.railway.app';
  let busy=false;

  function txt(el){return String(el?.textContent||'').replace(/\s+/g,' ').trim()}
  function valueByPlaceholder(root, needle){
    const el=[...root.querySelectorAll('input,textarea')].find(x=>String(x.placeholder||'').toLowerCase().includes(needle));
    return String(el?.value||'').trim();
  }
  function leaves(root){return [...root.querySelectorAll('*')].filter(x=>x.children.length===0)}

  function findItemBox(root,name){
    const exact=leaves(root).find(x=>txt(x)===name);
    if(!exact)return null;
    let n=exact;
    for(let i=0;i<7&&n&&n!==root;i++,n=n.parentElement){
      const t=txt(n);
      if(/Talle\s+/i.test(t)&&/[+＋]/.test(t)&&/[-−]/.test(t))return n;
    }
    return exact.parentElement;
  }

  function parseItem(box, product){
    const t=txt(box);
    const sm=t.match(/Talle\s+([^·\s]+)/i);
    const size=sm?sm[1].trim():'';
    let qty=0;
    const nums=leaves(box).map(x=>txt(x)).filter(v=>/^\d{1,2}$/.test(v)).map(Number).filter(v=>v>0&&v<50);
    if(nums.length)qty=nums[nums.length-1];
    if(!qty){
      const qm=t.match(/[-−]\s*(\d{1,2})\s*[+＋]/);
      if(qm)qty=Number(qm[1]);
    }
    return size&&qty?{product_id:Number(product.id),size,qty}:null;
  }

  async function intercept(ev,button){
    if(busy)return;
    ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
    busy=true;
    const old=button.textContent;
    button.disabled=true;button.textContent='Enviando pedido…';
    try{
      const root=button.closest('[role="dialog"]')||button.parentElement?.parentElement?.parentElement||document.body;
      const buyer_name=valueByPlaceholder(root,'nombre y apellido');
      const buyer_phone=valueByPlaceholder(root,'teléfono');
      const buyer_category=valueByPlaceholder(root,'categoría');
      const buyer_note=valueByPlaceholder(root,'observ');
      if(!buyer_name||!buyer_phone)throw new Error('Completá nombre y teléfono.');

      const res=await fetch(API+'/api/store/products?checkout=v3',{cache:'no-store'});
      if(!res.ok)throw new Error('No pude leer el catálogo de la Tienda.');
      const products=await res.json();
      const items=[];
      for(const p of products){
        const box=findItemBox(root,String(p.name||''));
        if(!box)continue;
        const item=parseItem(box,p);
        if(item)items.push(item);
      }
      if(!items.length)throw new Error('No pude identificar los productos del pedido.');

      const form=document.createElement('form');
      form.method='POST';form.action=API+'/api/store/orders/submit';form.style.display='none';
      const payload={buyer_name,buyer_phone,buyer_category,buyer_note,items:JSON.stringify(items)};
      Object.entries(payload).forEach(([name,val])=>{const input=document.createElement('input');input.type='hidden';input.name=name;input.value=val||'';form.appendChild(input)});
      document.body.appendChild(form);
      form.submit();
    }catch(err){
      busy=false;button.disabled=false;button.textContent=old;
      alert(err?.message||'No se pudo registrar el pedido.');
    }
  }

  document.addEventListener('click',function(ev){
    const button=ev.target?.closest?.('button');
    if(!button||button.disabled)return;
    const label=txt(button);
    if(!/^Registrar y enviar por WhatsApp$/i.test(label))return;
    intercept(ev,button);
  },true);

  window.__DEFE_STORE_CAPTURE_V3__='2026-09-11';
})();
