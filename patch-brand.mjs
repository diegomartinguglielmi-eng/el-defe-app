import fs from 'node:fs';
import path from 'node:path';

const dist='defe-web-build/dist';
const assets=path.join(dist,'assets');
const jsFile=fs.readdirSync(assets).find(f=>/^index-.*\.js$/.test(f));
if(!jsFile) throw new Error('No se encontró el bundle JS');
const jsPath=path.join(assets,jsFile);
let js=fs.readFileSync(jsPath,'utf8');

const replacements=new Map([
 ['#2E3192','#082D68'],['#3A307E','#082D68'],['#40368F','#082D68'],
 ['#4B50C6','#124D98'],['#51469A','#124D98'],['#5A4EB0','#124D98'],
 ['#ECEDFB','#EEF4FB'],['#EEEAF7','#EEF4FB'],['#EEEAF8','#EEF4FB'],
 ['#101828','#071D3E'],['#201C38','#071D3E'],['#241F3F','#071D3E'],
 ['#69748A','#687995'],['#746F86','#687995'],['#716C84','#687995'],
 ['#DFE5F0','#D8E2F0'],['#DED9E9','#D8E2F0'],['#DDD7EC','#D8E2F0'],
 ['#F3F6FB','#F3F7FC'],['#F7F6FA','#F3F7FC'],['#F2EFF9','#F3F7FC']
]);
for(const [from,to] of replacements) js=js.split(from).join(to);

const logoStart=js.indexOf('function Ns({size:e=34}){');
const logoEnd=js.indexOf('function Xi(',logoStart);
if(logoStart<0||logoEnd<0) throw new Error('No se encontró el componente del escudo');
const logoFn='function Ns({size:e=34}){return u.jsx("img",{src:"/el-defe-app/escudo-dsl.svg?v=41",alt:"Escudo Defensores de Santos Lugares",style:{width:e,height:e*1.15,objectFit:"contain",display:"block",filter:"drop-shadow(0 3px 6px rgba(0,0,0,.30))"}})}';
js=js.slice(0,logoStart)+logoFn+js.slice(logoEnd);

