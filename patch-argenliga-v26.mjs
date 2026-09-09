import fs from 'node:fs';
import path from 'node:path';

const dist='defe-web-build/dist';
const assets=path.join(dist,'assets');
const jsFile=fs.readdirSync(assets).find(f=>/^index-.*\.js$/.test(f));
if(!jsFile) throw new Error('No se encontró bundle');
const jsPath=path.join(assets,jsFile);
let js=fs.readFileSync(jsPath,'utf8');

const oldMerge='i.id==="lamba"&&(i.partidos||o)&&(t.LAAMBA={partidos:i.partidos??[],tablas:o??Ft.LAAMBA.tablas})}return t}';
const newMerge='i.id==="lamba"&&(i.partidos||o)&&(t.LAAMBA={partidos:i.partidos??[],tablas:o??Ft.LAAMBA.tablas}),i.id==="argenliga"&&(i.partidos||o)&&(t.ARGENLIGA={partidos:i.partidos??[],tablas:o??{}})}return t}';
if(js.includes(oldMerge)) js=js.replace(oldMerge,newMerge);
else if(!js.includes('t.ARGENLIGA={partidos:i.partidos??[],tablas:o??{}}')) throw new Error('No se encontró merge dinámico de ligas');

const kwOld='const{LIGAS:o,ENCUENTROS_FEFI:l,SUPERLIGA:c,LAAMBA:h,HORARIOS_FEFI:d}=Nr(),[p,g]=C.useState("fixture")';
const kwNew='const{LIGAS:o,ENCUENTROS_FEFI:l,SUPERLIGA:c,LAAMBA:h,ARGENLIGA:q={partidos:[],tablas:{}},HORARIOS_FEFI:d}=Nr(),[p,g]=C.useState("fixture")';
if(!js.includes(kwOld)) throw new Error('No se encontró cabecera Partidos');
js=js.replace(kwOld,kwNew);

const simpleOld='if(o[r].tipo==="simple"&&o[r].conectada){const f=r==="superliga"?c:h;';
const simpleNew='if(o[r].tipo==="simple"&&o[r].conectada){const f=r==="superliga"?c:r==="argenliga"?q:h;';
if(!js.includes(simpleOld)) throw new Error('No se encontró selector de liga simple');
js=js.replace(simpleOld,simpleNew);

const yfOld='const{LIGAS:a,TABLAS:o,SUPERLIGA:l,LAAMBA:c}=Nr(),[h,d]=C.useState("general");';
const yfNew='const{LIGAS:a,TABLAS:o,SUPERLIGA:l,LAAMBA:c,ARGENLIGA:q={partidos:[],tablas:{}}}=Nr(),[h,d]=C.useState("general");';
if(!js.includes(yfOld)) throw new Error('No se encontró cabecera Posiciones');
js=js.replace(yfOld,yfNew);

const posOld='const w=t==="superliga"?l:c,x=a[t].categorias';
const posNew='const w=t==="superliga"?l:t==="argenliga"?q:c,x=a[t].categorias';
if(!js.includes(posOld)) throw new Error('No se encontró selector de tabla simple');
js=js.replace(posOld,posNew);

// En Argenliga, los partidos sin resultado son Fixture; los terminados son Resultados.
const revOld='u.jsx("div",{className:"space-y-3",children:[...f.partidos].reverse().map(v=>u.jsxs("div",';
const revNew='u.jsx("div",{className:"space-y-3",children:[...f.partidos].filter(v=>r!=="argenliga"||p==="resultados"?v.jugado:!v.jugado).sort((v,A)=>p==="resultados"?String(A.fecha).localeCompare(String(v.fecha)):String(v.fecha).localeCompare(String(A.fecha))).map(v=>u.jsxs("div",';
if(js.includes(revOld)) js=js.replace(revOld,revNew);

js+='\n/* DEFE_ARGENLIGA_V26_CONNECTED_PRIMERA */\n';
fs.writeFileSync(jsPath,js);

const indexPath=path.join(dist,'index.html');
let html=fs.readFileSync(indexPath,'utf8');
html=html.replace(/<meta name="defe-brand" content="[^"]*"\s*\/>/,'<meta name="defe-brand" content="v26-argenliga-20260909" />');
fs.writeFileSync(indexPath,html);
console.log('V26 aplicada: Argenliga Primera conectada a Fixture, Resultados y Posiciones');
