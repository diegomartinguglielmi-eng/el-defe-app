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

// Home: estado de selector familiar y editor posterior.
const stateNeedle='_=(g?Object.entries(g.horas):[]).sort((y,f)=>y[1].localeCompare(f[1]));return u.jsxs("div",{className:"space-y-6 px-4 pb-6",children:[';
if(!js.includes(stateNeedle)) throw new Error('No se encontró el inicio de Home para agregar selector');
js=js.replace(stateNeedle,'_=(g?Object.entries(g.horas):[]).sort((y,f)=>y[1].localeCompare(f[1]));const[q,Q]=C.useState(!1);return u.jsxs("div",{className:"defe-home space-y-5 px-4 pb-6",children:[');

// Selector familiar: multiselección real, guardado y desaparición del bloque de onboarding.
const oldIntro='e.length===0&&u.jsxs("div",{className:"rounded-2xl p-4",style:{background:m.azulTinte,border:`1px solid ${m.linea}`},children:[u.jsx("div",{className:"mb-1 font-semibold",children:"Elegí las categorías de tu familia"}),u.jsx("p",{className:"mb-3 text-sm",style:{color:m.gris},children:"Marcá con la estrella las que seguís y la app te muestra primero sus resultados y horarios."}),u.jsx("button",{onClick:()=>r("partidos"),className:"rounded-full px-4 py-2 text-sm font-semibold text-white",style:{background:m.azul},children:"Elegir categorías"})]})';
const newIntro='e.length===0&&u.jsxs("div",{className:"defe-category-card rounded-3xl",children:[u.jsx("div",{className:"defe-family-icon",children:"◎"}),u.jsxs("div",{className:"defe-category-copy",children:[u.jsx("div",{className:"defe-category-title",children:"Elegí las categorías de tu familia"}),u.jsx("p",{className:"defe-category-help",children:"Podés elegir una, dos o varias. La app recordará la selección y te mostrará sus horarios y resultados."})]}),u.jsx("button",{onClick:()=>Q(!0),className:"defe-category-open",children:"Elegir categorías"})]})';
if(!js.includes(oldIntro)) throw new Error('No se encontró la tarjeta inicial de categorías');
js=js.replace(oldIntro,newIntro);

// Modal de multiselección. Cada toque suma o quita una categoría; no cierra hasta Guardar.
const anchor='e.length===0&&u.jsxs("div",{className:"defe-category-card rounded-3xl"';
if(!js.includes(anchor)) throw new Error('No se pudo ubicar el selector familiar nuevo');
const modal=',q&&u.jsx("div",{className:"defe-cat-backdrop",onClick:()=>Q(!1),children:u.jsxs("div",{className:"defe-cat-modal",onClick:y=>y.stopPropagation(),children:[u.jsxs("div",{className:"defe-cat-modal-head",children:[u.jsxs("div",{children:[u.jsx("div",{className:"defe-cat-modal-title",children:"Categorías de tu familia"}),u.jsx("div",{className:"defe-cat-modal-sub",children:"Seleccioná todas las que quieras seguir"})]}),u.jsx("button",{onClick:()=>Q(!1),className:"defe-cat-close","aria-label":"Cerrar",children:"×"})]}),u.jsx("div",{className:"defe-cat-grid",children:h.map(y=>{const f=e.includes(y);return u.jsxs("button",{onClick:()=>t(y),className:f?"defe-cat-option is-selected":"defe-cat-option",children:[u.jsx("span",{children:y}),u.jsx("span",{className:"defe-cat-check",children:f?"✓":"+"})]},y)})}),u.jsx("div",{className:"defe-cat-count",children:e.length===0?"Todavía no elegiste ninguna":e.length===1?"1 categoría seleccionada":`${e.length} categorías seleccionadas`}),u.jsx("button",{onClick:()=>Q(!1),disabled:e.length===0,className:"defe-category-save",children:e.length?"Guardar selección":"Elegí al menos una categoría"})]})})';
const introEnd='u.jsx("button",{onClick:()=>Q(!0),className:"defe-category-open",children:"Elegir categorías"})]})';
js=js.replace(introEnd,introEnd+modal);

