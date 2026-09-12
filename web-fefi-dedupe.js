// El Defe · FEFI dedupe hardening 2026-09-12
(() => {
  const MARK='DEFE_FEFI_DEDUPE_20260912_V1';
  let timer=null;

  function removeDuplicateFefi(){
    const filter=document.getElementById('matchFilters');
    if(!filter)return;
    const fefi=filter.querySelector('[data-comp="FEFI"]');
    if(!fefi)return;
    const card=fefi.closest('.card')||filter;
    const mainImg=fefi.querySelector('img');
    const mainSrc=mainImg?.src||'';

    // Quita cualquier tile legacy con el mismo logo FEFI que no sea el selector real.
    card.querySelectorAll('img').forEach(img=>{
      if(img===mainImg)return;
      const sameSrc=!!mainSrc&&img.src===mainSrc;
      const saysFefi=/fefi/i.test(img.alt||'');
      if(!sameSrc&&!saysFefi)return;
      if(img.closest('[data-comp="FEFI"]'))return;
      const victim=img.closest('button,[role="button"],a')||img.parentElement;
      if(victim&&victim!==card)victim.remove();
    });

    // Si quedaron selectores repetidos con data-comp, conserva solo el primero.
    ['FEFI','LAAMBA','ARGENLIGA','SUPERLIGA'].forEach(comp=>{
      const nodes=[...filter.querySelectorAll(`[data-comp="${comp}"]`)];
      nodes.slice(1).forEach(n=>n.remove());
    });

    document.documentElement.dataset.defeFefiDedupe=MARK;
  }

  function schedule(){clearTimeout(timer);timer=setTimeout(removeDuplicateFefi,25);}
  function run(){
    removeDuplicateFefi();
    new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
