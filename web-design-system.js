// El Defe · Design System overlay v2 · navegación e iconografía unificadas
(() => {
  if (window.__defeDesignSystemV2) return;
  window.__defeDesignSystemV2 = true;

  const ICONS={
    inicio:'<svg class="defe-nav-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.7 12 3.8l8.5 6.9v8.1a1.7 1.7 0 0 1-1.7 1.7h-4.4v-6.2H9.6v6.2H5.2a1.7 1.7 0 0 1-1.7-1.7z"/></svg>',
    competencias:'<svg class="defe-nav-svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.3"/><path d="M3 12h5m8 0h5M8 7.5v9M16 7.5v9"/><circle cx="12" cy="12" r="2.3"/></svg>',
    midefe:'<svg class="defe-nav-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.4 19 6v5.4c0 4.4-2.7 7.7-7 10-4.3-2.3-7-5.6-7-10V6z"/></svg>',
    comunidad:'<svg class="defe-nav-svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="16" rx="2.2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    tienda:'<svg class="defe-nav-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8.5h14l-1 11.5H6z"/><path d="M9 8.5V6.4a3 3 0 0 1 6 0v2.1"/></svg>',
    mensaje:'<svg class="defe-nav-svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.2"/><path d="m4.5 7 7.5 6 7.5-6"/></svg>'
  };

  function css(){
    let s=document.getElementById('defe-design-system-v2'); if(s)return;
    s=document.createElement('style');s.id='defe-design-system-v2';s.textContent=`
      :root{--defe-blue:#0d3f8a;--defe-blue-dark:#092f67;--defe-muted:#8a97aa;--defe-border:#dfe6f1;--defe-shadow:0 10px 26px rgba(19,50,94,.16)}
      [data-defe-nav-item="1"]{position:relative!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:5px!important;overflow:visible!important;color:var(--defe-muted)!important;padding:8px 3px 10px!important;min-width:0!important}
      [data-defe-nav-item="1"]>.defe-nav-icon{width:28px!important;height:28px!important;display:grid!important;place-items:center!important;color:currentColor!important;flex:none!important}
      [data-defe-nav-item="1"]>.defe-nav-icon .defe-nav-svg{display:block!important;width:28px!important;height:28px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.9!important;stroke-linecap:round!important;stroke-linejoin:round!important}
      [data-defe-nav-item="1"]>.defe-nav-label{display:block!important;font-size:12px!important;font-weight:650!important;line-height:1!important;white-space:nowrap!important;color:currentColor!important}
      [data-defe-nav-item="1"]>svg:not(.defe-nav-svg),[data-defe-nav-item="1"]>img,[data-defe-nav-item="1"]>.md-nav-label{display:none!important}
      [data-defe-nav-item="1"].is-active,[data-defe-nav-item="1"][aria-current="page"],[data-defe-nav-item="1"][data-active="true"]{color:var(--defe-blue)!important}
      [data-defe-nav-center="1"]{transform:translateY(-17px)!important;z-index:20!important;color:var(--defe-blue-dark)!important}
      [data-defe-nav-center="1"]:before{content:""!important;position:absolute!important;left:50%!important;top:30px!important;transform:translate(-50%,-50%)!important;width:76px!important;height:76px!important;border-radius:24px!important;background:#fff!important;border:1px solid var(--defe-border)!important;box-shadow:var(--defe-shadow)!important;z-index:-1!important}
      [data-defe-nav-center="1"]>.defe-nav-icon{width:52px!important;height:52px!important;border-radius:18px!important;background:linear-gradient(180deg,#164f9f,var(--defe-blue-dark))!important;color:#fff!important;border:3px solid #fff!important;box-shadow:0 6px 16px rgba(13,63,138,.28)!important}
      [data-defe-nav-center="1"]>.defe-nav-icon .defe-nav-svg{width:27px!important;height:27px!important;stroke-width:1.8!important}
      [data-defe-nav-center="1"]>.defe-nav-label{font-weight:800!important;color:var(--defe-blue-dark)!important;margin-top:4px!important}
      .dc-fab{width:56px!important;height:56px!important;right:16px!important;bottom:96px!important;padding:0!important;border-radius:999px!important;background:linear-gradient(180deg,#164f9f,var(--defe-blue-dark))!important;box-shadow:var(--defe-shadow)!important;display:grid!important;place-items:center!important}
      .dc-fab .dc-icon{display:grid!important;place-items:center!important;width:24px!important;height:24px!important;font-size:0!important}
      .dc-fab .dc-icon .defe-nav-svg{display:block!important;width:24px!important;height:24px!important;fill:none!important;stroke:#fff!important;stroke-width:1.9!important;stroke-linecap:round!important;stroke-linejoin:round!important}
      .dc-fab .dc-label{display:none!important}
      @media(max-width:430px){[data-defe-nav-item="1"]>.defe-nav-label{font-size:11.5px!important}[data-defe-nav-center="1"]{transform:translateY(-15px)!important}}
    `;document.head.appendChild(s);
  }

  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  function leaf(label){
    const all=[...document.querySelectorAll('span,div,p')].filter(el=>{
      if(el.closest('#defe-mi-defe,#defe-mi-defe-config,[data-defe-login-modal],[data-defe-account-modal]'))return false;
      if(clean(el.textContent)!==label)return false;
      const r=el.getBoundingClientRect();
      return r.bottom>innerHeight-150 && r.top>innerHeight-190;
    });
    return all.sort((a,b)=>a.childElementCount-b.childElementCount)[0]||null;
  }
  function navItem(label){
    const l=leaf(label); if(!l)return null;
    let el=l.closest('button,a,[role="button"]');
    if(el)return el;
    el=l;
    for(let i=0;i<4&&el.parentElement;i++){
      const p=el.parentElement,r=p.getBoundingClientRect();
      if(r.bottom>innerHeight-155 && r.height>=52 && r.height<=130 && r.width>=45 && r.width<=180)el=p; else break;
    }
    return el;
  }
  function render(el,key,label,center){
    if(!el)return;
    el.dataset.defeNavItem='1';
    if(center)el.dataset.defeNavCenter='1';else delete el.dataset.defeNavCenter;
    const sig='v2-'+key;
    if(el.dataset.defeNavRendered===sig && el.querySelector(':scope>.defe-nav-icon'))return;
    el.dataset.defeNavRendered=sig;
    el.innerHTML=`<span class="defe-nav-icon">${ICONS[key]}</span><span class="defe-nav-label">${label}</span>`;
  }
  function applyNav(){
    render(navItem('Inicio'),'inicio','Inicio',false);
    render(navItem('Competencias'),'competencias','Competencias',false);
    const mi=document.querySelector('[data-mi-defe-button="1"]')||navItem('Mi Defe');
    render(mi,'midefe','Mi Defe',true);
    render(navItem('Comunidad'),'comunidad','Comunidad',false);
    render(navItem('Tienda'),'tienda','Tienda',false);
  }
  function applyFab(){const f=document.querySelector('.dc-fab');if(!f)return;let i=f.querySelector('.dc-icon');if(!i){i=document.createElement('span');i.className='dc-icon';f.prepend(i)}i.innerHTML=ICONS.mensaje}
  let t=0;function run(){clearTimeout(t);t=setTimeout(()=>{applyNav();applyFab()},30)}
  function start(){css();run();new MutationObserver(run).observe(document.body,{childList:true,subtree:true});setInterval(run,1800)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
