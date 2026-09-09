import fs from 'node:fs';
import path from 'node:path';

const dist='defe-web-build/dist';
const assets=path.join(dist,'assets');
const jsFile=fs.readdirSync(assets).find(f=>/^index-.*\.js$/.test(f));
if(!jsFile) throw new Error('No se encontró el bundle JS');
const jsPath=path.join(assets,jsFile);
let js=fs.readFileSync(jsPath,'utf8');

// V11: el selector se muestra sólo en primera carga o cuando el usuario decide editar.
const oldSelector='u.jsxs("div",{className:"defe-category-card defe-category-card-v10 rounded-3xl",children:[';
const newSelector='(e.length===0||q)&&u.jsxs("div",{className:"defe-category-card defe-category-card-v10 rounded-3xl",children:[';
if(!js.includes(oldSelector)) throw new Error('No se encontró selector V10');
js=js.replace(oldSelector,newSelector);

// Al guardar, persistir y cerrar el cuadrante de selección.
const oldSave='onClick:()=>F(A),disabled:A.length===0,className:"defe-category-save",children:"Guardar selección"';
const newSave='onClick:()=>{F(A),Q(!1)},disabled:A.length===0,className:"defe-category-save",children:"Guardar selección"';
if(!js.includes(oldSave)) throw new Error('No se encontró botón Guardar selección V10');
js=js.replace(oldSave,newSave);

// En los horarios ya elegidos, el check permite reabrir el selector para agregar/quitar categorías.
const oldMark='u.jsx("span",{className:"defe-selected-mark",children:"✓"})';
const newMark='u.jsx("button",{type:"button",onClick:()=>{P([...e]),Q(!0)},className:"defe-selected-mark defe-selected-edit","aria-label":"Cambiar categorías",children:"✓"})';
if(!js.includes(oldMark)) throw new Error('No se encontró marca de categoría seleccionada');
js=js.split(oldMark).join(newMark);

js+='\n/* DEFE_UI_V11_20260909 FIRST_LOAD_CATEGORY_PICKER */\n';
fs.writeFileSync(jsPath,js);

const cssFile=fs.readdirSync(assets).find(f=>/^index-.*\.css$/.test(f));
if(cssFile){
  const cssPath=path.join(assets,cssFile);
  let css=fs.readFileSync(cssPath,'utf8');
  css+=`\n/* DEFE UI V11 */\n.defe-selected-edit{border:none;cursor:pointer}.defe-selected-edit:active{transform:scale(.95)}\n`;
  fs.writeFileSync(cssPath,css);
}

const indexPath=path.join(dist,'index.html');
let html=fs.readFileSync(indexPath,'utf8');
html=html.replace(/<meta name="defe-brand" content="[^"]*"\s*\/>/,'<meta name="defe-brand" content="v11-20260909" />');
fs.writeFileSync(indexPath,html);

console.log('UI V11 aplicada: selector sólo primera carga y reapertura desde categorías elegidas.');