(()=>{
  'use strict';
  const API='https://el-defe-v5-production.up.railway.app';
  const MARK='DEFE_STORE_CAPTURE_V3';
  window[MARK]=true;

  const txt=el=>String(el?.textContent||'').replace(/\s+/g,' ').trim();
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  function findModal(btn){let p=btn;while(p&&p!==document.body){const t=txt(p);if(t.includes('Tu pedido')&&t.includes('Total'))return p;p=p.parentElement;}return btn.closest?.('[role="dialog"]')||null;}
  function inputs(modal){return [...modal.querySelectorAll('input')];}
  function valByPlaceholder(modal,needle){const n=norm(needle);const el=inputs(modal).find(i=>norm(i.placeholder||'').includes(n));return String(el?.value||'').trim();}
  function parseItems(modal){
    const out=[],seen=new Set();
    const rows=[...modal.querySelectorAll('div,li')].filter(d=>/Talle\s+[^·]+(?:\s*·|$)/i.test(txt(d)));
    rows.sort((a,b)=>txt(a).length-txt(b).length);
    for(const d of rows){
      const line=txt(d),m=line.match(/Talle\s+([^·\n]+?)(?:\s*·|$)/i);if(!m)continue;
      let row=d;for(let i=0;i<3&&row?.parentElement;i++){if(txt(row).length>line.length&&/Talle/i.test(txt(row)))row=row.parentElement;else break;}
      const full=txt(row||d),size=m[1].trim();
      const name=full.split(/Talle\s+/i)[0].replace(/^[×x]\s*\d+\s*/,'').trim();
      if(!name||!size)continue;
      const key=norm(name)+'|'+norm(size);if(seen.has(key))continue;seen.add(key);
      let qty=1;
      const nums=[...(row||d).querySelectorAll('button,span,b,strong')].map(x=>Number(txt(x))).filter(n=>Number.isInteger(n)&&n>0&&n<100);if(nums.length)qty=nums[nums.length-1];
      out.push({name,size,qty});
    }
    return out;
  }
  async function catalog(){const r=await fetch(API+'/api/store/products?buyer=live-v3',{cache:'no-store'});const j=await r.json().catch(()=>[]);if(!r.ok)throw new Error(j.detail||'No se pudo leer el catálogo');return Array.isArray(j)?j:(j.products||j.items||[]);}
  function findProduct(list,name){const n=norm(name);let p=list.find(x=>norm(x.name||x.nombre)===n);if(p)return p;p=list.find(x=>n.includes(norm(x.name||x.nombre))||norm(x.name||x.nombre).includes(n));if(p)return p;const words=n.split(' ').filter(w=>w.length>2);let best=null,score=0;for(const x of list){const xn=norm(x.name||x.nombre),hit=words.filter(w=>xn.includes(w)).length,sc=words.length?hit/words.length:0;if(sc>score){score=sc;best=x;}}return score>=0.6?best:null;}
  async function submit(btn,modal){
    const buyer_name=valByPlaceholder(modal,'nombre'),buyer_phone=valByPlaceholder(modal,'tel'),buyer_category=valByPlaceholder(modal,'categor'),buyer_note=valByPlaceholder(modal,'observ');
    if(!buyer_name||!buyer_phone)throw new Error('Completá nombre y teléfono.');
    btn.disabled=true;const old=btn.innerHTML;btn.textContent='Registrando…';
    try{
      const parsed=parseItems(modal);if(!parsed.length)throw new Error('No pude leer los productos del pedido.');
      const list=await catalog();
      const items=parsed.map(x=>{const p=findProduct(list,x.name);if(!p)throw new Error('Producto no encontrado en catálogo: '+x.name);return {product_id:Number(p.id),slug:p.slug||'',product_name:p.name||x.name,size:x.size,qty:x.qty};});
      const form=document.createElement('form');form.method='POST';form.action=API+'/api/store/orders/submit';form.style.display='none';
      const data={buyer_name,buyer_phone,buyer_category,buyer_note,items:JSON.stringify(items)};
      for(const [k,v] of Object.entries(data)){const i=document.createElement('input');i.type='hidden';i.name=k;i.value=v==null?'':String(v);form.appendChild(i);}document.body.appendChild(form);form.submit();
    }catch(e){console.error(MARK,e);btn.disabled=false;btn.innerHTML=old;alert(e?.message||'No se pudo registrar el pedido.');}
  }
  document.addEventListener('click',e=>{const btn=e.target?.closest?.('button');if(!btn)return;const label=txt(btn);if(!/Registrar.*WhatsApp|Finalizar pedido por WhatsApp/i.test(label))return;const modal=findModal(btn);if(!modal)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();submit(btn,modal);},true);
})();
