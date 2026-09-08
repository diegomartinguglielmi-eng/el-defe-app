(() => {
  const API = 'https://el-defe-v5-production.up.railway.app';

  async function apiFetch(path, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try { return await fetch(`${API}${path}`, {...options, signal: controller.signal}); }
    finally { clearTimeout(timer); }
  }

  const visible = el => !!(el && el.offsetParent !== null);
  function fields() {
    const inputs = [...document.querySelectorAll('input')].filter(visible);
    return {
      email: inputs.find(i => i.type === 'email' || /email/i.test(i.placeholder || '')),
      password: inputs.find(i => i.type === 'password'),
      name: inputs.find(i => /nombre/i.test(i.placeholder || '')) || inputs.find(i => i.type === 'text')
    };
  }
  function isRegisterScreen() {
    const {email,password} = fields();
    return !!(email && password && /crear cuenta/i.test(document.body.innerText || ''));
  }
  function msg(button, text, ok=false) {
    let m = document.querySelector('[data-defe-register-msg]');
    if (!m) {
      m=document.createElement('div'); m.dataset.defeRegisterMsg='1';
      m.style.cssText='margin-top:12px;font-size:14px;line-height:1.4';
      button.insertAdjacentElement('afterend',m);
    }
    m.style.color=ok?'#067647':'#b42318'; m.textContent=text;
  }
  function busy(button,on) {
    if (!button.dataset.defeText) button.dataset.defeText='Crear cuenta';
    button.disabled=on; button.textContent=on?'Un momento…':button.dataset.defeText;
  }
  async function register(button) {
    if (button.dataset.defeBusy==='1') return;
    const {email,password,name}=fields();
    const e=(email?.value||'').trim().toLowerCase(), p=password?.value||'';
    if (name && !name.value.trim()) return msg(button,'Completá nombre y apellido.');
    if (!e || !e.includes('@')) return msg(button,'Ingresá un email válido.');
    if (p.length<8) return msg(button,'La contraseña debe tener al menos 8 caracteres.');
    button.dataset.defeBusy='1'; busy(button,true); msg(button,'Creando tu cuenta…',true);
    try {
      const r=await apiFetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:e,password:p})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(typeof d.detail==='string'?d.detail:`No se pudo crear la cuenta (${r.status})`);
      if(d.access_token){ localStorage.setItem('defe_access_token',d.access_token); localStorage.setItem('defe_user',JSON.stringify(d.user||{email:e,role:'lector'})); }
      msg(button,'Cuenta creada correctamente. Ya podés ingresar.',true);
      setTimeout(()=>{ const x=[...document.querySelectorAll('button,a')].find(el=>/ya tengo cuenta/i.test(el.textContent||'')); x?.click(); },900);
    } catch(err) {
      msg(button,err?.name==='AbortError'?'La conexión tardó demasiado. Probá nuevamente.':(err?.message||'No se pudo crear la cuenta.'));
    } finally { delete button.dataset.defeBusy; busy(button,false); }
  }

  // Captura global: corre antes que los handlers de React/Vite del formulario original.
  document.addEventListener('click', ev => {
    if(!isRegisterScreen()) return;
    const b=ev.target.closest('button'); if(!b) return;
    const t=(b.textContent||'').trim().toLowerCase();
    if(t!=='crear cuenta' && t!=='un momento…' && t!=='un momento...') return;
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); register(b);
  }, true);
  document.addEventListener('submit', ev => {
    if(!isRegisterScreen()) return;
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
    const b=[...ev.target.querySelectorAll('button')].find(x=>/crear cuenta|un momento/i.test(x.textContent||''));
    if(b) register(b);
  }, true);

  function jwt(v){ if(!v||typeof v!=='string')return null; const m=v.match(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/); return m?m[0]:null; }
  function token(){ for(const s of [localStorage,sessionStorage]) for(let i=0;i<s.length;i++){const t=jwt(s.getItem(s.key(i)));if(t)return t;} return null; }
  function role(t){try{const p=t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(p.padEnd(Math.ceil(p.length/4)*4,'='))).role}catch{return null}}
  async function users(){
    const t=token(); if(!t)return; document.querySelector('[data-defe-users-panel]')?.remove();
    const p=document.createElement('div'); p.dataset.defeUsersPanel='1'; p.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(17,24,39,.5);padding:20px;display:flex;align-items:center;justify-content:center';
    p.innerHTML='<div style="background:#fff;width:min(480px,100%);max-height:85vh;overflow:auto;border-radius:20px;padding:20px"><h2>Usuarios</h2><div data-body>Cargando…</div><button data-close style="width:100%;padding:12px">Cerrar</button></div>'; document.body.appendChild(p); p.querySelector('[data-close]').onclick=()=>p.remove();
    const body=p.querySelector('[data-body]'); try{const r=await apiFetch('/api/admin/users',{headers:{Authorization:`Bearer ${t}`}});const us=await r.json();if(!r.ok)throw new Error(us.detail||'Error');body.innerHTML='';for(const u of us){const d=document.createElement('div');d.style.cssText='border:1px solid #ddd;border-radius:12px;padding:12px;margin:10px 0';d.innerHTML=`<strong></strong><div>${u.role==='admin'?'Administrador':'Usuario'}</div><button>${u.role==='admin'?'Quitar administrador':'Hacer administrador'}</button>`;d.querySelector('strong').textContent=u.email;d.querySelector('button').onclick=async()=>{const nr=u.role==='admin'?'lector':'admin';const rr=await apiFetch(`/api/admin/users/${u.id}/role`,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`},body:JSON.stringify({role:nr})});const x=await rr.json().catch(()=>({}));if(!rr.ok)return alert(x.detail||'No se pudo cambiar el rol');p.remove();users()};body.appendChild(d)}}catch(e){body.textContent=e.message}
  }
  function admin(){const t=token(),ok=t&&role(t)==='admin';let b=document.querySelector('[data-defe-users-button]');if(!ok){b?.remove();return}if(!b){b=document.createElement('button');b.dataset.defeUsersButton='1';b.textContent='Usuarios';b.style.cssText='position:fixed;right:14px;top:84px;z-index:9998;background:#3437a5;color:#fff;border:0;border-radius:999px;padding:10px 14px;font-weight:700';b.onclick=users;document.body.appendChild(b)}}
  new MutationObserver(admin).observe(document.documentElement,{childList:true,subtree:true}); admin(); setInterval(admin,1500);
})();