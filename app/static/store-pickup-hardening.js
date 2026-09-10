// El Defe · Blindaje de modalidad única de retiro
(function(){
  if(window.__defeStorePickupHardeningLoaded)return;
  window.__defeStorePickupHardeningLoaded=true;

  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  const isOld=t=>t==='por la sede'||t==='en el predio'||t==='retiro en sede'||t==='retiro en el predio';

  function targetFor(el){
    if(!el)return null;
    return el.closest('button,label,[role="button"],[role="radio"],.chip,.option,.toggle')||el;
  }

  function ensure(){
    const roots=[document.getElementById('storeCartBody'),document.getElementById('storeCart'),document.querySelector('[role="dialog"]')].filter(Boolean);
    for(const root of roots){
      const hits=[];
      root.querySelectorAll('button,label,[role="button"],[role="radio"],div,span').forEach(el=>{
        const t=norm(el.textContent);
        if(isOld(t))hits.push(targetFor(el));
      });
      const unique=[...new Set(hits)].filter(Boolean);
      if(!unique.length)continue;

      let note=root.querySelector('.defe-pickup-only');
      if(!note){
        note=document.createElement('div');
        note.className='defe-pickup-only';
        note.setAttribute('data-defe-pickup','club-store');
        note.innerHTML='<strong>Retiro por la Tienda del Club</strong><small>Única modalidad disponible actualmente.</small>';
        const first=unique[0];
        first.parentElement?.insertBefore(note,first);
      }
      unique.forEach(el=>{if(el!==note)el.remove();});
    }
  }

  const mo=new MutationObserver(ensure);
  function init(){
    mo.observe(document.body,{childList:true,subtree:true,characterData:true});
    ensure();
    setTimeout(ensure,150);
    setTimeout(ensure,500);
    setTimeout(ensure,1200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
