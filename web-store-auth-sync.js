// El Defe · sincronización de sesión para Gestión de Tienda
(() => {
  const MARK='DEFE_STORE_AUTH_SYNC_V1';
  if(window.__defeStoreAuthSyncLoaded)return;
  window.__defeStoreAuthSyncLoaded=true;

  function jwtFromValue(value){
    if(!value||typeof value!=='string')return null;
    const direct=value.match(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/);
    if(direct)return direct[0];
    try{
      const parsed=JSON.parse(value);
      if(typeof parsed==='string')return jwtFromValue(parsed);
      if(parsed&&typeof parsed==='object'){
        for(const v of Object.values(parsed)){
          const found=jwtFromValue(typeof v==='string'?v:JSON.stringify(v));
          if(found)return found;
        }
      }
    }catch(_){}
    return null;
  }

  function findToken(){
    const preferred=['defe_token','defe_auth_token','access_token','token'];
    for(const key of preferred){
      const t=jwtFromValue(localStorage.getItem(key))||jwtFromValue(sessionStorage.getItem(key));
      if(t)return t;
    }
    for(const store of [localStorage,sessionStorage]){
      for(let i=0;i<store.length;i++){
        const t=jwtFromValue(store.getItem(store.key(i)));
        if(t)return t;
      }
    }
    return null;
  }

  function payload(token){
    try{
      const part=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
      return JSON.parse(atob(part.padEnd(Math.ceil(part.length/4)*4,'=')));
    }catch(_){return null;}
  }

  function sync(){
    const token=findToken();
    if(!token)return null;
    const p=payload(token)||{};
    const role=String(p.role||'').trim().toLowerCase();
    localStorage.setItem('defe_token',token);
    if(role)localStorage.setItem('defe_role',role);
    window.defeStoreAuth={token,role,email:p.email||'',userId:p.sub||''};
    document.documentElement.dataset.defeStoreAuth=MARK;
    window.dispatchEvent(new CustomEvent('defe-store-auth-ready',{detail:window.defeStoreAuth}));
    return window.defeStoreAuth;
  }

  window.defeSyncStoreAuth=sync;
  sync();
  window.addEventListener('storage',sync);
  window.addEventListener('focus',sync);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
})();
