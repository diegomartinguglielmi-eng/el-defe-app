(() => {
 if(window.__defeRoleExperience)return; window.__defeRoleExperience=true;
 const core=window.DefeCore;
 async function me(){try{if(core?.token())return await core.api('/api/me')}catch(_){} try{const r=await fetch(core.API+'/api/me',{credentials:'include',cache:'no-store'});if(r.ok)return await r.json()}catch(_){} const vals=[];for(const st of [localStorage,sessionStorage])for(let i=0;i<st.length;i++){const k=st.key(i),v=String(st.getItem(k)||'');if(/role/i.test(k))vals.push(v);try{const o=JSON.parse(v);if(o&&o.role)vals.push(o.role)}catch(_){}}const rr=vals.map(x=>String(x).toLowerCase()).find(x=>/profe|coach|profesor|entrenador|\bdt\b/.test(x));return rr?{role:rr}:null}
 let adminData=null,adminLoading=false;
 async function loadAdminData(){if(document.documentElement.dataset.defeRole!=='profe'||adminLoading)return;adminLoading=true;try{adminData=await core.api('/api/availability/v2/admin');window.DefeProfeAdminData=adminData;renderAdminHome()}catch(_){ }finally{adminLoading=false}}
 function fmtDate(s){if(!s)return'Fecha a confirmar';const d=new Date(s+'T12:00:00');return new Intl.DateTimeFormat('es-AR',{weekday:'short',day:'2-digit',month:'2-digit'}).format(d)}
 function renderAdminHome(){
   if(document.documentElement.dataset.defeRole!=='profe'||document.getElementById('defe-mi-defe')||!adminData)return;
   const heading=textLeaf(/^Pr[oó]ximas fechas$/i);if(!heading)return;const host=heading.parentElement;if(!host||host.querySelector('[data-profe-home]'))return;
   const item=(adminData.items||[])[0];if(!item)return;
   const [comp,cat]=(item.selection||'').split('|');const total=item.players||item.followers||0,yes=item.yes||0,no=item.no||0,maybe=item.maybe||0,pending=item.pending||0;
   const box=document.createElement('section');box.dataset.profeHome='1';box.style.cssText='margin:12px 0 20px;padding:16px;background:#fff;border:1px solid #d8e0ea;border-radius:18px;box-shadow:0 2px 10px #0000000a';
   box.innerHTML='<div style="font-size:12px;font-weight:900;color:#15589e;text-transform:uppercase">Próximo partido</div><div style="font-weight:900;margin-top:5px">'+(comp||'')+' · '+(cat||'')+'</div><div style="font-size:22px;font-weight:900;margin-top:8px">'+(item.rival||'Rival a confirmar')+'</div><div style="margin-top:4px;color:#64748b">'+fmtDate(item.date)+(item.time?' · '+item.time:'')+(item.home_away?' · '+item.home_away:'')+'</div>'+(item.venue?'<div style="margin-top:3px;color:#64748b">'+item.venue+'</div>':'')+'<div style="height:1px;background:#e5e7eb;margin:14px 0"></div><div style="font-size:12px;font-weight:900;color:#15589e;text-transform:uppercase">Asistencia</div><div style="font-weight:800;margin-top:6px">'+total+' jugadores · '+yes+' asisten · '+no+' no asisten · '+maybe+' a confirmar · '+pending+' sin responder</div><button data-profe-home-att style="margin-top:12px;width:100%;border:0;border-radius:12px;padding:11px;background:#15589e;color:#fff;font-weight:900">Ver asistencia →</button>';
   const hint=[...host.querySelectorAll('*')].find(x=>x.children.length===0&&/Elegí qué categorías seguís|Próxima jornada del plantel/i.test(x.textContent||''));if(hint)hint.parentElement.style.display='none';host.appendChild(box);
   box.querySelector('[data-profe-home-att]').onclick=()=>{[...document.querySelectorAll('button')].find(b=>/^\\s*✓?\\s*Asistencia\\s*$/i.test(b.textContent||'')&&!b.closest('[data-profe-home]'))?.click()}
 }

 function textLeaf(re){return [...document.querySelectorAll('body *')].find(x=>x.children.length===0&&re.test((x.textContent||'').trim()))}
 function renderProfeDashboard(){
   if(document.documentElement.dataset.defeRole!=='profe' && !document.querySelector('#defe-mi-defe [data-profe-dashboard]'))return;
   const page=document.getElementById('defe-mi-defe');if(!page)return;page.dataset.profeIsolated='1';
   let d=page.querySelector('[data-profe-dashboard]');
   const item=(adminData?.items||[])[0]||{},parts=String(item.selection||'').split('|'),total=item.players||item.followers||0;
   if(!d){
     const top=page.querySelector('header')||page.firstElementChild;
     const content=[...page.children].filter(x=>x!==top);
     content.forEach(x=>{if(!x.matches('nav,[class*=nav],[class*=bottom],[class*=dock]'))x.style.setProperty('display','none','important')});
     d=document.createElement('main');d.dataset.profeDashboard='1';d.style.cssText='position:fixed;inset:112px 0 0 0;z-index:10020;padding:12px 20px calc(20px + env(safe-area-inset-bottom));display:grid;align-content:start;gap:10px;background:#f3f7fb;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;pointer-events:auto;touch-action:pan-y;-webkit-overflow-scrolling:touch;box-sizing:border-box';
     if(top?.nextSibling)page.insertBefore(d,top.nextSibling);else page.appendChild(d);
   }
   page.querySelectorAll(':scope > *').forEach(x=>{if(x!==d&&x!==page.querySelector('header')){const s=(x.matches('nav,[class*=nav],[class*=bottom],[class*=dock]'));if(!s){x.style.setProperty('display','none','important');x.style.pointerEvents='none'}else{x.style.setProperty('position','relative','important');x.style.setProperty('z-index','10030','important')}}});
   const renderKey=(adminData?'data':'empty')+'-v4';if(d.dataset.rendered===renderKey)return;d.dataset.rendered=renderKey;
   d.innerHTML='<div data-profe-hit-layer style="position:absolute;inset:0;z-index:2147483000;pointer-events:none"></div><section><div style="display:flex;align-items:center;gap:9px"><div style="font-size:24px;font-weight:950;color:#17365f">Hola, Profe</div><span style="font-size:12px;background:#e5f0fb;color:#15589e;padding:6px 10px;border-radius:999px;font-weight:900">PROFE</span></div><div style="color:#64748b;margin-top:5px">Gestión deportiva de tus equipos</div></section><section style="background:#fff;border:1px solid #dbe4ef;border-radius:20px;padding:14px 18px"><div style="display:flex;justify-content:space-between;gap:10px"><b>Próxima jornada</b><button data-profe-dash-fixture style="border:0;background:none;color:#15589e;font-weight:800">Ver fixture ›</button></div><div style="font-weight:900;margin-top:9px">'+(parts.filter(Boolean).join(' · ')||'Plantel')+'</div><div style="font-size:20px;font-weight:950;margin-top:5px">'+(item.rival?'El Defe vs '+item.rival:'Partido a confirmar')+'</div><div style="color:#64748b;margin-top:5px">'+fmtDate(item.date)+(item.time?' · '+item.time:'')+(item.venue?' · '+item.venue:'')+'</div></section><section style="background:#fff;border:1px solid #dbe4ef;border-radius:20px;padding:14px 18px"><div><b>Asistencia</b></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:10px;text-align:center"><div><b style="font-size:22px">'+(item.yes||0)+'</b><small style="display:block">Confirmados</small></div><div><b style="font-size:22px">'+(item.no||0)+'</b><small style="display:block">No asisten</small></div><div><b style="font-size:22px">'+((item.maybe||0)+(item.pending||0))+'</b><small style="display:block">Pendientes</small></div><div><b style="font-size:22px">'+total+'</b><small style="display:block">Jugadores</small></div></div><button data-profe-dash-att-main style="margin-top:10px;width:100%;border:0;border-radius:13px;padding:13px;background:#15589e;color:#fff;font-weight:900">Ver asistencia de la jornada →</button></section><div style="font-weight:950;font-size:19px;color:#17365f">Herramientas del Profe</div><section style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px"><button data-profe-dash-plant>👥<br>Plantel<br>Jugadores</button><button data-profe-dash-com>✉<br>Comunicaciones</button></section><section data-profe-push-card style="background:#fff;border:1px solid #dbe4ef;border-radius:18px;padding:14px 16px"><div style="display:flex;align-items:center;gap:9px"><span style="font-size:20px">🔔</span><div><b style="color:#17365f">Avisos de El Defe</b><div style="font-size:13px;color:#64748b;margin-top:2px">Recibí comunicaciones aunque la app esté cerrada.</div></div></div><p style="font-size:13px;color:#64748b;margin:10px 0">Los avisos todavía no están configurados.</p><button data-defe-push-enable style="width:100%;border:0;border-radius:13px;padding:12px;background:#15589e;color:#fff;font-weight:900">Activar notificaciones del dispositivo</button></section>';
   d.querySelectorAll('button[data-profe-dash-plant],button[data-profe-dash-com]').forEach(x=>x.style.cssText+='border:1px solid #dbe4ef;border-radius:16px;padding:12px 6px;background:#fff;color:#17365f;font-weight:850;font-size:16px;cursor:pointer;pointer-events:auto;position:relative;z-index:3');
   const fixtureBtn=d.querySelector('[data-profe-dash-fixture]'),plantBtn=d.querySelector('[data-profe-dash-plant]'),comBtn=d.querySelector('[data-profe-dash-com]'),attBtn=d.querySelector('[data-profe-dash-att-main]');
   window.defeRefreshPushState?.();setTimeout(()=>window.defeRefreshPushState?.(),120);const pushBtn=d.querySelector('[data-defe-push-enable]');if(pushBtn){pushBtn.disabled=false;pushBtn.style.pointerEvents='auto';pushBtn.style.touchAction='manipulation';pushBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(window.defeEnablePush)window.defeEnablePush();else setTimeout(()=>window.defeEnablePush?.(),150)})}
   // Mobile hardening: transparent hit targets live above every legacy overlay.
   const hit=d.querySelector('[data-profe-hit-layer]');
   const addHit=(btn,fn)=>{if(!btn||!hit)return;const r=btn.getBoundingClientRect(),dr=d.getBoundingClientRect(),h=document.createElement('button');h.type='button';h.setAttribute('aria-label',btn.textContent.trim());h.style.cssText='position:absolute;left:'+(r.left-dr.left+d.scrollLeft)+'px;top:'+(r.top-dr.top+d.scrollTop)+'px;width:'+r.width+'px;height:'+r.height+'px;border:0;background:transparent;pointer-events:auto;touch-action:manipulation;z-index:2147483647';h.onclick=e=>{e.preventDefault();e.stopPropagation();fn()};hit.appendChild(h)};
   requestAnimationFrame(()=>{addHit(fixtureBtn,openProfeFixture);addHit(plantBtn,openPlantel);addHit(comBtn,()=>window.DefeComms?.openInbox?.()||window.DefeProfe?.openCommunications?.());addHit(attBtn,()=>window.DefeProfe?.openAttendance?.())});
   const wire=(btn,fn)=>{if(!btn)return;btn.type='button';btn.style.pointerEvents='auto';btn.style.touchAction='manipulation';btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();document.querySelector('.dc-modal')?.remove();document.getElementById('defe-profe-fixture')?.remove();document.getElementById('defe-profe-plantel')?.remove();fn()})};
   wire(fixtureBtn,openProfeFixture);wire(plantBtn,openPlantel);wire(comBtn,()=>{sessionStorage.setItem('defe_profe_active','1');window.DefeComms?.setProfe?.();window.DefeProfe?.openCommunications?.()});wire(attBtn,()=>window.DefeProfe?.openAttendance?.());
 }
 function adminHome(){
   if(document.documentElement.dataset.defeRole!=='profe'||document.getElementById('defe-mi-defe'))return;
   const hint=textLeaf(/Elegí qué categorías seguís para ver acá sus próximos partidos/i);
   if(hint){hint.textContent='Próxima jornada del plantel';hint.style.fontWeight='700'}
 }
 function adminProfile(){
   if(document.documentElement.dataset.defeRole!=='profe' && !document.querySelector('#defe-mi-defe [data-profe-dashboard]'))return;
   const label=textLeaf(/^(Dirigente · con acceso a Gestión|Administrador ·)/);if(label)label.textContent='Profe · gestión deportiva';
   const hijos=[...document.querySelectorAll('button,a')].filter(b=>/^Mis hijos$/i.test((b.textContent||'').replace(/\s+/g,' ').trim()));hijos.forEach(b=>{b.style.setProperty('display','none','important');b.setAttribute('aria-hidden','true')});
   const logout=[...document.querySelectorAll('button')].find(b=>/^Cerrar sesión$/i.test((b.textContent||'').replace(/\s+/g,' ').trim())&&b.offsetParent!==null);
   if(logout&&!document.querySelector('[data-profe-account-tools]')){
     const tools=document.createElement('div');tools.dataset.profeAccountTools='1';tools.style.cssText='display:grid;gap:10px;margin:12px 0';
     tools.innerHTML='<button data-p-account-att>✓ Asistencia / Jornada</button><button data-p-account-plant>👥 Plantel / Jugadores</button><button data-p-account-com>✉ Comunicaciones</button>';
     tools.querySelectorAll('button').forEach(b=>b.style.cssText='width:100%;border:0;border-radius:14px;padding:14px;background:#15589e;color:#fff;font-weight:800;font-size:16px');
     tools.querySelector('[data-p-account-att]').onclick=()=>closeAccountAnd(()=>window.DefeProfe?.openAttendance?.());
     tools.querySelector('[data-p-account-plant]').onclick=()=>{document.querySelector('[data-p-plant]')?.click()||[...document.querySelectorAll('button,a')].find(x=>/Plantel \/ Jugadores|Planteles/i.test((x.textContent||'').trim())&&x!==tools.querySelector('[data-p-account-plant]'))?.click()};
     tools.querySelector('[data-p-account-com]').onclick=()=>closeAccountAnd(()=>window.DefeProfe?.openCommunications?.());
     logout.parentElement.insertBefore(tools,logout);
   }
   const gtitle=textLeaf(/^Gestión$/);if(gtitle)gtitle.textContent='Gestión deportiva';
   const gdesc=textLeaf(/^Herramientas disponibles para (administradores|el Profe)\.$/);if(gdesc)gdesc.textContent='Asistencia, plantel y comunicaciones.';
 }
 function adminQuick(){
   if(document.documentElement.dataset.defeRole!=='profe'||document.querySelector('[data-profe-quick]'))return;
   const hint=textLeaf(/Próxima jornada del plantel|Elegí qué categorías seguís/i);if(!hint)return;
   const box=document.createElement('div');box.dataset.profeQuick='1';box.innerHTML='<div style="font-weight:900;margin-bottom:8px">Herramientas del Profe</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button data-profe-att>✓ Asistencia</button><button data-profe-comms>✉ Comunicaciones</button></div>';
   box.style.cssText='margin:12px 0 18px;padding:14px;background:#fff;border:1px solid #d8e0ea;border-radius:16px';
   box.querySelectorAll('button').forEach(b=>b.style.cssText='border:0;border-radius:12px;padding:10px 12px;background:#15589e;color:#fff;font-weight:800');
   box.querySelector('[data-profe-att]').onclick=()=>window.DefeProfe?.openAttendance?.();
   box.querySelector('[data-profe-comms]').onclick=()=>window.DefeProfe?.openCommunications?.();
   hint.parentElement?.parentElement?.appendChild(box);
 }
 function closeAccountAnd(action){
   const tool=document.querySelector('[data-profe-account-tools]');
   const modal=tool?.closest('[role="dialog"],.modal,[class*="modal"],[class*="overlay"]');
   const close=modal?.querySelector('button[aria-label*="errar" i],button[aria-label*="close" i]')||[...(modal?.querySelectorAll('button')||[])].find(b=>/^\\s*[×x]\\s*$/i.test(b.textContent||''));
   if(close)close.click();
   else if(modal)modal.style.display='none';
   setTimeout(action,120);
 }
 document.addEventListener('click',e=>{
   const b=e.target.closest('[data-p-account-att],[data-p-account-plant],[data-p-account-com]');if(!b)return;
   e.preventDefault();e.stopImmediatePropagation();
   if(b.matches('[data-p-account-com]'))return closeAccountAnd(()=>window.DefeProfe?.openCommunications?.());
   if(b.matches('[data-p-account-att]'))return closeAccountAnd(()=>window.DefeProfe?.openAttendance?.());
   closeAccountAnd(()=>{const x=[...document.querySelectorAll('button,a')].find(x=>/^(?:👥\\s*)?(?:Plantel \/ Jugadores|Planteles)$/i.test((x.textContent||'').trim())&&!x.closest('[data-profe-account-tools]')&&getComputedStyle(x).display!=='none');x?.click()});
 },true);
 async function openProfeFixture(){
  document.getElementById('defe-mi-defe')?.remove();document.querySelector('.dc-modal')?.remove();document.getElementById('defe-profe-fixture')?.remove();
  const item=(adminData?.items||[])[0]||{},parts=String(item.selection||'FEFI|').split('|'),comp=parts[0]||'FEFI',cat=parts[1]||'';
  const page=document.createElement('div');page.id='defe-profe-fixture';page.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#f3f7fb;overflow:auto;color:#17365f';
  page.innerHTML='<header style="background:#124f8c;color:white;padding:18px 20px 16px;display:flex;align-items:center;gap:14px;position:sticky;top:0;z-index:5"><button data-back style="border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.08);color:white;border-radius:12px;width:42px;height:42px;font-size:24px">‹</button><div><div style="font-size:11px;font-weight:900;letter-spacing:.08em;opacity:.9">MI DEFE · PROFE</div><div style="font-size:24px;font-weight:900">Fixture · '+comp+(cat?' · '+cat:'')+'</div></div></header><main data-list style="padding:16px 20px calc(28px + env(safe-area-inset-bottom))"><div style="background:#fff;border-radius:18px;padding:18px">Cargando próximas fechas…</div></main>';
  document.body.appendChild(page);page.querySelector('[data-back]').onclick=e=>{e.preventDefault();e.stopPropagation();page.remove();document.querySelector('[data-md-open]')?.click()};
  try{
    const rows=await core.api('/api/leagues/matches'),today=new Date().toISOString().slice(0,10);
    let matches=(Array.isArray(rows)?rows:(rows.items||rows.matches||[])).filter(m=>String(m.competition||'').toUpperCase()===comp.toUpperCase()&&String(m.date||'9999-99-99').slice(0,10)>=today&&String(m.status||'').toLowerCase()!=='final');
    matches.sort((a,b)=>String(a.date||'9999').localeCompare(String(b.date||'9999')));
    const list=page.querySelector('[data-list]');
    list.innerHTML=matches.length?matches.slice(0,12).map(m=>'<section style="background:#fff;border:1px solid #dbe4ef;border-radius:18px;padding:15px 16px;margin-bottom:10px;box-shadow:0 1px 2px rgba(15,23,42,.03)"><div style="font-size:13px;font-weight:900;color:#15589e">'+(m.round_name||m.division||comp)+'</div><div style="font-size:20px;font-weight:950;margin-top:8px">'+(m.home||'A confirmar')+' <span style="color:#64748b">vs</span> '+(m.away||'A confirmar')+'</div><div style="color:#64748b;margin-top:8px">'+fmtDate(m.date)+(m.time?' · '+m.time:'')+(m.venue?' · '+m.venue:'')+'</div></section>').join(''):'<div style="background:#fff;border:1px dashed #cbd5e1;border-radius:18px;padding:20px;color:#64748b">No hay próximas fechas publicadas para '+comp+'.</div>';
  }catch(e){page.querySelector('[data-list]').innerHTML='<div style="background:#fff;border-radius:18px;padding:18px;color:#64748b">No se pudo cargar el fixture.</div>'}
}
async function openPlantel(){
  document.getElementById('defe-mi-defe')?.remove();document.querySelector('.dc-modal')?.remove();document.getElementById('defe-profe-plantel')?.remove();
  const items=adminData?.items||[],groups=new Map();
  try{
    const teams=await core.api('/api/teams');
    for(const it of items){
      const key=it.selection||'Plantel',[comp,cat]=String(key).split('|');
      if(!groups.has(key))groups.set(key,new Map());
      const team=(Array.isArray(teams)?teams:teams?.items||[]).find(t=>String(t.competition||'').toLowerCase()===String(comp||'').toLowerCase()&&String(t.division||'').toLowerCase()===String(cat||'').toLowerCase());
      if(team?.id){
        const members=await core.api('/api/teams/'+team.id+'/members');
        (Array.isArray(members)?members:members?.items||[]).filter(p=>!p.role||p.role==='player').forEach(p=>groups.get(key).set(p.person_id||p.id||p.first_name,p));
      }
    }
  }catch(_){}
  items.forEach(it=>{const key=it.selection||'Plantel';if(!groups.has(key))groups.set(key,new Map());if(groups.get(key).size===0)(it.people||[]).forEach(p=>groups.get(key).set(p.person_id||p.name,p))});
  const page=document.createElement('div');page.id='defe-profe-plantel';page.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#f3f7fb;overflow:auto;color:#17365f';
  const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cards=[...groups].map(([sel,people])=>{const [comp,cat]=String(sel).split('|'),rows=[...people.values()];return '<section style="background:#fff;border:1px solid #dbe4ef;border-radius:18px;padding:16px;margin:0 20px 14px"><div style="display:flex;justify-content:space-between;align-items:end;gap:12px"><div><div style="font-weight:950;font-size:18px">'+safe(comp)+' · '+safe(cat||'')+'</div><div style="color:#64748b;margin-top:4px">'+rows.length+' jugador'+(rows.length===1?'':'es')+'</div></div></div><div style="margin-top:10px">'+rows.map((p,i)=>'<button type="button" data-player="'+safe(sel)+'::'+i+'" style="width:100%;border:0;border-top:1px solid #edf2f7;background:#fff;padding:13px 2px;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;color:#17365f"><span style="display:flex;align-items:center;gap:11px"><span style="width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#eaf2fb;color:#124f8c;font-weight:900">'+safe((p.name||p.first_name||'J').trim().charAt(0).toUpperCase())+'</span><b style="font-size:15px">'+safe(p.name||[p.first_name,p.last_name].filter(Boolean).join(' ')||'Jugador')+'</b></span><span style="font-size:22px;color:#94a3b8">›</span></button>').join('')+'</div></section>'}).join('');
  page.innerHTML='<header style="background:#124f8c;color:white;padding:18px 20px 16px;display:flex;align-items:center;gap:14px;position:sticky;top:0;z-index:5"><button data-back style="border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.08);color:white;border-radius:12px;width:42px;height:42px;font-size:24px">‹</button><div><div style="font-size:11px;font-weight:900;letter-spacing:.08em;opacity:.9">MI DEFE · PROFE</div><div style="font-size:24px;font-weight:900">Plantel</div><div style="font-size:12px;opacity:.85">Jugadores de tus categorías</div></div></header><main style="padding:16px 0 calc(28px + env(safe-area-inset-bottom))">'+(cards||'<div style="margin:0 20px;background:#fff;border:1px dashed #cbd5e1;border-radius:18px;padding:20px;color:#64748b">No hay jugadores vinculados a los planteles disponibles.</div>')+'</main>';
  document.body.appendChild(page);
  page.querySelector('[data-back]').onclick=e=>{e.preventDefault();e.stopPropagation();page.remove();document.querySelector('[data-md-open]')?.click()};
  page.querySelectorAll('[data-player]').forEach(b=>b.onclick=()=>{const [sel,idx]=b.dataset.player.split('::'),p=[...(groups.get(sel)?.values()||[])][Number(idx)]||{},name=safe(p.name||[p.first_name,p.last_name].filter(Boolean).join(' ')||'Jugador'),details=[['Categoría',sel.replace('|',' · ')],['Dorsal',p.shirt_number||p.number||p.dorsal||p.jersey_number],['Posición',p.position],['Estado',p.is_active===false?'Inactivo':p.is_active===true?'Activo':null]].filter(x=>x[1]);const d=document.createElement('div');d.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#f3f7fb;color:#17365f;overflow:auto';d.innerHTML='<header style="background:#124f8c;color:#fff;padding:18px 20px 16px;display:flex;align-items:center;gap:14px;position:sticky;top:0"><button data-player-back style="border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.08);color:#fff;border-radius:12px;width:42px;height:42px;font-size:24px">‹</button><div><div style="font-size:11px;font-weight:900;letter-spacing:.08em;opacity:.9">PLANTEL · JUGADOR</div><div style="font-size:24px;font-weight:900">'+name+'</div></div></header><main style="padding:18px 20px"><section style="background:#fff;border:1px solid #dbe4ef;border-radius:18px;padding:18px"><div style="width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:#eaf2fb;color:#124f8c;font-size:24px;font-weight:950;margin-bottom:14px">'+safe((p.name||p.first_name||'J').trim().charAt(0).toUpperCase())+'</div>'+details.map(x=>'<div style="padding:12px 0;border-top:1px solid #edf2f7"><div style="font-size:12px;color:#64748b;font-weight:800">'+safe(x[0])+'</div><div style="font-size:16px;font-weight:800;margin-top:3px">'+safe(x[1])+'</div></div>').join('')+''+'</section></main>';document.body.appendChild(d);d.querySelector('[data-player-back]').onclick=()=>d.remove()});
}
function hideFloatingAttendance(){if(document.documentElement.dataset.defeRole!=='profe' && !document.querySelector('#defe-mi-defe [data-profe-dashboard]'))return;[...document.querySelectorAll('button,a')].filter(x=>/^\s*✓?\s*Asistencia\s*$/i.test(x.textContent||'')&&!x.closest('[data-profe-panel]')).forEach(x=>{const cs=getComputedStyle(x);if(cs.position==='fixed'||cs.position==='absolute')x.style.display='none'})}
 function paint(){if(document.getElementById('defe-profe-fixture')||document.getElementById('defe-profe-plantel')||document.querySelector('.dc-modal'))return;adminHome();adminProfile();renderProfeDashboard();hideFloatingAttendance();renderAdminHome()}
 function jwtRole(){try{const t=core?.token?.();if(!t)return'';const p=t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return String(JSON.parse(atob(p.padEnd(Math.ceil(p.length/4)*4,'='))).role||'').toLowerCase()}catch(_){return''}} function apply(u){const apiRole=String(u?.role||u?.user?.role||u?.profile?.role||'').toLowerCase(),storedRole=String(localStorage.getItem('defe_role')||sessionStorage.getItem('defe_role')||'').toLowerCase(),raw=apiRole||storedRole||jwtRole()||'guest';const role=(raw==='coach'||raw==='profesor'||raw==='entrenador'||raw==='dt')?'profe':raw;document.documentElement.dataset.defeRole=role;document.querySelectorAll('[data-role-only]').forEach(el=>{const allowed=(el.dataset.roleOnly||'').split(',').map(x=>x.trim());el.hidden=!allowed.includes(role)});window.dispatchEvent(new CustomEvent('defe:role',{detail:{role,user:u}}));setTimeout(paint,100);setTimeout(paint,800);if(role==='profe')setTimeout(loadAdminData,250)}
 me().then(apply).catch(()=>apply(null));window.addEventListener('focus',()=>{me().then(apply).catch(()=>{});loadAdminData()});let paintQueued=false;new MutationObserver(()=>{if(paintQueued)return;paintQueued=true;requestAnimationFrame(()=>{paintQueued=false;paint()})}).observe(document.body,{childList:true,subtree:true});document.addEventListener('click',e=>{if(document.documentElement.dataset.defeRole!=='profe')return;const b=e.target.closest('[data-md-open],button,a');if(!b)return;const label=(b.textContent||'').trim().toLowerCase();if(b.matches('[data-md-open]')||label==='mi defe')setTimeout(()=>{paint();setTimeout(paint,250);setTimeout(paint,900)},0)},{capture:true});

// Profe dashboard: delegated pointer handler. Avoids stale/replaced button nodes on mobile.
document.addEventListener('pointerup',e=>{
 if(document.documentElement.dataset.defeRole!=='profe' && !document.querySelector('#defe-mi-defe [data-profe-dashboard]'))return;
 const b=e.target.closest('[data-profe-dash-fixture],[data-profe-dash-plant],[data-profe-dash-com],[data-profe-dash-att-main]');
 if(!b)return;
 e.preventDefault();e.stopPropagation();
 if(b.matches('[data-profe-dash-fixture]'))return openProfeFixture();
 if(b.matches('[data-profe-dash-plant]'))return openPlantel();
 if(b.matches('[data-profe-dash-com]'))return window.DefeProfe?.openCommunications?.();
 if(b.matches('[data-profe-dash-att-main]'))return window.DefeProfe?.openAttendance?.();
},{capture:true});
window.DefeProfe={openAttendance(){if(window.DefeAvailability?.openAdmin){window.DefeAvailability.openAdmin();return true}const b=document.querySelector('[data-av-admin-fixed]');if(b){b.click();return true}return false},openCommunications(){sessionStorage.setItem('defe_profe_active','1');window.DefeComms?.setProfe?.();document.documentElement.dataset.defeRole='profe';if(window.DefeComms?.openInbox){document.getElementById('defe-mi-defe')?.remove();window.DefeComms.openInbox();return}document.getElementById('defe-mi-defe')?.remove();document.getElementById('defe-profe-plantel')?.remove();document.getElementById('defe-profe-fixture')?.remove();document.querySelector('.dc-modal')?.remove();const b=document.querySelector('.dc-fab');if(b){b.click();return true}return false}};
})();