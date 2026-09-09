import fs from 'node:fs';
import * as cheerio from 'cheerio';

const URL='https://fefi.com.ar/2026-futbol-sala-mayores-fefi/mayores-b/';
const FILE='datos.json';
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const compact=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const isDefe=v=>/DEF(ENSORES)?DES(ANTOS|TOS)LUGARES/.test(compact(v));
const asInt=v=>{const n=Number(clean(v));return Number.isFinite(n)?n:null};
const months={ENERO:1,FEBRERO:2,MARZO:3,ABRIL:4,MAYO:5,JUNIO:6,JULIO:7,AGOSTO:8,SEPTIEMBRE:9,OCTUBRE:10,NOVIEMBRE:11,DICIEMBRE:12};
function dateFromText(t){const m=clean(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().match(/(\d{1,2})\s+DE\s+([A-Z]+)/);if(!m||!months[m[2]])return null;return `2026-${String(months[m[2]]).padStart(2,'0')}-${String(Number(m[1])).padStart(2,'0')}`}
function tableRows($,table){return $(table).find('tr').toArray().map(tr=>$(tr).find('th,td').toArray().map(td=>clean($(td).text()))).filter(r=>r.length)}
function parseFixture(html){const $=cheerio.load(html),lines=$.root().text().split(/\n+/).map(clean).filter(Boolean);let round=null,date=null;const out=[];for(let i=0;i<lines.length;i++){const m=lines[i].match(/^Fecha\s+(\d+)(?:\s*-\s*(.*))?$/i);if(m){round=`Fecha ${Number(m[1])}`;date=dateFromText(m[2]||'');continue}if(lines[i].toLowerCase()==='vs'&&round&&i>0&&i<lines.length-1){const home=lines[i-1],away=lines[i+1];if(isDefe(home)||isDefe(away))out.push({round_name:round,date,home,away})}}const dedup={};for(const r of out)dedup[r.round_name]=r;return Object.values(dedup)}
function resultTables(html){const $=cheerio.load(html),tables=[];$('table').each((_,t)=>{const rows=tableRows($,t);if(!rows.length)return;const h=rows[0].map(compact);if(h.includes('EQUIPOS')&&h.includes('GL')&&h.some(x=>x==='FT'||x.startsWith('FT')))tables.push(rows)});return tables}
function parseResults(html){const tables=resultTables(html);if(tables.length<2)return[];const rows=tables[1],h=rows[0].map(compact);const idx=t=>h.findIndex(x=>x===t||x.startsWith(t)),ft=idx('FT'),team=idx('EQUIPOS'),gl=idx('GL'),st=idx('ESTADO');if(ft<0||team<0||gl<0)return[];const out=[];for(let i=1;i<rows.length-1;){const a=rows[i],b=rows[i+1],f=compact(a[ft]||'');if(/^F\d+$/.test(f)){const home=a[team]||'',away=b[team]||'';if(isDefe(home)||isDefe(away)){const hr=a[gl]||'',ar=b[gl]||'';out.push({round_name:`Fecha ${Number(f.replace(/\D/g,''))}`,home,away,home_raw:hr,away_raw:ar,home_score:asInt(hr),away_score:asInt(ar),status:st>=0?(a[st]||''):''})}i+=2}else i++}return out}
function standingTables(html){const $=cheerio.load(html),tables=[];$('table').each((_,t)=>{const rows=tableRows($,t);if(!rows.length)return;const h=rows[0].map(compact);if(h.length===6&&h.includes('EQUIPOS')&&h.includes('PJ')&&h.includes('PTS'))tables.push(rows)});return tables}
function parseStandings(html){const tables=standingTables(html);if(tables.length<2)return[];return tables[1].slice(1).map(r=>({equipo:clean(r[0]),pj:asInt(r[1]),g:asInt(r[2]),e:asInt(r[3]),p:asInt(r[4]),pts:asInt(r[5])})).filter(r=>r.equipo&&r.pj!==null&&r.pts!==null)}

const datos=JSON.parse(fs.readFileSync(FILE,'utf8'));
const sep=URL.includes('?')?'&':'?';
const res=await fetch(`${URL}${sep}_defe=${Date.now()}`,{headers:{'user-agent':'Mozilla/5.0 ElDefe/2026','cache-control':'no-cache'}});
if(!res.ok)throw new Error(`FEFI Mayores B respondió ${res.status}`);
const html=await res.text();
const fixture=parseFixture(html),resultados=parseResults(html),posiciones=parseStandings(html);
if(!fixture.length)throw new Error('No se encontró a Defensores en el fixture Mayores B');
if(!posiciones.some(r=>isDefe(r.equipo)))console.error('FEFI Mayores B: tabla Clausura sin Defe; se conserva vacía para no mezclar datos.');
datos.fefiMayoresB={id:'fefi-mayores-b',competencia:'FEFI',division:'Mayores B',equipo:'+42',temporada:2026,fixture,resultados,posiciones:posiciones.some(r=>isDefe(r.equipo))?posiciones:[],fuente:URL,actualizado:new Date().toISOString()};
fs.writeFileSync(FILE,JSON.stringify(datos,null,2));
console.error(`FEFI Mayores B +42: ${fixture.length} fechas, ${resultados.length} resultados, ${datos.fefiMayoresB.posiciones.length} posiciones.`);
