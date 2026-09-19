(() => {
 if(window.__defeRoleExperience)return; window.__defeRoleExperience=true;
 const core=window.DefeCore;
 async function me(){if(!core?.token())return null;try{return await core.api('/api/me')}catch(_){return null}}
 let adminData=null,adminLoading=false;
 async function loadAdminData(){if(document.documentElement.dataset.defeRole!=='profe'||adminLoading)return;adminLoading=true;try{adminData=await core.api('/api/availability/v2/admin');renderAdminHome()}catch(_){ }finally{adminLoading=false}}
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
 function adminHome(){
   if(document.documentElement.dataset.defeRole!=='profe'||document.getElementById('defe-mi-defe'))return;
   const hint=textLeaf(/Elegí qué categorías seguís para ver acá sus próximos partidos/i);
   if(hint){hint.textContent='Próxima jornada del plantel';hint.style.fontWeight='700'}
 }
 function adminProfile(){
   if(document.documentElement.dataset.defeRole!=='profe')return;
   const label=textLeaf(/^(Dirigente · con acceso a Gestión|Administrador ·)/);if(label)label.textContent='Profe · gestión deportiva';
   const hijos=[...document.querySelectorAll('button,a')].filter(b=>/^Mis hijos$/i.test((b.textContent||'').replace(/\s+/g,' ').trim()));hijos.forEach(b=>{b.style.setProperty('display','none','important');b.setAttribute('aria-hidden','true')});
   const logout=[...document.querySelectorAll('button')].find(b=>/^Cerrar sesión$/i.test((b.textContent||'').replace(/\s+/g,' ').trim())&&b.offsetParent!==null);
   if(logout&&!document.querySelector('[data-profe-account-tools]')){
     const tools=document.createElement('div');tools.dataset.profeAccountTools='1';tools.style.cssText='display:grid;gap:10px;margin:12px 0';
     tools.innerHTML='<button data-p-account-att>✓ Asistencia / Jornada</button><button data-p-account-plant>👥 Plantel / Jugadores</button><button data-p-account-com>✉ Comunicaciones</button>';
     tools.querySelectorAll('button').forEach(b=>b.style.cssText='width:100%;border:0;border-radius:14px;padding:14px;background:#15589e;color:#fff;font-weight:800;font-size:16px');
     tools.querySelector('[data-p-account-att]').onclick=()=>{document.querySelector('[data-p-att]')?.click()||[...document.querySelectorAll('button,a')].find(x=>/^\\s*✓?\\s*Asistencia\\s*$/i.test((x.textContent||'').trim())&&x!==tools.querySelector('[data-p-account-att]'))?.click()};
     tools.querySelector('[data-p-account-plant]').onclick=()=>{document.querySelector('[data-p-plant]')?.click()||[...document.querySelectorAll('button,a')].find(x=>/Plantel \/ Jugadores|Planteles/i.test((x.textContent||'').trim())&&x!==tools.querySelector('[data-p-account-plant]'))?.click()};
     tools.querySelector('[data-p-account-com]').onclick=()=>document.querySelector('.dc-fab')?.click();
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
   box.querySelector('[data-profe-att]').onclick=()=>{const b=[...document.querySelectorAll('button')].find(x=>/Asistencia/.test(x.textContent||''));b?.click()};
   box.querySelector('[data-profe-comms]').onclick=()=>{const b=document.querySelector('.dc-fab');if(b)b.click()};
   hint.parentElement?.parentElement?.appendChild(box);
 }
 function hideFloatingAttendance(){if(document.documentElement.dataset.defeRole!=='profe')return;[...document.querySelectorAll('button,a')].filter(x=>/^\s*✓?\s*Asistencia\s*$/i.test(x.textContent||'')&&!x.closest('[data-profe-panel]')).forEach(x=>{const cs=getComputedStyle(x);if(cs.position==='fixed'||cs.position==='absolute')x.style.display='none'})}
 function paint(){adminHome();adminProfile();adminQuick();hideFloatingAttendance();renderAdminHome()}
 function apply(u){document.documentElement.dataset.defeRole=u?.role||'guest';const role=u?.role||'guest';document.querySelectorAll('[data-role-only]').forEach(el=>{const allowed=(el.dataset.roleOnly||'').split(',').map(x=>x.trim());el.hidden=!allowed.includes(role)});window.dispatchEvent(new CustomEvent('defe:role',{detail:{role,user:u}}));setTimeout(paint,100);setTimeout(paint,800);if(role==='profe')setTimeout(loadAdminData,250)}
 me().then(apply).catch(()=>apply(null));window.addEventListener('focus',()=>{me().then(apply).catch(()=>{});loadAdminData()});new MutationObserver(()=>paint()).observe(document.body,{childList:true,subtree:true});
})();