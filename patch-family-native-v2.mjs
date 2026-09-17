import fs from 'node:fs';
import path from 'node:path';

const dir=path.resolve('defe-web-build/dist/assets');
const files=fs.readdirSync(dir).filter(f=>/^index-.*\.js$/.test(f));
if(!files.length) throw new Error('No se encontró bundle principal');
let patched=0;
for(const file of files){
  const p=path.join(dir,file);
  let s=fs.readFileSync(p,'utf8');
  if(s.includes('DEFE_FAMILY_NATIVE_V2')) continue;
  const re=/u\.jsx\("button",\{onClick:([A-Za-z_$][\w$]*),className:"defe-logout mt-4 w-full rounded-xl py-3 text-sm font-semibold",style:\{border:`1px solid \$\{m\.linea\}`\},children:"⇥  Cerrar sesión"\}\)/;
  const m=s.match(re);
  if(!m) continue;
  const logout=m[0];
  const family='u.jsx("button",{type:"button",onClick:()=>{window.DefeFamily&&typeof window.DefeFamily.open==="function"?window.DefeFamily.open():window.dispatchEvent(new CustomEvent("defe:open-family"))},className:"defe-my-children mt-4 w-full rounded-xl py-3 text-sm font-semibold",style:{border:`1px solid ${m.linea}`,color:"#17365d",background:"#fff"},children:"Mis hijos"})';
  s=s.replace(logout,family+','+logout);
  s+='\n/* DEFE_FAMILY_NATIVE_V2 */\n';
  fs.writeFileSync(p,s);
  patched++;
}
if(!patched) throw new Error('No se encontró el botón real defe-logout de Mi Defe');
console.log(`Mis hijos integrado en ${patched} bundle(s) reales de Mi Defe`);
