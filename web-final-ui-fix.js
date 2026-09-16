// DEFE_FINAL_UI_FIX_20260916_V1
(() => {
  if(window.__defeFinalUiFixV1)return; window.__defeFinalUiFixV1=true;
  const trophy='<svg class="defe-nav-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v4.2c0 3-1.6 5.3-4 6.4-2.4-1.1-4-3.4-4-6.4z"/><path d="M8 6H5.5v1.6c0 2.2 1.4 3.7 3.5 4.1M16 6h2.5v1.6c0 2.2-1.4 3.7-3.5 4.1M12 14.6V18M8.5 20h7"/></svg>';
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  function style(){
    if(document.getElementById('defe-final-ui-fix-style'))return;
    const s=document.createElement('style');s.id='defe-final-ui-fix-style';s.textContent=`
      .defe-goal-icon{display:none!important}
      [data-defe-nav-item="1"]>.defe-nav-icon{display:grid!important}
      [data-defe-nav-item="1"]>.defe-nav-icon .defe-nav-svg{display:block!important;width:28px!important;height:28px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.9!important;stroke-linecap:round!important;stroke-linejoin:round!important}
      #matchFilters [data-defe-final-leagues="1"]{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important;width:100%!important}
      #matchFilters [data-defe-final-leagues="1"]>[data-comp]{min-width:0!important;width:100%!important;overflow:hidden!important}
      #matchFilters [data-defe-final-leagues="1"]>[data-comp] img{display:block!important;max-width:100%!important;object-fit:contain!important}
      @media(max-width:430px){#matchFilters [data-defe-final-leagues="1"]{gap:7px!important}}
    `;document.head.appendChild(s);
  }
  function nav(){
    document.querySelectorAll('.defe-goal-icon').forEach(x=>x.remove());
    const candidates=[...document.querySelectorAll('button,a,[role="button"]')].filter(el=>clean(el.textContent)==='Competencias'&&el.getBoundingClientRect().bottom>innerHeight-180);
    candidates.forEach(el=>{
      el.classList.remove('defe-goal-nav');
      el.dataset.defeNavItem='1';el.dataset.defeNavRendered='final-competencias';
      const direct=[...el.children];
      direct.forEach(ch=>{if(!ch.classList.contains('defe-nav-icon')&&!ch.classList.contains('defe-nav-label'))ch.remove()});
      let icon=el.querySelector(':scope>.defe-nav-icon');if(!icon){icon=document.createElement('span');icon.className='defe-nav-icon';el.prepend(icon)}
      icon.innerHTML=trophy;
      let label=el.querySelector(':scope>.defe-nav-label');if(!label){label=document.createElement('span');label.className='defe-nav-label';el.append(label)}label.textContent='Competencias';
    });
  }
  function leagues(){
    const f=document.getElementById('matchFilters');if(!f)return;
    const all=[...f.querySelectorAll('[data-comp]')].filter(b=>!b.closest('#defe-competencias-ui'));
    if(!all.length)return;
    const wanted=['FEFI','LAAMBA','ARGENLIGA','SUPERLIGA'];
    const chosen={};
    for(const b of all){const k=String(b.dataset.comp||'').toUpperCase();if(wanted.includes(k)&&!chosen[k])chosen[k]=b}
    for(const b of all){const k=String(b.dataset.comp||'').toUpperCase();if(wanted.includes(k)&&chosen[k]!==b)b.style.setProperty('display','none','important')}
    const buttons=wanted.map(k=>chosen[k]).filter(Boolean);if(buttons.length<3)return;
    const parent=buttons[0].parentElement;if(!parent||!buttons.every(b=>b.parentElement===parent))return;
    parent.dataset.defeFinalLeagues='1';
    wanted.forEach(k=>{const b=chosen[k];if(b)parent.appendChild(b)});
  }
  let busy=false;function run(){if(busy)return;busy=true;requestAnimationFrame(()=>{busy=false;style();nav();leagues()})}
  function start(){run();new MutationObserver(run).observe(document.body,{childList:true,subtree:true});setInterval(run,1200)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