// En la grilla de horarios mostrar sólo las categorías seleccionadas.
js=js.replace('_.map(([y,f],v)=>{const b=e.includes(y);return u.jsxs("div"', '(e.length?_.filter(([y])=>e.includes(y)):_).map(([y,f],v)=>{const b=e.includes(y);return u.jsxs("div"');

// Ocultar horarios hasta tener selección y permitir editar selección desde el encabezado de la grilla.
js=js.replace('g?u.jsxs("div",{className:"mt-3 overflow-hidden rounded-2xl bg-white"', 'g?u.jsxs("div",{className:e.length?"defe-times-card mt-3 overflow-hidden rounded-2xl bg-white":"hidden"');
js=js.replace('children:"Horario de cada categoría"}),', 'children:"Tus categorías"}),u.jsx("button",{onClick:()=>Q(!0),className:"defe-edit-cats",children:"Cambiar"}),');

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

// Estética de tarjeta de partido.
js=js.replace('u.jsxs("div",{className:"overflow-hidden rounded-2xl",style:{background:m.azul,color:"#fff"},children:[', 'u.jsxs("div",{className:"defe-match-card overflow-hidden rounded-3xl",style:{background:m.azul,color:"#fff"},children:[');
const directions='u.jsx("div",{className:"pt-1",children:u.jsx(yi,{destino:l.sede,claro:!0})})';
if(!js.includes(directions)) throw new Error('No se encontró Cómo llegar');
js=js.replace(directions,directions+',u.jsx("div",{className:"defe-siempre",children:"SIEMPRE DEFE!"})');

js+='\n/* DEFE_UI_V7_20260909 FAMILY_MULTISELECT */\n';
fs.writeFileSync(jsPath,js);

