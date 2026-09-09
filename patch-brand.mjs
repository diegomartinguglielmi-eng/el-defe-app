import fs from 'node:fs';
import path from 'node:path';

const dist = 'defe-web-build/dist';
const assets = path.join(dist, 'assets');
const jsFile = fs.readdirSync(assets).find(f => /^index-.*\.js$/.test(f));
if (!jsFile) throw new Error('No se encontró el bundle JS');
const jsPath = path.join(assets, jsFile);
let js = fs.readFileSync(jsPath, 'utf8');

// Paleta DSL de alto contraste para que el cambio sea inequívocamente visible.
const replacements = new Map([
  ['#2E3192', '#40368F'],
  ['#3A307E', '#40368F'],
  ['#4B50C6', '#5A4EB0'],
  ['#51469A', '#5A4EB0'],
  ['#ECEDFB', '#EEEAF8'],
  ['#EEEAF7', '#EEEAF8'],
  ['#101828', '#241F3F'],
  ['#201C38', '#241F3F'],
  ['#69748A', '#716C84'],
  ['#746F86', '#716C84'],
  ['#DFE5F0', '#DDD7EC'],
  ['#DED9E9', '#DDD7EC'],
  ['#F3F6FB', '#F2EFF9'],
  ['#F7F6FA', '#F2EFF9']
]);
for (const [from, to] of replacements) js = js.split(from).join(to);

// Escudo institucional más grande y protagonista.
const logoStart = js.indexOf('function Ns({size:e=34}){');
const logoEnd = js.indexOf('function Xi(', logoStart);
if (logoStart < 0 || logoEnd < 0) throw new Error('No se encontró el componente del escudo');
const logoFn = 'function Ns({size:e=34}){return u.jsx("img",{src:"/el-defe-app/escudo-dsl.svg?v=2",alt:"Escudo Defensores de Santos Lugares",style:{width:e,height:e*1.15,objectFit:"contain",display:"block",filter:"drop-shadow(0 2px 3px rgba(0,0,0,.18))"}})}';
js = js.slice(0, logoStart) + logoFn + js.slice(logoEnd);

// Rediseño visible del encabezado: degradado violeta, sin franjas, mayor altura y escudo de 42 px.
js = js.replace(
  'style:{background:m.azul,backgroundImage:"repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 18px, transparent 18px 36px)",color:"#fff",position:"sticky",top:0,zIndex:40}',
  'style:{background:"linear-gradient(135deg,#332A73 0%,#40368F 48%,#6659B8 100%)",backgroundImage:"none",color:"#fff",position:"sticky",top:0,zIndex:40,boxShadow:"0 3px 14px rgba(38,31,82,.28)",borderBottom:"3px solid #FFFFFF"}'
);
js = js.replace('className:"flex items-center gap-3 px-4 pb-3 pt-4"','className:"flex items-center gap-3 px-4 pb-4 pt-4"');
js = js.replace('u.jsx(Ns,{size:30})','u.jsx(Ns,{size:42})');
js = js.replace('fontSize:19,letterSpacing:.6','fontSize:21,letterSpacing:.8');

// Barra inferior: el ítem activo pasa a una pastilla violeta visible.
const oldNav = 'className:"flex flex-col items-center gap-1 py-2.5",children:[u.jsx(_t,{size:21,style:{color:Cs?m.azul:"#98A2B3"},strokeWidth:Cs?2.4:1.8}),u.jsx("span",{style:{fontSize:10.5,fontWeight:Cs?700:500,color:Cs?m.azul:"#98A2B3"},children:vn})]';
const newNav = 'className:"flex flex-col items-center gap-1 py-2.5",style:{background:Cs?"#EEEAF8":"transparent",borderTop:Cs?"3px solid #40368F":"3px solid transparent"},children:[u.jsx(_t,{size:21,style:{color:Cs?"#40368F":"#98A2B3"},strokeWidth:Cs?2.5:1.8}),u.jsx("span",{style:{fontSize:10.5,fontWeight:Cs?800:500,color:Cs?"#40368F":"#98A2B3"},children:vn})]';
if (!js.includes(oldNav)) throw new Error('No se encontró la navegación inferior');
js = js.replace(oldNav,newNav);

// Marcador interno para verificar que esta versión realmente llegó al bundle.
js += '\n/* DEFE_BRAND_V2_20260909 */\n';
fs.writeFileSync(jsPath, js);

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 560" role="img" aria-label="Escudo Defensores de Santos Lugares">
  <path d="M52 70 C122 82 181 74 256 28 C331 74 390 82 460 70 L448 330 C445 425 361 489 256 540 C151 489 67 425 64 330 Z" fill="#40368F" stroke="#40368F" stroke-width="18"/>
  <path d="M72 87 C138 98 190 88 256 48 C322 88 374 98 440 87 L428 326 C425 407 350 465 256 512 C162 465 87 407 84 326 Z" fill="#40368F" stroke="#FFFFFF" stroke-width="16"/>
  <path d="M91 111 C148 119 197 107 256 71 C315 107 364 119 421 111 L411 320 C408 391 341 442 256 486 C171 442 104 391 101 320 Z" fill="#40368F" stroke="#FFFFFF" stroke-width="7"/>
  <rect x="103" y="233" width="306" height="74" rx="3" fill="#FFFFFF"/>
  <circle cx="226" cy="270" r="9" fill="#40368F"/>
  <circle cx="286" cy="270" r="9" fill="#40368F"/>
  <text x="256" y="321" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="126" font-weight="700" fill="#40368F" stroke="#FFFFFF" stroke-width="5" paint-order="stroke">DSL</text>
</svg>`;
fs.writeFileSync(path.join(dist, 'escudo-dsl.svg'), svg);

const indexPath = path.join(dist, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/<meta name="theme-color" content="#[0-9A-Fa-f]{6}"\s*\/>/, '<meta name="theme-color" content="#40368F" />');
html = html.replace('</head>','<meta name="defe-brand" content="v2-20260909" /></head>');
fs.writeFileSync(indexPath, html);

const manifestPath = path.join(dist, 'manifest.webmanifest');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.name = 'Mi Defe';
  manifest.short_name = 'Mi Defe';
  manifest.lang = 'es-AR';
  manifest.theme_color = '#40368F';
  manifest.background_color = '#F2EFF9';
  manifest.icons = [{src:'/el-defe-app/escudo-dsl.svg?v=2', sizes:'any', type:'image/svg+xml', purpose:'any maskable'}];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
}

const cssFile = fs.readdirSync(assets).find(f => /^index-.*\.css$/.test(f));
if (cssFile) {
  const cssPath = path.join(assets, cssFile);
  let css = fs.readFileSync(cssPath, 'utf8');
  css += `\n:root{color-scheme:light} html,body,#app{background:#F2EFF9!important} body{margin:0} button:focus-visible,a:focus-visible{outline:3px solid #9B91D2;outline-offset:2px}`;
  fs.writeFileSync(cssPath, css);
}

console.log('Identidad visual DSL V2 aplicada:', jsFile);
