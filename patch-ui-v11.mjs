import fs from 'node:fs';
import path from 'node:path';

const dist='defe-web-build/dist';
const assets=path.join(dist,'assets');
const jsFile=fs.readdirSync(assets).find(f=>/^index-.*\.js$/.test(f));
if(!jsFile) throw new Error('No se encontró el bundle JS');
const jsPath=path.join(assets,jsFile);
let js=fs.readFileSync(jsPath,'utf8');

// V12: partir del bundle V10 real. El editor de categorías tiene estado propio.
const oldState='const[q,Q]=C.useState(!1),[A,P]=C.useState(()=>[...e]);C.useEffect(()=>{P([...e])},[e.join("|")]);return u.jsxs("div",{className:"defe-home space-y-5 px-4 pb-6",children:[';
const newState='const[q,Q]=C.useState(()=>e.length===0),[A,P]=C.useState(()=>[...e]);C.useEffect(()=>{P([...e])},[e.join("|")]);return u.jsxs("div",{className:"defe-home space-y-5 px-4 pb-6",children:[';
if(!js.includes(oldState)) throw new Error('No se encontró estado V10 de Home');
js=js.replace(oldState,newState);

// En V10 el selector era siempre visible. Desde V12 depende sólo de q.
const oldSelector='u.jsxs("div",{className:"defe-category-card defe-category-card-v10 rounded-3xl",children:[';
const newSelector='q&&u.jsxs("div",{className:"defe-category-card defe-category-card-v10 rounded-3xl",children:[';
if(!js.includes(oldSelector)) throw new Error('No se encontró selector V10 visible');
js=js.replace(oldSelector,newSelector);

// Guardar: primero cerrar visualmente, después persistir.
const oldSave='onClick:()=>F(A),disabled:A.length===0,className:"defe-category-save",children:"Guardar selección"';
const newSave='onClick:()=>{Q(!1),F(A)},disabled:A.length===0,className:"defe-category-save",children:"Guardar selección"';
if(!js.includes(oldSave)) throw new Error('No se encontró botón Guardar selección V10');
js=js.replace(oldSave,newSave);

// Bajo Próxima fecha, el check deja de ser sólo decorativo y reabre el editor.
const oldMark='u.jsx("span",{className:"defe-selected-mark",children:"✓"})';
const newMark='u.jsx("button",{type:"button",onClick:()=>{P([...e]),Q(!0)},className:"defe-selected-mark defe-selected-edit","aria-label":"Cambiar categorías",children:"✓"})';
if(!js.includes(oldMark)) throw new Error('No se encontró check informativo V10');
js=js.split(oldMark).join(newMark);

js+='\n/* DEFE_UI_V12_20260909 EXPLICIT_CATEGORY_EDITOR_STATE */\n';
fs.writeFileSync(jsPath,js);

const cssFile=fs.readdirSync(assets).find(f=>/^index-.*\.css$/.test(f));
if(cssFile){
  const cssPath=path.join(assets,cssFile);
  let css=fs.readFileSync(cssPath,'utf8');
  css+='\n/* DEFE UI V12 */\n.defe-selected-edit{border:none;cursor:pointer}.defe-selected-edit:active{transform:scale(.95)}\n';
  fs.writeFileSync(cssPath,css);
}

const indexPath=path.join(dist,'index.html');
let html=fs.readFileSync(indexPath,'utf8');
html=html.replace(/<meta name="defe-brand" content="[^"]*"\s*\/>/,'<meta name="defe-brand" content="v12-20260909" />');
fs.writeFileSync(indexPath,html);

console.log('UI V12 aplicada: Guardar cierra el selector y el check permite reabrirlo.');
