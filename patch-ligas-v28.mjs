import fs from 'node:fs';
import path from 'node:path';

const dist='defe-web-build/dist';
const assets=path.join(dist,'assets');
const jsFile=fs.readdirSync(assets).find(f=>/^index-.*\.js$/.test(f));
if(!jsFile) throw new Error('No se encontró bundle');
const jsPath=path.join(assets,jsFile);
let js=fs.readFileSync(jsPath,'utf8');

// Argenliga: Defe participa sólo con la rama masculina.
const a0=js.indexOf('if(r==="argenliga"){');
const a1=js.indexOf('if(r==="lamba"){',a0);
if(a0<0||a1<0) throw new Error('No se encontró bloque Argenliga V27');
let arg=js.slice(a0,a1);
arg=arg
  .replace('K=kL==="femenino"?F:M','K=M')
  .replace('(v.rama||"masculino")===kL','(v.rama||"masculino")==="masculino"')
  .replace('((kL==="masculino"&&Z==="1RA")?','((Z==="1RA")?')
  .replace('children:[["masculino","Masculino"],["femenino","Femenino"]].map','children:[["masculino","Masculino"]].map')
  .replace('["Argenliga · ",kL==="femenino"?"Femenino":"Masculino"," · ",Z]','["Argenliga · Masculino · ",Z]')
  .replace(/Argenliga \\?\$\{kL==="femenino"\?"Femenino":"Masculino"\}/g,'Argenliga Masculino');
js=js.slice(0,a0)+arg+js.slice(a1);

// LAAMBA: femenino de Defe 2026 está publicado como Reserva de F - Ascenso I.
const l0=js.indexOf('if(r==="lamba"){',a0);
if(l0<0) throw new Error('No se encontró bloque LAAMBA');
let pre=js.slice(0,l0), la=js.slice(l0);
la=la
  .replace('F=["FEM 1RA"]','F=["FEM RVA"]')
  .replace('nL(v==="femenino"?"FEM 1RA":"1RA")','nL(v==="femenino"?"FEM RVA":"1RA")')
  .replace(/v==="FEM 1RA"\?"1RA Femenino":v/g,'v==="FEM RVA"?"Reserva Femenino":v')
  .replace(/v\.categoria==="FEM 1RA"\?"1RA Femenino":v\.categoria/g,'v.categoria==="FEM RVA"?"Reserva Femenino":v.categoria')
  .replace('"Femenino · Ascenso I · Zona B"','"Femenino · Ascenso I · Reserva"');
js=pre+la;

js+='\n/* DEFE_LIGAS_V28_FEMENINO_EN_LAAMBA */\n';
fs.writeFileSync(jsPath,js);
console.log('V28 aplicada: Argenliga sólo masculino; femenino Defe en LAAMBA Ascenso I Reserva');
