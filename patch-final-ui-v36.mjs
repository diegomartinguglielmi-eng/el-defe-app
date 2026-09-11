import fs from 'node:fs';
import path from 'node:path';

const dist='defe-web-build/dist';
const assets=path.join(dist,'assets');
const jsFile=fs.readdirSync(assets).find(f=>/^index-.*\.js$/.test(f));
if(!jsFile) throw new Error('No se encontró bundle');
const jsPath=path.join(assets,jsFile);
let js=fs.readFileSync(jsPath,'utf8');

// Este parche debe ser idempotente: en builds nuevos los selectores pueden haber
// sido transformados previamente por otros parches. En ese caso no abortamos el
// deploy de Netlify; simplemente conservamos el bundle ya actualizado.
const laambaOld='if(r==="lamba"){const M=["1RA","3RA","4TA","5TA","6TA","7MA","8VA"],F=["FEM 1RA"]';
const laambaNew='if(r==="lamba"){const M=["1RA","3RA","4TA","5TA","6TA","7MA","8VA","Promocional 2016","Promocional 2017","Promocional 2018","Promocional 2019/20"],F=["FEM 1RA"]';
if(js.includes(laambaOld)) {
  js=js.replace(laambaOld,laambaNew);
  console.log('V36: selector LAAMBA actualizado');
} else {
  console.log('V36: selector LAAMBA ya transformado; se continúa sin abortar');
}

const argenOld='if(r==="argenliga"){const M=["1RA","3RA","4TA","5TA","6TA","7MA","8VA"],F=';
const argenNew='if(r==="argenliga"){const M=["1RA","3RA","4TA","5TA","6TA","7MA","8VA","9NA"],F=';
if(js.includes(argenOld)) {
  js=js.replace(argenOld,argenNew);
  console.log('V36: selector Argenliga actualizado');
} else {
  console.log('V36: selector Argenliga ya transformado; se continúa sin abortar');
}

if(!js.includes('DEFE_FINAL_UI_V36_PROMOS_ARGEN_9NA')) {
  js+='\n/* DEFE_FINAL_UI_V36_PROMOS_ARGEN_9NA */\n';
}
fs.writeFileSync(jsPath,js);

const indexPath=path.join(dist,'index.html');
let html=fs.readFileSync(indexPath,'utf8');
html=html.replace(/<meta name="defe-brand" content="[^"]*"\s*\/>/,'<meta name="defe-brand" content="v36-final-categorias-20260911" />');
fs.writeFileSync(indexPath,html);

// Sponsors: preparar separación entre "activo", "mostrar en inicio" y eliminación real.
// Se parchean los archivos fuente que netlify-build.sh copia después a dist.
const homePath='web-sponsors-home-sync.js';
if(fs.existsSync(homePath)){
  let home=fs.readFileSync(homePath,'utf8');
  home=home.replace("API+'/api/sponsors?ts='+Date.now()","API+'/api/sponsors/featured?ts='+Date.now()");
  if(!home.includes('/api/sponsors/featured?ts=')) throw new Error('No se pudo preparar filtro de sponsors para Inicio');
  fs.writeFileSync(homePath,home);
}

const acompPath='web-acompanan-overlay.js';
if(fs.existsSync(acompPath)){
  let acomp=fs.readFileSync(acompPath,'utf8');
  acomp=acomp.replace('<label>Activo<select data-f="active">','<label style="display:none">Activo<select data-f="active">');
  acomp=acomp.replace('<label>Destacado<select data-f="featured">','<label>Mostrar en inicio<select data-f="featured">');

  const oldDeactivate="async function deactivate(id){if(!confirm('¿Desactivar este sponsor?'))return;const r=await fetch(API+`/api/sponsors/admin/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${token()}`}});if(!r.ok)return alert('No se pudo desactivar el sponsor.');await loadPublic();await renderAdmin()}";
  const newActions="async function toggleActive(card,s){const a=card.querySelector('[data-f=\"active\"]');if(!a)return;a.value=s.active?'0':'1';await saveSponsor(card,s)}\n  async function deleteSponsor(id){if(!confirm('¿Eliminar definitivamente este sponsor? Esta acción no se puede deshacer.'))return;const r=await fetch(API+`/api/sponsors/admin/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${token()}`}});if(!r.ok)return alert('No se pudo eliminar el sponsor.');await loadPublic();await renderAdmin()}";
  if(acomp.includes(oldDeactivate)) acomp=acomp.replace(oldDeactivate,newActions);

  const oldCard="rows.map(s=>`<div class=\"sp-admin-card\" data-id=\"${s.id}\"><strong>${esc(s.name)}</strong>${formHtml(s)}<div class=\"sp-actions\"><button class=\"sp-primary\" data-save>Guardar</button><button class=\"sp-danger\" data-off>Desactivar</button></div><div class=\"sp-status\"></div></div>`).join('')";
  const newCard="rows.map(s=>`<div class=\"sp-admin-card\" data-id=\"${s.id}\"><strong>${esc(s.name)}</strong><div class=\"sp-status\" style=\"margin:6px 0 10px;font-weight:800;color:${s.active?'#166534':'#991b1b'}\">Estado: ${s.active?'Activo':'Inactivo'}</div>${formHtml(s)}<div class=\"sp-actions\"><button class=\"sp-primary\" data-save>Guardar</button><button type=\"button\" data-toggle>${s.active?'Desactivar':'Activar'}</button><button class=\"sp-danger\" type=\"button\" data-delete>Eliminar</button></div><div class=\"sp-status\"></div></div>`).join('')";
  if(acomp.includes(oldCard)) acomp=acomp.replace(oldCard,newCard);

  const oldBind="c.querySelector('[data-save]').onclick=()=>saveSponsor(c,s);c.querySelector('[data-off]').onclick=()=>deactivate(s.id)";
  const newBind="c.querySelector('[data-save]').onclick=()=>saveSponsor(c,s);c.querySelector('[data-toggle]').onclick=()=>toggleActive(c,s);c.querySelector('[data-delete]').onclick=()=>deleteSponsor(s.id)";
  if(acomp.includes(oldBind)) acomp=acomp.replace(oldBind,newBind);

  if(!acomp.includes('Mostrar en inicio')||!acomp.includes('data-delete')||!acomp.includes('toggleActive')) throw new Error('No se pudieron preparar controles de sponsors');
  fs.writeFileSync(acompPath,acomp);
}

console.log('V36 aplicada + sponsors preparados sin publicar producción');
