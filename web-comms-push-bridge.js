(() => {
  const API='https://el-defe-v5-production.up.railway.app';
  const nativeFetch=window.fetch.bind(window);

  function decodeCommunication(body){
    const b=String(body||'');
    if(!b.startsWith('[DEFE-COMMS-V3]'))return null;
    const priority=(b.match(/\[TIPO:([^\]]+)\]/)||[])[1]||'Información';
    const raw=(b.match(/\[TARGET:([^\]]+)\]/)||[])[1]||'';
    let target={scope:'club'};
    try{target=JSON.parse(decodeURIComponent(escape(atob(raw))))}catch(_){}
    const message=b.replace(/^\[DEFE-COMMS-V3\]\[TIPO:[^\]]+\]\[TARGET:[^\]]+\]\n?/,'');
    return {priority,target,message};
  }

  window.fetch=async function(input,init){
    const response=await nativeFetch(input,init);
    try{
      const url=typeof input==='string'?input:(input?.url||'');
      const method=String(init?.method||input?.method||'GET').toUpperCase();
      if(response.ok&&method==='POST'&&url===API+'/api/news'){
        const payload=JSON.parse(String(init?.body||'{}'));
        const comm=decodeCommunication(payload.body);
        if(comm){
          const headers=new Headers(init?.headers||{});
          const authorization=headers.get('Authorization');
          nativeFetch(API+'/api/notifications/communication',{
            method:'POST',
            headers:{'Content-Type':'application/json',...(authorization?{Authorization:authorization}:{})},
            body:JSON.stringify({
              title:payload.title||'Nueva comunicación',
              body:comm.message,
              competition:comm.target?.competition||null,
              category:comm.target?.category||null,
              priority:comm.priority
            })
          }).catch(e=>console.warn('Comunicación publicada, push pendiente',e));
        }
      }
    }catch(e){console.warn('No se pudo enlazar la comunicación con push',e)}
    return response;
  };
})();
