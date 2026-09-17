(()=>{
  function visible(el){return !!(el&&el.isConnected&&el.getClientRects().length)}
  function norm(s){return String(s||'').replace(/\s+/g,' ').trim().toLowerCase()}
  function findLogout(){return [...document.querySelectorAll('button')].find(b=>visible(b)&&norm(b.textContent)==='cerrar sesión')||null}
  function patch(){
    const logout=findLogout();if(!logout)return;
    // La captura real confirmó que Cerrar sesión es el ancla estable del modal de cuenta.
    // No condicionamos por ancestros/textos porque React agrega wrappers intermedios.
    const host=logout.parentElement;if(!host)return;
    if(document.querySelector('[data-defe-my-children-native="1"]'))return;
    const b=document.createElement('button');
    b.type='button';b.dataset.defeMyChildrenNative='1';b.textContent='Mis hijos';
    const cs=getComputedStyle(logout),r=logout.getBoundingClientRect();
    b.style.cssText=`display:block;box-sizing:border-box;width:${r.width?Math.round(r.width)+'px':'100%'};max-width:100%;min-height:${Math.max(56,Math.round(r.height||0))}px;padding:14px 18px;border:1px solid #15589e;border-radius:${cs.borderRadius||'16px'};background:#fff;color:#17365d;font-family:${cs.fontFamily};font-size:${cs.fontSize};font-weight:800;margin:0 0 12px 0;cursor:pointer`;
    b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(window.DefeFamily&&typeof window.DefeFamily.open==='function')window.DefeFamily.open();else window.dispatchEvent(new CustomEvent('defe:open-family'))});
    logout.insertAdjacentElement('beforebegin',b);
  }
  document.addEventListener('click',()=>{queueMicrotask(patch);setTimeout(patch,40);setTimeout(patch,150);setTimeout(patch,400)},true);
  new MutationObserver(patch).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(patch,250);patch();
})();
