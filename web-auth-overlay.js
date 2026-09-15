(() => {
  const API = 'https://el-defe-v5-production.up.railway.app';
  async function apiFetch(path, options = {}, timeoutMs = 12000) { const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);try{return await fetch(`${API}${path}`,{...options,signal:controller.signal})}finally{clearTimeout(timer)} }
  function jwtFromValue(value){if(!value||typeof value!=='string')return null;const direct=value.match(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/);if(direct)return direct[0];try{const parsed=JSON.parse(value);if(typeof parsed==='string')return jwtFromValue(parsed);if(parsed&&typeof parsed==='object')for(const v of Object.values(parsed)){const found=jwtFromValue(typeof v==='string'?v:JSON.stringify(v));if(found)return found}}catch(_){}return null}
  function getToken(){for(const store of [localStorage,sessionStorage])for(let i=0;i<store.length;i++){const t=jwtFromValue(store.getItem(store.key(i)));if(t)return t}return null}
  function tokenRole(token){try{const payload=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(payload.padEnd(Math.ceil(payload.length/4)*4,'='))).role||null}catch(_){return null}}
  const roleLabel=r=>r==='admin'?'Administrador':r==='tienda'?'Tienda':'Socio';

  function openRegister(){
    document.querySelector('[data-defe-register-panel]')?.remove();
    const panel=document.createElement('div');
    panel.dataset.defeRegisterPanel='1';
    panel.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(17,24,39,.58);padding:18px;display:flex;align-items:center;justify-content:center';
    panel.innerHTML=`<div style="background:#fff;width:min(520px,100%);border-radius:24px;padding:24px;box-shadow:0 18px 50px #0003">
      <div style="font-size:12px;font-weight:800;letter-spacing:.08em;color:#0b3a7a;margin-bottom:8px">CLUB ATLÉTICO DEFENSORES DE SANTOS LUGARES</div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><h2 style="margin:0;color:#17365d;font-size:32px;font-weight:500">Crear usuario</h2><button data-close aria-label="Cerrar" style="border:0;border-radius:999px;width:48px;height:48px;background:#eef2f7;color:#17365d;font-size:22px">×</button></div>
      <p style="color:#718096;font-size:15px;line-height:1.45;margin:16px 0 20px">Creá el acceso con tu correo electrónico. Luego el administrador asignará el perfil correspondiente.</p>
      <label style="display:block;font-size:14px;font-weight:800;color:#17365d;margin-bottom:7px">Correo electrónico</label>
      <input data-email type="email" autocomplete="email" style="box-sizing:border-box;width:100%;padding:16px 18px;border:1px solid #d7dee7;border-radius:16px;font-size:17px;outline:none" placeholder="nombre@correo.com">
      <label style="display:block;font-size:14px;font-weight:800;color:#17365d;margin:18px 0 7px">Contraseña</label>
      <input data-pass type="password" autocomplete="new-password" minlength="8" style="box-sizing:border-box;width:100%;padding:16px 18px;border:1px solid #d7dee7;border-radius:16px;font-size:17px;outline:none" placeholder="Mínimo 8 caracteres">
      <button data-create style="width:100%;margin-top:22px;padding:16px;border:0;border-radius:16px;background:#15589e;color:#fff;font-weight:800;font-size:18px">Crear usuario</button>
      <div data-msg style="min-height:22px;margin-top:12px;font-size:13px;color:#64748b"></div>
    </div>`;
    document.body.appendChild(panel);
    panel.querySelector('[data-close]').onclick=()=>panel.remove();
    const email=panel.querySelector('[data-email]'),pass=panel.querySelector('[data-pass]'),btn=panel.querySelector('[data-create]'),msg=panel.querySelector('[data-msg]');
    const visibleLogin=[...document.querySelectorAll('input[type=email]')].find(x=>x.offsetParent!==null&&x.value);
    if(visibleLogin)email.value=visibleLogin.value.trim();
    btn.onclick=async()=>{
      const e=email.value.trim().toLowerCase(),p=pass.value;
      if(!e||!e.includes('@')){msg.textContent='Ingresá un correo válido.';return}
      if((p||'').length<8){msg.textContent='La contraseña debe tener al menos 8 caracteres.';return}
      btn.disabled=true;btn.textContent='Creando…';msg.textContent='';
      try{
        const r=await apiFetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:e,password:p})});
        const d=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(d.detail||'No se pudo crear el usuario');
        msg.style.color='#15803d';msg.textContent='Usuario creado correctamente. Ya podés cerrar esta ventana e ingresar.';
        btn.textContent='Usuario creado';
      }catch(err){msg.style.color='#b42318';msg.textContent=err.message||'No se pudo crear el usuario';btn.disabled=false;btn.textContent='Crear usuario'}
    };
  }

  function patchLoginModal(){
    const headings=[...document.querySelectorAll('h1,h2,h3')].filter(x=>x.offsetParent!==null&&/^Ingresar$/i.test((x.textContent||'').trim()));
    for(const h of headings){
      const root=h.closest('[role=dialog]')||h.parentElement?.parentElement?.parentElement||h.parentElement;
      if(!root||root.querySelector('[data-defe-register-link]'))continue;
      const loginBtn=[...root.querySelectorAll('button')].find(b=>/^Ingresar$/i.test((b.textContent||'').trim()));
      if(!loginBtn)continue;
      const wrap=document.createElement('div');wrap.dataset.defeRegisterLink='1';wrap.style.cssText='text-align:center;margin-top:12px';
      const b=document.createElement('button');b.type='button';b.textContent='Crear usuario';b.style.cssText='background:transparent;border:0;color:#15589e;font-weight:800;font-size:15px;padding:8px 12px;text-decoration:underline;text-underline-offset:3px';b.onclick=openRegister;
      wrap.appendChild(b);loginBtn.insertAdjacentElement('afterend',wrap);
    }
  }

  async function manageUsers(){
    const token=getToken();if(!token)return;document.querySelector('[data-defe-users-panel]')?.remove();
    const panel=document.createElement('div');panel.dataset.defeUsersPanel='1';panel.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(17,24,39,.5);padding:20px;display:flex;align-items:center;justify-content:center';
    panel.innerHTML='<div style="background:#fff;width:min(480px,100%);max-height:85vh;overflow:auto;border-radius:20px;padding:20px"><h2 style="margin-top:0">Usuarios</h2><div style="font-size:12px;color:#64748b;margin-bottom:8px">Asigná a cada persona sólo el nivel de acceso que necesita.</div><div data-users-body>Cargando…</div><button data-close style="width:100%;margin-top:12px;padding:12px;border:0;border-radius:12px">Cerrar</button></div>';
    document.body.appendChild(panel);panel.querySelector('[data-close]').onclick=()=>panel.remove();const body=panel.querySelector('[data-users-body]');
    try{const r=await apiFetch('/api/admin/users',{headers:{Authorization:`Bearer ${token}`}}),users=await r.json();if(!r.ok)throw new Error(users.detail||'No se pudieron cargar los usuarios');body.innerHTML='';for(const u of users){const row=document.createElement('div');row.style.cssText='border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin:10px 0';row.innerHTML=`<strong></strong><div style="font-size:13px;margin:5px 0">Perfil actual: <b>${roleLabel(u.role)}</b></div><select data-role style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:10px;margin:5px 0"><option value="lector" ${u.role==='lector'?'selected':''}>Usuario</option><option value="tienda" ${u.role==='tienda'?'selected':''}>Tienda</option><option value="admin" ${u.role==='admin'?'selected':''}>Administrador</option></select><button data-save style="width:100%;padding:9px 10px;border:0;border-radius:9px;margin-top:6px;background:#40368f;color:#fff;font-weight:700">Guardar perfil</button><div data-msg style="font-size:12px;margin-top:6px;color:#64748b"></div>`;row.querySelector('strong').textContent=u.email;row.querySelector('[data-save]').onclick=async()=>{const role=row.querySelector('[data-role]').value,msg=row.querySelector('[data-msg]');if(role===u.role){msg.textContent='Sin cambios.';return}msg.textContent='Guardando…';const rr=await apiFetch(`/api/admin/users/${u.id}/role`,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({role})}),dd=await rr.json().catch(()=>({}));if(!rr.ok){msg.textContent=dd.detail||'No se pudo cambiar el perfil';return}panel.remove();manageUsers()};body.appendChild(row)}}catch(e){body.textContent=e.message}
  }
  function syncProfileRole(){const t=getToken(),r=t?tokenRole(t):null;if(!r)return;const label=roleLabel(r);const email=[...document.querySelectorAll('div,span,p,strong')].find(el=>el.childElementCount===0&&/@/.test(el.textContent||'')&&el.offsetParent!==null);if(!email)return;const root=email.parentElement?.parentElement||email.parentElement;if(!root)return;const cand=[...root.querySelectorAll('div,span,p')].find(el=>el.childElementCount===0&&/^(Socio|Administrador|Tienda)\s*·/i.test((el.textContent||'').trim()));if(cand){const txt=(cand.textContent||'').trim();cand.textContent=txt.replace(/^(Socio|Administrador|Tienda)/i,label)}}
  function syncAdminButton(){const token=getToken(),isAdmin=token&&tokenRole(token)==='admin';let btn=document.querySelector('[data-defe-users-button]');if(!isAdmin){btn?.remove();return}if(!btn){btn=document.createElement('button');btn.dataset.defeUsersButton='1';btn.setAttribute('aria-label','Gestionar usuarios');btn.title='Usuarios';btn.innerHTML='👥<span class="defe-users-label"> Usuarios</span>';btn.onclick=manageUsers;document.body.appendChild(btn)}const compact=window.innerWidth<760;btn.style.cssText=`position:fixed;right:12px;top:76px;z-index:9998;background:#40368f;color:#fff;border:1px solid rgba(255,255,255,.45);border-radius:999px;height:44px;min-width:44px;padding:${compact?'0':'0 14px'};font-weight:700;box-shadow:0 4px 14px #0002`;const label=btn.querySelector('.defe-users-label');if(label)label.style.display=compact?'none':'inline'}
  function sync(){syncAdminButton();syncProfileRole();patchLoginModal()}
  sync();window.addEventListener('resize',sync);window.addEventListener('focus',sync);setInterval(sync,700);
})();