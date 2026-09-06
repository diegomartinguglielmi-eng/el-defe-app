// El Defe V5.4 · Horarios FEFI por categoría
(function(){
 const apiBase=()=>window.EL_DEFE_API_URL||'';
 const token=()=>localStorage.getItem('defe_token')||'';
 const role=()=>localStorage.getItem('defe_role')||'';
 const cats=['2019','2013','2018','2014','2017','2016','2015'];
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
 async function api(path,opts={}){opts.headers=opts.headers||{};if(token())opts.headers.Authorization='Bearer '+token();const r=await fetch(apiBase()+path,opts);const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.detail||'Error');return j;}
 function ensure(){
   const tools=document.getElementById('adminTools');if(!tools||document.getElementById('fefiScheduleAdmin')||!['admin','delegado'].includes(role()))return;
   const card=document.createElement('div');card.className='card';card.id='fefiScheduleAdmin';
   card.innerHTML='<div class="row"><b>Horarios FEFI</b><span class="badge">7 categorías</span></div><div class="meta">Los horarios base se aplican automáticamente a todas las fechas. Modificá solo una categoría cuando exista una excepción confirmada.</div><select id="fefiScheduleMatch" style="margin-top:9px"><option>Cargando fechas…</option></select><div id="fefiScheduleFields"></div><button class="btn" id="saveFefiSchedule" style="margin-top:9px">Guardar horarios</button><div id="fefiScheduleMsg" class="meta"></div>';
   tools.insertBefore(card,tools.firstChild);loadMatches();
 }
 async function loadMatches(){
   const sel=document.getElementById('fefiScheduleMatch');if(!sel)return;
   try{const rows=(await api('/api/matches?competition=FEFI')).filter(x=>x.status!=='final');rows.sort((a,b)=>String(a.date||'9999').localeCompare(String(b.date||'9999')));sel.innerHTML=rows.map(x=>`<option value="${x.id}">${esc(x.round_name||'Fecha')} · ${esc(x.date||'sin fecha')} · ${esc(x.home)} vs ${esc(x.away)}</option>`).join('')||'<option value="">Sin próximos partidos</option>';sel.onchange=loadSchedule;if(sel.value)loadSchedule();}catch(e){sel.innerHTML='<option>Error al cargar</option>';}
 }
 async function loadSchedule(){
   const id=document.getElementById('fefiScheduleMatch')?.value,box=document.getElementById('fefiScheduleFields');if(!id||!box)return;
   box.innerHTML='<div class="meta">Cargando horarios…</div>';
   try{const d=await api('/api/fefi/schedules/'+id);const by=Object.fromEntries(d.items.map(x=>[x.category,x]));box.innerHTML=`<div class="meta" style="margin:9px 0">📍 ${esc(d.match.venue||'Sede a confirmar')}</div>`+cats.map(c=>{const x=by[c]||{};const source=x.source==='base'?'<span class="badge ok" style="margin-left:4px">BASE</span>':'<span class="badge gold" style="margin-left:4px">EXCEPCIÓN</span>';return `<div style="display:grid;grid-template-columns:60px 110px 1fr;gap:7px;align-items:center;margin:7px 0"><b>${c}${source}</b><input type="time" data-cat="${c}" value="${esc(x.time||'')}"><input data-note="${c}" placeholder="Nota opcional" value="${esc(x.note||'')}"></div>`}).join('');}catch(e){box.innerHTML=`<div class="meta">${esc(e.message)}</div>`;}
 }
 async function save(){
   const id=document.getElementById('fefiScheduleMatch')?.value,msg=document.getElementById('fefiScheduleMsg');if(!id)return;
   const items=cats.map(c=>({category:c,time:document.querySelector(`[data-cat="${c}"]`)?.value||null,note:document.querySelector(`[data-note="${c}"]`)?.value||null}));
   msg.textContent='Guardando…';try{const r=await api('/api/fefi/schedules/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({items})});msg.innerHTML=`<b>Horarios guardados.</b> ${r.changed?`${r.changed} cambio${r.changed===1?'':'s'} notificado${r.changed===1?'':'s'}.`:'Sin cambios respecto del horario base.'}`;window.dispatchEvent(new CustomEvent('defe:schedules-updated'));await loadSchedule();}catch(e){msg.textContent=e.message;}
 }
 function init(){ensure();document.addEventListener('click',e=>{if(e.target?.id==='saveFefiSchedule')save();if(e.target?.id==='defeAdminButton')setTimeout(ensure,100);});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 window.defeEnsureFefiSchedules=ensure;
})();