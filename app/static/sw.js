const CACHE="el-defe-v5-20260907-push1";
const ASSETS=["/","/static/escudo.jpg","/static/manifest.json","/static/icon-192.png","/static/icon-512.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET") return;
  e.respondWith(fetch(e.request).then(r=>{
    const copy=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)); return r;
  }).catch(()=>caches.match(e.request)));
});
self.addEventListener("push",e=>{
  let d={title:"El Defe",body:"Hay una novedad del club.",url:"/"};
  try{if(e.data)d={...d,...e.data.json()};}catch{}
  const opts={body:d.body||"",icon:"/static/icon-192.png",badge:"/static/icon-192.png",tag:d.id?`defe-${d.id}`:"defe-push",data:{url:d.url||"/",id:d.id||null},renotify:!!d.urgent};
  e.waitUntil(Promise.all([
    self.registration.showNotification(d.title||"El Defe",opts),
    clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>Promise.all(list.map(c=>c.postMessage({type:"defe-push-received",id:d.id||0}))))
  ]));
});
self.addEventListener("notificationclick",e=>{e.notification.close();const url=e.notification?.data?.url||"/";e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{for(const client of list){if("focus" in client){client.navigate?.(url);return client.focus();}}return clients.openWindow(url);}));});
