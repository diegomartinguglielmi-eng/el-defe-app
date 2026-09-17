import fs from 'node:fs';
import path from 'node:path';

const assets=path.resolve('defe-web-build/dist/assets');
const file=fs.readdirSync(assets).find(f=>/^index-.*\.js$/.test(f));
if(!file) throw new Error('No se encontró bundle principal');
const p=path.join(assets,file);
let s=fs.readFileSync(p,'utf8');

// El modal nativo contiene literalmente el botón Cerrar sesión. Insertamos la acción
// como hermano React inmediatamente antes, sin depender del DOM/overlay posterior.
const needles=[
  'children:"Cerrar sesión"',
  'children:"Cerrar sesi\u00f3n"'
];
let pos=-1, needle='';
for(const n of needles){pos=s.indexOf(n);if(pos>=0){needle=n;break}}
if(pos<0) throw new Error('No se encontró el botón nativo Cerrar sesión');

// Buscar el comienzo del jsx del botón que contiene el literal.
let start=s.lastIndexOf('u.jsx("button",{',pos);
if(start<0) start=s.lastIndexOf('u.jsxs("button",{',pos);
if(start<0) throw new Error('No se encontró JSX del botón Cerrar sesión');

// Encontrar el final balanceado del u.jsx/u.jsxs.
function endCall(str,from){let par=0,brace=0,bracket=0,quote=null,esc=false;for(let i=from;i<str.length;i++){const c=str[i];if(quote){if(esc){esc=false;continue}if(c==='\\'){esc=true;continue}if(c===quote)quote=null;continue}if(c==='"'||c==="'"){quote=c;continue}if(c==='(')par++;else if(c===')'){par--;if(par===0&&brace===0&&bracket===0)return i+1}else if(c==='{')brace++;else if(c==='}')brace--;else if(c==='[')bracket++;else if(c===']')bracket--;}return -1}
const end=endCall(s,start);
if(end<0) throw new Error('No se pudo delimitar botón Cerrar sesión');
const logout=s.slice(start,end);

// Debe estar dentro de un array children. Reemplazamos el elemento por dos elementos.
const family=`u.jsx("button",{type:"button",onClick:()=>{window.DefeFamily&&window.DefeFamily.open?window.DefeFamily.open():window.dispatchEvent(new CustomEvent("defe:open-family"))},className:"w-full rounded-2xl border border-[#15589e] bg-white px-4 py-4 text-[17px] font-extrabold text-[#17365d]",children:"Mis hijos"})`;
s=s.slice(0,start)+family+','+logout+s.slice(end);
s+='\n/* DEFE_FAMILY_NATIVE_20260917 */\n';
fs.writeFileSync(p,s);
console.log('Mis hijos integrado en modal nativo:',file);
