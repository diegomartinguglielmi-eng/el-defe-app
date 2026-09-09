import fs from 'node:fs';
import * as cheerio from 'cheerio';

const URL='https://fefi.com.ar/2026-futbol-sala-mayores-fefi/mayores-b/';
const FILE='datos.json';
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const compact=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const isDefe=v=>{const n=compact(v);return /^DEF.*SANTOSLUGARES$/.test(n)||/^DEF.*STOSLUGARES$/.test(n)};
const asInt=v=>{const s=clean(v);if(!s||!/^-?\d+(?:[.,]\d+)?$/.test(s))return null;const n=Number(s.replace(',','.'));return Number.isFinite(n)?n:null};
const months={ENERO:1,FEBRERO:2,MARZO:3,ABRIL:4,MAYO:5,JUNIO:6,JULIO:7,AGOSTO:8,SEPTIEMBRE:9,OCTUBRE:10,NOVIEMBRE:11,DICIEMBRE:12};
function dateFromText(t){const m=clean(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().match(/(\d{1,2})\s+DE\s+([A-Z]+)/);if(!m||!months[m[2]])return null;return `2026-${String(months[m[2]]).padStart(2,'0')}-${String(Number(m[1])).padStart(2,'0')}`}
function tableRows($,table){return $(table).find('tr').toArray().map(tr=>$(tr).find('th,td').toArray().map(td=>clean($(td).text()))).filter(r=>r.length)}
function parseFixture(html){
 const $=cheerio.load(html),out=[];
 $('table').each((_,table)=>{
   const rows=tableRows($,table); if(!rows.length)return;
   const head=rows[0].map(compact);
   if(!(head.includes('LOCAL')&&head.includes('VISITANTE')))return;
   let round=null,date=null;
   for(const row of rows.slice(1)){
     const joined=clean(row.join(' '));
     const fm=joined.match(/Fecha\s+(\d+)(?:\s*-\s*(.*))?/i);
     if(fm){round=`Fecha ${Number(fm[1])}`;date=dateFromText(fm[2]||'');continue}
     const vs=row.findIndex(c=>compact(c)==='VS');
     if(vs<0||!round)continue;
     const home=clean(row[vs-1]||row[0]),away=clean(row[vs+1]||row[row.length-1]);
     if(home&&away&&(isDefe(home)!==isDefe(away)))out.push({round_name:round,date,home,away});
   }
 });
 const dedup={};for(const r of out)dedup[`${r.round_name}|${compact(r.home)}|${compact(r.away)}`]=r;
 return Object.values(dedup).sort((a,b)=>Number(a.round_name.replace(/\D/g,''))-Number(b.round_name.replace(/\D/g,'')));
}
function resultTables(html){const $=cheerio.load(html),tables=[];$('table').each((_,t)=>{const rows=tableRows($,t);if(!rows.length)return;const h=rows[0].map(compact);if(h.includes('EQUIPOS')&&h.includes('GL')&&h.some(x=>x==='FT'||x.startsWith('FT')))tables.push(rows)});return tables}
function parseResultTable(rows){const h=rows[0].map(compact);const idx=t=>h.findIndex(x=>x===t||x.startsWith(t)),ft=idx('FT'),team=idx('EQUIPOS'),gl=idx('GL'),st=idx('ESTADO');if(ft<0||team<0||gl<0)return[];const out=[];for(let i=1;i<rows.length-1;){const a=rows[i],b=rows[i+1],f=compact(a[ft]||'');if(/^F\d+$/.test(f)){const home=clean(a[team]||''),away=clean(b[team]||'');const hr=asInt(a[gl]),ar=asInt(b[gl]);if(isDefe(home)!==isDefe(away)&&hr!==null&&ar!==null){out.push({round_name:`Fecha ${Number(f.replace(/\D/g,''))}`,home,away,home_score:hr,away_score:ar,status:st>=0?(a[st]||''):''})}i+=2}else i++}return out}
function standingTables(html){const $=cheerio.load(html),tables=[];$('table').each((_,t)=>{const rows=tableRows($,t);if(!rows.length)return;const h=rows[0].map(compact);if(h.includes('EQUIPOS')&&h.includes('PJ')&&h.includes('PTS'))tables.push(rows)});return tables}
function parseStandingTable(rows){return rows.slice(1).map(r=>({equipo:clean(r[0]),pj:asInt(r[1]),g:asInt(r[2]),e:asInt(r[3]),p:asInt(r[4]),pts:asInt(r[5])})).filter(r=>r.equipo&&r.pj!==null&&r.pts!==null)}

const datos=JSON.parse(fs.readFileSync(FILE,'utf8'));
const res=await fetch(`${URL}?_defe=${Date.now()}`,{headers:{'user-agent':'Mozilla/5.0 ElDefe/2026','cache-control':'no-cache'}});
if(!res.ok)throw new Error(`FEFI Mayores B respondió ${res.status}`);
const html=await res.text();
const fixture=parseFixture(html);
const resultSets=resultTables(html).map(parseResultTable).filter(r=>r.some(x=>isDefe(x.home)||isDefe(x.away)));
const standingSets=standingTables(html).map(parseStandingTable).filter(r=>r.some(x=>isDefe(x.equipo)));
const resultadosApertura=resultSets[0]||[];
const resultadosClausura=resultSets[1]||[];
const posicionesApertura=standingSets[0]||[];
const posicionesClausura=standingSets[1]||[];
if(!fixture.length)throw new Error('No se encontró a Defensores en el fixture Mayores B');
datos.fefiMayoresB={
 id:'fefi-mayores-b',competencia:'FEFI',division:'Mayores B',equipo:'+42',temporada:2026,
 fixture,fixtureClausura:fixture,
 resultadosApertura,resultadosClausura,
 posicionesApertura,posicionesClausura,
 resultados:resultadosClausura,posiciones:posicionesClausura,
 fuente:URL,actualizado:new Date().toISOString()
};
fs.writeFileSync(FILE,JSON.stringify(datos,null,2));
console.error(`FEFI Mayores B +42: fixture ${fixture.length}; resultados A ${resultadosApertura.length}, C ${resultadosClausura.length}; tablas A ${posicionesApertura.length}, C ${posicionesClausura.length}.`);
