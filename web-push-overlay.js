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

  async function registerPushSW(){
    const reg=await navigator.serviceWorker.register(SW,{scope:BASE,updateViaCache:'none'});
    await reg.update().catch(()=>{});
    return reg;
  }

  async function retire(reg,sub){
    try{const j=sub?.toJSON?.();if(j?.endpoint&&j?.keys?.p256dh&&j?.keys?.auth){await fetch(API+'/api/notifications/push/unsubscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:j.endpoint,keys:j.keys,followed:followed()})})}}catch(_){}
    try{await sub?.unsubscribe?.()}catch(_){}
  }

  async function sync(force=false){
    if(!supported()||Notification.permission!=='granted'||localStorage.getItem(ENABLED)!=='1')return false;
    try{
      const kr=await fetch(API+'/api/notifications/push/public-key',{cache:'no-store'});
      if(!kr.ok)throw new Error('public-key '+kr.status);
      const {public_key}=await kr.json();
      const reg=await registerPushSW();
      let sub=await reg.pushManager.getSubscription();
      const oldKey=localStorage.getItem(KEY);
      if(sub&&oldKey&&oldKey!==public_key){await retire(reg,sub);sub=null}
      if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToBytes(public_key)});
      const j=sub.toJSON();
      const r=await fetch(API+'/api/notifications/push/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:j.endpoint,keys:j.keys,followed:followed()})});
      if(!r.ok)throw new Error('subscribe '+r.status);
      localStorage.setItem(KEY,public_key);
      localStorage.setItem(ENABLED,'1');
      paint('on');
      return true;
    }catch(e){console.warn('El Defe push sync',e);paint('error');return false}
  }

  async function enable(){
    if(busy)return;busy=true;paint('busy');
    try{
      if(!supported()){alert('Este navegador no soporta notificaciones push.');paint('off');return}
      let p=Notification.permission;
      if(p!=='granted')p=await Notification.requestPermission();
      if(p!=='granted'){localStorage.removeItem(ENABLED);paint('blocked');return}
      localStorage.setItem(ENABLED,'1');
      const ok=await sync(true);
      if(ok){
        const reg=await navigator.serviceWorker.ready;
        await reg.showNotification('Avisos de El Defe activados',{body:'Listo. Vas a recibir novedades del club aunque la app esté cerrada.',icon:BASE+'assets/icon-192.png',badge:BASE+'assets/icon-192.png',tag:'defe-push-ready',data:{url:BASE}}).catch(()=>{});
      }
    }finally{busy=false}
  }

  function ensureButton(){
    if(document.getElementById('defe-push-btn'))return;
    const s=document.createElement('style');s.textContent='.defe-push-btn{position:fixed;left:14px;bottom:78px;z-index:9997;border:0;border-radius:999px;padding:10px 13px;font-weight:800;box-shadow:0 5px 18px #0003;background:#fff;color:#40368f}.defe-push-btn.on{background:#e9f8ef;color:#176b39}.defe-push-btn.err{background:#fff4df;color:#8a5a00}';document.head.appendChild(s);
    const b=document.createElement('button');b.id='defe-push-btn';b.className='defe-push-btn';b.type='button';b.onclick=enable;document.body.appendChild(b);paint();
  }

  function paint(state){
    const b=document.getElementById('defe-push-btn');if(!b)return;
    if(!supported()){b.textContent='Avisos no disponibles';b.disabled=true;return}
    if(state==='busy'){b.textContent='Activando avisos…';b.disabled=true;return}
    b.disabled=false;b.className='defe-push-btn';
    if(state==='error'){b.textContent='Revisar avisos';b.classList.add('err');return}
    if(Notification.permission==='denied'){b.textContent='Avisos bloqueados';b.classList.add('err');return}
    if(Notification.permission==='granted'&&localStorage.getItem(ENABLED)==='1'){b.textContent='🔔 Avisos activos';b.classList.add('on');return}
    b.textContent='🔔 Activar avisos';
  }

  async function init(){
    ensureButton();
    if(Notification.permission==='granted'&&localStorage.getItem(ENABLED)==='1')await sync();
    document.addEventListener('defe:preferences-updated',()=>sync(true));
  }

  window.defeEnablePush=enable;
  window.defeSyncPush=()=>sync(true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();