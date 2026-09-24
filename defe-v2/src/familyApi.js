// DEFE V2
// Capa comun de Familia para FEFI, LAAMBA y ARGENLIGA.
// La competencia define el origen del partido; desde convocatoria en adelante el circuito es unico.

const auth=token=>({Authorization:'Bearer '+token});
const upper=v=>String(v||'').trim().toUpperCase();
const sameId=(a,b)=>String(a??'')===String(b??'');

export function selectionKey(competition,category){return upper(competition)+'|'+upper(category)}

export function findParticipationCallup(callups,playerId,competition,category){
  const key=selectionKey(competition,category);
  return (callups||[]).find(x=>sameId(x.person_id??x.player_id,playerId)&&selectionKey(x.competition,x.category)===key)||null;
}

export function findParticipationEvent(events,competition,category){
  const key=selectionKey(competition,category);
  return (events||[]).find(x=>{
    if(x.competition||x.category)return selectionKey(x.competition,x.category)===key;
    const parts=String(x.selection||'').split('|');
    return selectionKey(parts[0],parts[1])===key;
  })||null;
}

export function normalizeAttendance(value){
  const v=upper(value);
  if(['YES','SI','SÍ','CONFIRMED','CONFIRMADO','ASISTE'].includes(v))return 'YES';
  if(['NO','REJECTED','RECHAZADO','NO ASISTE'].includes(v))return 'NO';
  return null;
}

export function normalizeFamilyMatch({competition,category,event,callup,fefiMatch}){
  const comp=upper(competition);
  const source=comp==='FEFI'?(fefiMatch||event):event;
  if(!source)return {competition:comp,category,match:null,callup:callup||null,attendance:normalizeAttendance(callup?.attendance),canAnswer:false};
  const match={
    id:source.id||source.match_id||callup?.match_id||null,
    home:source.home||source.home_team||'',
    away:source.away||source.away_team||'',
    date:source.date||source.match_date||null,
    time:source.match_time||source.time||null,
    local:source.home_away==='local'||source.local===true,
    roundName:source.round_name||source.roundName||null,
    venue:source.venue||source.address||source.location||null,
    mapsUrl:source.maps_url||source.mapsUrl||null,
    available:source.available!==false
  };
  return {competition:comp,category,match,callup:callup||null,attendance:normalizeAttendance(callup?.attendance),canAnswer:Boolean(callup?.id||callup?.row_id)};
}

// Unico view-model para Inicio y Partidos. Evita que cada liga arme una tarjeta distinta.
export function buildFamilyParticipation({playerId,competition,category,events,callups,fefiMatch}){
  const event=findParticipationEvent(events,competition,category);
  const callup=findParticipationCallup(callups,playerId,competition,category);
  return normalizeFamilyMatch({competition,category,event,callup,fefiMatch});
}

export function familyCallupRowId(view){return view?.callup?.id||view?.callup?.row_id||null}

export async function loadFamilyEvents(token){
  const r=await fetch('/api/availability/v2/me',{headers:auth(token)});
  if(!r.ok)throw new Error('No pudimos cargar los partidos.');
  const d=await r.json();
  return d.items||[];
}

export async function loadFamilyCallups(token){
  const r=await fetch('/api/availability/v2/family/callups',{headers:auth(token)});
  if(!r.ok)throw new Error('No pudimos cargar las convocatorias.');
  const d=await r.json();
  return d.items||[];
}

export async function loadFamilyContext(token){
  const [events,callups]=await Promise.all([loadFamilyEvents(token),loadFamilyCallups(token)]);
  return {events,callups};
}

export async function answerFamilyCallup(rowId,status,token){
  if(!rowId)throw new Error('No encontramos la convocatoria para guardar la respuesta.');
  const attendance=normalizeAttendance(status);
  if(!attendance)throw new Error('Respuesta de asistencia inválida.');
  const r=await fetch('/api/availability/v2/family/callups/'+rowId,{method:'PATCH',headers:{'Content-Type':'application/json',...auth(token)},body:JSON.stringify({attendance})});
  const d=await r.json();
  if(!r.ok)throw new Error(d.detail||d.error||'No pudimos guardar la respuesta.');
  return d;
}

// Compatibilidad temporal: se retira cuando Inicio y Partidos consuman buildFamilyParticipation.
export async function loadNextMatch(playerId,token){const r=await fetch('/api/next-match?playerId='+encodeURIComponent(playerId),{headers:auth(token)});if(!r.ok)return null;const d=await r.json();return d.match||null}
export async function answerCallup(playerId,matchId,status,token){const r=await fetch('/api/respond-callup',{method:'POST',headers:{'Content-Type':'application/json',...auth(token)},body:JSON.stringify({playerId,matchId,status})});return r.json()}
