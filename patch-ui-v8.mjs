import fs from 'node:fs';
import path from 'node:path';

const dist='defe-web-build/dist';
const assets=path.join(dist,'assets');
const jsFile=fs.readdirSync(assets).find(f=>/^index-.*\.js$/.test(f));
if(!jsFile) throw new Error('No se encontró el bundle JS');
const jsPath=path.join(assets,jsFile);
let js=fs.readFileSync(jsPath,'utf8');

// Home recibe un setter de favoritos completos para guardar varias categorías de una sola vez.
const oldSig='function bw({favs:e,toggleFav:t,irA:r,abrirNovedad:n,horarios:s}){';
const newSig='function bw({favs:e,toggleFav:t,setFavs:F,irA:r,abrirNovedad:n,horarios:s}){';
if(!js.includes(oldSig)) throw new Error('No se encontró firma de Home');
js=js.replace(oldSig,newSig);

const oldState='const[q,Q]=C.useState(!1);return u.jsxs("div",{className:"defe-home space-y-5 px-4 pb-6",children:[';
const newState='const[q,Q]=C.useState(!1),[A,P]=C.useState([]);return u.jsxs("div",{className:"defe-home space-y-5 px-4 pb-6",children:[';
if(!js.includes(oldState)) throw new Error('No se encontró estado del selector');
js=js.replace(oldState,newState);

// Abrir selector copiando la selección actual, sin persistir todavía.
js=js.replace('onClick:()=>Q(!0),className:"defe-category-open"','onClick:()=>{P([...e]),Q(!0)},className:"defe-category-open"');
js=js.replace('onClick:()=>Q(!0),className:"defe-edit-cats"','onClick:()=>{P([...e]),Q(!0)},className:"defe-edit-cats"');

// En el modal, trabajar sobre una selección temporal A. Así tocar una categoría no desmonta el modal.
const oldGrid='u.jsx("div",{className:"defe-cat-grid",children:h.map(y=>{const f=e.includes(y);return u.jsxs("button",{onClick:()=>t(y),className:f?"defe-cat-option is-selected":"defe-cat-option",children:[u.jsx("span",{children:y}),u.jsx("span",{className:"defe-cat-check",children:f?"✓":"+"})]},y)})})';
const newGrid='u.jsx("div",{className:"defe-cat-grid",children:h.map(y=>{const f=A.includes(y);return u.jsxs("button",{onClick:()=>P(f?A.filter(V=>V!==y):[...A,y]),className:f?"defe-cat-option is-selected":"defe-cat-option",children:[u.jsx("span",{children:y}),u.jsx("span",{className:"defe-cat-check",children:f?"✓":"+"})]},y)})})';
if(!js.includes(oldGrid)) throw new Error('No se encontró grilla del modal');
js=js.replace(oldGrid,newGrid);

const oldCount='u.jsx("div",{className:"defe-cat-count",children:e.length===0?"Todavía no elegiste ninguna":e.length===1?"1 categoría seleccionada":`${e.length} categorías seleccionadas`}),u.jsx("button",{onClick:()=>Q(!1),disabled:e.length===0,className:"defe-category-save",children:e.length?"Guardar selección":"Elegí al menos una categoría"})';
const newCount='u.jsx("div",{className:"defe-cat-count",children:A.length===0?"Todavía no elegiste ninguna":A.length===1?"1 categoría seleccionada":`${A.length} categorías seleccionadas`}),u.jsx("button",{onClick:()=>{F(A),Q(!1)},disabled:A.length===0,className:"defe-category-save",children:A.length?`Guardar selección (${A.length})`:"Elegí al menos una categoría"})';
if(!js.includes(oldCount)) throw new Error('No se encontró contador/guardar del modal');
js=js.replace(oldCount,newCount);

// Setter de lista completa en el contenedor principal.
const oldParent='const R=H=>{const _t=ke.includes(H)?ke.filter(vn=>vn!==H):[...ke,H];e?i({favoritos:_t}):(b(_t),xw("defe:favs",_t))},L=H=>i({notificaciones:H}),';
const newParent='const R=H=>{const _t=ke.includes(H)?ke.filter(vn=>vn!==H):[...ke,H];e?i({favoritos:_t}):(b(_t),xw("defe:favs",_t))},V=H=>{e?i({favoritos:H}):(b(H),xw("defe:favs",H))},L=H=>i({notificaciones:H}),';
if(!js.includes(oldParent)) throw new Error('No se encontró setter de favoritos');
js=js.replace(oldParent,newParent);

const oldHome='u.jsx(bw,{favs:ke,toggleFav:R,irA:_,abrirNovedad:E,horarios:{}})';
const newHome='u.jsx(bw,{favs:ke,toggleFav:R,setFavs:V,irA:_,abrirNovedad:E,horarios:{}})';
if(!js.includes(oldHome)) throw new Error('No se encontró invocación de Home');
js=js.replace(oldHome,newHome);

js+='\n/* DEFE_UI_V8_20260909 MULTISELECT_DRAFT_SAVE */\n';
fs.writeFileSync(jsPath,js);

const indexPath=path.join(dist,'index.html');
let html=fs.readFileSync(indexPath,'utf8');
html=html.replace(/<meta name="defe-brand" content="[^"]*"\s*\/>/,'<meta name="defe-brand" content="v8-20260909" />');
fs.writeFileSync(indexPath,html);

console.log('UI V8 aplicada y lista para publicar: selección múltiple real con guardado al final.');
