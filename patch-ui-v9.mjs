import fs from 'node:fs';
import path from 'node:path';

const dist='defe-web-build/dist';
const assets=path.join(dist,'assets');
const jsFile=fs.readdirSync(assets).find(f=>/^index-.*\.js$/.test(f));
if(!jsFile) throw new Error('No se encontró el bundle JS');
const jsPath=path.join(assets,jsFile);
let js=fs.readFileSync(jsPath,'utf8');

// V9: el selector queda COMPLETO arriba de Próxima fecha. No hay categorías para elegir debajo del partido.
// La selección es temporal y múltiple; recién se persiste al tocar Guardar selección.
const start='e.length===0&&u.jsxs("div",{className:"defe-category-card rounded-3xl"';
const end='u.jsxs("section",{children:[u.jsxs("div",{className:"mb-3 flex items-center justify-between",children:[u.jsx("h2",{className:"font-semibold",style:{fontSize:17},children:"Próxima fecha"})';
const si=js.indexOf(start);
const ei=js.indexOf(end,si);
if(si<0||ei<0) throw new Error('No se pudo ubicar onboarding/Próxima fecha para reordenar selector');

const selector=`u.jsxs("div",{className:"defe-category-card defe-category-card-v9 rounded-3xl",children:[u.jsx("div",{className:"defe-family-icon",children:"◎"}),u.jsxs("div",{className:"defe-category-copy",children:[u.jsx("div",{className:"defe-category-title",children:e.length?"Tus categorías":"Elegí las categorías de tu familia"}),u.jsx("p",{className:"defe-category-help",children:e.length&&!q?e.join(" · "):"Podés elegir una, dos o varias. Marcá todas las que correspondan y guardá al final."})]}),!q&&u.jsx("button",{onClick:()=>{P([...e]),Q(!0)},className:"defe-category-open",children:e.length?"Cambiar":"Elegir categorías"}),q&&u.jsxs("div",{className:"defe-inline-selector",children:[u.jsx("div",{className:"defe-cat-grid",children:h.map(y=>{const f=A.includes(y);return u.jsxs("button",{onClick:()=>P(f?A.filter(V=>V!==y):[...A,y]),className:f?"defe-cat-option is-selected":"defe-cat-option",children:[u.jsx("span",{children:y}),u.jsx("span",{className:"defe-cat-check",children:f?"✓":"+"})]},y)})}),u.jsx("div",{className:"defe-cat-count",children:A.length===0?"Todavía no elegiste ninguna":A.length===1?"1 categoría seleccionada":\`${'${A.length}'} categorías seleccionadas\`}),u.jsxs("div",{className:"defe-cat-actions",children:[e.length>0&&u.jsx("button",{onClick:()=>{P([...e]),Q(!1)},className:"defe-category-cancel",children:"Cancelar"}),u.jsx("button",{onClick:()=>{F(A),Q(!1)},disabled:A.length===0,className:"defe-category-save",children:A.length?\`Guardar selección (${'${A.length}'})\`:"Elegí al menos una categoría"})]})]})]})`;

js=js.slice(0,si)+selector+','+js.slice(ei);

// La grilla bajo Próxima fecha es solamente informativa: horarios de las categorías ya elegidas.
// Se elimina cualquier estrella/botón de selección de esa grilla.
const scheduleStar='u.jsx(Yc,{activo:b,onClick:()=>t(y),size:18})';
if(js.includes(scheduleStar)) js=js.replace(scheduleStar,'u.jsx("span",{className:"defe-selected-mark",children:"✓"})');

// Etiqueta más clara del bloque informativo.
js=js.replace('children:"Tus categorías"}),u.jsx("button",{onClick:()=>{P([...e]),Q(!0)},className:"defe-edit-cats",children:"Cambiar"}),','children:"Horarios de tus categorías"}),');
js=js.replace('children:"Tus categorías"}),u.jsx("button",{onClick:()=>Q(!0),className:"defe-edit-cats",children:"Cambiar"}),','children:"Horarios de tus categorías"}),');

js+='\n/* DEFE_UI_V9_20260909 INLINE_MULTISELECT_BEFORE_MATCH */\n';
fs.writeFileSync(jsPath,js);

const cssFile=fs.readdirSync(assets).find(f=>/^index-.*\.css$/.test(f));
if(cssFile){
  const cssPath=path.join(assets,cssFile);
  let css=fs.readFileSync(cssPath,'utf8');
  css+=`\n/* DEFE UI V9 */\n.defe-category-card-v9{grid-template-columns:52px 1fr auto!important;align-items:center!important;margin-bottom:2px!important}.defe-inline-selector{grid-column:1/-1;width:100%;margin-top:10px;padding-top:12px;border-top:1px solid #D8E2F0}.defe-cat-actions{display:flex;gap:8px;align-items:center}.defe-category-cancel{border:1px solid #D8E2F0;background:#fff;color:#082D68;border-radius:14px;padding:12px 14px;font-weight:800}.defe-cat-actions .defe-category-save{flex:1}.defe-selected-mark{display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:#EAF3FF;color:#124D98;font-weight:900}.defe-times-card{margin-top:10px!important}.defe-times-card .defe-edit-cats{display:none!important}@media(max-width:520px){.defe-category-card-v9{grid-template-columns:44px 1fr!important}.defe-category-card-v9>.defe-category-open{grid-column:2!important;justify-self:start!important}.defe-inline-selector{grid-column:1/-1!important}.defe-cat-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}}\n`;
  fs.writeFileSync(cssPath,css);
}

const indexPath=path.join(dist,'index.html');
let html=fs.readFileSync(indexPath,'utf8');
html=html.replace(/<meta name="defe-brand" content="[^"]*"\s*\/>/,'<meta name="defe-brand" content="v9-20260909" />');
fs.writeFileSync(indexPath,html);

console.log('UI V9 aplicada: selector múltiple arriba de Próxima fecha y horarios sólo informativos.');
