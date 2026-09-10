// El Defe · Aísla cualquier checkout legacy del flujo oficial de Tienda
(function(){
  if(window.__defeStoreUiShieldLoaded)return;
  window.__defeStoreUiShieldLoaded=true;

  function isLegacyCheckoutScript(node){
    if(!node||node.tagName!=='SCRIPT')return false;
    const src=String(node.src||node.getAttribute?.('src')||'');
    if(!/\/static\/store-checkout\.js(?:\?|$)/i.test(src))return false;
    return !/store-checkout-[a-f0-9_-]+\.js(?:\?|$)/i.test(src);
  }

  function officialCheckoutPresent(){
    return typeof window.defeStoreCheckout==='function'||
      !!document.querySelector('script[data-store-checkout="1"],script[data-defe-store-module="store-checkout.js"]');
  }

  const nativeAppend=Element.prototype.appendChild;
  if(!nativeAppend.__defeStoreCheckoutShield){
    const wrapped=function(node){
      if(isLegacyCheckoutScript(node)&&officialCheckoutPresent()){
        try{node.dataset.defeBlockedLegacyCheckout='1';}catch(_){}
        queueMicrotask(()=>node.dispatchEvent(new Event('load')));
        return node;
      }
      return nativeAppend.call(this,node);
    };
    wrapped.__defeStoreCheckoutShield=true;
    Element.prototype.appendChild=wrapped;
  }

  function neutralizeLegacyOrder(){
    if(typeof window.defeStoreCheckout!=='function')return;
    const legacy=window.defeStoreOrder;
    if(typeof legacy==='function'&&!legacy.__defeOfficialCheckoutBridge){
      const bridge=function(){return window.defeStoreCheckout.apply(this,arguments)};
      bridge.__defeOfficialCheckoutBridge=true;
      window.defeStoreOrder=bridge;
    }
  }

  const obs=new MutationObserver(()=>neutralizeLegacyOrder());
  obs.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('load',neutralizeLegacyOrder);
  setTimeout(neutralizeLegacyOrder,0);
  setTimeout(neutralizeLegacyOrder,500);
  setInterval(neutralizeLegacyOrder,3000);
})();