import fs from 'node:fs';
import path from 'node:path';

const dist='defe-web-build/dist';
const assets=path.join(dist,'assets');
const jsFile=fs.readdirSync(assets).find(f=>/^index-.*\.js$/.test(f));
if(!jsFile) throw new Error('No se encontró el bundle JS');
const jsPath=path.join(assets,jsFile);
let js=fs.readFileSync(jsPath,'utf8');

// Inicio: identidad institucional aprobada.
js=js.split('children:["inicio","midefe"].includes(x)?"MI DEFE":yn[x].toUpperCase()').join('children:["inicio","midefe"].includes(x)?"CLUB ATLÉTICO DEFENSORES DE SANTOS LUGARES":yn[x].toUpperCase()');
js=js.split('children:"DEFENSORES DE SANTOS LUGARES"').join('children:"CLUB ATLÉTICO DEFENSORES DE SANTOS LUGARES"');

// Próxima fecha: eliminar amarillo, horario global y valor de entrada.
const oldStripe='u.jsx("div",{style:{height:6,background:`repeating-linear-gradient(90deg, ${m.oro} 0 14px, ${m.azulVivo} 14px 28px)`}})';
const newStripe='u.jsx("div",{className:"defe-match-stripe",style:{height:5,background:"linear-gradient(90deg,#FFFFFF 0 18%,#2E6EB5 18% 38%,#FFFFFF 38% 58%,#2E6EB5 58% 78%,#FFFFFF 78% 100%)"}})';
if(!js.includes(oldStripe)) throw new Error('No se encontró la franja de Próxima fecha');
js=js.replace(oldStripe,newStripe);
js=js.split('style:{color:m.oro},children:p<=0?"hoy":p===1?"mañana":`en ${p} días`}').join('style:{color:"#FFFFFF"},children:p<=0?"hoy":p===1?"mañana":`en ${p} días`}');

const timeLine='u.jsxs("div",{className:"flex items-center gap-1",children:[u.jsx(al,{size:14}),g?`de ${_[0][1]} a ${_[_.length-1][1]}${g.entrada?` · entrada ${nt(g.entrada)}`:""}`:w||"horarios por categoría a confirmar"]}),';
if(!js.includes(timeLine)) throw new Error('No se encontró la línea de horario/entrada');
js=js.replace(timeLine,'');

// Añadir sello institucional a la tarjeta sin alterar datos ni navegación.
const directions='u.jsx("div",{className:"pt-1",children:u.jsx(yi,{destino:l.sede,claro:!0})})';
if(!js.includes(directions)) throw new Error('No se encontró Cómo llegar');
js=js.replace(directions,directions+',u.jsx("div",{className:"defe-siempre",children:"SIEMPRE DEFE!"})');

js+='\n/* DEFE_UI_V5_20260909 AZUL_SIEMPRE_DEFE */\n';
fs.writeFileSync(jsPath,js);

const cssFile=fs.readdirSync(assets).find(f=>/^index-.*\.css$/.test(f));
if(cssFile){
 const cssPath=path.join(assets,cssFile);
 let css=fs.readFileSync(cssPath,'utf8');
 css+=`\n/* DEFE UI V5 */\n.defe-hero{min-height:176px!important;background:linear-gradient(rgba(3,35,82,.76),rgba(4,48,105,.80)),repeating-linear-gradient(125deg,#082d68 0 18px,#0d438e 18px 36px)!important}.defe-hero-inner{padding:22px 22px 20px!important;gap:14px!important}.defe-hero-inner img{max-width:74px!important;max-height:86px!important}.defe-hero-title{font-family:Anton,Impact,sans-serif!important;font-style:normal!important;font-size:21px!important;line-height:1.12!important;letter-spacing:.5px!important;max-width:330px!important}.defe-hero-sub{display:none!important}.defe-hero-tag{margin-top:10px!important;padding-top:8px!important;font-size:13px!important}.defe-hero-side,.defe-hero-year{display:none!important}.defe-siempre{margin-top:10px;text-align:right;font-family:Impact,Anton,sans-serif;font-style:italic;font-size:18px;letter-spacing:.8px;color:#fff;transform:rotate(-2deg)}.defe-siempre:after{content:"";display:block;width:110px;margin:4px 0 0 auto;border-bottom:2px solid rgba(255,255,255,.9)}\n`;
 fs.writeFileSync(cssPath,css);
}

const indexPath=path.join(dist,'index.html');
let html=fs.readFileSync(indexPath,'utf8');
html=html.replace(/<meta name="defe-brand" content="[^"]*"\s*\/>/,'<meta name="defe-brand" content="v5-20260909" />');
fs.writeFileSync(indexPath,html);
console.log('UI V5 aplicada: identidad azul, Próxima fecha simplificada y SIEMPRE DEFE!');
