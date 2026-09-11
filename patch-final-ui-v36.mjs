import fs from 'node:fs';
import path from 'node:path';

const dist='defe-web-build/dist';
const assets=path.join(dist,'assets');
const jsFile=fs.readdirSync(assets).find(f=>/^index-.*\.js$/.test(f));
if(!jsFile) throw new Error('No se encontró bundle');
const jsPath=path.join(assets,jsFile);
let js=fs.readFileSync(jsPath,'utf8');

// Este parche debe ser idempotente: en builds nuevos los selectores pueden haber
// sido transformados previamente por otros parches. En ese caso no abortamos el
// deploy de Netlify; simplemente conservamos el bundle ya actualizado.
const laambaOld='if(r==="lamba"){const M=["1RA","3RA","4TA","5TA","6TA","7MA","8VA"],F=["FEM 1RA"]';
const laambaNew='if(r==="lamba"){const M=["1RA","3RA","4TA","5TA","6TA","7MA","8VA","Promocional 2016","Promocional 2017","Promocional 2018","Promocional 2019/20"],F=["FEM 1RA"]';
if(js.includes(laambaOld)) {
  js=js.replace(laambaOld,laambaNew);
  console.log('V36: selector LAAMBA actualizado');
} else {
  console.log('V36: selector LAAMBA ya transformado; se continúa sin abortar');
}

const argenOld='if(r==="argenliga"){const M=["1RA","3RA","4TA","5TA","6TA","7MA","8VA"],F=';
const argenNew='if(r==="argenliga"){const M=["1RA","3RA","4TA","5TA","6TA","7MA","8VA","9NA"],F=';
if(js.includes(argenOld)) {
  js=js.replace(argenOld,argenNew);
  console.log('V36: selector Argenliga actualizado');
} else {
  console.log('V36: selector Argenliga ya transformado; se continúa sin abortar');
}

if(!js.includes('DEFE_FINAL_UI_V36_PROMOS_ARGEN_9NA')) {
  js+='\n/* DEFE_FINAL_UI_V36_PROMOS_ARGEN_9NA */\n';
}
fs.writeFileSync(jsPath,js);

const indexPath=path.join(dist,'index.html');
let html=fs.readFileSync(indexPath,'utf8');
html=html.replace(/<meta name="defe-brand" content="[^"]*"\s*\/>/,'<meta name="defe-brand" content="v36-final-categorias-20260911" />');
fs.writeFileSync(indexPath,html);
console.log('V36 aplicada sin bloquear builds ya parcheados');
