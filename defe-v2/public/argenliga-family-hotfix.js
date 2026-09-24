// Temporary V2 bridge: render the selected ARGENLIGA activity in Family > Partidos
// without falling through to the FEFI-only block in the current React bundle.
(() => {
  const API_BASE = 'https://defe-v2-laamba-staging-production.up.railway.app';
  let lastKey = '';
  let busy = false;

  const selectedArgenliga = () => {
    const app = document.querySelector('.familyApp');
    if (!app) return null;
    const active = app.querySelector('.activitySwitch button.active');
    if (!active) return null;
    const league = (active.querySelector('b')?.textContent || '').toUpperCase();
    if (!league.includes('ARGENLIGA')) return null;
    const category = (active.querySelector('small')?.textContent || '').trim();
    return category ? `ARGENLIGA|${category}` : null;
  };

  const fmtDate = value => {
    if (!value) return 'Fecha a confirmar';
    try {
      return new Date(String(value).slice(0,10) + 'T12:00:00').toLocaleDateString('es-AR', {
        weekday: 'short', day: '2-digit', month: '2-digit'
      });
    } catch (_) { return String(value); }
  };

  async function render() {
    const key = selectedArgenliga();
    const panel = document.querySelector('.familyApp .familyTabPanel');
    if (!key || !panel || busy) { if (!key) lastKey = ''; return; }
    const signature = key + '|' + (panel.querySelector('h1')?.textContent || '');
    if (panel.dataset.argenligaRendered === signature && lastKey === signature) return;
    busy = true;
    try {
      const token = localStorage.getItem('defe_token');
      const r = await fetch(API_BASE + '/api/availability/v2/me', {headers: token ? {Authorization:'Bearer '+token} : {}});
      if (!r.ok) return;
      const d = await r.json();
      const ev = (d.items || []).find(x => String(x.selection || '').toUpperCase() === key.toUpperCase());
      const small = panel.querySelector(':scope > small');
      if (small) small.textContent = 'PRÓXIMO PARTIDO · ARGENLIGA';
      const h3 = panel.querySelector('h3');
      const p = h3?.nextElementSibling;
      if (ev?.available) {
        if (h3) h3.textContent = `${ev.home || 'DEF. DE SANTOS LUGARES'} vs. ${ev.away || 'Rival a confirmar'}`;
        if (p) p.innerHTML = `<b>${fmtDate(ev.date)}</b> · ${ev.match_time || ev.time || 'Horario a confirmar'} hs · ${(ev.home_away === 'local' || ev.local === true) ? 'Local' : 'Visitante'}`;
        const status = panel.querySelector('.matchStatus b');
        if (status && !status.textContent.includes('CONFIRM')) status.textContent = 'FECHA CONFIRMADA';
      } else {
        if (h3) h3.textContent = 'Próxima fecha a confirmar';
        if (p) { p.textContent = 'ARGENLIGA todavía no publicó o programó el próximo partido de esta categoría.'; p.classList.add('muted'); }
      }
      panel.dataset.argenligaRendered = signature;
      lastKey = signature;
    } finally { busy = false; }
  }

  const observer = new MutationObserver(() => queueMicrotask(render));
  observer.observe(document.documentElement, {subtree:true, childList:true, attributes:true, attributeFilter:['class']});
  document.addEventListener('click', () => setTimeout(render, 0), true);
  render();
})();