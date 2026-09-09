import fs from 'node:fs';
import path from 'node:path';

const dist='defe-web-build/dist';
const assets=path.join(dist,'assets');
const jsFile=fs.readdirSync(assets).find(f=>/^index-.*\.js$/.test(f));
if(!jsFile) throw new Error('No se encontró bundle');
const jsPath=path.join(assets,jsFile);
let js=fs.readFileSync(jsPath,'utf8');

// Las clases Tailwind arbitrarias agregadas post-build no existen en el CSS compilado.
// V25 pasa la grilla a estilos inline para garantizar columnas reales en Android/PWA.
const headOld='className:"grid grid-cols-[1fr_38px_38px_44px] gap-1 px-3 py-2 text-xs font-semibold",style:{background:"#F7F9FD",color:m.gris}';
const headNew='className:"grid items-center gap-1 px-3 py-2.5 text-xs font-semibold",style:{gridTemplateColumns:"28px minmax(0,1fr) 38px 42px 44px",background:"#F7F9FD",color:m.gris}';
if(!js.includes(headOld)) throw new Error('No se encontró encabezado LAAMBA V24');
js=js.replace(headOld,headNew);

const headChildren='children:[u.jsx("span",{children:"Equipo"}),u.jsx("span",{className:"text-center",children:"PJ"}),u.jsx("span",{className:"text-center",children:"DG"}),u.jsx("span",{className:"text-center",children:"Pts"})]';
const headChildrenNew='children:[u.jsx("span",{className:"text-center",children:"#"}),u.jsx("span",{children:"Equipo"}),u.jsx("span",{className:"text-center",children:"PJ"}),u.jsx("span",{className:"text-center",children:"DG"}),u.jsx("span",{className:"text-center",children:"Pts"})]';
if(!js.includes(headChildren)) throw new Error('No se encontraron columnas de encabezado LAAMBA');
js=js.replace(headChildren,headChildrenNew);

const rowOld='className:"grid grid-cols-[1fr_38px_38px_44px] items-center gap-1 px-3 py-2.5 text-sm",style:{borderTop:A?`1px solid ${m.linea}`:"none",background:/Defensores de SL/i.test(v.equipo)?m.azulTinte:"#fff"},children:[u.jsx("span",{className:/Defensores de SL/i.test(v.equipo)?"font-bold":"font-medium",children:v.equipo}),u.jsx("span",{className:"text-center",children:v.pj}),u.jsx("span",{className:"text-center",children:v.dg??"-"}),u.jsx("span",{className:"text-center font-bold",style:{color:m.azul},children:v.pts})]';
const rowNew='className:"grid items-center gap-1 px-3 py-2.5 text-sm",style:{gridTemplateColumns:"28px minmax(0,1fr) 38px 42px 44px",borderTop:A?`1px solid ${m.linea}`:"none",background:/Defensores de SL/i.test(v.equipo)?m.azulTinte:"#fff",minHeight:48},children:[u.jsx("span",{className:"text-center text-xs",style:{color:/Defensores de SL/i.test(v.equipo)?m.azul:m.gris,fontWeight:/Defensores de SL/i.test(v.equipo)?800:600},children:A+1}),u.jsx("span",{className:/Defensores de SL/i.test(v.equipo)?"truncate font-bold":"truncate font-medium",children:/Defensores de SL/i.test(v.equipo)?"DEFE":v.equipo}),u.jsx("span",{className:"text-center",style:{color:m.gris},children:v.pj}),u.jsx("span",{className:"text-center",style:{color:(v.dg??0)>0?m.gana:(v.dg??0)<0?m.pierde:m.gris},children:v.dg??"-"}),u.jsx("span",{className:"text-center font-bold",style:{color:m.azul,fontSize:15},children:v.pts})]';
if(!js.includes(rowOld)) throw new Error('No se encontró fila LAAMBA V24');
js=js.replace(rowOld,rowNew);

// Barra de categorías en una sola línea desplazable para evitar que ocupe dos filas.
const catsOld='u.jsx("div",{className:"mb-4 flex flex-wrap gap-2",children:K.map(v=>u.jsx("button",{onClick:()=>nL(v),className:"rounded-full px-3 py-2 text-sm font-semibold"';
const catsNew='u.jsx("div",{className:"mb-4 overflow-x-auto",children:u.jsx("div",{className:"flex min-w-max gap-2 pb-1",children:K.map(v=>u.jsx("button",{onClick:()=>nL(v),className:"shrink-0 rounded-full px-3 py-2 text-sm font-semibold"';
if(!js.includes(catsOld)) throw new Error('No se encontró selector de categorías LAAMBA');
js=js.replace(catsOld,catsNew);

const catsEnd='children:v==="FEM 1RA"?"1RA Femenino":v},v))}),u.jsx(Zi,{vista:p,setVista:g})';
const catsEndNew='children:v==="FEM 1RA"?"1RA Femenino":v},v))})}),u.jsx(Zi,{vista:p,setVista:g})';
if(!js.includes(catsEnd)) throw new Error('No se encontró cierre selector de categorías LAAMBA');
js=js.replace(catsEnd,catsEndNew);

js+='\n/* DEFE_LAAMBA_V25_COMPACT_STANDINGS */\n';
fs.writeFileSync(jsPath,js);

const indexPath=path.join(dist,'index.html');
let html=fs.readFileSync(indexPath,'utf8');
html=html.replace(/<meta name="defe-brand" content="[^"]*"\s*\/>/,'<meta name="defe-brand" content="v25-laamba-standings-20260909" />');
fs.writeFileSync(indexPath,html);
console.log('V25 aplicada: tabla LAAMBA compacta, alineada y legible');
