// DEFE V2
// Base funcional copiada de Mi AFALP. AFALP permanece solo lectura.
// Adaptación a Defensores/FEFI se realiza exclusivamente en este repositorio.

export async function loadNextMatch(playerId,token){const r=await fetch('/api/next-match?playerId='+encodeURIComponent(playerId),{headers:{Authorization:'Bearer '+token}});if(!r.ok)return null;const d=await r.json();return d.match||null}export async function answerCallup(playerId,matchId,status,token){const r=await fetch('/api/respond-callup',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({playerId,matchId,status})});return r.json()}