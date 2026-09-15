// El Defe · UX hotfix 2026-09-15 v9: login sin reload + estado visible de sesión
(() => {
  const API='https://el-defe-v5-production.up.railway.app';
  const MARK='DEFE_UI_HOTFIX_20260915_V9_NO_RELOAD';

  function tokenRole(token){try{const p=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return String(JSON.parse(atob(p.padEnd(Math.ceil(p.length/4)*4,'='))).role||'').toLowerCase()}catch(_){return ''}}
  function getToken(){return localStorage.getItem('defe_auth_token')||localStorage.getItem('defe_token')||''}
  function getUser(){try{return JSON.parse(localStorage.getItem('defe_auth_user')||'{}')||{}}catch(_){return {}}}
  function getRole(){return String(localStorage.getItem('defe_role')||getUser()?.role||tokenRole(getToken())||'').toLowerCase()}
  function isLogged(){return !!getToken()}
  function roleLabel(role){if(role==='tienda')return 'Tienda';if(role==='admin')return 'Administrador';if(role==='lector')return 'Usuario';return role?role.charAt(0).toUpperCase()+role.slice(1):'Usuario'}

  function closeLogin(){document.querySelector('[data-defe-login-modal]')?.remove();}
  function closeAccount(){document.querySelector('[data-defe-account-modal]')?.remove();}

  function syncSessionButtons(){
    const logged=isLogged(),role=getRole();
    document.querySelectorAll('button,a,[role="button"]').forEach(el=>{
      const txt=String(el.textContent||'').trim().replace(/\s+/g,' ');
      if(!/^Ingresar$|^Mi cuenta$|^Tienda$/i.test(txt))return;
      if(el.closest('[data-defe-login-modal],[data-defe-account-modal]'))return;
      if(logged){el.textContent=role==='tienda'?'Tienda':'Mi cuenta';el.dataset.defeSessionButton='1';el.setAttribute('title','Sesión activa');}
      else if(el.dataset.defeSessionButton){el.textContent='Ingresar';delete el.dataset.defeSessionButton;el.removeAttribute('title');}
    });
  }

  function openAccount(){
    closeAccount();
    const user=getUser(),role=getRole();
    const email=String(user.email||user.username||user.correo||'Sesión activa');
    const modal=document.createElement('div');
    modal.dataset.defeAccountModal=MARK;
    modal.style.cssText='position:fixed;inset:0;z-index:100001;background:rgba(8,28,58,.64);display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML=`<div style="width:min(420px,100%);background:#fff;border-radius:24px;padding:24px;box-shadow:0 24px 60px #0004;color:#17365f"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><div><div style="font-size:12px;font-weight:900;letter-spacing:.08em;color:#0b4a8f">SESIÓN ACTIVA</div><h2 style="margin:5px 0 0;font-size:26px">${roleLabel(role)}</h2></div><button data-close aria-label="Cerrar" style="border:0;background:#eef3f8;border-radius:999px;width:38px;height:38px;font-size:20px;color:#17365f">×</button></div><div style="margin:18px 0;padding:14px 16px;background:#f4f8fc;border-radius:14px"><div style="font-size:12px;font-weight:800;color:#718096;margin-bottom:4px">Usuario</div><div style="font-size:15px;font-weight:800;word-break:break-word">${email}</div><div style="font-size:12px;color:#718096;margin-top:8px">Rol: ${roleLabel(role)}</div></div><button data-logout style="width:100%;border:1px solid #d7e0ea;border-radius:13px;padding:13px 16px;background:#fff;color:#17365f;font-weight:900;font-size:15px">Cerrar sesión</button></div>`;
    document.body.appendChild(modal);
    modal.querySelector('[data-close]').onclick=closeAccount;
    modal.querySelector('[data-logout]').onclick=()=>{
      ['defe_auth_token','defe_token','defe_auth_user','defe_role'].forEach(k=>localStorage.removeItem(k));
      closeAccount();
      try{window.defeSyncStoreAuth?.();}catch(_){}
      syncSessionButtons();
    };
    modal.addEventListener('click',e=>{if(e.target===modal)closeAccount();});
  }

  function openLogin(){
    if(document.querySelector('[data-defe-login-modal]'))return;
    const modal=document.createElement('div');
    modal.dataset.defeLoginModal=MARK;
    modal.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(8,28,58,.64);display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML=`<div style="width:min(420px,100%);background:#fff;border-radius:24px;padding:24px;box-shadow:0 24px 60px #0004;color:#17365f"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px"><div><div style="font-size:12px;font-weight:900;letter-spacing:.08em;color:#0b4a8f">CLUB ATLÉTICO DEFENSORES DE SANTOS LUGARES</div><h2 style="margin:5px 0 0;font-size:28px">Ingresar</h2></div><button data-close aria-label="Cerrar" style="border:0;background:#eef3f8;border-radius:999px;width:38px;height:38px;font-size:20px;color:#17365f">×</button></div><p style="margin:0 0 18px;color:#718096;font-size:14px">Ingresá con tu usuario para acceder a las funciones de gestión.</p><form data-form><label style="display:block;font-size:12px;font-weight:900;margin:0 0 6px">Correo electrónico</label><input name="username" type="email" autocomplete="username" required style="box-sizing:border-box;width:100%;padding:13px 14px;border:1px solid #d7e0ea;border-radius:12px;font-size:16px;margin-bottom:14px;outline:none" placeholder="tu@email.com"><label style="display:block;font-size:12px;font-weight:900;margin:0 0 6px">Contraseña</label><input name="password" type="password" autocomplete="current-password" required style="box-sizing:border-box;width:100%;padding:13px 14px;border:1px solid #d7e0ea;border-radius:12px;font-size:16px;margin-bottom:10px;outline:none" placeholder="Contraseña"><div data-msg style="min-height:20px;color:#b42318;font-size:13px;margin:3px 0 8px"></div><button type="submit" data-submit style="width:100%;border:0;border-radius:13px;padding:13px 16px;background:#0b4a8f;color:#fff;font-weight:900;font-size:16px">Ingresar</button></form></div>`;
    document.body.appendChild(modal);
    modal.querySelector('[data-close]').onclick=closeLogin;
    modal.addEventListener('click',e=>{if(e.target===modal)closeLogin();});
    const form=modal.querySelector('[data-form]'),msg=modal.querySelector('[data-msg]'),submit=modal.querySelector('[data-submit]');
    form.onsubmit=async e=>{
      e.preventDefault();msg.textContent='';submit.disabled=true;submit.textContent='Ingresando…';
      try{
        const fd=new FormData(form),body=new URLSearchParams();
        const email=String(fd.get('username')||'').trim();
        body.set('username',email);
        body.set('password',String(fd.get('password')||''));
        const r=await fetch(API+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()});
        const data=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(data.detail||'No se pudo iniciar sesión');
        const t=data.access_token||'';
        if(!t)throw new Error('El servidor no devolvió una sesión válida');
        localStorage.setItem('defe_auth_token',t);
        localStorage.setItem('defe_token',t);
        localStorage.setItem('defe_auth_user',JSON.stringify(data.user||{email}));
        const role=String(data.user?.role||tokenRole(t)||'').toLowerCase();
        if(role)localStorage.setItem('defe_role',role);
        try{window.defeSyncStoreAuth?.();}catch(_){}
        closeLogin();
        syncSessionButtons();
        setTimeout(openAccount,50);
      }catch(err){msg.textContent=String(err?.message||err);submit.disabled=false;submit.textContent='Ingresar';}
    };
    setTimeout(()=>modal.querySelector('input[name="username"]')?.focus(),50);
  }

  function installIntercept(){
    document.addEventListener('click',e=>{
      const el=e.target.closest('button,a,[role="button"]');if(!el)return;
      if(el.closest('[data-defe-login-modal],[data-defe-account-modal]'))return;
      const txt=String(el.textContent||'').trim().replace(/\s+/g,' ');
      if(isLogged() && (/^Mi cuenta$/i.test(txt)||/^Tienda$/i.test(txt)||el.dataset.defeSessionButton==='1')){e.preventDefault();e.stopImmediatePropagation();openAccount();return;}
      if(!/^Ingresar$/i.test(txt))return;
      e.preventDefault();e.stopImmediatePropagation();openLogin();
    },true);
  }

  function run(){
    document.documentElement.dataset.defeUiHotfix=MARK;
    installIntercept();
    syncSessionButtons();
    const mo=new MutationObserver(()=>syncSessionButtons());
    mo.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
