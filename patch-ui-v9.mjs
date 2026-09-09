import fs from 'node:fs';
import path from 'node:path';

const dist='defe-web-build/dist';
const assets=path.join(dist,'assets');
const jsFile=fs.readdirSync(assets).find(f=>/^index-.*\.js$/.test(f));
if(!jsFile) throw new Error('No se encontró el bundle JS');
const jsPath=path.join(assets,jsFile);
let js=fs.readFileSync(jsPath,'utf8');

// V10: selector familiar COMPLETO antes de Próxima fecha.
// Se elimina el comportamiento de estrella individual del listado inferior.
const start='e.length===0&&u.jsxs("div",{className:"defe-category-card rounded-3xl"';
const end='u.jsxs("section",{children:[u.jsxs("div",{className:"mb-3 flex items-center justify-between",children:[u.jsx("h2",{className:"font-semibold",style:{fontSize:17},children:"Próxima fecha"})';
const si=js.indexOf(start);
const ei=js.indexOf(end,si);
if(si<0||ei<0) throw new Error('No se pudo ubicar categorías/Próxima fecha');

const selector=`u.jsxs("div",{className:"defe-category-card defe-category-card-v10 rounded-3xl",children:[u.jsx("div",{className:"defe-family-icon",children:"◎"}),u.jsxs("div",{className:"defe-category-copy",children:[u.jsx("div",{className:"defe-category-title",children:"Categorías de tu familia"}),u.jsx("p",{className:"defe-category-help",children:"Seleccioná todas las categorías que quieras seguir. Podés elegir más de una."})]}),u.jsx("div",{className:"defe-cat-grid defe-cat-grid-home",children:h.map(y=>{const f=A.includes(y);return u.jsxs("button",{type:"button",onClick:()=>P(f?A.filter(V=>V!==y):[...A,y]),className:f?"defe-cat-option is-selected":"defe-cat-option",children:[u.jsx("span",{children:y}),u.jsx("span",{className:"defe-cat-check",children:f?"✓":"+"})]},y)})}),u.jsxs("div",{className:"defe-cat-save-row",children:[u.jsx("div",{className:"defe-cat-count",children:A.length===0?"Elegí una o más categorías":A.length===1?"1 categoría seleccionada":\`${'${A.length}'} categorías seleccionadas\`}),u.jsx("button",{type:"button",onClick:()=>F(A),disabled:A.length===0,className:"defe-category-save",children:"Guardar selección"})]})]})`;

js=js.slice(0,si)+selector+','+js.slice(ei);

// Inicializar borrador con favoritos existentes para que puedan sumarse/quitarse sin perder los demás.
js=js.replace('const[q,Q]=C.useState(!1),[A,P]=C.useState([]);return u.jsxs("div",{className:"defe-home space-y-5 px-4 pb-6",children:[','const[q,Q]=C.useState(!1),[A,P]=C.useState(()=>[...e]);C.useEffect(()=>{P([...e])},[e.join("|")]);return u.jsxs("div",{className:"defe-home space-y-5 px-4 pb-6",children:[');

// Bajo Próxima fecha: sólo horarios filtrados, sin estrellas clickeables ni botón Cambiar.
const star='u.jsx(Yc,{activo:b,onClick:()=>t(y),size:18})';
js=js.split(star).join('u.jsx("span",{className:"defe-selected-mark",children:"✓"})');
js=js.replace('children:"Tus categorías"}),u.jsx("button",{onClick:()=>{P([...e]),Q(!0)},className:"defe-edit-cats",children:"Cambiar"}),','children:"Horarios de tus categorías"}),');
js=js.replace('children:"Tus categorías"}),u.jsx("button",{onClick:()=>Q(!0),className:"defe-edit-cats",children:"Cambiar"}),','children:"Horarios de tus categorías"}),');

js+='\n/* DEFE_UI_V10_20260909 ALWAYS_VISIBLE_MULTISELECT */\n';
fs.writeFileSync(jsPath,js);

const cssFile=fs.readdirSync(assets).find(f=>/^index-.*\.css$/.test(f));
if(cssFile){
 const cssPath=path.join(assets,cssFile);
 let css=fs.readFileSync(cssPath,'utf8');
 css+=`\n/* DEFE UI V10 */\n.defe-category-card-v10{display:grid!important;grid-template-columns:52px 1fr!important;gap:10px 12px!important;align-items:center!important;padding:16px!important;background:#fff!important;border:1px solid #D8E2F0!important}.defe-category-card-v10 .defe-cat-grid-home{grid-column:1/-1!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important;margin-top:5px!important}.defe-category-card-v10 .defe-cat-option{min-height:44px!important;justify-content:space-between!important}.defe-cat-save-row{grid-column:1/-1;display:flex;align-items:center;gap:12px;margin-top:4px}.defe-cat-save-row .defe-cat-count{flex:1;margin:0!important;text-align:left!important}.defe-cat-save-row .defe-category-save{width:auto!important;min-width:150px!important}.defe-selected-mark{display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:#EAF3FF;color:#124D98;font-weight:900}@media(max-width:520px){.defe-category-card-v10 .defe-cat-grid-home{grid-template-columns:repeat(3,minmax(0,1fr))!important}.defe-cat-save-row{align-items:stretch;flex-direction:column}.defe-cat-save-row .defe-category-save{width:100%!important}}\n`;
 fs.writeFileSync(cssPath,css);
}

const indexPath=path.join(dist,'index.html');
let html=fs.readFileSync(indexPath,'utf8');
html=html.replace(/<meta name="defe-brand" content="[^"]*"\s*\/>/,'<meta name="defe-brand" content="v10-20260909" />');
fs.writeFileSync(indexPath,html);
console.log('UI V10: multiselección visible antes de Próxima fecha.');