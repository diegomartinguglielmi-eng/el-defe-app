(() => {
 if(window.__defeRoleExperience)return; window.__defeRoleExperience=true;
 const core=window.DefeCore;
 async function me(){if(!core?.token())return null;try{return await core.api('/api/me')}catch(_){return null}}
 function textLeaf(re){return [...document.querySelectorAll('body *')].find(x=>x.children.length===0&&re.test((x.textContent||'').trim()))}
 function adminHome(){
   if(document.documentElement.dataset.defeRole!=='admin'||document.getElementById('defe-mi-defe'))return;
   const hint=textLeaf(/Elegí qué categorías seguís para ver acá sus próximos partidos/i);
   if(hint){hint.textContent='Próxima jornada del plantel';hint.style.fontWeight='700'}
 }
 function adminProfile(){
   if(document.documentElement.dataset.defeRole!=='admin')return;
   const label=textLeaf(/^(Dirigente · con acceso a Gestión|Administrador ·)/);if(label)label.textContent='Profe · gestión deportiva';const hijos=textLeaf(/^Mis hijos$/);if(hijos){const b=hijos.closest('button');if(b)b.style.display='none'}const gtitle=textLeaf(/^Gestión$/);if(gtitle)gtitle.textContent='Gestión deportiva';const gdesc=textLeaf(/^Herramientas disponibles para (administradores|el Profe)\.$/);if(gdesc){gdesc.textContent='Asistencia, plantel y comunicaciones.';const card=gdesc.closest('div.rounded-3xl')||gdesc.parentElement?.parentElement;const sponsor=card&&[...card.querySelectorAll('button')].find(b=>/Gestionar Sponsors/i.test(b.textContent||''));if(sponsor)sponsor.style.display='none';if(card&&!card.querySelector('[data-profe-panel]')){const panel=document.createElement('div');panel.dataset.profePanel='1';panel.style.cssText='display:grid;grid-template-columns:1fr;gap:10px;margin-top:14px';panel.innerHTML='<button data-p-att>✓ Asistencia</button><button data-p-plant>👥 Plantel / Jugadores</button><button data-p-com>✉ Comunicaciones</button>';panel.querySelectorAll('button').forEach(b=>b.style.cssText='border:0;border-radius:14px;padding:14px;background:#15589e;color:#fff;font-weight:800;font-size:16px');panel.querySelector('[data-p-att]').onclick=()=>{[...document.querySelectorAll('button')].find(b=>/Asistencia/.test(b.textContent||'')&&!b.closest('[data-profe-panel]'))?.click()};panel.querySelector('[data-p-plant]').onclick=()=>{const b=[...document.querySelectorAll('button')].find(b=>(b.textContent||'').trim()==='Planteles');if(b)b.click()};panel.querySelector('[data-p-com]').onclick=()=>{[...document.querySelectorAll('button')].find(b=>/Comunic|✉/.test(b.textContent||'')&&!b.closest('[data-profe-panel]'))?.click()};card.appendChild(panel);const profile=[...document.querySelectorAll('.defe-profile-card')][0];if(profile&&card.parentElement)card.parentElement.insertBefore(card,profile.nextSibling)}};
   const gestion=textLeaf(/^Gestión$/);if(gestion){const btn=gestion.closest('button');const desc=btn&&[...btn.querySelectorAll('*')].find(x=>x.children.length===0&&/Tienda, pedidos, contenidos y fuentes/i.test(x.textContent||''));if(desc)desc.textContent='Administración general del club'}
 }
 function adminQuick(){
   if(document.documentElement.dataset.defeRole!=='admin'||document.querySelector('[data-profe-quick]'))return;
   const hint=textLeaf(/Próxima jornada del plantel|Elegí qué categorías seguís/i);if(!hint)return;
   const box=document.createElement('div');box.dataset.profeQuick='1';box.innerHTML='<div style="font-weight:900;margin-bottom:8px">Herramientas del Profe</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button data-profe-att>✓ Asistencia</button><button data-profe-comms>✉ Comunicaciones</button></div>';
   box.style.cssText='margin:12px 0 18px;padding:14px;background:#fff;border:1px solid #d8e0ea;border-radius:16px';
   box.querySelectorAll('button').forEach(b=>b.style.cssText='border:0;border-radius:12px;padding:10px 12px;background:#15589e;color:#fff;font-weight:800');
   box.querySelector('[data-profe-att]').onclick=()=>{const b=[...document.querySelectorAll('button')].find(x=>/Asistencia/.test(x.textContent||''));b?.click()};
   box.querySelector('[data-profe-comms]').onclick=()=>{const b=[...document.querySelectorAll('button')].find(x=>/✉|Comunic/.test(x.textContent||''));b?.click()};
   hint.parentElement?.parentElement?.appendChild(box);
 }
 function hideFloatingAttendance(){if(document.documentElement.dataset.defeRole!=='admin')return;[...document.querySelectorAll('button,a')].filter(x=>/^\s*✓?\s*Asistencia\s*$/i.test(x.textContent||'')&&!x.closest('[data-profe-panel]')).forEach(x=>{const cs=getComputedStyle(x);if(cs.position==='fixed'||cs.position==='absolute')x.style.display='none'})}
 function paint(){adminHome();adminProfile();adminQuick();hideFloatingAttendance()}
 function apply(u){document.documentElement.dataset.defeRole=u?.role||'guest';const role=u?.role||'guest';document.querySelectorAll('[data-role-only]').forEach(el=>{const allowed=(el.dataset.roleOnly||'').split(',').map(x=>x.trim());el.hidden=!allowed.includes(role)});window.dispatchEvent(new CustomEvent('defe:role',{detail:{role,user:u}}));setTimeout(paint,100);setTimeout(paint,800)}
 me().then(apply).catch(()=>apply(null));window.addEventListener('focus',()=>me().then(apply).catch(()=>{}));new MutationObserver(()=>paint()).observe(document.body,{childList:true,subtree:true});
})();