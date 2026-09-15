// El Defe · UX hotfix 2026-09-15 v10: login PWA estable
(() => {
  const API='https://el-defe-v5-production.up.railway.app';
  const MARK='DEFE_UI_HOTFIX_20260915_V10_PWA_STABLE';
  const keys={token:'defe_auth_token',token2:'defe_token',user:'defe_auth_user',role:'defe_role'};

  function tokenRole(token){try{const p=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return String(JSON.parse(atob(p.padEnd(Math.ceil(p.length/4)*4,'='))).role||'').toLowerCase()}catch(_){return ''}}
  function getToken(){return localStorage.getItem(keys.token)||localStorage.getItem(keys.token2)||''}
  function getUser(){try{return JSON.parse(localStorage.getItem(keys.user)||'{}')||{}}catch(_){return {}}}
  function getRole(){return String(localStorage.getItem(keys.role)||getUser()?.role||tokenRole(getToken())||'').toLowerCase()}
  function isLogged(){return !!getToken()}
  function roleLabel(r){if(r==='tienda')return 'Tienda';if(r==='admin')return 'Administrador';if(r==='lector')return 'Usuario';return r?r.charAt(0).toUpperCase()+r.slice(1):'Usuario'}
  function close(sel){document.querySelector(sel)?.remove()}

  function syncSessionButtons(){
    const logged=isLogged(), role=getRole();
    document.querySelectorAll('button,a,[role="button"]').forEach(el=>{
      if(el.closest('[data-defe-login-modal],[data-defe-account-modal]'))return;
      const txt=String(el.textContent||'').trim().replace(/\s+/g,' ');
      if(!/^(Ingresar|Mi cuenta|Tienda)$/i.test(txt))return;
      if(logged){el.textContent=role==='tienda'?'Tienda':'Mi cuenta';el.dataset.defeSessionButton='1';el.title='Sesión activa';}
      else if(el.dataset.defeSessionButton){el.textContent='Ingresar';delete el.dataset.defeSessionButton;el.removeAttribute('title');}
    });
  }

  function openAccount(){
    close('[data-defe-account-modal]');
    const u=getUser(), r=getRole(), email=String(u.email||u.username||u.correo||'Sesión activa');
    const modal=document.createElement('div');
    modal.dataset.defeAccountModal=MARK;
    modal.style.cssText='position:fixed;inset:0;z-index:100001;background:rgba(8,28,58,.64);display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML=`<div style="width:min(420px,100%);background:#fff;border-radius:24px;padding:24px;box-shadow:0 24px 60px #0004;color:#17365f"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><div><div style="font-size:12px;font-weight:900;letter-spacing:.08em;color:#0b4a8f">SESIÓN ACTIVA</div><h2 style="margin:5px 0 0;font-size:26px">${roleLabel(r)}</h2></div><button data-close style="border:0;background:#eef3f8;border-radius:999px;width:38px;height:38px;font-size:20px;color:#17365f">×</button></div><div style="margin:18px 0;padding:14px 16px;background:#f4f8fc;border-radius:14px"><div style="font-size:12px;font-weight:800;color:#718096;margin-bottom:4px">Usuario</div><div style="font-size:15px;font-weight:800;word-break:break-word">${email}</div><div style="font-size:12px;color:#718096;margin-top:8px">Rol: ${roleLabel(r)}</div></div><button data-logout style="width:100%;border:1px solid #d7e0ea;border-radius:13px;padding:13px 16px;background:#fff;color:#17365f;font-weight:900;font-size:15px">Cerrar sesión</button></div>`;
    document.body.appendChild(modal);
    modal.querySelector('[data-close]').onclick=()=>close('[data-defe-account-modal]');
    modal.querySelector('[data-logout]').onclick=()=>{Object.values(keys).forEach(k=>localStorage.removeItem(k));close('[data-defe-account-modal]');syncSessionButtons();};
    modal.addEventListener('click',e=>{if(e.target===modal)close('[data-defe-account-modal]')});
  }

  function openLogin(){
    if(document.querySelector('[data-defe-login-modal]'))return;
    const modal=document.createElement('div');
    modal.dataset.defeLoginModal=MARK;
    modal.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(8,28,58,.64);display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML=`<div style="width:min(420px,100%);background:#fff;border-radius:24px;padding:24px;box-shadow:0 24px 60px #0004;color:#17365f"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px"><div><div style="font-size:12px;font-weight:900;letter-spacing:.08em;color:#0b4a8f">CLUB ATLÉTICO DEFENSORES DE SANTOS LUGARES</div><h2 style="margin:5px 0 0;font-size:28px">Ingresar</h2></div><button data-close style="border:0;background:#eef3f8;border-radius:999px;width:38px;height:38px;font-size:20px;color:#17365f">×</button></div><p style="margin:0 0 18px;color:#718096;font-size:14px">Ingresá con tu usuario para acceder a las funciones de gestión.</p><form data-form><label style="display:block;font-size:12px;font-weight:900;margin:0 0 6px">Correo electrónico</label><input name="username" type="email" autocomplete="username" required style="box-sizing:border-box;width:100%;padding:13px 14px;border:1px solid #d7e0ea;border-radius:12px;font-size:16px;margin-bottom:14px" placeholder="tu@email.com"><label style="display:block;font-size:12px;font-weight:900;margin:0 0 6px">Contraseña</label><input name="password" type="password" autocomplete="current-password" required style="box-sizing:border-box;width:100%;padding:13px 14px;border:1px solid #d7e0ea;border-radius:12px;font-size:16px;margin-bottom:10px"><div data-msg style="min-height:20px;color:#b42318;font-size:13px;margin:3px 0 8px"></div><button type="submit" data-submit style="width:100%;border:0;border-radius:13px;padding:13px 16px;background:#0b4a8f;color:#fff;font-weight:900;font-size:16px">Ingresar</button></form></div>`;
    document.body.appendChild(modal);
    modal.querySelector('[data-close]').onclick=()=>close('[data-defe-login-modal]');
    modal.addEventListener('click',e=>{if(e.target===modal)close('[data-defe-login-modal]')});
    const form=modal.querySelector('[data-form]'),msg=modal.querySelector('[data-msg]'),submit=modal.querySelector('[data-submit]');
    form.onsubmit=async e=>{
      e.preventDefault();msg.textContent='';submit.disabled=true;submit.textContent='Ingresando…';
      try{
        const fd=new FormData(form), email=String(fd.get('username')||'').trim(), body=new URLSearchParams();
        body.set('username',email);body.set('password',String(fd.get('password')||''));
        const r=await fetch(API+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString(),cache:'no-store'});
        const data=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(data.detail||'No se pudo iniciar sesión');
        const t=data.access_token||''; if(!t)throw new Error('El servidor no devolvió una sesión válida');
        localStorage.setItem(keys.token,t);localStorage.setItem(keys.token2,t);localStorage.setItem(keys.user,JSON.stringify(data.user||{email}));
        const role=String(data.user?.role||tokenRole(t)||'').toLowerCase();if(role)localStorage.setItem(keys.role,role);
        close('[data-defe-login-modal]');syncSessionButtons();openAccount();
      }catch(err){msg.textContent=String(err?.message||err);submit.disabled=false;submit.textContent='Ingresar';}
    };
    setTimeout(()=>modal.querySelector('input[name="username"]')?.focus(),50);
  }

  function installIntercept(){
    document.addEventListener('click',e=>{
      const el=e.target.closest('button,a,[role="button"]');if(!el||el.closest('[data-defe-login-modal],[data-defe-account-modal]'))return;
      const txt=String(el.textContent||'').trim().replace(/\s+/g,' ');
      if(isLogged()&&(/^(Mi cuenta|Tienda)$/i.test(txt)||el.dataset.defeSessionButton==='1')){e.preventDefault();e.stopImmediatePropagation();openAccount();return;}
      if(!/^Ingresar$/i.test(txt))return;e.preventDefault();e.stopImmediatePropagation();openLogin();
    },true);
  }

  function run(){document.documentElement.dataset.defeUiHotfix=MARK;installIntercept();syncSessionButtons();new MutationObserver(syncSessionButtons).observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
