import fs from 'node:fs';
import path from 'node:path';

const dist='defe-web-build/dist';
const assets=path.join(dist,'assets');
const jsFile=fs.readdirSync(assets).find(f=>/^index-.*\.js$/.test(f));
if(!jsFile) throw new Error('No se encontró bundle');
const jsPath=path.join(assets,jsFile);
let js=fs.readFileSync(jsPath,'utf8');

const old='children:[Yi(c.fecha)," · el club ganó la fecha ",c.pts[0]," a ",c.pts[1],c.estado==="previo"&&" · a verificar"]';
const neu='children:[Yi(c.fecha),Array.isArray(c.pts)?" · el club ganó la fecha "+c.pts[0]+" a "+c.pts[1]:"",c.estado==="previo"&&" · a verificar"]';
if(!js.includes(old)) throw new Error('No se encontró acceso inseguro a c.pts');
js=js.replace(old,neu);
js+='\n/* DEFE_RUNTIME_V19_OPTIONAL_FEFI_PTS */\n';
fs.writeFileSync(jsPath,js);

const indexPath=path.join(dist,'index.html');
let html=fs.readFileSync(indexPath,'utf8');
html=html.replace(/<meta name="defe-brand" content="[^"]*"\s*\/>/,'<meta name="defe-brand" content="v19-runtime-20260909" />');
fs.writeFileSync(indexPath,html);
console.log('V19 aplicada: pts FEFI opcional, sin crash en Home');
