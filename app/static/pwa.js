(function(){
  let deferredPrompt=null;
  const canSW='serviceWorker' in navigator;

  async function registerSW(){
    if(!canSW)return;
    try{await navigator.serviceWorker.register('/sw.js',{scope:'/'});}catch(e){console.warn('SW registration failed',e);}
  }

  function ensureInstallCard(){
    const main=document.querySelector('#profile .main');
    if(!main||document.getElementById('installAppCard'))return;
    const card=document.createElement('div');
    card.className='card';card.id='installAppCard';
    card.innerHTML='<div class="row"><b>Instalar El Defe</b><span class="badge">ANDROID</span></div><div class="meta">Agregá El Defe a la pantalla de inicio para abrirlo como una app.</div><button id="installAppBtn" class="btn" style="margin-top:10px">Agregar a pantalla de inicio</button><div id="installAppMsg" class="meta"></div>';
    main.appendChild(card);
    const btn=document.getElementById('installAppBtn');
    btn.onclick=async()=>{
      const msg=document.getElementById('installAppMsg');
      if(!deferredPrompt){msg.textContent='Si no aparece el instalador, usá el menú del navegador → Agregar a pantalla principal.';return;}
      deferredPrompt.prompt();
      const choice=await deferredPrompt.userChoice.catch(()=>null);
      msg.textContent=choice?.outcome==='accepted'?'El Defe se agregó como app.':'Podés instalarlo más adelante desde este mismo lugar.';
      deferredPrompt=null;
    };
  }

  function init(){
    registerSW();setTimeout(ensureInstallCard,250);
    const oldShow=window.show;
    if(typeof oldShow==='function'&&!oldShow.__pwa){
      const wrapped=function(id){const r=oldShow.apply(this,arguments);if(id==='profile')setTimeout(ensureInstallCard,0);return r};
      wrapped.__pwa=true;window.show=wrapped;
    }
  }

  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;ensureInstallCard();});
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;const m=document.getElementById('installAppMsg');if(m)m.textContent='El Defe ya está instalado en este dispositivo.';});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