const oldHeader='u.jsxs("div",{style:{background:m.azul,backgroundImage:"repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 18px, transparent 18px 36px)",color:"#fff",position:"sticky",top:0,zIndex:40},children:[u.jsxs("div",{className:"flex items-center gap-3 px-4 pb-3 pt-4",children:[u.jsx(Ns,{size:30}),u.jsxs("div",{className:"flex-1",children:[u.jsx("div",{style:{fontFamily:"Anton, sans-serif",fontSize:19,letterSpacing:.6},children:yn[x].toUpperCase()}),u.jsx("div",{style:{fontSize:11,opacity:.75,marginTop:-2},children:"Defensores de Santos Lugares"})]}),u.jsxs("button",{onClick:()=>_("midefe"),className:"flex items-center gap-1.5 rounded-full px-3 py-1.5",style:{background:["midefe","gestion"].includes(x)?"rgba(255,255,255,.25)":"rgba(255,255,255,.14)"},"aria-label":"Mi Defe",children:[u.jsx(iw,{size:15}),u.jsx("span",{className:"text-xs font-semibold",children:e?"Mi Defe":"Ingresar"})]})]}),o&&u.jsx("div",{className:"px-4 pb-2 text-xs",style:{opacity:.8},children:"Sin conexión: estás viendo lo último que se descargó."})]})';
const newHeader='u.jsxs("div",{className:["inicio","midefe"].includes(x)?"defe-hero defe-hero-profile":"defe-topbar",style:{color:"#fff",position:["inicio","midefe"].includes(x)?"relative":"sticky",top:0,zIndex:40},children:[u.jsxs("div",{className:["inicio","midefe"].includes(x)?"defe-hero-inner":"flex items-center gap-3 px-4 pb-3 pt-4",children:[u.jsx(Ns,{size:["inicio","midefe"].includes(x)?86:38}),u.jsxs("div",{className:"flex-1",children:[u.jsx("div",{className:["inicio","midefe"].includes(x)?"defe-hero-title":"defe-topbar-title",children:["inicio","midefe"].includes(x)?"MI DEFE":yn[x].toUpperCase()}),u.jsx("div",{className:["inicio","midefe"].includes(x)?"defe-hero-sub":"defe-topbar-sub",children:"DEFENSORES DE SANTOS LUGARES"}),["inicio","midefe"].includes(x)&&u.jsx("div",{className:"defe-hero-tag",children:"EL GIGANTE DE TRES DE FEBRERO"})]}),!["inicio","midefe"].includes(x)&&u.jsxs("button",{onClick:()=>_("midefe"),className:"flex items-center gap-1.5 rounded-full px-3 py-1.5",style:{background:["midefe","gestion"].includes(x)?"rgba(255,255,255,.25)":"rgba(255,255,255,.14)"},"aria-label":"Mi Defe",children:[u.jsx(iw,{size:15}),u.jsx("span",{className:"text-xs font-semibold",children:e?"Mi Defe":"Ingresar"})]})]}),["inicio","midefe"].includes(x)&&u.jsxs("div",{className:"defe-hero-side",children:[u.jsx("span",{children:"BARRIO"}),u.jsx("span",{children:"FAMILIA"}),u.jsx("span",{children:"FUTSAL"}),u.jsx("span",{children:"PASIÓN"}),u.jsx("span",{children:"SIEMPRE"})]}),["inicio","midefe"].includes(x)&&u.jsx("div",{className:"defe-hero-year",children:"1922"}),o&&u.jsx("div",{className:"px-4 pb-2 text-xs",style:{opacity:.8},children:"Sin conexión: estás viendo lo último que se descargó."})]})';
if(!js.includes(oldHeader)) throw new Error('No se encontró el encabezado base');
js=js.replace(oldHeader,newHeader);

const oldNav='className:"flex flex-col items-center gap-1 py-2.5",children:[u.jsx(_t,{size:21,style:{color:Cs?m.azul:"#98A2B3"},strokeWidth:Cs?2.4:1.8}),u.jsx("span",{style:{fontSize:10.5,fontWeight:Cs?700:500,color:Cs?m.azul:"#98A2B3"},children:vn})]';
const newNav='className:"defe-nav-item flex flex-col items-center gap-1 py-2.5",style:{background:Cs?"#F4F8FD":"transparent",borderTop:Cs?"3px solid #082D68":"3px solid transparent"},children:[u.jsx(_t,{size:22,style:{color:Cs?"#082D68":"#8795AA"},strokeWidth:Cs?2.6:1.8}),u.jsx("span",{style:{fontSize:10.5,fontWeight:Cs?800:500,color:Cs?"#082D68":"#8795AA"},children:vn})]';
if(!js.includes(oldNav)) throw new Error('No se encontró la navegación inferior base');
js=js.replace(oldNav,newNav);

js=js.replace('const Ow=[["cambios","Cambios de horario o cancha"],["resultados","Resultados al terminar la fecha"],["novedades","Novedades del club"],["convocatorias","Convocatorias"],["soloFavoritos","Solo de mis categorías"]];',
'const Ow=[["cambios","Cambios de horario o cancha","Avisos de modificaciones en partidos"],["resultados","Resultados al terminar la fecha","Resultados y posiciones"],["novedades","Novedades del club","Comunicados y noticias importantes"],["convocatorias","Convocatorias","Citaciones y listas de buena fe"],["soloFavoritos","Solo de mis categorías","Filtrá la información que te interesa"]];');

js=js.replace('return e?u.jsxs("div",{className:"space-y-4 px-4 pb-6",children:[',
'return e?u.jsxs("div",{className:"defe-profile-page space-y-4 px-4 pb-6",children:[');

