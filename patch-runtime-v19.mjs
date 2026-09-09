import fs from 'node:fs';
import path from 'node:path';

const dist='defe-web-build/dist';
const assets=path.join(dist,'assets');
const jsFile=fs.readdirSync(assets).find(f=>/^index-.*\.js$/.test(f));
if(!jsFile) throw new Error('No se encontró bundle');
const jsPath=path.join(assets,jsFile);
let js=fs.readFileSync(jsPath,'utf8');

// 1) Evitar crash cuando la fecha FEFI no trae puntaje global (pts).
const oldPts='children:[Yi(c.fecha)," · el club ganó la fecha ",c.pts[0]," a ",c.pts[1],c.estado==="previo"&&" · a verificar"]';
const newPts='children:[Yi(c.fecha),Array.isArray(c.pts)?" · el club ganó la fecha "+c.pts[0]+" a "+c.pts[1]:"",c.estado==="previo"&&" · a verificar"]';
if(!js.includes(oldPts)) throw new Error('No se encontró acceso inseguro a c.pts');
js=js.replace(oldPts,newPts);

// 2) Usar la fecha real actual en lugar de una fecha fija de desarrollo.
const oldToday='iu=new Date("2026-09-08T09:00:00")';
if(!js.includes(oldToday)) throw new Error('No se encontró fecha fija iu');
js=js.replace(oldToday,'iu=new Date');

// 3) Próxima fecha y último resultado FEFI se determinan por fecha real.
const oldSelection='l=a.find(y=>!y.jugado&&xa(y.fecha)>=iu),c=[...a].reverse().find(y=>y.jugado),';
const newSelection='l=[...a].filter(y=>xa(y.fecha)>=iu).sort((y,f)=>xa(y.fecha)-xa(f.fecha))[0],c=[...a].filter(y=>xa(y.fecha)<iu&&y.marc).sort((y,f)=>xa(f.fecha)-xa(y.fecha))[0],';
if(!js.includes(oldSelection)) throw new Error('No se encontró lógica V12 de selección FEFI');
js=js.replace(oldSelection,newSelection);

js+='\n/* DEFE_RUNTIME_V19_OPTIONAL_FEFI_PTS */\n/* DEFE_RUNTIME_V20_DATE_BASED_FEFI */\n';
fs.writeFileSync(jsPath,js);

const indexPath=path.join(dist,'index.html');
let html=fs.readFileSync(indexPath,'utf8');
html=html.replace(/<meta name="defe-brand" content="[^"]*"\s*\/>/,'<meta name="defe-brand" content="v19-runtime-20260909" />');
fs.writeFileSync(indexPath,html);
console.log('Runtime aplicado: FEFI por fecha real + pts opcional');
