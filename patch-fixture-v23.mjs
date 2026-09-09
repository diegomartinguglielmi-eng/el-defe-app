import fs from 'node:fs';
import path from 'node:path';

const dist='defe-web-build/dist';
const assets=path.join(dist,'assets');
const jsFile=fs.readdirSync(assets).find(f=>/^index-.*\.js$/.test(f));
if(!jsFile) throw new Error('No se encontró bundle');
const jsPath=path.join(assets,jsFile);
let js=fs.readFileSync(jsPath,'utf8');

// Fixture/Resultados deben depender de la fecha real, no del flag jugado derivado de marc.
const oldFilter='const w=l.filter(f=>p==="fixture"?!f.jugado:f.jugado),x=p==="fixture"?w:[...w].reverse(),_=o.fefi.categorias,y=e.length?_.filter(f=>e.includes(f)):_;';
const newFilter='const w=l.filter(f=>p==="fixture"?xa(f.fecha)>=iu:xa(f.fecha)<iu&&!!f.marc),x=p==="fixture"?[...w].sort((f,v)=>xa(f.fecha)-xa(v.fecha)):[...w].sort((f,v)=>xa(v.fecha)-xa(f.fecha)),_=o.fefi.categorias,y=e.length?_.filter(f=>e.includes(f)):_;';
if(!js.includes(oldFilter)) throw new Error('No se encontró filtro Fixture/Resultados');
js=js.replace(oldFilter,newFilter);

// En las tarjetas del Fixture, un encuentro futuro debe verse como futuro aunque marc venga cargado por error.
const replacements=[
  ['f.jugado&&Array.isArray(f.pts)&&u.jsxs("span"','xa(f.fecha)<iu&&Array.isArray(f.pts)&&u.jsxs("span"'],
  ['!f.jugado&&u.jsxs("div",{className:"mt-1 flex items-center gap-1 text-xs"','xa(f.fecha)>=iu&&u.jsxs("div",{className:"mt-1 flex items-center gap-1 text-xs"'],
  ['!f.jugado&&u.jsx("div",{className:"mt-2",children:u.jsx(yi,{destino:f.sede})})','xa(f.fecha)>=iu&&u.jsx("div",{className:"mt-2",children:u.jsx(yi,{destino:f.sede})})'],
  ['f.jugado&&(()=>{const z=_.map(v=>f.marc&&f.marc[v]).filter(v=>Array.isArray(v));','xa(f.fecha)<iu&&f.marc&&(()=>{const z=_.map(v=>f.marc&&f.marc[v]).filter(v=>Array.isArray(v));']
];
for(const [a,b] of replacements){
  if(!js.includes(a)) throw new Error('No se encontró fragmento de tarjeta: '+a.slice(0,50));
  js=js.replace(a,b);
}

js+='\n/* DEFE_FIXTURE_V23_DATE_BASED_COMPLETE */\n';
fs.writeFileSync(jsPath,js);

const indexPath=path.join(dist,'index.html');
let html=fs.readFileSync(indexPath,'utf8');
html=html.replace(/<meta name="defe-brand" content="[^"]*"\s*\/>/,'<meta name="defe-brand" content="v23-complete-fixture-20260909" />');
fs.writeFileSync(indexPath,html);
console.log('V23 aplicada: fixture completo y cronológico por fecha real');