const cssFile=fs.readdirSync(assets).find(f=>/^index-.*\.css$/.test(f));
if(cssFile){
 const cssPath=path.join(assets,cssFile);
 let css=fs.readFileSync(cssPath,'utf8');
 css+=`
/* DEFE UI V7 */
.defe-hero{height:132px!important;min-height:132px!important;overflow:hidden!important;background:
linear-gradient(90deg,rgba(3,34,80,.92),rgba(5,54,116,.80)),
radial-gradient(circle at 18% 115%,rgba(255,255,255,.15) 0 2px,transparent 3px),
radial-gradient(circle at 28% 110%,rgba(255,255,255,.12) 0 2px,transparent 3px),
radial-gradient(circle at 72% 112%,rgba(255,255,255,.12) 0 2px,transparent 3px),
repeating-linear-gradient(125deg,#082d68 0 24px,#0d438e 24px 48px)!important;
box-shadow:0 8px 22px rgba(7,29,62,.18)}
.defe-hero:after{content:"";position:absolute;inset:auto 0 0;height:44px;background:repeating-radial-gradient(circle at 10px 42px,rgba(255,255,255,.12) 0 2px,transparent 3px 12px);opacity:.45;pointer-events:none}
.defe-hero-inner{height:132px!important;padding:14px 16px!important;gap:12px!important;align-items:center!important}
.defe-hero-inner img{width:67px!important;max-width:67px!important;max-height:78px!important}
.defe-hero-title{font-family:Anton,Impact,sans-serif!important;font-style:normal!important;font-size:16px!important;line-height:1.03!important;letter-spacing:.25px!important;max-width:235px!important}
.defe-hero-sub{display:none!important}
.defe-hero-tag{margin-top:7px!important;padding-top:5px!important;font-size:10px!important;letter-spacing:.28px!important;border-top:2px solid rgba(255,255,255,.92)!important}
.defe-hero-side,.defe-hero-year{display:none!important}
.defe-hero .rounded-full{flex-shrink:0!important;background:rgba(255,255,255,.14)!important;border:1px solid rgba(255,255,255,.12)!important}
.defe-home{padding-top:12px!important}
.defe-category-card{display:grid;grid-template-columns:54px 1fr auto;align-items:center;gap:12px;padding:14px 16px;background:#fff;border:1px solid #D8E2F0;box-shadow:0 8px 22px rgba(17,43,81,.07)}
.defe-family-icon{display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;background:#EEF4FB;color:#082D68;font-size:28px;font-weight:800}
.defe-category-title{font-size:16px;font-weight:800;color:#071D3E;line-height:1.15}
.defe-category-help{margin-top:4px;font-size:12px;line-height:1.35;color:#687995}
.defe-category-open{border:none;border-radius:999px;background:#082D68;color:#fff;padding:11px 15px;font-size:13px;font-weight:800;white-space:nowrap}
.defe-cat-backdrop{position:fixed;inset:0;z-index:120;background:rgba(3,18,43,.62);display:flex;align-items:flex-end;justify-content:center;padding:16px}
.defe-cat-modal{width:min(100%,520px);max-height:78vh;overflow:auto;background:#fff;border-radius:26px 26px 18px 18px;padding:18px;box-shadow:0 24px 70px rgba(0,0,0,.28)}
.defe-cat-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
.defe-cat-modal-title{font-size:20px;font-weight:900;color:#071D3E}.defe-cat-modal-sub{margin-top:3px;font-size:13px;color:#687995}
.defe-cat-close{border:none;background:#EEF4FB;color:#082D68;width:34px;height:34px;border-radius:50%;font-size:24px;line-height:1}
.defe-cat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
.defe-cat-option{display:flex;align-items:center;justify-content:space-between;border:1px solid #D8E2F0;background:#F7FAFE;color:#082D68;border-radius:14px;padding:12px 11px;font-weight:800;font-size:14px;min-height:46px}
.defe-cat-option.is-selected{background:#082D68;color:#fff;border-color:#082D68;box-shadow:0 4px 12px rgba(8,45,104,.20)}
.defe-cat-check{font-size:16px;font-weight:900}
.defe-cat-count{margin:14px 0 10px;font-size:12px;font-weight:700;color:#687995;text-align:center}
.defe-category-save{width:100%;border:none;border-radius:14px;padding:13px;background:#082D68;color:#fff;font-weight:800;font-size:14px}.defe-category-save:disabled{background:#D8E2F0;color:#687995}
.defe-edit-cats{margin-left:auto;border:none;background:#EEF4FB;color:#124D98;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:800}
.defe-times-card{box-shadow:0 8px 22px rgba(17,43,81,.07);border:1px solid #D8E2F0}
.defe-match-card{position:relative;background-image:linear-gradient(112deg,rgba(4,45,105,.99),rgba(10,70,148,.92)),url('/el-defe-app/escudo-dsl.svg?v=41')!important;background-repeat:no-repeat,no-repeat!important;background-size:auto,170px!important;background-position:0 0,112% 50%!important;box-shadow:0 10px 26px rgba(11,49,105,.16)}
.defe-match-card .p-4{padding:18px!important}
.defe-siempre{margin-top:8px;text-align:right;font-family:Impact,Anton,sans-serif;font-style:italic;font-size:17px;letter-spacing:.7px;color:#fff;transform:rotate(-2deg)}
.defe-siempre:after{content:"";display:block;width:104px;margin:4px 0 0 auto;border-bottom:2px solid rgba(255,255,255,.9)}
@media(max-width:520px){.defe-category-card{grid-template-columns:46px 1fr}.defe-category-open{grid-column:2;justify-self:start}.defe-family-icon{width:42px;height:42px;font-size:24px}.defe-cat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
 fs.writeFileSync(cssPath,css);
}

const indexPath=path.join(dist,'index.html');
let html=fs.readFileSync(indexPath,'utf8');
html=html.replace(/<meta name="defe-brand" content="[^"]*"\s*\/>/,'<meta name="defe-brand" content="v7-20260909" />');
fs.writeFileSync(indexPath,html);

console.log('UI V7 aplicada: multiselección familiar y estética compacta.');
