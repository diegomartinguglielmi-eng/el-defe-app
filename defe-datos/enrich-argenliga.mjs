import { readFileSync, writeFileSync } from 'node:fs';

const FILE='datos.json';
const TEAM=1214864;
const TOURNAMENT=34170;
const API='https://api.sofascore.com/api/v1';

const browserHeaders={
  'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
  'accept':'application/json,text/plain,*/*',
  'accept-language':'es-AR,es;q=0.9,en;q=0.8',
  'referer':'https://www.sofascore.com/',
  'origin':'https://www.sofascore.com',
  'cache-control':'no-cache',
  'pragma':'no-cache'
};

async function getJson(path){
  const url=`${API}${path}`;
  const r=await fetch(url,{headers:browserHeaders,cache:'no-store'});
  if(!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}

function mapEvent(ev){
  const local=ev.homeTeam?.id===TEAM;
  return {
    categoria:'Primera',
    rival: local?ev.awayTeam?.name:ev.homeTeam?.name,
    local,
    fecha: ev.startTimestamp?new Date(ev.startTimestamp*1000).toISOString().slice(0,10):null,
    hora: ev.startTimestamp?new Date(ev.startTimestamp*1000).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Argentina/Buenos_Aires'}):null,
    gf: local?(ev.homeScore?.current??null):(ev.awayScore?.current??null),
    gc: local?(ev.awayScore?.current??null):(ev.homeScore?.current??null),
    ronda: ev.roundInfo?.round??null,
    jugado: ev.status?.type==='finished' || (ev.homeScore?.current!=null && ev.awayScore?.current!=null),
    estado: ev.status?.type||null,
    fuente:'Sofascore'
  };
}

const snapshotTabla=[
  ['El Campito',5,15,11],['Villa Luro Norte',5,13,10],['Defensores de Santos Lugares',4,10,6],
  ['Velez de Martinez',5,10,5],['Saenz Peña',5,9,9],['Hurlingham',4,9,7],['Newells (Bs. As.)',5,9,-5],
  ['Arsenal de Sarandi (Argenliga)',5,8,1],['Estrada de Almagro',5,7,-1],['Amigos de Villa Luro',5,5,-4],
  ['IPA',5,4,-5],['Versailles',5,4,-6],['Bristol',5,2,-4],['Huracan (Argenliga)',5,2,-5],['Biblioteca',5,1,-6],['Centro Artiguense',5,1,-13]
].map(([equipo,pj,pts,dg])=>({equipo,pj,g:0,e:0,p:0,pts,dg}));

const snapshotPartidos=[
  {categoria:'Primera',rival:'Versailles',local:false,fecha:'2026-03-28',hora:'20:30',gf:4,gc:0,ronda:1,jugado:true,fuente:'Sofascore'},
  {categoria:'Primera',rival:'Centro Artiguense',local:true,fecha:'2026-04-05',hora:'20:30',gf:3,gc:2,ronda:2,jugado:true,fuente:'Sofascore'},
  {categoria:'Primera',rival:'Hurlingham',local:false,fecha:'2026-04-11',hora:'19:00',gf:null,gc:null,ronda:3,jugado:false,estado:'postponed',fuente:'Sofascore'},
  {categoria:'Primera',rival:'Bristol',local:true,fecha:'2026-04-19',hora:'18:00',gf:6,gc:5,ronda:4,jugado:true,fuente:'Sofascore'},
  {categoria:'Primera',rival:'Velez de Martinez',local:false,fecha:'2026-04-26',hora:'17:00',gf:5,gc:5,ronda:5,jugado:true,fuente:'Sofascore'}
];

const data=JSON.parse(readFileSync(FILE,'utf8'));
let liga=data.ligas.find(l=>l.id==='argenliga');
if(!liga){
  liga={id:'argenliga',nombre:'Argenliga',disciplina:'Futsal'};
  data.ligas.push(liga);
}

let partidos=[];
let tabla=[];
const errores=[];

try{
  const last=await getJson(`/team/${TEAM}/events/last/0`);
  partidos.push(...(last.events||[]).filter(e=>e.tournament?.uniqueTournament?.id===TOURNAMENT).map(mapEvent));
}catch(e){errores.push(`last: ${e.message}`)}
try{
  const next=await getJson(`/team/${TEAM}/events/next/0`);
  partidos.push(...(next.events||[]).filter(e=>e.tournament?.uniqueTournament?.id===TOURNAMENT).map(mapEvent));
}catch(e){errores.push(`next: ${e.message}`)}
try{
  const seasons=await getJson(`/unique-tournament/${TOURNAMENT}/seasons`);
  const season=seasons.seasons?.find(s=>s.name==='2026')?.id || seasons.seasons?.[0]?.id;
  if(season){
    const st=await getJson(`/unique-tournament/${TOURNAMENT}/season/${season}/standings/total`);
    const group=(st.standings||[]).find(g=>g.rows?.some(r=>r.team?.id===TEAM)) || st.standings?.[0];
    tabla=(group?.rows||[]).map(r=>({equipo:r.team.name,pj:r.matches,g:r.wins,e:r.draws,p:r.losses,pts:r.points,dg:(r.scoresFor??0)-(r.scoresAgainst??0)}));
  }
}catch(e){errores.push(`tabla: ${e.message}`)}

if(!partidos.length) partidos=snapshotPartidos;
if(!tabla.length) tabla=snapshotTabla;

const seen=new Set();
partidos=partidos.filter(p=>{
  const k=`${p.ronda}|${p.fecha}|${p.local}|${p.rival}`;
  if(seen.has(k)) return false;
  seen.add(k);return true;
}).sort((a,b)=>String(a.fecha).localeCompare(String(b.fecha)));

Object.assign(liga,{
  nombre:'Argenliga',disciplina:'Futsal',torneo:'Argenliga A · Zona 1 · 2026',
  fuente:`https://www.sofascore.com/es-la/futsal/team/defensores-de-santos-lugares/${TEAM}`,
  conectada:true,actualizado:new Date().toISOString(),categorias:['Primera'],
  partidos,tablas:{general:tabla,Primera:tabla},parcial:Boolean(errores.length),errores:errores.length?errores:undefined
});

data.actualizado=new Date().toISOString();
writeFileSync(FILE,JSON.stringify(data,null,2));
console.error(`Argenliga: ${partidos.length} partido(s), ${tabla.length} fila(s) de tabla${errores.length?` · fallback parcial (${errores.join('; ')})`:''}.`);
