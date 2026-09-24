// Family integration adapter: one source of truth for player + league participation.
import {buildFamilyParticipation} from './familyApi';
import {familyPlayerAt,familyTeams,familyHeader} from './familySelection';

export function buildFamilyView({players,kid,activity,events,callups,fefiMatch}){
  const player=familyPlayerAt(players,kid);
  const teams=familyTeams(player);
  const team=teams[activity]||teams[0]||null;
  if(!player||!team)return {player,teams,team,header:'MI DEFE',participation:null};
  return {
    player,teams,team,
    header:familyHeader(team),
    participation:buildFamilyParticipation({
      playerId:player.id??player.person_id,
      competition:team.competition,
      category:team.category,
      events,
      callups,
      fefiMatch:String(team.competition).toUpperCase()==='FEFI'?fefiMatch:null
    })
  };
}
