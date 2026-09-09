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
const logoFn='function Ns({size:e=34}){return u.jsx("img",{src:"/el-defe-app/escudo-dsl.svg?v=3",alt:"Escudo Defensores de Santos Lugares",style:{width:e,height:e*1.15,objectFit:"contain",display:"block",filter:"drop-shadow(0 3px 5px rgba(0,0,0,.25))"}})}';
js=js.slice(0,logoStart)+logoFn+js.slice(logoEnd);

const oldHeader='style:{background:m.azul,backgroundImage:"repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 18px, transparent 18px 36px)",color:"#fff",position:"sticky",top:0,zIndex:40}';
const newHeader='style:{background:"linear-gradient(135deg,#061F4A 0%,#082D68 52%,#124D98 100%)",backgroundImage:"radial-gradient(circle at 80% 20%,rgba(255,255,255,.12),transparent 30%)",color:"#fff",position:"sticky",top:0,zIndex:40,boxShadow:"0 4px 16px rgba(5,31,74,.30)",borderBottom:"4px solid #FFFFFF"}';
if(!js.includes(oldHeader)) throw new Error('No se encontró el encabezado base');
js=js.replace(oldHeader,newHeader);
js=js.replace('className:"flex items-center gap-3 px-4 pb-3 pt-4"','className:"flex items-center gap-3 px-4 pb-4 pt-4"');
js=js.replace('u.jsx(Ns,{size:30})','u.jsx(Ns,{size:48})');
js=js.replace('fontSize:19,letterSpacing:.6','fontSize:22,letterSpacing:1');

const oldNav='className:"flex flex-col items-center gap-1 py-2.5",children:[u.jsx(_t,{size:21,style:{color:Cs?m.azul:"#98A2B3"},strokeWidth:Cs?2.4:1.8}),u.jsx("span",{style:{fontSize:10.5,fontWeight:Cs?700:500,color:Cs?m.azul:"#98A2B3"},children:vn})]';
const newNav='className:"flex flex-col items-center gap-1 py-2.5",style:{background:Cs?"#EEF4FB":"transparent",borderTop:Cs?"3px solid #082D68":"3px solid transparent"},children:[u.jsx(_t,{size:21,style:{color:Cs?"#082D68":"#98A2B3"},strokeWidth:Cs?2.5:1.8}),u.jsx("span",{style:{fontSize:10.5,fontWeight:Cs?800:500,color:Cs?"#082D68":"#98A2B3"},children:vn})]';
if(!js.includes(oldNav)) throw new Error('No se encontró la navegación inferior base');
js=js.replace(oldNav,newNav);

js+='\n/* DEFE_BRAND_V3_20260909 AZUL_BLANCO */\n';
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
html=html.replace(/<meta name="defe-brand" content="[^"]*"\s*\/>/,'<meta name="defe-brand" content="v3-20260909" />');
if(!html.includes('defe-brand')) html=html.replace('</head>','<meta name="defe-brand" content="v3-20260909" /></head>');
fs.writeFileSync(indexPath,html);

const manifestPath=path.join(dist,'manifest.webmanifest');
if(fs.existsSync(manifestPath)){
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 manifest.name='Mi Defe'; manifest.short_name='Mi Defe'; manifest.lang='es-AR';
 manifest.theme_color='#082D68'; manifest.background_color='#F3F7FC';
 manifest.description='Defensores de Santos Lugares · El Gigante de Tres de Febrero';
 manifest.icons=[{src:'/el-defe-app/escudo-dsl.svg?v=3',sizes:'any',type:'image/svg+xml',purpose:'any maskable'}];
 fs.writeFileSync(manifestPath,JSON.stringify(manifest));
}

const cssFile=fs.readdirSync(assets).find(f=>/^index-.*\.css$/.test(f));
if(cssFile){
 const cssPath=path.join(assets,cssFile); let css=fs.readFileSync(cssPath,'utf8');
 css+=`\n:root{color-scheme:light}html,body,#app{background:#F3F7FC!important}body{margin:0}button:focus-visible,a:focus-visible{outline:3px solid #7DA8D8;outline-offset:2px}/* Defe V3 azul y blanco */`;
 fs.writeFileSync(cssPath,css);
}
console.log('Identidad visual DSL V3 azul/blanco aplicada:',jsFile);
