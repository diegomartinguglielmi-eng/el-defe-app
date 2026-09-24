// Selector helpers shared by Family UI. `kid` is always an array index, never a person id.
export function familyPlayerIndex(players, personId){
  const i=(players||[]).findIndex(p=>String(p?.id??p?.person_id)===String(personId));
  return i<0?0:i;
}
export function familyPlayerAt(players,index){
  return (players||[])[Number.isInteger(index)?index:0]||(players||[])[0]||null;
}
export function familyTeams(player){
  if(!player)return [];
  return player?.teams?.length?player.teams:[{competition:'FEFI',category:player.category}].filter(x=>x.category);
}
