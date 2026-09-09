import fs from 'node:fs';
import path from 'node:path';

const dist = 'defe-web-build/dist';
const assets = path.join(dist, 'assets');
const jsFile = fs.readdirSync(assets).find(f => /^index-.*\.js$/.test(f));
if (!jsFile) throw new Error('No se encontró el bundle JS');
const jsPath = path.join(assets, jsFile);
let js = fs.readFileSync(jsPath, 'utf8');

// Paleta institucional tomada del escudo oficial compartido.
const replacements = new Map([
  ['#2E3192', '#3A307E'],
  ['#4B50C6', '#51469A'],
  ['#ECEDFB', '#EEEAF7'],
  ['#101828', '#201C38'],
  ['#69748A', '#746F86'],
  ['#DFE5F0', '#DED9E9'],
  ['#F3F6FB', '#F7F6FA']
]);
for (const [from, to] of replacements) js = js.split(from).join(to);

// Sustituye el escudo simplificado por el escudo institucional vectorial.
const logoStart = js.indexOf('function Ns({size:e=34}){');
const logoEnd = js.indexOf('function Xi(', logoStart);
if (logoStart < 0 || logoEnd < 0) throw new Error('No se encontró el componente del escudo');
const logoFn = 'function Ns({size:e=34}){return u.jsx("img",{src:"/el-defe-app/escudo-dsl.svg",alt:"Escudo Defensores de Santos Lugares",style:{width:e,height:e*1.15,objectFit:"contain",display:"block"}})}';
js = js.slice(0, logoStart) + logoFn + js.slice(logoEnd);
fs.writeFileSync(jsPath, js);

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 560" role="img" aria-label="Escudo Defensores de Santos Lugares">
  <path d="M52 70 C122 82 181 74 256 28 C331 74 390 82 460 70 L448 330 C445 425 361 489 256 540 C151 489 67 425 64 330 Z" fill="#3A307E" stroke="#3A307E" stroke-width="18"/>
  <path d="M72 87 C138 98 190 88 256 48 C322 88 374 98 440 87 L428 326 C425 407 350 465 256 512 C162 465 87 407 84 326 Z" fill="#3A307E" stroke="#FFFFFF" stroke-width="16"/>
  <path d="M91 111 C148 119 197 107 256 71 C315 107 364 119 421 111 L411 320 C408 391 341 442 256 486 C171 442 104 391 101 320 Z" fill="#3A307E" stroke="#FFFFFF" stroke-width="7"/>
  <rect x="103" y="233" width="306" height="74" rx="3" fill="#FFFFFF"/>
  <circle cx="226" cy="270" r="9" fill="#3A307E"/>
  <circle cx="286" cy="270" r="9" fill="#3A307E"/>
  <text x="256" y="321" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="126" font-weight="700" fill="#3A307E" stroke="#FFFFFF" stroke-width="5" paint-order="stroke">DSL</text>
</svg>`;
fs.writeFileSync(path.join(dist, 'escudo-dsl.svg'), svg);

const indexPath = path.join(dist, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/<meta name="theme-color" content="#[0-9A-Fa-f]{6}"\s*\/>/, '<meta name="theme-color" content="#3A307E" />');
fs.writeFileSync(indexPath, html);

const manifestPath = path.join(dist, 'manifest.webmanifest');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.theme_color = '#3A307E';
  manifest.background_color = '#F7F6FA';
  manifest.icons = [{src:'/el-defe-app/escudo-dsl.svg', sizes:'any', type:'image/svg+xml', purpose:'any maskable'}];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
}

const cssFile = fs.readdirSync(assets).find(f => /^index-.*\.css$/.test(f));
if (cssFile) {
  const cssPath = path.join(assets, cssFile);
  let css = fs.readFileSync(cssPath, 'utf8');
  css = css.replace(/background:#f3f6fb/g, 'background:#F7F6FA');
  css += `\n:root{color-scheme:light} body{background:#F7F6FA} button:focus-visible,a:focus-visible{outline:3px solid #8F84C9;outline-offset:2px}`;
  fs.writeFileSync(cssPath, css);
}

console.log('Identidad visual DSL aplicada:', jsFile);
