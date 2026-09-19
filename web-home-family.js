(()=>{
'use strict';
const core=window.DefeCore;
const API=(core&&core.API)||'https://el-defe-v2-staging-production.up.railway.app';
function jwtFromValue(v){if(!v)return'';const m=String(v).match(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/);return m?m[0]:''}
function authToken(){if(core?.token())return core.token();for(const st of [localStorage,sessionStorage])for(let i=0;i<st.length;i++){const t=jwtFromValue(st.getItem(st.key(i)));if(t)return t}return''}
async function familyApi(path){const t=authToken();if(!t)throw Error('Sin sesión');const r=await fetch(API+path,{headers:{Authorization:'Bearer '+t},cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.detail||('Error '+r.status));return d}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={yes:'Voy',no:'No voy',maybe:'A confirmar',pending:'Sin responder'};
function root(){const all=[...document.querySelectorAll('body *')];const hint=all.find(x=>x.children.length===0&&/Elegí qué categorías seguís para ver acá sus próximos partidos/i.test((x.textContent||'').trim()));if(hint)return hint.parentElement;const h=all.find(x=>x.children.length===0&&/^Pr[oó]ximas fechas$/i.test((x.textContent||'').trim()));return h?.parentElement||document.querySelector('main')||null}
function emptyHint(host){return [...host.querySelectorAll('*')].find(x=>x.children.length===0&&/Elegí qué categorías seguís para ver acá sus próximos partidos/i.test((x.textContent||'').trim()))}
function when(x){return [x.date,x.time].filter(Boolean).map(esc).join(' · ')||'Fecha y hora a confirmar'}
function card(x){
 const r=x.response||'pending', disabled=x.available===false;
 const state=r==='yes'?['✓ Voy','yes']:r==='no'?['✕ No voy','no']:r==='maybe'?['◷ A confirmar','maybe']:null;
 return `<article class="family-next-card" data-family-next="${esc(x.person_id)}">
 <div class="family-next-player">${esc(x.player_name)}</div><div class="family-next-meta">${esc(x.competition)} · ${esc(x.category)}</div>
 <strong>${esc(disabled?'Sin próxima fecha publicada':(x.rival||'Rival a confirmar'))}</strong>
 <div class="family-next-when">${disabled?'':when(x)}${disabled||!x.venue?'':' · '+esc(x.venue)}</div>
 ${disabled?'':state?`<div class="family-next-state ${state[1]}">${state[0]}</div>`:`<button class="family-next-reminder" data-open-mi-defe="1">Confirmá la asistencia en Mi Defe</button>`}
 </article>`;
}
function wire(box){box.querySelectorAll('[data-open-mi-defe]').forEach(b=>b.onclick=()=>{const nav=[...document.querySelectorAll('button')].find(x=>(x.textContent||'').trim()==='Mi Defe');if(nav)nav.click();else document.querySelector('[aria-label="Mi Defe"]')?.click()})}
function render(items){
 if(document.getElementById('defe-mi-defe')){document.querySelectorAll('[data-family-home]').forEach(x=>x.remove());return}
 const host=root();if(!host)return;let box=host.querySelector('[data-family-home]');
 if(!items.length){box?.remove();return}
 if(!box){box=document.createElement('section');box.dataset.familyHome='1';const hint=emptyHint(host);if(hint){hint.style.display='none';hint.parentElement?.insertBefore(box,hint)}else host.appendChild(box);const st=document.createElement('style');st.textContent=`
 [data-family-home]{margin:12px 0 18px}.family-home-title{font-size:1.05rem;font-weight:900;margin:0 0 9px}.family-home-sub{font-size:.84rem;opacity:.68;margin:-5px 0 10px}
 [data-family-home-list]{display:grid;gap:10px}.family-next-card{border:1px solid rgba(0,0,0,.12);border-radius:16px;padding:13px;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.04)}
 .family-next-player{font-weight:900;font-size:1rem}.family-next-meta{font-size:.8rem;opacity:.68;margin:2px 0 7px}.family-next-when{margin-top:3px;font-size:.9rem}.family-next-question{font-weight:800;margin:11px 0 7px}
 .family-next-actions{display:flex;gap:6px;flex-wrap:wrap}.family-next-actions button{border:1px solid rgba(0,0,0,.15);background:#fff;border-radius:999px;padding:7px 10px;font-weight:700}.family-next-actions button.active{outline:2px solid currentColor}
 .family-next-state{display:inline-flex;margin-top:11px;border-radius:999px;padding:7px 11px;font-weight:900;font-size:.82rem}.family-next-state.yes{background:#e8f7ef;color:#087443;border:1px solid #15945b}.family-next-state.no{background:#fdecec;color:#b42318;border:1px solid #d92d20}.family-next-state.maybe{background:#fff4d6;color:#8a5a00;border:1px solid #d69e00}.family-next-reminder{margin-top:11px;border:0;border-radius:12px;background:#15589e;color:#fff;padding:10px 12px;font-weight:900;font:inherit}`;document.head.appendChild(st)}
 box.innerHTML='<div class="family-home-title">Tu Defe</div><div class="family-home-sub">Próximos partidos de tus hijos</div><div data-family-home-list>'+items.map(card).join('')+'</div>';wire(box)
}
async function load(){if(!authToken())return;if(document.getElementById('defe-mi-defe'))return;try{const d=await familyApi('/api/availability/v2/me');render(d.items||[])}catch(e){console.warn('DEFE_HOME_FAMILY',e)}}
document.addEventListener('defe:session',load);window.addEventListener('focus',load);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});setTimeout(load,400);setTimeout(load,1800);
})();