(() => {
  const API = 'https://el-defe-v5-production.up.railway.app';
  const STYLE_ID = 'defe-auth-overlay-style';

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .defe-modal-backdrop{position:fixed;inset:0;background:rgba(17,24,39,.48);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px}
      .defe-modal{width:min(440px,100%);max-height:86vh;overflow:auto;background:#fff;border-radius:22px;padding:24px;box-shadow:0 24px 70px rgba(0,0,0,.25);font-family:inherit;color:#1f2937}
      .defe-modal h2{margin:0 0 8px;font-size:24px}.defe-modal p{color:#6b7280;margin:0 0 18px;line-height:1.45}
      .defe-field{width:100%;box-sizing:border-box;border:1px solid #d9deea;border-radius:14px;padding:14px 15px;font-size:16px;margin:7px 0;background:#fff}
      .defe-primary,.defe-secondary{width:100%;border:0;border-radius:14px;padding:14px 16px;font-size:16px;font-weight:700;cursor:pointer;margin-top:10px}
      .defe-primary{background:#3437a5;color:#fff}.defe-secondary{background:#eef0f8;color:#3437a5}
      .defe-error{color:#b42318!important;font-size:14px;margin-top:10px!important}.defe-ok{color:#067647!important;font-size:14px;margin-top:10px!important}
      .defe-users-fab{position:fixed;right:14px;top:84px;z-index:9998;background:#3437a5;color:#fff;border:0;border-radius:999px;padding:10px 14px;font-weight:700;box-shadow:0 8px 24px rgba(52,55,165,.28)}
      .defe-user-row{border:1px solid #e5e7eb;border-radius:14px;padding:12px;margin:10px 0}.defe-user-mail{font-weight:700;word-break:break-all}.defe-user-meta{font-size:13px;color:#6b7280;margin:4px 0 8px}
      .defe-role-btn{border:0;border-radius:10px;padding:8px 10px;font-weight:700;cursor:pointer;background:#eef0f8;color:#3437a5}.defe-role-admin{background:#e7e8ff;color:#272a8b}
    `;
    document.head.appendChild(style);
  }

  function modal(title, subtitle) {
    ensureStyles();
    const back = document.createElement('div');
    back.className = 'defe-modal-backdrop';
    back.innerHTML = `<div class="defe-modal"><h2>${title}</h2><p>${subtitle}</p><div class="defe-modal-body"></div><button class="defe-secondary defe-close">Cerrar</button></div>`;
    back.querySelector('.defe-close').onclick = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) back.remove(); });
    document.body.appendChild(back);
    return { back, body: back.querySelector('.defe-modal-body') };
  }

  async function register() {
    const { back, body } = modal('Crear cuenta', 'La cuenta se crea como usuario común. Los administradores se asignan únicamente desde Gestión.');
    body.innerHTML = `
      <input class="defe-field" type="email" autocomplete="email" placeholder="Email" data-reg-email>
      <input class="defe-field" type="password" autocomplete="new-password" placeholder="Contraseña (mínimo 8 caracteres)" data-reg-pass>
      <input class="defe-field" type="password" autocomplete="new-password" placeholder="Repetir contraseña" data-reg-pass2>
      <button class="defe-primary" data-reg-submit>Crear mi cuenta</button>
      <p data-reg-msg></p>`;
    body.querySelector('[data-reg-submit]').onclick = async () => {
      const email = body.querySelector('[data-reg-email]').value.trim();
      const password = body.querySelector('[data-reg-pass]').value;
      const password2 = body.querySelector('[data-reg-pass2]').value;
      const msg = body.querySelector('[data-reg-msg]');
      msg.className = '';
      if (!email || !password) { msg.className = 'defe-error'; msg.textContent = 'Completá email y contraseña.'; return; }
      if (password !== password2) { msg.className = 'defe-error'; msg.textContent = 'Las contraseñas no coinciden.'; return; }
      try {
        const r = await fetch(`${API}/api/auth/register`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.detail || 'No se pudo crear la cuenta');
        msg.className = 'defe-ok';
        msg.textContent = 'Cuenta creada. Ya podés ingresar con tu email y contraseña.';
        const emailInput = [...document.querySelectorAll('input')].find(i => /email/i.test(i.placeholder || '') || i.type === 'email');
        const passInput = [...document.querySelectorAll('input')].find(i => /contrase/i.test(i.placeholder || '') && i.type === 'password');
        if (emailInput) { emailInput.value = email; emailInput.dispatchEvent(new Event('input',{bubbles:true})); }
        if (passInput) { passInput.value = password; passInput.dispatchEvent(new Event('input',{bubbles:true})); }
        setTimeout(() => back.remove(), 1500);
      } catch (e) {
        msg.className = 'defe-error'; msg.textContent = e.message;
      }
    };
  }

  function bindRegisterButton() {
    const buttons = [...document.querySelectorAll('button,a')];
    const btn = buttons.find(el => (el.textContent || '').trim().toLowerCase() === 'no tengo cuenta');
    if (!btn || btn.dataset.defeRegisterBound) return;
    btn.dataset.defeRegisterBound = '1';
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); register(); }, true);
  }

  function jwtFromValue(value) {
    if (!value) return null;
    if (typeof value !== 'string') return null;
    const direct = value.match(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/);
    if (direct) return direct[0];
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'string') return jwtFromValue(parsed);
      if (parsed && typeof parsed === 'object') {
        for (const v of Object.values(parsed)) { const found = jwtFromValue(typeof v === 'string' ? v : JSON.stringify(v)); if (found) return found; }
      }
    } catch (_) {}
    return null;
  }

  function getToken() {
    for (const store of [localStorage, sessionStorage]) {
      for (let i=0;i<store.length;i++) {
        const t = jwtFromValue(store.getItem(store.key(i)));
        if (t) return t;
      }
    }
    return null;
  }

  function tokenRole(token) {
    try {
      const payload = token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
      return JSON.parse(decodeURIComponent(escape(atob(payload.padEnd(Math.ceil(payload.length/4)*4,'='))))).role || null;
    } catch (_) { return null; }
  }

  async function manageUsers() {
    const token = getToken();
    if (!token) return;
    const { body } = modal('Usuarios', 'Los nuevos registros son usuarios comunes. Desde acá podés promover o quitar administradores.');
    body.innerHTML = '<p>Cargando usuarios…</p>';
    try {
      const r = await fetch(`${API}/api/admin/users`, {headers:{Authorization:`Bearer ${token}`}});
      const users = await r.json();
      if (!r.ok) throw new Error(users.detail || 'No se pudieron cargar los usuarios');
      body.innerHTML = '';
      users.forEach(u => {
        const row = document.createElement('div'); row.className = 'defe-user-row';
        row.innerHTML = `<div class="defe-user-mail"></div><div class="defe-user-meta"></div><button class="defe-role-btn ${u.role==='admin'?'defe-role-admin':''}"></button>`;
        row.querySelector('.defe-user-mail').textContent = u.email;
        row.querySelector('.defe-user-meta').textContent = `Rol actual: ${u.role === 'admin' ? 'Administrador' : 'Usuario'}`;
        const b = row.querySelector('.defe-role-btn');
        b.textContent = u.role === 'admin' ? 'Quitar administrador' : 'Hacer administrador';
        b.onclick = async () => {
          const next = u.role === 'admin' ? 'lector' : 'admin';
          if (!confirm(next === 'admin' ? `¿Convertir ${u.email} en administrador?` : `¿Quitar permisos de administrador a ${u.email}?`)) return;
          const rr = await fetch(`${API}/api/admin/users/${u.id}/role`, {method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({role:next})});
          const dd = await rr.json().catch(()=>({}));
          if (!rr.ok) { alert(dd.detail || 'No se pudo cambiar el rol'); return; }
          manageUsers(); row.closest('.defe-modal-backdrop')?.remove();
        };
        body.appendChild(row);
      });
    } catch (e) { body.innerHTML = `<p class="defe-error">${e.message}</p>`; }
  }

  function syncAdminButton() {
    const token = getToken();
    const isAdmin = token && tokenRole(token) === 'admin';
    let btn = document.querySelector('.defe-users-fab');
    if (!isAdmin) { if (btn) btn.remove(); return; }
    if (!btn) {
      btn = document.createElement('button'); btn.className = 'defe-users-fab'; btn.textContent = 'Usuarios'; btn.onclick = manageUsers; document.body.appendChild(btn);
    }
  }

  const observer = new MutationObserver(() => { bindRegisterButton(); syncAdminButton(); });
  observer.observe(document.documentElement, {childList:true,subtree:true});
  bindRegisterButton(); syncAdminButton();
  setInterval(syncAdminButton, 1500);
})();