js=js.replace('u.jsxs("div",{className:"rounded-2xl bg-white p-4",style:{border:`1px solid ${m.linea}`},children:[u.jsxs("div",{className:"flex items-center gap-3",children:[u.jsx("div",{className:"flex h-11 w-11 items-center justify-center rounded-full",style:{background:m.azulTinte},children:u.jsx(Ns,{size:22})}),',
'u.jsxs("div",{className:"defe-profile-card rounded-3xl bg-white p-4",style:{border:`1px solid ${m.linea}`},children:[u.jsxs("div",{className:"flex items-center gap-3",children:[u.jsx("div",{className:"defe-avatar flex h-14 w-14 items-center justify-center rounded-full",style:{background:m.azulTinte},children:u.jsx(Ns,{size:30})}),');

js=js.replace('u.jsx("button",{onClick:a,className:"mt-3 w-full rounded-xl py-2.5 text-sm font-semibold",style:{border:`1px solid ${m.linea}`},children:"Cerrar sesión"})]}),',
'u.jsx("button",{onClick:a,className:"defe-logout mt-4 w-full rounded-xl py-3 text-sm font-semibold",style:{border:`1px solid ${m.linea}`},children:"⇥  Cerrar sesión"})]}),');

js=js.replace('u.jsxs("div",{className:"overflow-hidden rounded-2xl bg-white",style:{border:`1px solid ${m.linea}`},children:[u.jsx("div",{className:"px-4 py-3 font-semibold",style:{borderBottom:`1px solid ${m.linea}`},children:"Notificaciones"}),Ow.map(([y,f])=>u.jsxs("button",{onClick:()=>r({...t,[y]:!t[y]}),className:"flex w-full items-center gap-3 px-4 py-3 text-left",style:{borderBottom:`1px solid ${m.linea}`},children:[u.jsx("span",{className:"flex-1 text-sm",children:f}),u.jsx("span",{className:"rounded-full px-2.5 py-1 text-xs font-semibold",style:{background:t[y]?m.azul:"#E4E9F2",color:t[y]?"#fff":m.gris},children:t[y]?"Sí":"No"})]},y)),u.jsx(Pw,{perfilId:e.id})]}),',
'u.jsxs("div",{className:"defe-notif-card overflow-hidden rounded-3xl bg-white",style:{border:`1px solid ${m.linea}`},children:[u.jsxs("div",{className:"defe-notif-head flex items-center px-4 py-4",style:{borderBottom:`1px solid ${m.linea}`},children:[u.jsx("span",{className:"defe-bell",children:"●"}),u.jsx("span",{className:"font-semibold",children:"Notificaciones"}),u.jsx("span",{className:"ml-auto text-xs font-semibold tracking-wider",style:{color:m.gris},children:"ELEGÍ QUÉ QUERÉS RECIBIR"})]}),Ow.map(([y,f,desc],idx)=>u.jsxs("button",{onClick:()=>r({...t,[y]:!t[y]}),className:"defe-notif-row flex w-full items-center gap-3 px-4 py-3 text-left",style:{borderBottom:`1px solid ${m.linea}`},children:[u.jsx("span",{className:"defe-notif-icon",children:["▣","●","◖","♟","☆"][idx]}),u.jsxs("span",{className:"flex-1",children:[u.jsx("span",{className:"block text-sm font-semibold",children:f}),u.jsx("span",{className:"block text-xs",style:{color:m.gris},children:desc})]}),u.jsx("span",{className:"defe-toggle rounded-full px-3 py-1 text-xs font-semibold",style:{background:t[y]?m.azul:"#E4E9F2",color:t[y]?"#fff":m.gris},children:t[y]?"Sí  ●":"○  No"})]},y)),u.jsx(Pw,{perfilId:e.id})]}),u.jsxs("div",{className:"defe-club-banner rounded-3xl",children:[u.jsxs("div",{className:"defe-club-banner-copy",children:[u.jsx("div",{children:"MI BARRIO"}),u.jsx("div",{children:"MI CLUB"}),u.jsx("div",{children:"MI FAMILIA"})]}),u.jsxs("div",{className:"defe-club-values",children:[u.jsx("span",{children:"DISCIPLINA"}),u.jsx("span",{children:"RESPETO"}),u.jsx("span",{children:"COMPAÑERISMO"}),u.jsx("span",{children:"PASIÓN"})]})]}),');

