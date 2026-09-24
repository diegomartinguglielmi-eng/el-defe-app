// Selector helpers shared by Family UI.
// Transitional rule: prefer array index, but also accept a person id so the
// current FamilyHome cannot jump back to the first child when a card sends p.id.
export function familyPlayerIndex(players, personId){
  const i=(players||[]).findIndex(p=>String(p?.id??p?.person_id)===String(personId));
  return i<0?0:i;
}
export function familyPlayerAt(players,indexOrId){
  const xs=players||[];
  if(!xs.length)return null;
  const n=Number(indexOrId);
  if(Number.isInteger(n)&&n>=0&&n<xs.length)return xs[n];
  const byId=xs.find(p=>String(p?.id??p?.person_id)===String(indexOrId));
  return byId||xs[0]||null;
}
export function familyTeams(player){
  if(!player)return [];
  return player?.teams?.length?player.teams:[{competition:'FEFI',category:player.category}].filter(x=>x.category);
}
export function familyHeader(team){
  const c=String(team?.competition||'FEFI').toUpperCase();
  if(c==='FEFI')return 'BABY FÚTBOL · FEFI';
  if(c==='LAAMBA')return 'FUTSAL · LAAMBA';
  if(c==='ARGENLIGA')return 'FUTSAL · ARGENLIGA';
  return c;
}
