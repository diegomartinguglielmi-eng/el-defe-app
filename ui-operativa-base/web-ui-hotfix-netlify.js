// El Defe · UX hotfix 2026-09-15 v13: sesión + acceso operativo Tienda
(() => {
  const API='https://el-defe-v2-staging-production.up.railway.app';
  const MARK='DEFE_UI_HOTFIX_20260915_V13_STORE_ACCESS';
  const KEYS={token:'defe_access_token',token2:'defe_token',user:'defe_auth_user',role:'defe_role',session:'defe:railway:session'};

  function tokenRole(token){
    try{
      const p=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
      return String(JSON.parse(atob(p.padEnd(Math.ceil(p.length/4)*4,'='))).role||'').toLowerCase();
    }catch(_){return ''}
  }
  function getToken(){try{const direct=localStorage.getItem(KEYS.token)||localStorage.getItem(KEYS.token2);if(direct)return direct;const s=JSON.parse(localStorage.getItem(KEYS.session)||'null');return s?.token||''}catch(_){return ''}}
  function getUser(){try{return JSON.parse(localStorage.getItem(KEYS.user)||'{}')||{}}catch(_){return {}}}
  function getRole(){return String(localStorage.getItem(KEYS.role)||tokenRole(getToken())||getUser().role||'').toLowerCase()}
  function roleLabel(role){
    if(role==='tienda')return 'Tienda';
    if(role==='admin')return 'Administrador';
    if(role==='delegado')return 'Delegado';
    if(role==='dt')return 'DT';
    if(role==='lector')return 'Usuario';
    return role?role.charAt(0).toUpperCase()+role.slice(1):'Usuario';
  }
  function clearSession(){Object.values(KEYS).forEach(k=>localStorage.removeItem(k));localStorage.removeItem('defe_auth_token');localStorage.removeItem('defe_user')}
  function closeLogin(){document.querySelector('[data-defe-login-modal]')?.remove()}
  function closeAccount(){document.querySelector('[data-defe-account-modal]')?.remove()}
  function sessionLabel(){return getRole()==='tienda'?'Tienda':'Mi cuenta'}

  function isSessionButton(el){
    if(el?.dataset?.defeSessionButton==='1')return true;
    const txt=String(el?.textContent||'').trim().replace(/\s+/g,' ');
    return /^(Ingresar|Mi cuenta)$/i.test(txt);
  }

  function syncSessionButtons(){
    const logged=!!getToken();
    const desired=logged?sessionLabel():'Ingresar';
    document.querySelectorAll('button,a,[role="button"]').forEach(el=>{
      if(el.closest('[data-defe-login-modal],[data-defe-account-modal]'))return;
      if(!isSessionButton(el))return;
      if(String(el.textContent||'').trim()!==desired)el.textContent=desired;
      if(logged){
        el.dataset.defeSessionButton='1';
        const aria='Sesión activa: '+roleLabel(getRole());
        if(el.getAttribute('aria-label')!==aria)el.setAttribute('aria-label',aria);
        if(el.getAttribute('title')!=='Sesión activa')el.setAttribute('title','Sesión activa');
      }else{
        delete el.dataset.defeSessionButton;
        el.removeAttribute('title');
        el.removeAttribute('aria-label');
      }
    });
  }

  async function refreshProfile(){
    const token=getToken(); if(!token)return null;
    try{
      const r=await fetch(API+'/api/me',{headers:{Authorization:'Bearer '+token}});
      if(r.status===401){clearSession();syncSessionButtons();return null}
      if(!r.ok)return null;
      const u=await r.json();
      localStorage.setItem(KEYS.user,JSON.stringify(u||{}));
      const role=String(u?.role||tokenRole(token)||'').toLowerCase();
      if(role)localStorage.setItem(KEYS.role,role);
      syncSessionButtons();
      return u;
    }catch(_){return null}
  }

  function openStoreAdmin(){
    closeAccount();
    document.dispatchEvent(new CustomEvent('defe-store-auth-ready',{detail:{role:getRole(),user:getUser()}}));
    if(typeof window.show==='function'){
      window.show('admin');
      setTimeout(()=>window.defeEnsureStoreAdmin?.(),120);
      setTimeout(()=>window.defeEnsureStoreAdmin?.(),500);
      return;
    }
    const admin=document.getElementById('admin');
    if(admin){
      document.querySelectorAll('.screen').forEach(x=>x.classList.remove('on'));
      admin.classList.add('on');
      setTimeout(()=>window.defeEnsureStoreAdmin?.(),120);
    }
  }

  function openAccount(){
    closeAccount();
    const u=getUser(), role=getRole();
    const email=String(u.email||'Sesión activa');
    const canManageStore=['tienda','admin','delegado'].includes(role);
    const modal=document.createElement('div');
    modal.dataset.defeAccountModal=MARK;
    modal.style.cssText='position:fixed;inset:0;z-index:100001;background:rgba(8,28,58,.64);display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML=`<div style="width:min(420px,100%);background:#fff;border-radius:24px;padding:24px;box-shadow:0 24px 60px #0004;color:#17365f"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><div><div style="font-size:12px;font-weight:900;letter-spacing:.08em;color:#16865b">● SESIÓN ACTIVA</div><h2 style="margin:5px 0 0;font-size:27px">${roleLabel(role)}</h2></div><button data-close aria-label="Cerrar" style="border:0;background:#eef3f8;border-radius:999px;width:40px;height:40px;font-size:20px;color:#17365f">×</button></div><div style="margin:18px 0;padding:15px 16px;background:#f4f8fc;border-radius:14px"><div style="font-size:12px;font-weight:800;color:#718096;margin-bottom:4px">Usuario</div><div style="font-size:15px;font-weight:900;word-break:break-word">${email}</div><div style="font-size:12px;color:#718096;margin-top:9px">Perfil: <b>${roleLabel(role)}</b></div></div>${canManageStore?'<button data-store-admin style="width:100%;border:0;border-radius:13px;padding:14px 16px;background:#0b4a8f;color:#fff;font-weight:900;font-size:15px;margin-bottom:10px">Administrar tienda</button>':''}<button data-logout style="width:100%;border:1px solid #d7e0ea;border-radius:13px;padding:13px 16px;background:#fff;color:#17365f;font-weight:900;font-size:15px">Cerrar sesión</button></div>`;
    document.body.appendChild(modal);
    modal.querySelector('[data-close]').onclick=closeAccount;
    const manage=modal.querySelector('[data-store-admin]');
    if(manage)manage.onclick=openStoreAdmin;
    modal.querySelector('[data-logout]').onclick=()=>{clearSession();closeAccount();syncSessionButtons()};
    modal.addEventListener('click',e=>{if(e.target===modal)closeAccount()});
  }

  function openLogin(){
    if(getToken()){openAccount();return}
    if(document.querySelector('[data-defe-login-modal]'))return;
    const modal=document.createElement('div');
    modal.dataset.defeLoginModal=MARK;
    modal.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(8,28,58,.64);display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML=`<div style="width:min(420px,100%);background:#fff;border-radius:24px;padding:24px;box-shadow:0 24px 60px #0004;color:#17365f"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px"><div><div style="font-size:12px;font-weight:900;letter-spacing:.08em;color:#0b4a8f">CLUB ATLÉTICO DEFENSORES DE SANTOS LUGARES</div><h2 style="margin:5px 0 0;font-size:28px">Ingresar</h2></div><button data-close aria-label="Cerrar" style="border:0;background:#eef3f8;border-radius:999px;width:38px;height:38px;font-size:20px;color:#17365f">×</button></div><p style="margin:0 0 18px;color:#718096;font-size:14px">Ingresá con tu usuario para acceder a las funciones de gestión.</p><form data-form><label style="display:block;font-size:12px;font-weight:900;margin:0 0 6px">Correo electrónico</label><input name="username" type="email" autocomplete="username" required style="box-sizing:border-box;width:100%;padding:13px 14px;border:1px solid #d7e0ea;border-radius:12px;font-size:16px;margin-bottom:14px;outline:none" placeholder="tu@email.com"><label style="display:block;font-size:12px;font-weight:900;margin:0 0 6px">Contraseña</label><input name="password" type="password" autocomplete="current-password" required style="box-sizing:border-box;width:100%;padding:13px 14px;border:1px solid #d7e0ea;border-radius:12px;font-size:16px;margin-bottom:10px;outline:none" placeholder="Contraseña"><div data-msg style="min-height:20px;color:#b42318;font-size:13px;margin:3px 0 8px"></div><button type="submit" data-submit style="width:100%;border:0;border-radius:13px;padding:13px 16px;background:#0b4a8f;color:#fff;font-weight:900;font-size:16px">Ingresar</button></form></div>`;
    document.body.appendChild(modal);
    modal.querySelector('[data-close]').onclick=closeLogin;
    modal.addEventListener('click',e=>{if(e.target===modal)closeLogin()});
    const form=modal.querySelector('[data-form]'),msg=modal.querySelector('[data-msg]'),submit=modal.querySelector('[data-submit]');
    form.onsubmit=async e=>{
      e.preventDefault();msg.textContent='';submit.disabled=true;submit.textContent='Ingresando…';
      try{
        const fd=new FormData(form),body=new URLSearchParams();
        body.set('username',String(fd.get('username')||'').trim());
        body.set('password',String(fd.get('password')||''));
        const r=await fetch(API+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()});
        const data=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(data.detail||'No se pudo iniciar sesión');
        const token=data.access_token||'';
        localStorage.setItem(KEYS.token,token);
        localStorage.setItem(KEYS.token2,token);
        localStorage.setItem(KEYS.user,JSON.stringify(data.user||{}));localStorage.setItem('defe_user',JSON.stringify(data.user||{}));localStorage.setItem(KEYS.session,JSON.stringify({token,user:data.user||{}}));
        const role=tokenRole(token)||String(data.user?.role||'').toLowerCase();
        if(role)localStorage.setItem(KEYS.role,role);
        const profile=await refreshProfile();
        if(!profile){
          throw new Error('La sesión no pudo validarse. Volvé a ingresar.');
        }
        closeLogin();
        syncSessionButtons();
        document.dispatchEvent(new CustomEvent('defe-store-auth-ready',{detail:{role:getRole(),user:getUser()}}));
        openAccount();
        document.dispatchEvent(new CustomEvent('defe:session-changed',{detail:{logged:true,role:getRole(),user:getUser()}}));
      }catch(err){msg.textContent=String(err?.message||err);submit.disabled=false;submit.textContent='Ingresar';}
    };
    setTimeout(()=>modal.querySelector('input[name="username"]')?.focus(),50);
  }

  function installIntercept(){
    document.addEventListener('click',e=>{
      const el=e.target.closest('button,a,[role="button"]'); if(!el)return;
      if(el.closest('[data-defe-login-modal],[data-defe-account-modal]'))return;
      if(!isSessionButton(el))return;
      e.preventDefault();e.stopImmediatePropagation();
      getToken()?openAccount():openLogin();
    },true);
  }

  function run(){
    document.documentElement.dataset.defeUiHotfix=MARK;
    installIntercept();
    syncSessionButtons();
    refreshProfile();
    setTimeout(syncSessionButtons,500);
    setTimeout(syncSessionButtons,1500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