js+='\n/* DEFE_BRAND_V4_1_20260909 HOME_EDITORIAL */\n';
fs.writeFileSync(jsPath,js);

const svg=`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 560" role="img" aria-label="Escudo Defensores de Santos Lugares">
 <path d="M48 68 C120 83 182 73 256 28 C330 73 392 83 464 68 L450 326 C446 424 361 490 256 542 C151 490 66 424 62 326 Z" fill="#082D68" stroke="#FFFFFF" stroke-width="10"/>
 <path d="M69 91 C134 102 190 91 256 52 C322 91 378 102 443 91 L431 321 C428 406 352 465 256 514 C160 465 84 406 81 321 Z" fill="#082D68" stroke="#FFFFFF" stroke-width="12"/>
 <rect x="92" y="232" width="328" height="76" fill="#FFFFFF"/>
 <circle cx="221" cy="270" r="9" fill="#082D68"/><circle cx="291" cy="270" r="9" fill="#082D68"/>
 <text x="256" y="326" text-anchor="middle" font-family="Georgia,Times New Roman,serif" font-size="132" font-weight="700" fill="#082D68" stroke="#FFFFFF" stroke-width="4" paint-order="stroke">DSL</text>
</svg>`;
fs.writeFileSync(path.join(dist,'escudo-dsl.svg'),svg);

const indexPath=path.join(dist,'index.html');
let html=fs.readFileSync(indexPath,'utf8');
html=html.replace(/<meta name="theme-color" content="#[0-9A-Fa-f]{6}"\s*\/>/,'<meta name="theme-color" content="#082D68" />');
html=html.replace(/<meta name="defe-brand" content="[^"]*"\s*\/>/,'<meta name="defe-brand" content="v4.1-20260909" />');
if(!html.includes('defe-brand')) html=html.replace('</head>','<meta name="defe-brand" content="v4.1-20260909" /></head>');
fs.writeFileSync(indexPath,html);

const manifestPath=path.join(dist,'manifest.webmanifest');
if(fs.existsSync(manifestPath)){
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 manifest.name='Mi Defe'; manifest.short_name='Mi Defe'; manifest.lang='es-AR';
 manifest.theme_color='#082D68'; manifest.background_color='#F3F7FC';
 manifest.description='Defensores de Santos Lugares · El Gigante de Tres de Febrero';
 manifest.icons=[{src:'/el-defe-app/escudo-dsl.svg?v=41',sizes:'any',type:'image/svg+xml',purpose:'any maskable'}];
 fs.writeFileSync(manifestPath,JSON.stringify(manifest));
}

