self.addEventListener('push',event=>{
  let d={title:'El Defe',body:'Hay una novedad del club.',url:'/el-defe-app/'};
  try{if(event.data)d={...d,...event.data.json()}}catch(_){}
  const opts={body:d.body||'',tag:d.id?`defe-${d.id}`:'defe-push',data:{url:d.url||'/el-defe-app/',id:d.id||null},renotify:!!d.urgent};
  event.waitUntil(self.registration.showNotification(d.title||'El Defe',opts));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=event.notification?.data?.url||'/el-defe-app/';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const client of list){
      if('focus' in client){try{client.navigate(url)}catch(_){}return client.focus()}
    }
    return clients.openWindow?clients.openWindow(url):undefined;
  }));
});
