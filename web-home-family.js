(()=>{
'use strict';
const core=window.DefeCore;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function root(){
  const headings=[...document.querySelectorAll('h1,h2,h3')];
  const h=headings.find(x=>/pr[oó]ximas fechas/i.test(x.textContent||''));
  return h?.parentElement||null;
}
function card(m){
  const rival=esc(m.rival||m.away||m.home||'Próximo partido');
  const when=[m.date,m.time].filter(Boolean).map(esc).join(' · ');
  return `<article class="family-next-card" data-family-next="${esc(m.person_id)}">
    <div class="family-next-player">${esc(m.player_name)}</div>
    <div class="family-next-meta">${esc(m.competition)} · ${esc(m.category)}</div>
    <strong>${rival}</strong>${when?`<div>${when}</div>`:''}
  </article>`;
}
function render(data){
  if(!data?.next_matches?.length)return;
  const host=root(); if(!host)return;
  let box=host.querySelector('[data-family-home]');
  if(!box){
    box=document.createElement('section'); box.dataset.familyHome='1';
    box.innerHTML='<div class="family-home-title">Tus próximos partidos</div><div data-family-home-list></div>';
    host.appendChild(box);
    const st=document.createElement('style');st.textContent=`
      [data-family-home]{margin:12px 0 4px}.family-home-title{font-weight:800;margin:0 0 8px}
      [data-family-home-list]{display:grid;gap:8px}.family-next-card{border:1px solid rgba(0,0,0,.12);border-radius:14px;padding:12px;background:#fff}
      .family-next-player{font-weight:800}.family-next-meta{font-size:.82rem;opacity:.72;margin:2px 0 6px}
    `;document.head.appendChild(st);
  }
  box.querySelector('[data-family-home-list]').innerHTML=data.next_matches.map(card).join('');
}
async function load(){
  if(!core?.token())return;
  try{render(await core.api('/api/home/personalized'))}catch(_){/* conserva Home histórico */}
}
window.addEventListener('focus',load);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
setTimeout(load,400);setTimeout(load,1800);
})();