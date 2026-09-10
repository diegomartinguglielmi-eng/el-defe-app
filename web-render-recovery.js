(() => {
  const ROOT_SELECTOR = '#root';
  const RELOAD_KEY = 'defe-render-recovery-v1';
  let timer = null;

  function rootLooksBlank() {
    const root = document.querySelector(ROOT_SELECTOR);
    if (!root) return true;
    const text = (root.innerText || '').replace(/\s+/g, ' ').trim();
    const rect = root.getBoundingClientRect();
    return text.length < 40 || rect.height < 220;
  }

  function canReload() {
    const now = Date.now();
    let state = { ts: 0, count: 0 };
    try { state = JSON.parse(sessionStorage.getItem(RELOAD_KEY) || '{}'); } catch (_) {}
    if (!state.ts || now - state.ts > 12000) state = { ts: now, count: 0 };
    if ((state.count || 0) >= 2) return false;
    state.count = (state.count || 0) + 1;
    state.ts = now;
    sessionStorage.setItem(RELOAD_KEY, JSON.stringify(state));
    return true;
  }

  function recoverIfNeeded() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (document.visibilityState !== 'visible' || !rootLooksBlank()) return;
      if (!canReload()) return;
      location.reload();
    }, 900);
  }

  function arm() {
    const root = document.querySelector(ROOT_SELECTOR);
    if (!root) {
      recoverIfNeeded();
      return;
    }
    new MutationObserver(recoverIfNeeded).observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });
    recoverIfNeeded();
  }

  // Los cambios de sesión/ruta pueden vaciar temporalmente el árbol React.
  // Si queda vacío de forma sostenida, una recarga reconstruye el estado desde storage.
  document.addEventListener('click', (event) => {
    const el = event.target && event.target.closest ? event.target.closest('button,a') : null;
    const label = (el?.innerText || '').toLowerCase();
    if (label.includes('cerrar sesión') || label.includes('ingresar') || label.includes('guardar selección')) {
      setTimeout(recoverIfNeeded, 250);
    }
  }, true);
  window.addEventListener('pageshow', recoverIfNeeded);
  window.addEventListener('focus', recoverIfNeeded);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arm, { once: true });
  else arm();
})();
