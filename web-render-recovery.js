(() => {
  const ROOT = '#root';
  const BASE = '/el-defe-app/';
  let blankTimer = null;
  let lastRecovery = 0;

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

  function clearAuthOnly() {
    for (const store of [localStorage, sessionStorage]) {
      const remove = [];
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        const value = store.getItem(key);
        const k = (key || '').toLowerCase();
        if (jwtFromValue(value) || /(^|[_-])(token|jwt|auth|session)([_-]|$)/.test(k)) {
          // No borrar preferencias del usuario, categorías seguidas ni estado de push.
          if (!k.includes('followed') && !k.includes('push') && !k.includes('notif')) remove.push(key);
        }
      }
      remove.forEach(k => store.removeItem(k));
    }
  }

  function hardHome(reason) {
    const now = Date.now();
    if (now - lastRecovery < 2500) return;
    lastRecovery = now;
    const u = `${BASE}?recover=${now}&reason=${encodeURIComponent(reason || 'blank')}`;
    location.replace(u);
  }

  function rootLooksBlank() {
    const root = document.querySelector(ROOT);
    if (!root) return true;
    const text = (root.innerText || '').replace(/\s+/g, ' ').trim();
    const visibleNodes = [...root.querySelectorAll('*')].filter(el => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 20 && r.height > 20 && s.display !== 'none' && s.visibility !== 'hidden';
    }).length;
    return text.length < 25 && visibleNodes < 3;
  }

  function scheduleBlankCheck(reason = 'blank') {
    clearTimeout(blankTimer);
    blankTimer = setTimeout(() => {
      if (document.visibilityState === 'visible' && rootLooksBlank()) hardHome(reason);
    }, 1200);
  }

  // El logout del bundle deja el árbol React vacío en algunos Android/PWA.
  // Lo resolvemos de forma determinista: limpiamos SOLO autenticación y arrancamos la app de cero.
  document.addEventListener('click', (event) => {
    const el = event.target?.closest?.('button,a,[role="button"]');
    if (!el) return;
    const label = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();

    if (label.includes('cerrar sesión') || label.includes('cerrar sesion')) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      clearAuthOnly();
      setTimeout(() => hardHome('logout'), 50);
      return;
    }

    if (label.includes('ingresar') || label.includes('guardar selección') || label.includes('guardar seleccion')) {
      setTimeout(() => scheduleBlankCheck('session-change'), 300);
    }
  }, true);

  function armObserver() {
    const root = document.querySelector(ROOT);
    if (!root) {
      scheduleBlankCheck('missing-root');
      return;
    }
    const observer = new MutationObserver(() => scheduleBlankCheck('empty-root'));
    observer.observe(root, { childList: true, subtree: true });
    scheduleBlankCheck('startup');
  }

  window.addEventListener('pageshow', () => scheduleBlankCheck('pageshow'));
  window.addEventListener('focus', () => scheduleBlankCheck('focus'));

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', armObserver, { once: true });
  } else {
    armObserver();
  }
})();
