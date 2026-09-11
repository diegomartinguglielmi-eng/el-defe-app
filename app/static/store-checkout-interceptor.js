// El Defe · Interceptor de checkout para la Tienda
(function(){
  let locked=false;
  function buyerMessage(text){
    const el=document.getElementById('storeBuyerMsg');
    if(el)el.textContent=text||'';
  }
  function isCheckoutButton(btn){
    if(!btn)return false;
    const body=document.getElementById('storeCartBody');
    const dialog=btn.closest?.('[role="dialog"]');
    if(!(body?.contains(btn)||dialog))return false;
    if(!document.getElementById('storeBuyerCard'))return false;
    const text=String(btn.textContent||'').replace(/\s+/g,' ').trim();
    return /Registrar.*WhatsApp|enviar.*WhatsApp|confirmar.*WhatsApp|Registrando/i.test(text);
  }
  async function runCheckout(){
    if(locked)return;
    locked=true;
    try{
      if(typeof window.defeStoreCheckout!=='function')throw new Error('El checkout no está disponible. Cerrá y volvé a abrir la app.');
      await window.defeStoreCheckout();
    }catch(err){
      console.error('[DEFE store checkout]',err);
      buyerMessage(err?.message||'No se pudo registrar el pedido. Intentá nuevamente.');
    }finally{
      locked=false;
    }
  }
  document.addEventListener('click',function(ev){
    const btn=ev.target?.closest?.('button');
    if(!isCheckoutButton(btn))return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    runCheckout();
  },true);
  window.__defeStoreCheckoutInterceptor='v1-20260911';
})();
