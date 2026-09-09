import fs from 'node:fs';
import path from 'node:path';

const dist='defe-web-build/dist';
const assets=path.join(dist,'assets');
const jsFile=fs.readdirSync(assets).find(f=>/^index-.*\.js$/.test(f));
if(!jsFile) throw new Error('No se encontró bundle');
const jsPath=path.join(assets,jsFile);
let js=fs.readFileSync(jsPath,'utf8');

// HOME: enriquecer el resumen de la última jornada con puntos y goles acumulados.
const oldHome='(()=>{const z=Object.values(c.marc||{}).filter(v=>Array.isArray(v));let g=0,E=0,p=0;z.forEach(v=>{v[0]>v[1]?g++:v[0]===v[1]?E++:p++});return z.length?u.jsxs("div",{className:"mt-3 rounded-xl px-3 py-2 text-sm font-semibold",style:{background:m.azulTinte,color:m.azul},children:[g," ganados · ",E," empate",E===1?"":"s"," · ",p," perdido",p===1?"":"s"]}):null})()';
const newHome='(()=>{const z=Object.values(c.marc||{}).filter(v=>Array.isArray(v));let g=0,E=0,p=0,gf=0,gc=0;z.forEach(v=>{gf+=Number(v[0]||0);gc+=Number(v[1]||0);v[0]>v[1]?g++:v[0]===v[1]?E++:p++});const pd=g*3+E*2+p,pr=p*3+E*2+g;return z.length?u.jsxs("div",{className:"mt-3 space-y-2",children:[u.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[u.jsxs("div",{className:"rounded-xl px-3 py-2",style:{background:m.azulTinte},children:[u.jsx("div",{className:"text-xs font-semibold",style:{color:m.gris},children:"Puntos de la jornada"}),u.jsxs("div",{className:"mt-0.5 font-bold",style:{color:m.azul},children:["DEFE ",pd," · ",pr," ",gr(c.rival)]})]}),u.jsxs("div",{className:"rounded-xl px-3 py-2",style:{background:"#F7F9FD"},children:[u.jsx("div",{className:"text-xs font-semibold",style:{color:m.gris},children:"Goles acumulados"}),u.jsxs("div",{className:"mt-0.5 font-bold",style:{color:m.tinta},children:["DEFE ",gf," · ",gc," ",gr(c.rival)]})]})]}),u.jsxs("div",{className:"rounded-xl px-3 py-2 text-sm font-semibold",style:{background:m.azulTinte,color:m.azul},children:[g," ganados · ",E," empate",E===1?"":"s"," · ",p," perdido",p===1?"":"s"]})]}):null})()';
if(!js.includes(oldHome)) throw new Error('No se encontró resumen V20 de Home');
js=js.replace(oldHome,newHome);

// RESULTADOS: mostrar todas las categorías y el acumulado de puntos/goles en cada fecha jugada.
const oldResults='f.jugado&&u.jsx("div",{className:"mt-3 grid grid-cols-2 gap-x-4",children:y.map(v=>u.jsxs("div",{className:"flex items-center justify-between border-b py-1",style:{borderColor:m.linea},children:[u.jsx("span",{className:"text-sm font-semibold",children:v}),u.jsx(Jf,{m:f.marc[v]})]},v))})';
const newResults='f.jugado&&(()=>{const z=_.map(v=>f.marc&&f.marc[v]).filter(v=>Array.isArray(v));let G=0,E=0,P=0,gf=0,gc=0;z.forEach(v=>{gf+=Number(v[0]||0);gc+=Number(v[1]||0);v[0]>v[1]?G++:v[0]===v[1]?E++:P++});const pd=G*3+E*2+P,pr=P*3+E*2+G;return u.jsxs(u.Fragment,{children:[z.length&&u.jsxs("div",{className:"mt-3 grid grid-cols-2 gap-2",children:[u.jsxs("div",{className:"rounded-xl px-3 py-2",style:{background:m.azulTinte},children:[u.jsx("div",{className:"text-xs font-semibold",style:{color:m.gris},children:"Puntos de la jornada"}),u.jsxs("div",{className:"mt-0.5 font-bold",style:{color:m.azul},children:["DEFE ",pd," · ",pr," ",gr(f.rival)]})]}),u.jsxs("div",{className:"rounded-xl px-3 py-2",style:{background:"#F7F9FD"},children:[u.jsx("div",{className:"text-xs font-semibold",style:{color:m.gris},children:"Goles acumulados"}),u.jsxs("div",{className:"mt-0.5 font-bold",style:{color:m.tinta},children:["DEFE ",gf," · ",gc," ",gr(f.rival)]})]})]}),z.length&&u.jsxs("div",{className:"mt-2 text-xs font-semibold",style:{color:m.gris},children:[G," ganados · ",E," empate",E===1?"":"s"," · ",P," perdido",P===1?"":"s"]}),u.jsx("div",{className:"mt-3 overflow-hidden rounded-xl",style:{border:`1px solid ${m.linea}`},children:_.map((v,b)=>u.jsxs("div",{className:"flex items-center justify-between px-3 py-2.5",style:{borderTop:b?`1px solid ${m.linea}`:"none"},children:[u.jsx("span",{className:"text-sm font-semibold",children:v}),u.jsx(Jf,{m:f.marc&&f.marc[v]})]},v))})]})})()';
if(!js.includes(oldResults)) throw new Error('No se encontró grilla de resultados FEFI');
js=js.replace(oldResults,newResults);

js+='\n/* DEFE_RESULTS_V21_POINTS_GOALS_ALL_CATEGORIES */\n';
fs.writeFileSync(jsPath,js);

const indexPath=path.join(dist,'index.html');
let html=fs.readFileSync(indexPath,'utf8');
html=html.replace(/<meta name="defe-brand" content="[^"]*"\s*\/>/,'<meta name="defe-brand" content="v21-points-goals-20260909" />');
fs.writeFileSync(indexPath,html);
console.log('V21 aplicada: puntos, goles y todas las categorías en resultados FEFI');
