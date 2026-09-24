(() => {
  const API='https://el-defe-v5-production.up.railway.app';
  const BASE=location.pathname.startsWith('/el-defe-app/')?'/el-defe-app/':'/';
  const SW=BASE+'push-sw.js';
  const ENABLED='defe_push_enabled_v1';
  const KEY='defe_push_vapid_key_v1';
  let busy=false,painting=false,actualPush=false;
  const jwt=()=>{for(const st of [localStorage,sessionStorage]){for(const k of ['defe:railway:session','defe_access_token','defe_token']){const v=st.getItem(k);if(v&&v.split('.').length===3)return v}for(let i=0;i<st.length;i++){const v=st.getItem(st.key(i));if(v&&v.split('.').length===3)return v}}return ''};

  const supported=()=>('serviceWorker' in navigator)&&('PushManager' in window)&&('Notification' in window);
  const b64ToBytes=s=>{const p='='.repeat((4-s.length%4)%4),b=(s+p).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(b),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out};
  const followed=()=>{try{return JSON.parse(localStorage.getItem('defe_followed_v1')||'[]')}catch{return []}};
  const pushOn=()=>supported()&&Notification.permission==='granted'&&(actualPush||localStorage.getItem(ENABLED)==='1');

  function isLegacy(el){const t=(el.textContent||'').replace(/\s+/g,' ').trim();if(!/^(🔔\s*)?(avisos activos|activar avisos)$/i.test(t))return false;if(el.closest('[data-defe-notifications-panel]'))return false;const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.position==='fixed'||r.bottom>window.innerHeight-220}
  function removeLegacyButton(){document.getElementById('defe-push-btn')?.remove();document.querySelectorAll('.defe-push-btn').forEach(el=>el.remove());[...document.querySelectorAll('button,a,div,span')].filter(isLegacy).forEach(el=>{const target=el.closest('button,a')||el;if(target.style.display!=='none'){target.style.setProperty('display','none','important');target.setAttribute('aria-hidden','true')}})}

  async function cleanupLegacyPushWorkers(){
    if(!('serviceWorker' in navigator))return;
    try{
      const regs=await navigator.serviceWorker.getRegistrations();
      for(const reg of regs){
        const urls=[reg.active?.scriptURL,reg.waiting?.scriptURL,reg.installing?.scriptURL].filter(Boolean);
        const current=urls.some(u=>{try{const x=new URL(u);return x.origin===location.origin&&x.pathname===BASE+'push-sw.js'}catch{return false}});
        if(current)continue;
        const legacy=urls.some(u=>{try{const x=new URL(u);return x.origin===location.origin&&(x.pathname.endsWith('/sw.js')||x.pathname.endsWith('/registerSW.js')||x.pathname.includes('firebase-messaging-sw'))}catch{return false}});
        if(legacy){
          try{
            const sub=await reg.pushManager?.getSubscription?.();
            if(sub)await retire(reg,sub);
          }catch(_){}
          await reg.unregister().catch(()=>{});
        }
      }
    }catch(e){console.warn('El Defe legacy push cleanup',e)}
  }
  async function registerPushSW(){await cleanupLegacyPushWorkers();const reg=await navigator.serviceWorker.register(SW,{scope:BASE,updateViaCache:'none'});await reg.update().catch(()=>{});return reg}
  async function detectActualPush(){
    if(!supported()||Notification.permission!=='granted'){actualPush=false;if(Notification.permission!=='granted')localStorage.removeItem(ENABLED);return false}
    try{
      const reg=await navigator.serviceWorker.getRegistration(BASE)||await navigator.serviceWorker.getRegistration();
      const sub=await reg?.pushManager?.getSubscription?.();
      if(sub){actualPush=true;localStorage.setItem(ENABLED,'1');return true}
    }catch(e){console.warn('El Defe push state',e)}
    actualPush=false;localStorage.removeItem(ENABLED);return false
  }
  async function retire(reg,sub){try{const j=sub?.toJSON?.();if(j?.endpoint&&j?.keys?.p256dh&&j?.keys?.auth){await fetch(API+'/api/notifications/push/unsubscribe',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+jwt()},body:JSON.stringify({endpoint:j.endpoint,keys:j.keys,followed:followed()})})}}catch(_){}try{await sub?.unsubscribe?.()}catch(_){}}
  async function sync(){if(!pushOn())return false;try{const kr=await fetch(API+'/api/notifications/push/public-key',{cache:'no-store'});if(!kr.ok)throw new Error('public-key '+kr.status);const {public_key}=await kr.json();const reg=await registerPushSW();let sub=await reg.pushManager.getSubscription();const oldKey=localStorage.getItem(KEY);if(sub&&oldKey&&oldKey!==public_key){await retire(reg,sub);sub=null}if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToBytes(public_key)});const j=sub.toJSON();const r=await fetch(API+'/api/notifications/push/subscribe',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+jwt()},body:JSON.stringify({endpoint:j.endpoint,keys:j.keys,followed:followed()})});if(!r.ok)throw new Error('subscribe '+r.status);actualPush=true;localStorage.setItem(KEY,public_key);localStorage.setItem(ENABLED,'1');paintPanel();return true}catch(e){console.warn('El Defe push sync',e);return false}}
  async function enable(){if(busy)return;busy=true;paintPanel('busy');try{if(!supported()){alert('Este dispositivo no soporta notificaciones push.');return}let p=Notification.permission;if(p!=='granted')p=await Notification.requestPermission();if(p!=='granted'){actualPush=false;localStorage.removeItem(ENABLED);return}localStorage.setItem(ENABLED,'1');const ok=await sync();if(ok){paintPanel();const reg=await registerPushSW();await reg.showNotification('Avisos de El Defe activados',{body:'Listo. Vas a recibir novedades del club aunque la app esté cerrada.',icon:BASE+'icon.png',badge:BASE+'icon.png',tag:'defe-push-ready',data:{url:BASE}}).catch(()=>{})}}finally{busy=false;paintPanel()}}

  function findPanelButton(){const direct=document.querySelector('[data-profe-push-card] [data-defe-push-enable]');if(direct)return direct;return [...document.querySelectorAll('button')].find(b=>{const t=(b.textContent||'').replace(/\s+/g,' ').trim();return /^(activar notificaciones del dispositivo|activando notificaciones…?|✓?\s*notificaciones activas)$/i.test(t)})}
  function findStatus(){const direct=document.querySelector('[data-profe-push-card] p');if(direct)return direct;return [...document.querySelectorAll('p,div,span')].find(el=>/los avisos todavía no están configurados|las notificaciones del dispositivo están activas|notificaciones están bloqueadas/i.test(el.textContent||'')&&el.children.length===0)}
  function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}
  function paintPanel(state){if(painting)return;painting=true;try{removeLegacyButton();const b=findPanelButton();if(!b)return false;b.setAttribute('data-defe-notifications-panel','1');if(!b.dataset.defePushBound){b.dataset.defePushBound='1';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();enable()})}if(!supported()){setText(b,'Notificaciones no disponibles');b.disabled=true;return true}if(state==='busy'&&!pushOn()){setText(b,'Activando notificaciones…');b.disabled=true;return true}b.disabled=false;const on=pushOn();setText(b,on?'✓ Notificaciones activas':'Activar notificaciones del dispositivo');const st=findStatus();if(st)setText(st,on?'Las notificaciones del dispositivo están activas. Recibirás los avisos según tus categorías y preferencias.':Notification.permission==='denied'?'Las notificaciones están bloqueadas en el dispositivo.':'Los avisos todavía no están configurados.');return true}finally{painting=false}}
  async function refreshState(){await detectActualPush();paintPanel();setTimeout(()=>paintPanel(),150)}
  function observePanel(){let timer=0;new MutationObserver(muts=>{if(!muts.some(m=>m.addedNodes&&m.addedNodes.length))return;clearTimeout(timer);timer=setTimeout(()=>{removeLegacyButton();refreshState()},80)}).observe(document.body,{childList:true,subtree:true});refreshState()}
  async function init(){removeLegacyButton();observePanel();await detectActualPush();if(Notification.permission==='granted')await sync();refreshState();document.addEventListener('defe:preferences-updated',()=>{sync();refreshState()});window.addEventListener('focus',refreshState);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshState()})}
  window.defeEnablePush=enable;window.defeSyncPush=()=>sync();window.defeRefreshPushState=refreshState;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();