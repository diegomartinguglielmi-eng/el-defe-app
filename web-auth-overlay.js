(() => {
  const API = 'https://el-defe-v5-production.up.railway.app';

  async function apiFetch(path, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${API}${path}`, {...options, signal: controller.signal});
    } finally {
      clearTimeout(timer);
    }
  }

  function textOf(el) {
    return (el?.textContent || '').trim().toLowerCase();
  }

  function findVisibleRegisterFields() {
    const visible = el => !!(el && el.offsetParent !== null);
    const inputs = [...document.querySelectorAll('input')].filter(visible);
    const email = inputs.find(i => i.type === 'email' || /email/i.test(i.placeholder || ''));
    const password = inputs.find(i => i.type === 'password' && /contrase/i.test(i.placeholder || '')) || inputs.find(i => i.type === 'password');
    const name = inputs.find(i => /nombre/i.test(i.placeholder || ''));
    return {email, password, name};
  }

  function showInlineMessage(button, message, ok = false) {
    let msg = button.parentElement?.querySelector('[data-defe-register-msg]');
    if (!msg) {
      msg = document.createElement('div');
      msg.dataset.defeRegisterMsg = '1';
      msg.style.marginTop = '12px';
      msg.style.fontSize = '14px';
      msg.style.lineHeight = '1.4';
      button.insertAdjacentElement('afterend', msg);
    }
    msg.style.color = ok ? '#067647' : '#b42318';
    msg.textContent = message;
  }

  function setButtonState(button, busy) {
    if (!button) return;
    if (!button.dataset.defeOriginalText) button.dataset.defeOriginalText = button.textContent.trim() || 'Crear cuenta';
    button.disabled = busy;
    button.textContent = busy ? 'Un momento…' : button.dataset.defeOriginalText;
  }

  async function handleNativeRegister(button) {
    const {email, password, name} = findVisibleRegisterFields();
    const emailValue = (email?.value || '').trim().toLowerCase();
    const passwordValue = password?.value || '';

    if (name && !name.value.trim()) {
      showInlineMessage(button, 'Completá nombre y apellido.');
      return;
    }
    if (!emailValue || !emailValue.includes('@')) {
      showInlineMessage(button, 'Ingresá un email válido.');
      return;
    }
    if (passwordValue.length < 8) {
      showInlineMessage(button, 'La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setButtonState(button, true);
    showInlineMessage(button, 'Creando tu cuenta…', true);
    try {
      const r = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email: emailValue, password: passwordValue})
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.detail || `No se pudo crear la cuenta (${r.status})`);

      if (data.access_token) {
        localStorage.setItem('defe_access_token', data.access_token);
        localStorage.setItem('defe_user', JSON.stringify(data.user || {email: emailValue, role: 'lector'}));
      }
      showInlineMessage(button, 'Cuenta creada correctamente. Ya podés ingresar.', true);
      setTimeout(() => {
        const loginLink = [...document.querySelectorAll('button,a')].find(el => /ya tengo cuenta/i.test(el.textContent || ''));
        if (loginLink) loginLink.click();
      }, 900);
    } catch (e) {
      const message = e?.name === 'AbortError' ? 'La conexión tardó demasiado. Probá nuevamente.' : (e?.message || 'No se pudo crear la cuenta.');
      showInlineMessage(button, message, false);
    } finally {
      setButtonState(button, false);
    }
  }

  function bindNativeRegister() {
    const candidates = [...document.querySelectorAll('button')].filter(el => {
      const t = textOf(el);
      return t === 'crear cuenta' || t === 'crear mi cuenta' || t === 'un momento…' || t === 'un momento...';
    });
    for (const btn of candidates) {
      if (btn.dataset.defeNativeRegisterBound) continue;
      const {email, password} = findVisibleRegisterFields();
      if (!email || !password) continue;
      btn.dataset.defeNativeRegisterBound = '1';
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopImmediatePropagation();
        handleNativeRegister(btn);
      }, true);
    }
  }

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
    } catch (_) {
      return null;
    }
  }

  async function manageUsers() {
    const token = getToken();
    if (!token) return;
    const existing = document.querySelector('[data-defe-users-panel]');
    existing?.remove();
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
    } catch (e) {
      body.textContent = e.message;
    }
  }

  function syncAdminButton() {
    const token = getToken();
    const isAdmin = token && tokenRole(token) === 'admin';
    let btn = document.querySelector('[data-defe-users-button]');
    if (!isAdmin) {
      btn?.remove();
      return;
    }
    if (!btn) {
      btn = document.createElement('button');
      btn.dataset.defeUsersButton = '1';
      btn.textContent = 'Usuarios';
      btn.style.cssText = 'position:fixed;right:14px;top:84px;z-index:9998;background:#3437a5;color:#fff;border:0;border-radius:999px;padding:10px 14px;font-weight:700';
      btn.onclick = manageUsers;
      document.body.appendChild(btn);
    }
  }

  const observer = new MutationObserver(() => {
    bindNativeRegister();
    syncAdminButton();
  });
  observer.observe(document.documentElement, {childList:true, subtree:true});
  bindNativeRegister();
  syncAdminButton();
  setInterval(() => { bindNativeRegister(); syncAdminButton(); }, 1000);
})();
