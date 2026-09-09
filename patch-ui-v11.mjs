import fs from 'node:fs';
import path from 'node:path';

const dist='defe-web-build/dist';
const assets=path.join(dist,'assets');
const jsFile=fs.readdirSync(assets).find(f=>/^index-.*\.js$/.test(f));
if(!jsFile) throw new Error('No se encontró el bundle JS');
const jsPath=path.join(assets,jsFile);
let js=fs.readFileSync(jsPath,'utf8');

// V12: usar un estado explícito del editor. No depender de que favoritos se actualicen
// de forma síncrona después de Guardar, porque esa era la causa de que el cuadrante siguiera visible.
const oldState='const[q,Q]=C.useState(!1),[A,P]=C.useState(()=>[...e]);C.useEffect(()=>{P([...e])},[e.join("|")]);return u.jsxs("div",{className:"defe-home space-y-5 px-4 pb-6",children:[';
const newState='const[q,Q]=C.useState(()=>e.length===0),[A,P]=C.useState(()=>[...e]);C.useEffect(()=>{P([...e])},[e.join("|")]);return u.jsxs("div",{className:"defe-home space-y-5 px-4 pb-6",children:[';
if(!js.includes(oldState)) throw new Error('No se encontró estado V10/V11 de Home');
js=js.replace(oldState,newState);

// El selector depende sólo de q. Guardar siempre lo cierra inmediatamente.
const oldSelector='(e.length===0||q)&&u.jsxs("div",{className:"defe-category-card defe-category-card-v10 rounded-3xl",children:[';
const newSelector='q&&u.jsxs("div",{className:"defe-category-card defe-category-card-v10 rounded-3xl",children:[';
if(!js.includes(oldSelector)) throw new Error('No se encontró condición del selector V11');
js=js.replace(oldSelector,newSelector);

const oldSave='onClick:()=>{F(A),Q(!1)},disabled:A.length===0,className:"defe-category-save",children:"Guardar selección"';
const newSave='onClick:()=>{Q(!1),F(A)},disabled:A.length===0,className:"defe-category-save",children:"Guardar selección"';
if(!js.includes(oldSave)) throw new Error('No se encontró botón Guardar selección V11');
js=js.replace(oldSave,newSave);

// Los checks de las categorías elegidas reabren el editor con la selección actual.
const oldMark='u.jsx("button",{type:"button",onClick:()=>{P([...e]),Q(!0)},className:"defe-selected-mark defe-selected-edit","aria-label":"Cambiar categorías",children:"✓"})';
if(!js.includes(oldMark)) throw new Error('No se encontró acceso de edición desde categoría elegida');

js+='\n/* DEFE_UI_V12_20260909 EXPLICIT_CATEGORY_EDITOR_STATE */\n';
fs.writeFileSync(jsPath,js);

const indexPath=path.join(dist,'index.html');
let html=fs.readFileSync(indexPath,'utf8');
html=html.replace(/<meta name="defe-brand" content="[^"]*"\s*\/>/,'<meta name="defe-brand" content="v12-20260909" />');
fs.writeFileSync(indexPath,html);

console.log('UI V12 aplicada: Guardar cierra el selector en forma inmediata y estable.');