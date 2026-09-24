self.addEventListener('push',event=>{
  let d={title:'El Defe',body:'Hay una novedad del club.',url:'/el-defe-app/'};
  try{if(event.data)d={...d,...event.data.json()}}catch(_){}
  let u;try{u=new URL(d.url||'/el-defe-app/',self.location.origin)}catch(_){u=new URL('/el-defe-app/',self.location.origin)}
  if(u.origin!==self.location.origin||!u.pathname.startsWith('/el-defe-app/'))u=new URL('/el-defe-app/?tab=convocatoria',self.location.origin);
  const opts={body:d.body||'',icon:'/el-defe-app/icon.png',badge:'/el-defe-app/icon.png',tag:d.id?`defe-${d.id}`:'defe-push',data:{url:u.pathname+u.search+u.hash,id:d.id||null},renotify:!!d.urgent};
  event.waitUntil(self.registration.showNotification(d.title||'El Defe',opts));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  let u;try{u=new URL(event.notification?.data?.url||'/el-defe-app/?tab=convocatoria',self.location.origin)}catch(_){u=new URL('/el-defe-app/?tab=convocatoria',self.location.origin)}
  if(u.origin!==self.location.origin||!u.pathname.startsWith('/el-defe-app/'))u=new URL('/el-defe-app/?tab=convocatoria',self.location.origin);
  const target=u.href;
  event.waitUntil((async()=>{
    const list=await clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of list){
      try{
        const cu=new URL(client.url);
        if(cu.origin===self.location.origin&&cu.pathname.startsWith('/el-defe-app/')){
          await client.navigate(target);
          return await client.focus();
        }
      }catch(_){}
    }
    return clients.openWindow?clients.openWindow(target):undefined;
  })());
});
