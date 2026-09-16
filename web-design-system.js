// El Defe · Design System overlay v1 · navegación e iconografía unificadas
(() => {
  if (window.__defeDesignSystemV1) return;
  window.__defeDesignSystemV1 = true;

  const ICONS = {
    inicio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-5v-6h-5v6h-5A1.5 1.5 0 0 1 3 19.5z"/></svg>',
    competencias: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 8v8M16 8v8M3 12h5M16 12h5"/><circle cx="12" cy="12" r="2.2"/></svg>',
    midefe: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 19 6v5.6c0 4.4-2.7 7.6-7 9.9-4.3-2.3-7-5.5-7-9.9V6z"/></svg>',
    comunidad: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    tienda: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    mensaje: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4.5 7 7.5 6 7.5-6"/></svg>'
  };

  function injectCss(){
    if(document.getElementById('defe-design-system-v1')) return;
    const s=document.createElement('style');
    s.id='defe-design-system-v1';
    s.textContent=`
      :root{
        --defe-blue:#0d3f8a;--defe-blue-dark:#0a2f69;--defe-blue-soft:#eaf1fb;
        --defe-text:#173156;--defe-muted:#7e8ca3;--defe-border:#dfe6f1;--defe-white:#fff;
        --defe-shadow:0 10px 28px rgba(20,45,90,.16);--defe-shadow-soft:0 4px 14px rgba(20,45,90,.10);
      }
      [data-defe-nav-item="1"]{position:relative!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:5px!important;min-width:0!important;padding:8px 4px 10px!important;color:inherit!important;overflow:visible!important}
      [data-defe-nav-item="1"] svg:not(.defe-nav-svg){display:none!important}
      [data-defe-nav-item="1"] img:not(.defe-nav-img){display:none!important}
      .defe-nav-icon{width:28px;height:28px;display:grid;place-items:center;flex:none;color:currentColor}
      .defe-nav-icon svg{display:block!important;width:28px;height:28px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
      .defe-nav-label{font-size:12px!important;font-weight:650!important;line-height:1!important;letter-spacing:-.01em;white-space:nowrap}
      [data-defe-nav-item="1"]:not([data-defe-nav-center="1"]){color:#8996aa!important}
      [data-defe-nav-item="1"].is-active:not([data-defe-nav-center="1"]),
      [data-defe-nav-item="1"][aria-current="page"]:not([data-defe-nav-center="1"]),
      [data-defe-nav-item="1"][data-active="true"]:not([data-defe-nav-center="1"]){color:var(--defe-blue)!important}
      [data-defe-nav-item="1"]:not([data-defe-nav-center="1"]).is-active:before,
      [data-defe-nav-item="1"]:not([data-defe-nav-center="1"])[aria-current="page"]:before,
      [data-defe-nav-item="1"]:not([data-defe-nav-center="1"])[data-active="true"]:before{content:"";position:absolute;top:-8px;left:50%;transform:translateX(-50%);width:46px;height:3px;background:var(--defe-blue);border-radius:999px}

      [data-defe-nav-center="1"]{transform:translateY(-18px)!important;z-index:12!important;color:var(--defe-blue-dark)!important}
      [data-defe-nav-center="1"]:before{content:""!important;position:absolute!important;left:50%!important;top:42%!important;transform:translate(-50%,-50%)!important;width:78px!important;height:78px!important;border-radius:24px!important;background:var(--defe-white)!important;border:1px solid var(--defe-border)!important;box-shadow:var(--defe-shadow)!important;z-index:-1!important}
      [data-defe-nav-center="1"] .defe-nav-icon{width:54px;height:54px;border-radius:18px;background:linear-gradient(180deg,var(--defe-blue),var(--defe-blue-dark));color:#fff;box-shadow:0 6px 16px rgba(13,63,138,.28);border:3px solid #fff}
      [data-defe-nav-center="1"] .defe-nav-icon svg{width:28px;height:28px;stroke-width:1.8}
      [data-defe-nav-center="1"] .defe-nav-label{font-size:12px!important;font-weight:800!important;margin-top:5px;color:var(--defe-blue-dark)!important}

      .dc-fab{width:58px!important;height:58px!important;right:16px!important;bottom:96px!important;padding:0!important;border-radius:999px!important;background:linear-gradient(180deg,#184fa1,#0d3f8a)!important;box-shadow:var(--defe-shadow)!important;display:grid!important;place-items:center!important}
      .dc-fab .dc-icon{display:grid!important;place-items:center!important;width:24px;height:24px;font-size:0!important}
      .dc-fab .dc-icon svg{width:24px;height:24px;fill:none;stroke:#fff;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
      .dc-fab .dc-label{display:none!important}
      .dc-fab .dc-badge{position:absolute!important;right:-2px!important;top:-4px!important}

      button[aria-label="Cerrar"],button[data-close],.md-close,.dc-close{transition:transform .12s ease,background .12s ease}
      button[aria-label="Cerrar"]:active,button[data-close]:active,.md-close:active,.dc-close:active{transform:scale(.96)}

      @media(max-width:430px){
        [data-defe-nav-item="1"]{gap:4px!important;padding-left:2px!important;padding-right:2px!important}
        .defe-nav-label{font-size:11.5px!important}
        [data-defe-nav-center="1"]{transform:translateY(-16px)!important}
        [data-defe-nav-center="1"]:before{width:74px!important;height:74px!important;border-radius:22px!important}
        [data-defe-nav-center="1"] .defe-nav-icon{width:50px;height:50px;border-radius:17px}
      }
    `;
    document.head.appendChild(s);
  }

  function exactLabel(el){return String(el?.textContent||'').replace(/\s+/g,' ').trim()}
  function bottomCandidate(label){
    const nodes=[...document.querySelectorAll('button,a,[role="button"]')];
    return nodes.find(el=>{
      if(el.closest('#defe-mi-defe,#defe-mi-defe-config,[data-defe-login-modal],[data-defe-account-modal]')) return false;
      const txt=exactLabel(el);
      if(txt!==label) return false;
      const r=el.getBoundingClientRect();
      return r.bottom>window.innerHeight-170;
    })||null;
  }

  function renderItem(el,key,label,center=false){
    if(!el) return;
    el.dataset.defeNavItem='1';
    if(center) el.dataset.defeNavCenter='1'; else delete el.dataset.defeNavCenter;
    if(el.dataset.defeNavRendered===key) return;
    el.dataset.defeNavRendered=key;
    el.innerHTML=`<span class="defe-nav-icon">${ICONS[key]}</span><span class="defe-nav-label">${label}</span>`;
  }

  function applyNav(){
    const mi=document.querySelector('[data-mi-defe-button="1"]');
    renderItem(bottomCandidate('Inicio'),'inicio','Inicio');
    renderItem(bottomCandidate('Competencias'),'competencias','Competencias');
    if(mi) renderItem(mi,'midefe','Mi Defe',true);
    else renderItem(bottomCandidate('Mi Defe'),'midefe','Mi Defe',true);
    renderItem(bottomCandidate('Comunidad'),'comunidad','Comunidad');
    renderItem(bottomCandidate('Tienda'),'tienda','Tienda');
  }

  function applyFab(){
    const fab=document.querySelector('.dc-fab');
    if(!fab) return;
    const icon=fab.querySelector('.dc-icon');
    if(icon && !icon.dataset.defeDs){icon.dataset.defeDs='1';icon.innerHTML=ICONS.mensaje}
  }

  let scheduled=false;
  function schedule(){
    if(scheduled) return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;applyNav();applyFab()});
  }

  function start(){
    injectCss();schedule();
    const obs=new MutationObserver(schedule);
    obs.observe(document.body,{childList:true,subtree:true});
    setTimeout(schedule,300);setTimeout(schedule,1000);setTimeout(schedule,2500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
