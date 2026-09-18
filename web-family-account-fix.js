(()=>{
  // Compatibilidad del modal Mi cuenta: nunca elimina el acceso a Mis hijos.
  function visible(el){return !!(el&&el.isConnected&&el.getClientRects().length)}
  function norm(s){return String(s||'').replace(/\\s+/g,' ').trim().toLowerCase()}
  function patch(){
    const buttons=[...document.querySelectorAll('button')].filter(visible);
    if(buttons.some(b=>norm(b.textContent)==='mis hijos'))return;
    const logout=buttons.find(b=>/cerrar sesi[oó]n/i.test(b.textContent||''));
    if(!logout||!window.DefeFamily?.open)return;
    const b=document.createElement('button');b.dataset.defeMyChildrenNative='1';b.textContent='Mis hijos';
    b.style.cssText='display:block;width:100%;padding:15px;border:1px solid #15589e;border-radius:16px;background:#fff;color:#17365d;font-weight:800;font-size:17px;margin:10px 0';
    b.onclick=e=>{e.preventDefault();e.stopPropagation();window.DefeFamily.open()};logout.before(b);
  }
  document.addEventListener('click',()=>{queueMicrotask(patch);setTimeout(patch,50)},true);
  new MutationObserver(patch).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(patch,700);patch();
})();
