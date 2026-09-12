import { readFileSync, writeFileSync } from "node:fs";
import * as cheerio from "cheerio";

const URL="https://fefi.com.ar/2026-torneo-anual-baby-futbol/h/";
const CLUB="DEF. DE SANTOS LUGARES";
const CATS=["2019","2013","2018","2014","2017","2016","2015"];
const clean=s=>String(s??"").replace(/\s+/g," ").trim();
const norm=s=>clean(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9]/g,"");
const val=v=>{const t=clean(v).toUpperCase();if(t==="GP"||t==="NP")return t;if(!t)return null;const n=Number(t.replace(",","."));return Number.isFinite(n)?n:null};

const data=JSON.parse(readFileSync("datos.json","utf8"));
const liga=data.ligas?.find(l=>l.id==="fefi");
if(!liga) throw new Error("No se encontró FEFI en datos.json");

// El fixture de Clausura es la autoridad. Nunca heredamos marcadores por número de fecha solamente.
for(const e of liga.encuentros||[]){delete e.marc;delete e.pts;delete e.estado;}

const r=await fetch(`${URL}?_defe_clausura=${Date.now()}`,{headers:{"cache-control":"no-cache, no-store","user-agent":"Mozilla/5.0 (app-defe)"}});
if(!r.ok) throw new Error(`FEFI respondió ${r.status}`);
const $=cheerio.load(await r.text());
let applied=0;

$("table").each((_,table)=>{
 const rows=$(table).find("tr").toArray().map(tr=>$(tr).find("th,td").toArray().map(td=>clean($(td).text())));
 const head=(rows[0]||[]).join("|").toUpperCase();
 if(!head.includes("F.T.")&&!head.includes("ESTADO")) return;
 for(let i=1;i<rows.length-1;i++){
  const a=rows[i]||[], b=rows[i+1]||[];
  if(!/^F\d+$/i.test(a[0]||"")) continue;
  const n=Number(String(a[0]).replace(/\D/g,""));
  const enc=(liga.encuentros||[]).find(e=>Number(e.nro)===n);
  if(!enc) continue;
  const local=clean(a[1]), visita=clean(b[0]);
  const esperadoLocal=enc.local?CLUB:enc.rival;
  const esperadoVisita=enc.local?enc.rival:CLUB;
  // Clave del arreglo: exige orientación local/visitante idéntica al fixture Clausura.
  // Así una tabla de Apertura con la misma F6 no puede contaminar la F6 de Clausura.
  if(norm(local)!==norm(esperadoLocal)||norm(visita)!==norm(esperadoVisita)) continue;
  const ga=a.slice(2,9), gb=b.slice(1,8);
  if([...ga,...gb].every(x=>clean(x)==="")) continue;
  const somosLocal=enc.local, marc={}; let valid=0;
  CATS.forEach((cat,j)=>{const ours=val(somosLocal?ga[j]:gb[j]), theirs=val(somosLocal?gb[j]:ga[j]);if(ours==="GP"||ours==="NP"){marc[cat]=ours;valid++;}else if(ours!==null&&theirs!==null){marc[cat]=[ours,theirs];valid++;}});
  if(!valid) continue;
  enc.marc=marc;
  const pLocal=val(a[10]),pVis=val(b[9]);
  if(typeof pLocal==="number"&&typeof pVis==="number") enc.pts=somosLocal?[pLocal,pVis]:[pVis,pLocal];
  enc.estado=clean(a[11]||"").toLowerCase()||"previo";
  applied++;
 }
});

liga.actualizado=new Date().toISOString();
writeFileSync("datos.json",JSON.stringify(data,null,2));
console.error(`FEFI Clausura saneado: ${applied} fecha(s) con resultados compatibles con el fixture; fechas sin resultado quedan como próximas.`);
