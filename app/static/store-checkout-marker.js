// El Defe · Evita cargar una segunda versión del checkout desde Railway
(function(){
  if(window.__defeStoreCheckoutMarkerLoaded)return;
  window.__defeStoreCheckoutMarkerLoaded=true;

  function mark(){
    const scripts=[...document.scripts];
    const checkout=scripts.find(s=>/store-checkout(?:-|\.js)/.test(s.src||''));
    if(!checkout)return false;
    checkout.dataset.defeStoreModule='store-checkout.js';
    checkout.dataset.storeCheckout='1';
    return true;
  }

  if(mark())return;
  const mo=new MutationObserver(()=>{if(mark())mo.disconnect();});
  mo.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>mo.disconnect(),10000);
})();
