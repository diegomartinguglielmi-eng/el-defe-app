(()=>{
  'use strict';
  const API='https://el-defe-v5-production.up.railway.app';
  const MARK='DEFE_STORE_CAPTURE_V2';
  window[MARK]=true;

  function txt(el){return (el?.textContent||'').trim();}
  function findModal(btn){
    let p=btn;
    while(p&&p!==document.body){
      if(txt(p).includes('Tu pedido')&&txt(p).includes('Total')) return p;
      p=p.parentElement;
    }
    return null;
  }
  function inputs(modal){return [...modal.querySelectorAll('input')];}
  function valByPlaceholder(modal,needle){
    const el=inputs(modal).find(i=>(i.placeholder||'').toLowerCase().includes(needle));
    return (el?.value||'').trim();
  }
  function parseItems(modal){
    const out=[];
    const rows=[...modal.querySelectorAll('div')].filter(d=>/Talle\s+[^·]+\s*·/.test(txt(d)));
    const seen=new Set();
    for(const d of rows){
      const line=txt(d); const m=line.match(/Talle\s+([^·]+)\s*·/); if(!m) continue;
      let row=d.parentElement; if(!row) continue;
      const name=txt(row.children?.[0]?.children?.[0])||txt(row).split('Talle')[0].trim();
      const size=m[1].trim();
      const key=name+'|'+size; if(seen.has(key)) continue; seen.add(key);
      let qty=1;
      const spans=[...row.querySelectorAll('span')];
      const q=spans.map(s=>txt(s)).find(v=>/^\d+$/.test(v)); if(q) qty=Number(q)||1;
      out.push({name,size,qty});
    }
    return out;
  }
  async function productMap(){
    const r=await fetch(API+'/api/store/products',{cache:'no-store'}); if(!r.ok) throw new Error('No se pudo leer catálogo');
    const j=await r.json(); const a=Array.isArray(j)?j:(j.products||j.items||[]);
    return a;
  }
  async function submit(btn,modal){
    const buyer_name=valByPlaceholder(modal,'nombre');
    const buyer_phone=valByPlaceholder(modal,'tel');
    const buyer_category=valByPlaceholder(modal,'categor');
    const buyer_note=valByPlaceholder(modal,'observ');
    if(!buyer_name||!buyer_phone) return;
    btn.disabled=true; const old=btn.innerHTML; btn.textContent='Registrando…';
    try{
      const parsed=parseItems(modal); if(!parsed.length) throw new Error('No pude leer los productos del pedido');
      const catalog=await productMap();
      const items=parsed.map(x=>{
        const p=catalog.find(p=>(p.name||p.nombre||'').trim()===x.name.trim());
        if(!p) throw new Error('Producto no encontrado: '+x.name);
        return {product_id:Number(p.id),size:x.size,qty:x.qty};
      });
      const form=document.createElement('form'); form.method='POST'; form.action=API+'/api/store/orders/submit'; form.style.display='none';
      const data={buyer_name,buyer_phone,buyer_category,buyer_note,items:JSON.stringify(items)};
      for(const [k,v] of Object.entries(data)){const i=document.createElement('input');i.type='hidden';i.name=k;i.value=v||'';form.appendChild(i)}
      document.body.appendChild(form); form.submit();
    }catch(e){
      console.error(MARK,e); btn.disabled=false; btn.innerHTML=old;
      alert('No pudimos registrar el pedido: '+(e?.message||'error desconocido'));
    }
  }
  document.addEventListener('click',e=>{
    const btn=e.target.closest('button'); if(!btn) return;
    if(!txt(btn).includes('Registrar y enviar por WhatsApp')) return;
    const modal=findModal(btn); if(!modal) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    submit(btn,modal);
  },true);
})();
