// El Defe · polish visual v1 · ajuste fino navegación
(() => {
  if (window.__defeDesignPolishV1) return;
  window.__defeDesignPolishV1 = true;
  const s=document.createElement('style');
  s.id='defe-design-polish-v1';
  s.textContent=`
    [data-defe-nav-item="1"].is-active:not([data-defe-nav-center="1"]),
    [data-defe-nav-item="1"][aria-current="page"]:not([data-defe-nav-center="1"]),
    [data-defe-nav-item="1"][data-active="true"]:not([data-defe-nav-center="1"]){color:#0d3f8a!important}
    [data-defe-nav-center="1"]{transform:translateY(-12px)!important}
    [data-defe-nav-center="1"]:before{top:28px!important;width:70px!important;height:70px!important;border-radius:22px!important;box-shadow:0 8px 20px rgba(19,50,94,.14)!important}
    [data-defe-nav-center="1"]>.defe-nav-icon{width:46px!important;height:46px!important;border-radius:16px!important;box-shadow:0 5px 13px rgba(13,63,138,.24)!important}
    [data-defe-nav-center="1"]>.defe-nav-icon .defe-nav-svg{width:24px!important;height:24px!important}
    [data-defe-nav-center="1"]>.defe-nav-label{margin-top:3px!important}
    @media(max-width:430px){[data-defe-nav-center="1"]{transform:translateY(-11px)!important}}
  `;
  document.head.appendChild(s);
})();
