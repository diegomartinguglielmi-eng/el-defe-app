// El Defe · UX hotfix 2026-09-12 v5: ingreso solamente
(() => {
  const API='https://el-defe-v5-production.up.railway.app';
  const MARK='DEFE_UI_HOTFIX_20260912_V5_LOGIN_ONLY';

  function closeLogin(){document.querySelector('[data-defe-login-modal]')?.remove();}
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
        body.set('username',String(fd.get('username')||'').trim());
        body.set('password',String(fd.get('password')||''));
        const r=await fetch(API+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()});
        const data=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(data.detail||'No se pudo iniciar sesión');
        localStorage.setItem('defe_auth_token',data.access_token);
        localStorage.setItem('defe_auth_user',JSON.stringify(data.user||{}));
        closeLogin();location.reload();
      }catch(err){msg.textContent=String(err?.message||err);submit.disabled=false;submit.textContent='Ingresar';}
    };
    setTimeout(()=>modal.querySelector('input[name="username"]')?.focus(),50);
  }

  function installLoginIntercept(){
    document.addEventListener('click',e=>{
      const el=e.target.closest('button,a,[role="button"]');if(!el)return;
      const txt=String(el.textContent||'').trim().replace(/\s+/g,' ');
      if(!/^Ingresar$/i.test(txt))return;
      e.preventDefault();e.stopImmediatePropagation();openLogin();
    },true);
  }

  function run(){document.documentElement.dataset.defeUiHotfix=MARK;installLoginIntercept();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
