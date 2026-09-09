import fs from 'node:fs';
import path from 'node:path';
const f=path.join('defe-web-build','dist','fefi-senior-v30.js');
let s=fs.readFileSync(f,'utf8');
s=s.replace("const team=x=>/DEF(ENSORES)?\\.?\\s*(DE)?\\s*(SANTOS|STOS)\\.?\\s*LUGARES/i.test(String(x||''));","const team=x=>{const n=String(x||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');return /DEF(ENSORES)?DES(ANTOS|TOS)LUGARES/.test(n)};");
s=s.replace("const results=(data?.resultados||[]).filter(r=>r.home_score!=null&&r.away_score!=null);","const results=(data?.resultados||[]).filter(r=>r.home_score!=null&&r.away_score!=null&&team(r.home)!==team(r.away));");
fs.writeFileSync(f,s);
console.log('V31 FEFI +42: normalización de Defe y resultados válidos');
