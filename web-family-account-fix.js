(()=>{
  // El modal de cuenta ya incluye el acceso nativo a Mis hijos.
  // Este parche queda sólo como compatibilidad: nunca crea un segundo botón.
  function visible(el){return !!(el&&el.isConnected&&el.getClientRects().length)}
  function norm(s){return String(s||'').replace(/\s+/g,' ').trim().toLowerCase()}
  function patch(){
    const buttons=[...document.querySelectorAll('button')].filter(visible);
    const native=buttons.find(b=>norm(b.textContent)==='mis hijos'&&!b.dataset.defeMyChildrenNative);
    const injected=buttons.filter(b=>b.dataset.defeMyChildrenNative==='1');
    if(native){injected.forEach(b=>b.remove());return;}
    // No inyectar fallback: evita duplicados y deja como fuente única el acceso nativo.
    injected.forEach(b=>b.remove());
  }
  document.addEventListener('click',()=>{queueMicrotask(patch);setTimeout(patch,50)},true);
  new MutationObserver(patch).observe(document.documentElement,{childList:true,subtree:true});
  patch();
})();
