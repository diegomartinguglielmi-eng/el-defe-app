(()=>{
'use strict';
const core=window.DefeCore;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={yes:'Voy',no:'No voy',maybe:'A confirmar',pending:'Sin responder'};
function root(){const hs=[...document.querySelectorAll('h1,h2,h3')];const h=hs.find(x=>/pr[oó]ximas fechas/i.test(x.textContent||''));return h?.parentElement||document.querySelector('main')||null}
function emptyHint(host){return [...host.querySelectorAll('div,p,span')].find(x=>/Elegí qué categorías seguís para ver acá sus próximos partidos/i.test(x.textContent||'')&&x.children.length===0)}
function when(x){return [x.date,x.time].filter(Boolean).map(esc).join(' · ')||'Fecha y hora a confirmar'}
function card(x){
 const r=x.response||'pending', disabled=x.available===false;
 return `<article class="family-next-card" data-family-next="${esc(x.person_id)}">
 <div class="family-next-player">${esc(x.player_name)}</div><div class="family-next-meta">${esc(x.competition)} · ${esc(x.category)}</div>
 <strong>${esc(disabled?'Sin próxima fecha publicada':(x.rival||'Rival a confirmar'))}</strong>
 <div class="family-next-when">${disabled?'':when(x)}</div>
 ${disabled?'':`<div class="family-next-question">¿${esc(x.player_name)} juega?</div><div class="family-next-actions">${[['yes','✓ Voy'],['no','✕ No voy'],['maybe','◷ A confirmar']].map(([v,l])=>`<button data-family-answer="${v}" data-person="${x.person_id}" data-match="${x.match_id}" data-selection="${esc(x.selection)}" class="${r===v?'active':''}">${l}</button>`).join('')}</div><div class="family-next-status">Estado: ${labels[r]||labels.pending}</div>`}
 </article>`;
}
function wire(box){box.querySelectorAll('[data-family-answer]').forEach(b=>b.onclick=async()=>{const s=b.closest('.family-next-card').querySelector('.family-next-status');try{s.textContent='Guardando…';await core.api('/api/availability/v2/'+b.dataset.match,{method:'PUT',body:JSON.stringify({person_id:Number(b.dataset.person),selection:b.dataset.selection,status:b.dataset.familyAnswer})});await load()}catch(e){s.textContent=e.message||'No se pudo guardar'}})}
function render(items){
 if(document.getElementById('defe-mi-defe')){document.querySelectorAll('[data-family-home]').forEach(x=>x.remove());return}
 const host=root();if(!host)return;let box=host.querySelector('[data-family-home]');
 if(!items.length){box?.remove();return}
 if(!box){box=document.createElement('section');box.dataset.familyHome='1';const hint=emptyHint(host);if(hint){hint.style.display='none';hint.parentElement?.insertBefore(box,hint)}else host.appendChild(box);const st=document.createElement('style');st.textContent=`
 [data-family-home]{margin:12px 0 18px}.family-home-title{font-size:1.05rem;font-weight:900;margin:0 0 9px}.family-home-sub{font-size:.84rem;opacity:.68;margin:-5px 0 10px}
 [data-family-home-list]{display:grid;gap:10px}.family-next-card{border:1px solid rgba(0,0,0,.12);border-radius:16px;padding:13px;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.04)}
 .family-next-player{font-weight:900;font-size:1rem}.family-next-meta{font-size:.8rem;opacity:.68;margin:2px 0 7px}.family-next-when{margin-top:3px;font-size:.9rem}.family-next-question{font-weight:800;margin:11px 0 7px}
 .family-next-actions{display:flex;gap:6px;flex-wrap:wrap}.family-next-actions button{border:1px solid rgba(0,0,0,.15);background:#fff;border-radius:999px;padding:7px 10px;font-weight:700}.family-next-actions button.active{outline:2px solid currentColor}
 .family-next-status{font-size:.78rem;opacity:.72;margin-top:7px}`;document.head.appendChild(st)}
 box.innerHTML='<div class="family-home-title">Tu Defe</div><div class="family-home-sub">Próximos partidos de tus hijos</div><div data-family-home-list>'+items.map(card).join('')+'</div>';wire(box)
}
async function load(){if(!core?.token())return;if(document.getElementById('defe-mi-defe'))return;try{const d=await core.api('/api/availability/v2/me');render(d.items||[])}catch(e){console.warn('DEFE_HOME_FAMILY',e)}}
document.addEventListener('defe:session',load);window.addEventListener('focus',load);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});setTimeout(load,400);setTimeout(load,1800);
})();