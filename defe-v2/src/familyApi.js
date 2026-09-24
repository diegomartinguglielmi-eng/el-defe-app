// DEFE V2
// Capa comun de Familia para FEFI, LAAMBA y ARGENLIGA.
// La competencia define el origen del partido; desde convocatoria en adelante el circuito es unico.

const auth=token=>({Authorization:'Bearer '+token});
const upper=v=>String(v||'').toUpperCase();

export function selectionKey(competition,category){return upper(competition)+'|'+upper(category)}

export function findParticipationCallup(callups,playerId,competition,category){
  const key=selectionKey(competition,category);
  return (callups||[]).find(x=>x.person_id===playerId&&selectionKey(x.competition,x.category)===key)||null;
}

export function findParticipationEvent(events,competition,category){
  const key=selectionKey(competition,category);
  return (events||[]).find(x=>selectionKey(...String(x.selection||'').split('|'))===key)||null;
}

export function normalizeFamilyMatch({competition,category,event,callup,fefiMatch}){
  const comp=upper(competition);
  const source=comp==='FEFI'?(fefiMatch||event):event;
  if(!source)return {competition:comp,category,match:null,callup:callup||null};
  return {
    competition:comp,
    category,
    match:{
      id:source.id||source.match_id||null,
      home:source.home||'',
      away:source.away||'',
      date:source.date||source.match_date||null,
      time:source.match_time||source.time||null,
      local:source.home_away==='local'||source.local===true,
      roundName:source.round_name||null,
      venue:source.venue||source.address||source.location||null,
      mapsUrl:source.maps_url||null,
      available:source.available!==false
    },
    callup:callup||null
  };
}

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

export async function answerFamilyCallup(rowId,status,token){
  const r=await fetch('/api/availability/v2/family/callups/'+rowId,{method:'PATCH',headers:{'Content-Type':'application/json',...auth(token)},body:JSON.stringify({attendance:status})});
  const d=await r.json();
  if(!r.ok)throw new Error(d.detail||d.error||'No pudimos guardar la respuesta.');
  return d;
}

// Compatibilidad con el circuito anterior mientras terminamos la migracion visual.
export async function loadNextMatch(playerId,token){const r=await fetch('/api/next-match?playerId='+encodeURIComponent(playerId),{headers:auth(token)});if(!r.ok)return null;const d=await r.json();return d.match||null}
export async function answerCallup(playerId,matchId,status,token){const r=await fetch('/api/respond-callup',{method:'POST',headers:{'Content-Type':'application/json',...auth(token)},body:JSON.stringify({playerId,matchId,status})});return r.json()}