const cssFile=fs.readdirSync(assets).find(f=>/^index-.*\.css$/.test(f));
if(cssFile){
 const cssPath=path.join(assets,cssFile); let css=fs.readFileSync(cssPath,'utf8');
 css+=`\n:root{color-scheme:light}html,body,#app{background:#F3F7FC!important}body{margin:0}.defe-topbar{background:linear-gradient(135deg,#061F4A 0%,#082D68 58%,#124D98 100%);box-shadow:0 4px 16px rgba(5,31,74,.28);border-bottom:3px solid #fff}.defe-topbar-title{font-family:Anton,Impact,sans-serif;font-size:20px;letter-spacing:.8px}.defe-topbar-sub{font-size:10px;opacity:.82;margin-top:-2px;letter-spacing:.35px}.defe-hero{min-height:238px;overflow:hidden;background:linear-gradient(rgba(3,28,70,.70),rgba(4,39,91,.78)),radial-gradient(circle at 20% 15%,rgba(255,255,255,.18),transparent 25%),repeating-linear-gradient(125deg,#0a3474 0 16px,#0d428d 16px 32px,#082d68 32px 48px);box-shadow:0 8px 24px rgba(7,29,62,.28)}.defe-hero:before{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 0 20%,rgba(255,255,255,.06) 20% 22%,transparent 22% 45%,rgba(255,255,255,.08) 45% 47%,transparent 47%);opacity:.8}.defe-hero-inner{position:relative;z-index:2;display:flex;align-items:center;gap:16px;padding:34px 28px 26px}.defe-hero-title{font-family:Impact,Anton,sans-serif;font-style:italic;font-size:42px;line-height:.95;letter-spacing:1.5px;text-shadow:0 2px 2px rgba(0,0,0,.25)}.defe-hero-sub{margin-top:8px;font-size:12px;font-weight:800;letter-spacing:.9px}.defe-hero-tag{margin-top:14px;padding-top:10px;border-top:3px solid rgba(255,255,255,.9);font-size:15px;font-weight:800;font-style:italic;letter-spacing:.5px}.defe-hero-side{position:absolute;right:18px;top:22px;z-index:2;display:flex;flex-direction:column;gap:4px;font-size:8px;font-weight:800;letter-spacing:1.1px}.defe-hero-year{position:absolute;right:18px;bottom:20px;z-index:2;font-family:Impact,Anton,sans-serif;font-size:32px;transform:rotate(-4deg);background:#fff;color:#082D68;padding:4px 9px;box-shadow:0 3px 8px rgba(0,0,0,.18)}.defe-profile-page{position:relative;z-index:5;margin-top:-24px}.defe-profile-card,.defe-notif-card{box-shadow:0 10px 26px rgba(17,43,81,.10)}.defe-avatar{border:1px solid #d7e1ef}.defe-logout{color:#082D68;background:linear-gradient(#fff,#f8fbff);font-size:15px!important}.defe-notif-head{font-size:19px;color:#082D68}.defe-bell{width:26px;height:26px;border-radius:50%;background:#082D68;color:#082D68;margin-right:10px}.defe-notif-row{min-height:66px}.defe-notif-icon{display:flex;align-items:center;justify-content:center;width:28px;height:28px;color:#082D68;font-size:20px;font-weight:800}.defe-toggle{min-width:58px;text-align:center;box-shadow:inset 0 0 0 1px rgba(255,255,255,.15)}.defe-notif-card>div:last-child{padding:16px!important}.defe-notif-card>div:last-child button{background:#082D68!important;color:#fff!important;border:none!important}.defe-club-banner{min-height:142px;display:flex;align-items:center;justify-content:space-between;padding:20px 24px;color:#fff;background:linear-gradient(rgba(4,39,91,.74),rgba(4,39,91,.78)),repeating-linear-gradient(120deg,#0b3b7f 0 22px,#0f4a98 22px 44px);box-shadow:0 8px 22px rgba(17,43,81,.12)}.defe-club-banner-copy{font-family:Impact,Anton,sans-serif;font-style:italic;font-size:28px;line-height:1.02;transform:rotate(-3deg)}.defe-club-banner-copy:after{content:"";display:block;width:138px;border-bottom:3px solid #fff;margin-top:9px}.defe-club-values{display:flex;flex-direction:column;gap:6px;font-size:9px;font-weight:800;letter-spacing:1px}.defe-nav-item{transition:.18s ease}.fixed.bottom-0{box-shadow:0 -4px 18px rgba(17,43,81,.06)}button:focus-visible,a:focus-visible{outline:3px solid #7DA8D8;outline-offset:2px}/* Defe V4.1 editorial */`;
 fs.writeFileSync(cssPath,css);
}
console.log('Identidad visual DSL V4.1 editorial aplicada:',jsFile);
