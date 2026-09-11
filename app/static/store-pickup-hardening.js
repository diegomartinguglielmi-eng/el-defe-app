// El Defe · Blindaje de modalidad única de retiro
(function(){
  if(window.__defeStorePickupHardeningLoaded)return;
  window.__defeStorePickupHardeningLoaded=true;

  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  const OLD=new Set(['por la sede','en el predio','retiro en sede','retiro en el predio']);
  const isOld=t=>OLD.has(norm(t));

  function closestControl(el){
    if(!el)return null;
    return el.closest('button,label,[role="button"],[role="radio"],.chip,.option,.toggle')||el;
  }
  function checkoutRoot(el){
    return el?.closest?.('[role="dialog"]')||el?.closest?.('.modal')||el?.closest?.('#storeCart')||el?.closest?.('#storeCartBody')||document.body;
  }
  function ensureForRoot(root){
    if(!root)return;
    const controls=[];
    root.querySelectorAll('button,label,[role="button"],[role="radio"],div,span').forEach(el=>{
      if(isOld(el.textContent))controls.push(closestControl(el));
    });
    const unique=[...new Set(controls)].filter(Boolean);
    if(!unique.length)return;

    let note=root.querySelector('.defe-pickup-only');
    if(!note){
      note=document.createElement('div');
      note.className='defe-pickup-only';
      note.setAttribute('data-defe-pickup','club-store');
      note.style.cssText='margin:10px 0;padding:12px 14px;border:1px solid #d7dce5;border-radius:12px;background:#fff;display:flex;flex-direction:column;gap:2px';
      note.innerHTML='<strong>Retiro por la Tienda del Club</strong><small>Única modalidad disponible actualmente.</small>';
      const first=unique[0];
      const parent=first.parentElement||root;
      parent.insertBefore(note,first);
    }
    unique.forEach(el=>{if(el&&el!==note&&el.isConnected)el.remove()});
  }
  function ensure(){
    const oldNodes=[...document.querySelectorAll('button,label,[role="button"],[role="radio"],div,span')].filter(el=>isOld(el.textContent));
    if(oldNodes.length){
      const roots=[...new Set(oldNodes.map(checkoutRoot).filter(Boolean))];
      roots.forEach(ensureForRoot);
    }
    document.querySelectorAll('[role="dialog"],#storeCart,#storeCartBody,.modal').forEach(ensureForRoot);
  }

  const mo=new MutationObserver(()=>queueMicrotask(ensure));
  function init(){
    mo.observe(document.body,{childList:true,subtree:true,characterData:true});
    ensure();
    [50,150,350,700,1200,2000].forEach(ms=>setTimeout(ensure,ms));
    setInterval(ensure,2000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
