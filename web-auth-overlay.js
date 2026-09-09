(() => {
  const API = 'https://el-defe-v5-production.up.railway.app';
  let registering = false;

  async function apiFetch(path, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${API}${path}`, {...options, signal: controller.signal});
    } finally {
      clearTimeout(timer);
    }
  }

  function visible(el) { return !!(el && el.offsetParent !== null); }
  function textOf(el) { return (el?.textContent || '').trim().toLowerCase(); }

  function registerFields() {
    const inputs = [...document.querySelectorAll('input')].filter(visible);
    const email = inputs.find(i => i.type === 'email' || /email/i.test(i.placeholder || ''));
    const passwords = inputs.filter(i => i.type === 'password');
    const password = passwords.find(i => /contrase/i.test(i.placeholder || '')) || passwords[0];
    const name = inputs.find(i => /nombre/i.test(i.placeholder || ''));
    return {email, password, name};
  }

  function isRegisterButton(el) {
    if (!el) return false;
    const btn = el.closest?.('button');
    if (!btn) return false;
    const t = textOf(btn);
    if (!(t === 'crear cuenta' || t === 'crear mi cuenta' || t === 'un momento…' || t === 'un momento...')) return false;
    const {email, password} = registerFields();
    return !!(email && password);
  }

  function messageNode(button) {
    let msg = document.querySelector('[data-defe-register-msg]');
    if (!msg) {
      msg = document.createElement('div');
      msg.dataset.defeRegisterMsg = '1';
      msg.style.cssText = 'margin-top:12px;font-size:14px;line-height:1.4';
      button.insertAdjacentElement('afterend', msg);
    }
    return msg;
  }

  function showMessage(button, text, ok = false) {
    const msg = messageNode(button);
    msg.style.color = ok ? '#067647' : '#b42318';
    msg.textContent = text;
  }

  function setBusy(button, busy) {
    if (!button.dataset.defeOriginalText) button.dataset.defeOriginalText = 'Crear cuenta';
    button.disabled = busy;
    button.textContent = busy ? 'Un momento…' : button.dataset.defeOriginalText;
  }

  async function register(button) {
    if (registering) return;
    const {email, password, name} = registerFields();
    const emailValue = (email?.value || '').trim().toLowerCase();
    const passwordValue = password?.value || '';

    if (name && !name.value.trim()) return showMessage(button, 'Completá nombre y apellido.');
    if (!emailValue || !emailValue.includes('@')) return showMessage(button, 'Ingresá un email válido.');
    if (passwordValue.length < 8) return showMessage(button, 'La contraseña debe tener al menos 8 caracteres.');

    registering = true;
    setBusy(button, true);
    showMessage(button, 'Creando tu cuenta…', true);
    try {
      const r = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email: emailValue, password: passwordValue})
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        let detail = data.detail;
        if (Array.isArray(detail)) detail = detail.map(x => x.msg).filter(Boolean).join(' · ');
        throw new Error(detail || `No se pudo crear la cuenta (${r.status})`);
      }
      if (data.access_token) {
        localStorage.setItem('defe_access_token', data.access_token);
        localStorage.setItem('defe_user', JSON.stringify(data.user || {email: emailValue, role: 'lector'}));
      }
      showMessage(button, 'Cuenta creada correctamente. Ya podés ingresar.', true);
      setTimeout(() => {
        const loginLink = [...document.querySelectorAll('button,a')].find(el => /ya tengo cuenta/i.test(el.textContent || ''));
        loginLink?.click();
      }, 900);
    } catch (e) {
      const msg = e?.name === 'AbortError' ? 'La conexión tardó demasiado. Probá nuevamente.' : (e?.message || 'No se pudo crear la cuenta.');
      showMessage(button, msg, false);
    } finally {
      registering = false;
      setBusy(button, false);
    }
  }

  // Captura a nivel documento: corre antes que los handlers delegados de React.
  document.addEventListener('click', e => {
    if (!isRegisterButton(e.target)) return;
    const button = e.target.closest('button');
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    register(button);
  }, true);

  document.addEventListener('submit', e => {
    const form = e.target;
    const button = [...form.querySelectorAll('button')].find(b => isRegisterButton(b));
    if (!button) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    register(button);
  }, true);

  function jwtFromValue(value) {
    if (!value || typeof value !== 'string') return null;
    const direct = value.match(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/);
    if (direct) return direct[0];
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'string') return jwtFromValue(parsed);
      if (parsed && typeof parsed === 'object') {
        for (const v of Object.values(parsed)) {
          const found = jwtFromValue(typeof v === 'string' ? v : JSON.stringify(v));
          if (found) return found;
        }
      }
    } catch (_) {}
    return null;
  }

  function getToken() {
    for (const store of [localStorage, sessionStorage]) {
      for (let i = 0; i < store.length; i++) {
        const t = jwtFromValue(store.getItem(store.key(i)));
        if (t) return t;
      }
    }
    return null;
  }

  function tokenRole(token) {
    try {
      const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='))).role || null;
    } catch (_) { return null; }
  }

  async function manageUsers() {
    const token = getToken();
    if (!token) return;
    document.querySelector('[data-defe-users-panel]')?.remove();
    const panel = document.createElement('div');
    panel.dataset.defeUsersPanel = '1';
    panel.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(17,24,39,.5);padding:20px;display:flex;align-items:center;justify-content:center';
    panel.innerHTML = '<div style="background:#fff;width:min(480px,100%);max-height:85vh;overflow:auto;border-radius:20px;padding:20px"><h2 style="margin-top:0">Usuarios</h2><div data-users-body>Cargando…</div><button data-close style="width:100%;margin-top:12px;padding:12px;border:0;border-radius:12px">Cerrar</button></div>';
    document.body.appendChild(panel);
    panel.querySelector('[data-close]').onclick = () => panel.remove();
    const body = panel.querySelector('[data-users-body]');
    try {
      const r = await apiFetch('/api/admin/users', {headers:{Authorization:`Bearer ${token}`}});
      const users = await r.json();
      if (!r.ok) throw new Error(users.detail || 'No se pudieron cargar los usuarios');
      body.innerHTML = '';
      for (const u of users) {
        const row = document.createElement('div');
        row.style.cssText = 'border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin:10px 0';
        row.innerHTML = `<strong></strong><div style="font-size:13px;margin:5px 0">${u.role === 'admin' ? 'Administrador' : 'Usuario'}</div><button style="padding:8px 10px;border:0;border-radius:9px">${u.role === 'admin' ? 'Quitar administrador' : 'Hacer administrador'}</button>`;
        row.querySelector('strong').textContent = u.email;
        row.querySelector('button').onclick = async () => {
          const role = u.role === 'admin' ? 'lector' : 'admin';
          const rr = await apiFetch(`/api/admin/users/${u.id}/role`, {method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({role})});
          const dd = await rr.json().catch(() => ({}));
          if (!rr.ok) return alert(dd.detail || 'No se pudo cambiar el rol');
          panel.remove();
          manageUsers();
        };
        body.appendChild(row);
      }
    } catch (e) { body.textContent = e.message; }
  }

  function syncAdminButton() {
    const token = getToken();
    const isAdmin = token && tokenRole(token) === 'admin';
    let btn = document.querySelector('[data-defe-users-button]');
    if (!isAdmin) { btn?.remove(); return; }
    if (!btn) {
      btn = document.createElement('button');
      btn.dataset.defeUsersButton = '1';
      btn.textContent = 'Usuarios';
      btn.style.cssText = 'position:fixed;right:14px;top:84px;z-index:9998;background:#3437a5;color:#fff;border:0;border-radius:999px;padding:10px 14px;font-weight:700';
      btn.onclick = manageUsers;
      document.body.appendChild(btn);
    }
  }

  syncAdminButton();
  setInterval(syncAdminButton, 1200);
})();
