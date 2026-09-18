// El Defe · adaptador de asistencia por hijo sobre la UI operativa validada
(function(){
if(window.__defeAttendancePlayerV2)return;window.__defeAttendancePlayerV2=true;
const core=window.DefeCore;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const token=()=>core?.token()||'';
const api=(path,init={})=>core.api(path,init);
const labels={yes:'Asiste',no:'No asiste',maybe:'A confirmar',pending:'Sin responder'};
function date(v){if(!v)return'Fecha a confirmar';try{const[y,m,d]=String(v).slice(0,10).split('-').map(Number);return new Intl.DateTimeFormat('es-AR',{weekday:'short',day:'2-digit',month:'2-digit'}).format(new Date(y,m-1,d))}catch{return v}}
function anchor(){return document.querySelector('[data-availability-user]')}
function card(x){if(x.available===false)return`<div class="av-card"><div class="av-kicker">${esc(x.player_name)} · ${esc(x.competition)} · ${esc(x.category)}</div><div class="av-title">Sin próxima fecha publicada</div></div>`;const r=x.response||'pending';return`<div class="av-card" data-player-availability="${x.person_id}"><div class="av-kicker">${esc(x.player_name)} · ${esc(x.competition)} · ${esc(x.category)}</div><div class="av-title">${esc(x.rival||'Rival a confirmar')}</div><div class="av-meta">${esc(date(x.date))} · ${esc(x.time||'Hora a confirmar')}</div><div class="av-buttons">${[['yes','✓ Sí, voy'],['no','✕ No puedo'],['maybe','◷ A confirmar']].map(([v,l])=>`<button class="av-btn" data-active="${r===v?v:''}" data-player-answer="${v}" data-person="${x.person_id}" data-match="${x.match_id}" data-selection="${esc(x.selection)}">${l}</button>`).join('')}</div><div class="av-status">Estado de ${esc(x.player_name)}: ${labels[r]||'Sin responder'}</div></div>`}
let busy=false;
async function enhance(){const box=anchor();if(!box||!token()||busy||box.dataset.playerV2==='1')return;busy=true;try{const d=await api('/api/availability/v2/me'),items=d.items||[];box.dataset.playerV2='1';box.innerHTML=`<b>Disponibilidad para la próxima fecha</b><div class="av-sub">Confirmá la asistencia de cada hijo.</div>${items.length?items.map(card).join(''):'<div class="av-empty">No hay fechas para confirmar.</div>'}`;box.querySelectorAll('[data-player-answer]').forEach(b=>b.onclick=async()=>{const c=b.closest('.av-card'),msg=c.querySelector('.av-status');try{msg.textContent='Guardando…';await api('/api/availability/v2/'+b.dataset.match,{method:'PUT',body:JSON.stringify({person_id:Number(b.dataset.person),selection:b.dataset.selection,status:b.dataset.playerAnswer})});box.dataset.playerV2='';await refresh(box)}catch(e){msg.textContent=e.message}})}catch(e){box.dataset.playerV2='';}finally{busy=false}}
async function refresh(box){try{const d=await api('/api/availability/v2/me'),items=d.items||[];box.dataset.playerV2='1';box.innerHTML=`<b>Disponibilidad para la próxima fecha</b><div class="av-sub">Confirmá la asistencia de cada hijo.</div>${items.length?items.map(card).join(''):'<div class="av-empty">No hay fechas para confirmar.</div>'}`;box.querySelectorAll('[data-player-answer]').forEach(b=>b.onclick=async()=>{const c=b.closest('.av-card'),msg=c.querySelector('.av-status');try{msg.textContent='Guardando…';await api('/api/availability/v2/'+b.dataset.match,{method:'PUT',body:JSON.stringify({person_id:Number(b.dataset.person),selection:b.dataset.selection,status:b.dataset.playerAnswer})});await refresh(box)}catch(e){msg.textContent=e.message}})}catch(e){box.dataset.playerV2='';}}
// El tablero administrativo conserva su aspecto; sólo cambiamos su fuente a v2.
const nativeFetch=window.fetch.bind(window);
window.fetch=async function(input,init){
  let url=typeof input==='string'?input:(input&&input.url)||'';
  try{
    const u=new URL(url,location.href);
    if(core&&u.pathname.endsWith('/api/availability/admin')){
      input=core.API+'/api/availability/v2/admin';
    }
  }catch(_){}
  return nativeFetch(input,init)
};
setInterval(enhance,900);window.addEventListener('focus',enhance);enhance();
})();
