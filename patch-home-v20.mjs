import fs from 'node:fs';
import path from 'node:path';

const dist='defe-web-build/dist';
const assets=path.join(dist,'assets');
const jsFile=fs.readdirSync(assets).find(f=>/^index-.*\.js$/.test(f));
if(!jsFile) throw new Error('No se encontró bundle');
const jsPath=path.join(assets,jsFile);
let js=fs.readFileSync(jsPath,'utf8');

const old='u.jsxs("section",{children:[u.jsxs("h2",{className:"mb-1 font-semibold",style:{fontSize:17},children:["Fecha ",c.nro," · ",c.local?"vs "+gr(c.rival):"en "+gr(c.rival)]}),u.jsxs("p",{className:"mb-3 text-xs",style:{color:m.gris},children:[Yi(c.fecha),Array.isArray(c.pts)?" · el club ganó la fecha "+c.pts[0]+" a "+c.pts[1]:"",c.estado==="previo"&&" · a verificar"]}),u.jsx("div",{className:"overflow-hidden rounded-2xl bg-white",style:{border:`1px solid ${m.linea}`},children:d.map((y,f)=>u.jsxs("div",{className:"flex items-center gap-3 px-4 py-2.5",style:{borderTop:f?`1px solid ${m.linea}`:"none"},children:[u.jsx("span",{className:"w-14 font-semibold",children:y}),u.jsx("span",{className:"flex-1",children:u.jsx(Jf,{m:c.marc[y]})}),u.jsx(Yc,{activo:e.includes(y),onClick:()=>t(y),size:18})]},y))})]})';

const neu='u.jsxs("section",{children:[u.jsx("h2",{className:"mb-3 font-semibold",style:{fontSize:17},children:"Última fecha"}),u.jsxs("div",{className:"rounded-2xl bg-white p-4",style:{border:`1px solid ${m.linea}`},children:[u.jsxs("div",{className:"mb-2 flex items-center justify-between gap-3",children:[u.jsxs("div",{children:[u.jsxs("div",{className:"text-xs font-semibold",style:{color:m.azul},children:["FEFI · Fecha ",c.nro," · Clausura"]}),u.jsx("div",{className:"mt-1 font-semibold",style:{fontSize:18},children:c.local?"DEFE vs "+gr(c.rival):gr(c.rival)+" vs DEFE"})]}),u.jsx("span",{className:"rounded-full px-2.5 py-1 text-xs font-semibold",style:{background:m.azulTinte,color:m.azul},children:c.local?"Local":"Visitante"})]}),u.jsx("div",{className:"text-sm",style:{color:m.gris},children:Yi(c.fecha)}),c.sede&&u.jsxs("div",{className:"mt-2 flex items-start gap-2 text-sm",style:{color:m.gris},children:[u.jsx("span",{children:"⌖"}),u.jsx("span",{children:c.sede})]}),(()=>{const z=Object.values(c.marc||{}).filter(v=>Array.isArray(v));let g=0,E=0,p=0;z.forEach(v=>{v[0]>v[1]?g++:v[0]===v[1]?E++:p++});return z.length?u.jsxs("div",{className:"mt-3 rounded-xl px-3 py-2 text-sm font-semibold",style:{background:m.azulTinte,color:m.azul},children:[g," ganados · ",E," empate",E===1?"":"s"," · ",p," perdido",p===1?"":"s"]}):null})(),u.jsx("div",{className:"mt-3 overflow-hidden rounded-xl",style:{border:`1px solid ${m.linea}`},children:d.map((y,f)=>u.jsxs("div",{className:"flex items-center gap-3 px-3 py-2.5",style:{borderTop:f?`1px solid ${m.linea}`:"none"},children:[u.jsx("span",{className:"w-14 font-semibold",children:y}),u.jsx("span",{className:"flex-1",children:u.jsx(Jf,{m:c.marc[y]})}),u.jsx(Yc,{activo:e.includes(y),onClick:()=>t(y),size:18})]},y))})]})]})';

if(!js.includes(old)) throw new Error('No se encontró bloque de última fecha V19');
js=js.replace(old,neu);
js+='\n/* DEFE_HOME_V20_RICH_LAST_MATCH */\n';
fs.writeFileSync(jsPath,js);

const indexPath=path.join(dist,'index.html');
let html=fs.readFileSync(indexPath,'utf8');
html=html.replace(/<meta name="defe-brand" content="[^"]*"\s*\/>/,'<meta name="defe-brand" content="v20-rich-last-match-20260909" />');
fs.writeFileSync(indexPath,html);
console.log('V20 aplicada: última fecha enriquecida con sede, condición y resumen');
