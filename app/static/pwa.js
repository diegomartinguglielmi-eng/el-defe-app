(function(){
  let deferredPrompt=null;
  const canSW='serviceWorker' in navigator;

  async function registerSW(){
    if(!canSW)return;
    try{await navigator.serviceWorker.register('/static/sw.js',{scope:'/'});}catch(e){console.warn('SW registration failed',e);}
  }

  function ensureInstallCard(){
    const prefs=document.getElementById('prefsBox');
    if(!prefs||document.getElementById('installAppCard'))return;
    const card=document.createElement('div');
    card.className='card';card.id='installAppCard';
    card.innerHTML='<div class="row"><b>Instalar El Defe</b><span class="badge">ANDROID</span></div><div class="meta">Agregá El Defe a la pantalla de inicio para abrirlo como una app.</div><button id="installAppBtn" class="btn" style="margin-top:10px">Agregar a pantalla de inicio</button><div id="installAppMsg" class="meta"></div>';
    prefs.appendChild(card);
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

  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;ensureInstallCard();});
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;const m=document.getElementById('installAppMsg');if(m)m.textContent='El Defe ya está instalado en este dispositivo.';});
  document.addEventListener('DOMContentLoaded',()=>{registerSW();setTimeout(ensureInstallCard,250);});
})();
