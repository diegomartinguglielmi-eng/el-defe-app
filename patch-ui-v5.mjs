import fs from 'node:fs';
import path from 'node:path';

const dist='defe-web-build/dist';
const assets=path.join(dist,'assets');
const jsFile=fs.readdirSync(assets).find(f=>/^index-.*\.js$/.test(f));
if(!jsFile) throw new Error('No se encontró el bundle JS');
const jsPath=path.join(assets,jsFile);
let js=fs.readFileSync(jsPath,'utf8');

// Identidad institucional de Inicio.
js=js.split('children:["inicio","midefe"].includes(x)?"MI DEFE":yn[x].toUpperCase()').join('children:["inicio","midefe"].includes(x)?"CLUB ATLÉTICO DEFENSORES DE SANTOS LUGARES":yn[x].toUpperCase()');
js=js.split('children:"DEFENSORES DE SANTOS LUGARES"').join('children:"CLUB ATLÉTICO DEFENSORES DE SANTOS LUGARES"');

// Mostrar acceso Mi Defe también en Inicio.
js=js.split('!["inicio","midefe"].includes(x)&&u.jsxs("button"').join('x!=="midefe"&&u.jsxs("button"');

// Selector de categorías: abrir, marcar varias y guardar una sola vez.
const stateNeedle='_=(g?Object.entries(g.horas):[]).sort((y,f)=>y[1].localeCompare(f[1]));return u.jsxs("div",{className:"space-y-6 px-4 pb-6",children:[';
if(!js.includes(stateNeedle)) throw new Error('No se encontró el inicio de Home para agregar selector');
js=js.replace(stateNeedle,'_=(g?Object.entries(g.horas):[]).sort((y,f)=>y[1].localeCompare(f[1]));const[q,Q]=C.useState(!1);return u.jsxs("div",{className:"space-y-6 px-4 pb-6",children:[');

const oldIntro='e.length===0&&u.jsxs("div",{className:"rounded-2xl p-4",style:{background:m.azulTinte,border:`1px solid ${m.linea}`},children:[u.jsx("div",{className:"mb-1 font-semibold",children:"Elegí las categorías de tu familia"}),u.jsx("p",{className:"mb-3 text-sm",style:{color:m.gris},children:"Marcá con la estrella las que seguís y la app te muestra primero sus resultados y horarios."}),u.jsx("button",{onClick:()=>r("partidos"),className:"rounded-full px-4 py-2 text-sm font-semibold text-white",style:{background:m.azul},children:"Elegir categorías"})]})';
const newIntro='(e.length===0||q)&&u.jsxs("div",{className:"defe-category-card rounded-3xl p-4",style:{background:"#FFFFFF",border:`1px solid ${m.linea}`},children:[u.jsx("div",{className:"mb-1 font-semibold",children:"Elegí las categorías de tu familia"}),u.jsx("p",{className:"mb-3 text-sm",style:{color:m.gris},children:"Elegilas una sola vez. Después Inicio te mostrará únicamente sus horarios y resultados."}),!q&&u.jsx("button",{onClick:()=>Q(!0),className:"defe-category-open rounded-full px-4 py-2 text-sm font-semibold text-white",style:{background:m.azul},children:"Elegir categorías"}),q&&u.jsx("div",{className:"defe-cat-grid",children:h.map(y=>{const f=e.includes(y);return u.jsxs("button",{onClick:()=>t(y),className:"defe-cat-option",style:{background:f?"#082D68":"#F4F8FD",color:f?"#fff":"#082D68",border:f?"1px solid #082D68":"1px solid #D8E2F0"},children:[u.jsx("span",{children:y}),u.jsx("span",{children:f?"✓":"○"})]},y)})}),q&&u.jsx("button",{onClick:()=>Q(!1),disabled:e.length===0,className:"defe-category-save mt-3 w-full rounded-xl py-2.5 text-sm font-semibold",style:{background:e.length?"#082D68":"#D8E2F0",color:e.length?"#fff":"#687995"},children:e.length?`Guardar selección (${e.length})`:"Elegí al menos una categoría"})]})';
if(!js.includes(oldIntro)) throw new Error('No se encontró la tarjeta inicial de categorías');
js=js.replace(oldIntro,newIntro);

// En la grilla de horarios mostrar sólo las categorías seleccionadas.
js=js.replace('_.map(([y,f],v)=>{const b=e.includes(y);return u.jsxs("div"', '(e.length?_.filter(([y])=>e.includes(y)):_).map(([y,f],v)=>{const b=e.includes(y);return u.jsxs("div"');

// Ocultar el bloque de horarios hasta que exista una selección.
js=js.replace('g?u.jsxs("div",{className:"mt-3 overflow-hidden rounded-2xl bg-white"', 'g?u.jsxs("div",{className:e.length?"mt-3 overflow-hidden rounded-2xl bg-white":"hidden"');

// Eliminar amarillo de badges manuales y estrellas seleccionadas.
js=js.split('background:n?"#E8F5EF":"#FFF4DE",color:n?m.gana:"#8A6100"').join('background:n?"#E8F5EF":"#EAF3FF",color:n?m.gana:"#124D98"');
js=js.split('color:e?m.oro:"#B8C1D1",fill:e?m.oro:"none"').join('color:e?"#124D98":"#B8C1D1",fill:e?"#124D98":"none"');

