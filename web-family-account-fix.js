(()=>{
  function visible(el){return !!(el&&el.isConnected&&el.getClientRects().length)}
  function findLogout(){return [...document.querySelectorAll('button')].find(b=>visible(b)&&/^Cerrar sesión$/i.test((b.textContent||'').trim()))||null}
  function patch(){
    const logout=findLogout();if(!logout)return;
    const parent=logout.parentElement;if(!parent||parent.querySelector('[data-defe-my-children-native]'))return;
    const text=(parent.parentElement?.textContent||parent.textContent||'');if(!/SESIÓN ACTIVA/i.test(text)&&!/@/.test(text))return;
    const b=document.createElement('button');b.type='button';b.dataset.defeMyChildrenNative='1';b.textContent='Mis hijos';
    const cs=getComputedStyle(logout);b.style.cssText=`display:block;box-sizing:border-box;width:100%;height:${Math.max(56,logout.getBoundingClientRect().height||0)}px;padding:14px 18px;border:1px solid #15589e;border-radius:${cs.borderRadius||'16px'};background:#fff;color:#17365d;font-family:${cs.fontFamily};font-size:${cs.fontSize};font-weight:800;margin:0 0 12px 0;cursor:pointer`;
    b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(window.DefeFamily&&typeof window.DefeFamily.open==='function'){window.DefeFamily.open()}else{console.error('DefeFamily no disponible')}});
    parent.insertBefore(b,logout);
  }
  document.addEventListener('click',()=>{setTimeout(patch,0);setTimeout(patch,80);setTimeout(patch,250)},true);
  new MutationObserver(()=>patch()).observe(document.body,{childList:true,subtree:true});
  setInterval(patch,300);patch();
})();
