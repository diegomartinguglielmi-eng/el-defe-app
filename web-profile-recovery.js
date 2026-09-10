// El Defe · recuperación específica de Mi Defe después de navegar por la app
(() => {
  if (window.__defeProfileRecoveryLoaded) return;
  window.__defeProfileRecoveryLoaded = true;

  const BASE = '/el-defe-app/';
  const INTENT_KEY = 'defe_reopen_profile_once';
  let recovering = false;

  function labelOf(el) {
    return String(el?.innerText || el?.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function isProfileTrigger(el) {
    const label = labelOf(el);
    return label.includes('mi defe') || label === 'mi df' || label.includes('mi df');
  }

  function isVisible(el) {
    if (!el) return false;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 10 && r.height > 10;
  }

  function profileLooksOpen() {
    const profile = document.getElementById('profile');
    if (!profile) return false;
    if (profile.classList.contains('on')) return true;
    return isVisible(profile);
  }

  function appLooksBlank() {
    const root = document.getElementById('root');
    if (!root) return true;
    const text = String(root.innerText || '').replace(/\s+/g, ' ').trim();
    const visible = [...root.querySelectorAll('section,.screen,.main,.card,header,nav')]
      .filter(isVisible).length;
    return text.length < 20 || visible < 2;
  }

  function tryOpenProfile() {
    try {
      if (typeof window.show === 'function') {
        window.show('profile');
        return true;
      }
    } catch (_) {}
    return false;
  }

  function reloadAndReopen() {
    if (recovering) return;
    recovering = true;
    try { sessionStorage.setItem(INTENT_KEY, '1'); } catch (_) {}
    const now = Date.now();
    location.replace(`${BASE}?recoverProfile=${now}`);
  }

  function verifyProfileOpen() {
    setTimeout(() => {
      if (profileLooksOpen() && !appLooksBlank()) return;
      tryOpenProfile();
      setTimeout(() => {
        if (profileLooksOpen() && !appLooksBlank()) return;
        reloadAndReopen();
      }, 350);
    }, 180);
  }

  document.addEventListener('click', (event) => {
    const el = event.target?.closest?.('button,a,[role="button"]');
    if (!el || !isProfileTrigger(el)) return;
    // Dejamos actuar a la navegación original y sólo verificamos que Mi Defe
    // haya quedado realmente visible. Si falla, reabrimos el perfil sin perder sesión.
    verifyProfileOpen();
  }, true);

  function consumeReopenIntent() {
    let reopen = false;
    try {
      reopen = sessionStorage.getItem(INTENT_KEY) === '1';
      if (reopen) sessionStorage.removeItem(INTENT_KEY);
    } catch (_) {}
    if (!reopen) return;

    const attempt = () => {
      if (tryOpenProfile()) {
        setTimeout(() => {
          if (!profileLooksOpen()) {
            const btn = [...document.querySelectorAll('button,a,[role="button"]')].find(isProfileTrigger);
            btn?.click();
          }
        }, 250);
      }
    };

    setTimeout(attempt, 500);
    setTimeout(() => {
      if (!profileLooksOpen()) attempt();
    }, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', consumeReopenIntent, { once: true });
  } else {
    consumeReopenIntent();
  }
})();
