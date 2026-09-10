(() => {
  const API='https://el-defe-v5-production.up.railway.app';
  const BASE='/el-defe-app/';
  const SW=BASE+'push-sw.js';
  const ENABLED='defe_push_enabled_v1';
  const KEY='defe_push_vapid_key_v1';
  let busy=false;

  const supported=()=>('serviceWorker' in navigator)&&('PushManager' in window)&&('Notification' in window);
  const b64ToBytes=s=>{const p='='.repeat((4-s.length%4)%4),b=(s+p).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(b),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out};
  const followed=()=>{try{return JSON.parse(localStorage.getItem('defe_followed_v1')||'[]')}catch{return []}};

  async function registerPushSW(){const reg=await navigator.serviceWorker.register(SW,{scope:BASE,updateViaCache:'none'});await reg.update().catch(()=>{});return reg}
  async function retire(reg,sub){try{const j=sub?.toJSON?.();if(j?.endpoint&&j?.keys?.p256dh&&j?.keys?.auth){await fetch(API+'/api/notifications/push/unsubscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:j.endpoint,keys:j.keys,followed:followed()})})}}catch(_){}try{await sub?.unsubscribe?.()}catch(_){}}

  async function sync(){
    if(!supported()||Notification.permission!=='granted'||localStorage.getItem(ENABLED)!=='1')return false;
    try{const kr=await fetch(API+'/api/notifications/push/public-key',{cache:'no-store'});if(!kr.ok)throw new Error('public-key '+kr.status);const {public_key}=await kr.json();const reg=await registerPushSW();let sub=await reg.pushManager.getSubscription();const oldKey=localStorage.getItem(KEY);if(sub&&oldKey&&oldKey!==public_key){await retire(reg,sub);sub=null}if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToBytes(public_key)});const j=sub.toJSON();const r=await fetch(API+'/api/notifications/push/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:j.endpoint,keys:j.keys,followed:followed()})});if(!r.ok)throw new Error('subscribe '+r.status);localStorage.setItem(KEY,public_key);localStorage.setItem(ENABLED,'1');paintPanel('on');return true}catch(e){console.warn('El Defe push sync',e);paintPanel('error');return false}
  }

  async function enable(){
    if(busy)return;busy=true;paintPanel('busy');
    try{if(!supported()){alert('Este dispositivo no soporta notificaciones push.');paintPanel('off');return}let p=Notification.permission;if(p!=='granted')p=await Notification.requestPermission();if(p!=='granted'){localStorage.removeItem(ENABLED);paintPanel('blocked');return}localStorage.setItem(ENABLED,'1');const ok=await sync();if(ok){const reg=await navigator.serviceWorker.ready;await reg.showNotification('Avisos de El Defe activados',{body:'Listo. Vas a recibir novedades del club aunque la app esté cerrada.',icon:BASE+'icon.png',badge:BASE+'icon.png',tag:'defe-push-ready',data:{url:BASE}}).catch(()=>{})}}
    finally{busy=false;paintPanel()}
  }

  function findPanelButton(){return [...document.querySelectorAll('button')].find(b=>/activar notificaciones del dispositivo/i.test(b.textContent||'')||/avisos activos/i.test(b.textContent||''))}
  function findStatus(){return [...document.querySelectorAll('p,div,span')].find(el=>/los avisos todavía no están configurados/i.test(el.textContent||'')&&el.children.length===0)}
  function paintPanel(state){
    const b=findPanelButton();if(!b)return false;
    b.onclick=e=>{e.preventDefault();e.stopPropagation();enable()};
    if(!supported()){b.textContent='Notificaciones no disponibles';b.disabled=true;return true}
    if(state==='busy'){b.textContent='Activando notificaciones…';b.disabled=true;return true}
    b.disabled=false;
    const on=Notification.permission==='granted'&&localStorage.getItem(ENABLED)==='1';
    b.textContent=on?'✓ Notificaciones activas':'Activar notificaciones del dispositivo';
    const st=findStatus();if(st)st.textContent=on?'Las notificaciones del dispositivo están activas. Recibirás los avisos según tus categorías y preferencias.':Notification.permission==='denied'?'Las notificaciones están bloqueadas en el dispositivo.':'Los avisos todavía no están configurados.';
    return true
  }

  function observePanel(){
    const mo=new MutationObserver(()=>paintPanel());mo.observe(document.body,{childList:true,subtree:true});paintPanel()
  }

  async function init(){
    // Push queda integrado al panel nativo de Notificaciones: ya no se crea botón flotante.
    observePanel();
    if(Notification.permission==='granted'&&localStorage.getItem(ENABLED)==='1')await sync();
    document.addEventListener('defe:preferences-updated',()=>sync());
  }

  window.defeEnablePush=enable;
  window.defeSyncPush=()=>sync();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();