import fs from 'node:fs';
import path from 'node:path';

const dist='defe-web-build/dist';
const assets=path.join(dist,'assets');
const jsFile=fs.readdirSync(assets).find(f=>/^index-.*\.js$/.test(f));
if(!jsFile) throw new Error('No se encontró el bundle JS');
const jsPath=path.join(assets,jsFile);
let js=fs.readFileSync(jsPath,'utf8');

const basePath='/tmp/defe-v12-base.js';
if(!fs.existsSync(basePath)) throw new Error('No se encontró la copia base V12');
const base=fs.readFileSync(basePath,'utf8');

// 1) Fecha actual real: evita que Inicio trate fixtures futuros como jugados.
js=js.replace('iu=new Date("2026-09-08T09:00:00")','iu=new Date');

// 2) Restaurar Home V12 completa (próxima fecha, horarios, resultados, futsal y novedades).
const baseHomeStart=base.indexOf('function bw(');
const baseHomeEnd=base.indexOf('function nn(',baseHomeStart);
const curHomeStart=js.indexOf('function bw(');
const curHomeEnd=js.indexOf('function kw(',curHomeStart);
if(baseHomeStart<0||baseHomeEnd<0||curHomeStart<0||curHomeEnd<0) throw new Error('No se pudo localizar Home V12/V13');
let home=base.slice(baseHomeStart,baseHomeEnd);

// La selección ya se administra desde Mi Defe: no abrir editor de categorías en Inicio.
home=home.replace('const[q,Q]=C.useState(()=>e.length===0)','const[q,Q]=C.useState(()=>!1)');
home=home.replace('onClick:()=>{P([...e]),Q(!0)}','onClick:()=>r("midefe")');

js=js.slice(0,curHomeStart)+home+js.slice(curHomeEnd);

// 3) Argenliga: habilitar categorías juveniles además de Primera.
js=js.replace('argenliga:["Primera"]','argenliga:["3RA","4TA","5TA","6TA","7MA","8VA","9NA","Primera"]');

// Si datos.json sólo trae Primera, usar igual el catálogo completo configurado para Argenliga.
js=js.replace(
  'oe=b=>{const S=(A[b.id]&&A[b.id].categorias&&A[b.id].categorias.length?A[b.id].categorias:P[b.id])||[];return S}',
  'oe=b=>{const S=(b.id==="argenliga"?P.argenliga:(A[b.id]&&A[b.id].categorias&&A[b.id].categorias.length?A[b.id].categorias:P[b.id]))||[];return S}'
);

if(!js.includes('"9NA","Primera"')) throw new Error('No se aplicó catálogo ampliado de Argenliga');
if(!js.includes('children:"Novedades"')) throw new Error('La Home restaurada no contiene Novedades');
if(!js.includes('children:"Próxima fecha"')) throw new Error('La Home restaurada no contiene Próxima fecha');
if(!js.includes('children:"Futsal"')) throw new Error('La Home restaurada no contiene Futsal');

fs.writeFileSync(jsPath,js);

// Marca de versión.
const indexPath=path.join(dist,'index.html');
let html=fs.readFileSync(indexPath,'utf8');
html=html.replace('</head>','<meta name="defe-ui-version" content="v14-20260909"></head>');
fs.writeFileSync(indexPath,html);
console.log('DEFE_UI_V14_20260909 aplicado: Home V12 restaurada + Mi Defe ampliado');
