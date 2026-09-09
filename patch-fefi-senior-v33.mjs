import fs from 'node:fs';
import path from 'node:path';
const f=path.join('defe-web-build','dist','fefi-senior-v30.js');
let s=fs.readFileSync(f,'utf8');
// Reconocer de forma robusta todas las variantes de "Defensores de Santos Lugares".
s=s.replace(/const team=x=>\{[^;]+;return \/DEF\(ENSORES\)\?DES\(ANTOS\|TOS\)LUGARES\/.+?\};/,"const team=x=>{const n=String(x||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');return /^DEF.*SANTOSLUGARES$/.test(n)||/^DEF.*STOSLUGARES$/.test(n)};");
// Tabla completa: PJ, G, E, P y Pts.
const start=s.indexOf(' function table(rows,title){');
const end=s.indexOf(' function validResult',start);
if(start<0||end<0)throw new Error('No se encontró tabla V32');
const table=` function table(rows,title){rows=rows||[];if(!rows.length)return '<div style="padding:22px;text-align:center;color:#718096;background:#fff;border:1px solid #dbe2ec;border-radius:16px">No hay tabla '+title+' publicada por FEFI.</div>';return '<div style="margin-bottom:16px"><div style="font-size:14px;font-weight:900;color:#0b376d;margin:4px 0 8px">'+title+'</div><div style="overflow-x:auto;background:#fff;border:1px solid #dbe2ec;border-radius:16px"><div style="min-width:360px"><div style="display:grid;grid-template-columns:24px minmax(118px,1fr) 30px 30px 30px 30px 40px;gap:4px;padding:10px 10px;background:#f7f9fd;color:#718096;font-size:11px;font-weight:800"><span>#</span><span>Equipo</span><span style="text-align:center">PJ</span><span style="text-align:center">G</span><span style="text-align:center">E</span><span style="text-align:center">P</span><span style="text-align:center">Pts</span></div>'+rows.map((r,i)=>'<div style="display:grid;grid-template-columns:24px minmax(118px,1fr) 30px 30px 30px 30px 40px;gap:4px;padding:11px 10px;border-top:'+(i?'1px solid #edf1f7':'0')+';background:'+(team(r.equipo)?'#eef5ff':'#fff')+';font-size:12px;align-items:center"><span style="color:#718096">'+(i+1)+'</span><span style="font-weight:'+(team(r.equipo)?'800':'600')+'">'+esc(team(r.equipo)?'DEFE':r.equipo)+'</span><span style="text-align:center">'+esc(r.pj??'-')+'</span><span style="text-align:center">'+esc(r.g??'-')+'</span><span style="text-align:center">'+esc(r.e??'-')+'</span><span style="text-align:center">'+esc(r.p??'-')+'</span><span style="text-align:center;font-weight:800;color:#0b376d">'+esc(r.pts??'-')+'</span></div>').join('')+'</div></div></div>'}\n`;
s=s.slice(0,start)+table+s.slice(end);
fs.writeFileSync(f,s);
console.log('V33 FEFI +42: alias Defe robusto + tabla PJ/G/E/P/Pts');
