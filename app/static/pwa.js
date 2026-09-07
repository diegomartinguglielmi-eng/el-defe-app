(function(){
  let deferredPrompt=null;
  const canSW='serviceWorker' in navigator;
  const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;

  async function registerSW(){
    if(!canSW)return;
    try{await navigator.serviceWorker.register('/sw.js',{scope:'/'});}catch(e){console.warn('SW registration failed',e);}
  }

  function paintInstallState(){
    const btn=document.getElementById('installAppBtn');
    const msg=document.getElementById('installAppMsg');
    if(!btn)return;
    if(isStandalone()){
      btn.textContent='El Defe está instalado';btn.disabled=true;
      if(msg)msg.textContent='Ya estás usando El Defe como aplicación.';
      return;
    }
    if(deferredPrompt){btn.textContent='Instalar El Defe';btn.disabled=false;if(msg)msg.textContent='';return;}
    btn.textContent='Abrir El Defe';btn.disabled=false;
    if(msg)msg.textContent='Si Chrome muestra “Abrir El Defe”, la aplicación ya está instalada en este dispositivo.';
  }

  function ensureInstallCard(){
    const main=document.querySelector('#profile .main');
    if(!main)return;
    if(document.getElementById('installAppCard')){paintInstallState();return;}
    const card=document.createElement('div');
    card.className='card';card.id='installAppCard';
    card.innerHTML='<div class="row"><b>El Defe en tu teléfono</b><span class="badge">ANDROID</span></div><div class="meta">Instalá o abrí El Defe como aplicación, sin la barra del navegador.</div><button id="installAppBtn" class="btn" style="margin-top:10px">Comprobar instalación</button><div id="installAppMsg" class="meta"></div>';
    main.appendChild(card);
    const btn=document.getElementById('installAppBtn');
    btn.onclick=async()=>{
      const msg=document.getElementById('installAppMsg');
      if(isStandalone()){paintInstallState();return;}
      if(deferredPrompt){
        deferredPrompt.prompt();
        const choice=await deferredPrompt.userChoice.catch(()=>null);
        if(choice?.outcome==='accepted'){if(msg)msg.textContent='Instalación aceptada. Abrí El Defe desde su ícono.';}
        deferredPrompt=null;setTimeout(paintInstallState,500);return;
      }
      if(msg)msg.textContent='La aplicación ya puede estar instalada. En Chrome: menú ⋮ → Abrir El Defe. Si esa opción no aparece, usá “Agregar a pantalla principal”.';
    };
    paintInstallState();
  }

  function init(){
    registerSW();setTimeout(ensureInstallCard,250);
    const oldShow=window.show;
    if(typeof oldShow==='function'&&!oldShow.__pwa){
      const wrapped=function(id){const r=oldShow.apply(this,arguments);if(id==='profile')setTimeout(ensureInstallCard,0);return r};
      wrapped.__pwa=true;window.show=wrapped;
    }
  }

  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;ensureInstallCard();paintInstallState();});
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;ensureInstallCard();paintInstallState();});
  window.matchMedia('(display-mode: standalone)').addEventListener?.('change',paintInstallState);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