// Próxima fecha: sin amarillo, sin horario global ni valor de entrada.
const oldStripe='u.jsx("div",{style:{height:6,background:`repeating-linear-gradient(90deg, ${m.oro} 0 14px, ${m.azulVivo} 14px 28px)`}})';
const newStripe='u.jsx("div",{className:"defe-match-stripe",style:{height:4,background:"linear-gradient(90deg,#FFFFFF 0 16%,#4B82BD 16% 34%,#FFFFFF 34% 50%,#4B82BD 50% 68%,#FFFFFF 68% 84%,#4B82BD 84% 100%)"}})';
if(!js.includes(oldStripe)) throw new Error('No se encontró la franja de Próxima fecha');
js=js.replace(oldStripe,newStripe);
js=js.split('style:{color:m.oro},children:p<=0?"hoy":p===1?"mañana":`en ${p} días`}').join('style:{color:"#FFFFFF"},children:p<=0?"hoy":p===1?"mañana":`en ${p} días`}');

const timeLine='u.jsxs("div",{className:"flex items-center gap-1",children:[u.jsx(al,{size:14}),g?`de ${_[0][1]} a ${_[_.length-1][1]}${g.entrada?` · entrada ${nt(g.entrada)}`:""}`:w||"horarios por categoría a confirmar"]}),';
if(!js.includes(timeLine)) throw new Error('No se encontró la línea de horario/entrada');
js=js.replace(timeLine,'');

// Estética nueva de tarjeta.
js=js.replace('u.jsxs("div",{className:"overflow-hidden rounded-2xl",style:{background:m.azul,color:"#fff"},children:[', 'u.jsxs("div",{className:"defe-match-card overflow-hidden rounded-3xl",style:{background:m.azul,color:"#fff"},children:[');

const directions='u.jsx("div",{className:"pt-1",children:u.jsx(yi,{destino:l.sede,claro:!0})})';
if(!js.includes(directions)) throw new Error('No se encontró Cómo llegar');
js=js.replace(directions,directions+',u.jsx("div",{className:"defe-siempre",children:"SIEMPRE DEFE!"})');

js+='\n/* DEFE_UI_V6_20260909 SELECTOR_PERSISTENTE */\n';
fs.writeFileSync(jsPath,js);

const cssFile=fs.readdirSync(assets).find(f=>/^index-.*\.css$/.test(f));
if(cssFile){
 const cssPath=path.join(assets,cssFile);
 let css=fs.readFileSync(cssPath,'utf8');
 css+=`
/* DEFE UI V6 */
.defe-hero{min-height:145px!important;background:
linear-gradient(rgba(3,35,82,.84),rgba(4,48,105,.88)),
radial-gradient(circle at 84% 18%,rgba(255,255,255,.12),transparent 26%),
repeating-linear-gradient(125deg,#082d68 0 18px,#0b3e85 18px 36px)!important;
box-shadow:0 8px 22px rgba(7,29,62,.20)}
.defe-hero-inner{padding:18px 18px 17px!important;gap:12px!important;align-items:center!important}
.defe-hero-inner img{max-width:60px!important;max-height:70px!important}
.defe-hero-title{font-family:Anton,Impact,sans-serif!important;font-style:normal!important;font-size:17px!important;line-height:1.08!important;letter-spacing:.35px!important;max-width:235px!important}
.defe-hero-sub{display:none!important}
.defe-hero-tag{margin-top:8px!important;padding-top:6px!important;font-size:11px!important;letter-spacing:.35px!important}
.defe-hero-side,.defe-hero-year{display:none!important}
.defe-hero .rounded-full{flex-shrink:0}
.defe-category-card{box-shadow:0 8px 22px rgba(17,43,81,.07)}
.defe-cat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}
.defe-cat-option{display:flex;align-items:center;justify-content:space-between;border-radius:12px;padding:10px 11px;font-weight:700;font-size:13px}
.defe-category-save:disabled{cursor:not-allowed}
.defe-match-card{position:relative;background-image:
linear-gradient(115deg,rgba(5,45,104,.98),rgba(10,67,142,.91)),
url('/el-defe-app/escudo-dsl.svg?v=41')!important;
background-repeat:no-repeat,no-repeat!important;
background-size:auto,155px!important;
background-position:0 0,112% 55%!important;
box-shadow:0 10px 26px rgba(11,49,105,.16)}
.defe-match-card .p-4{padding:18px!important}
.defe-match-card .text-sm{line-height:1.35}
.defe-siempre{margin-top:8px;text-align:right;font-family:Impact,Anton,sans-serif;font-style:italic;font-size:17px;letter-spacing:.7px;color:#fff;transform:rotate(-2deg)}
.defe-siempre:after{content:"";display:block;width:104px;margin:4px 0 0 auto;border-bottom:2px solid rgba(255,255,255,.9)}
`;
 fs.writeFileSync(cssPath,css);
}

const indexPath=path.join(dist,'index.html');
let html=fs.readFileSync(indexPath,'utf8');
html=html.replace(/<meta name="defe-brand" content="[^"]*"\s*\/>/,'<meta name="defe-brand" content="v6-20260909" />');
fs.writeFileSync(indexPath,html);

console.log('UI V6 aplicada: estética ajustada y selector persistente de categorías.');
