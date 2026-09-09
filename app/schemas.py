from pydantic import BaseModel
from typing import Optional, List

class LoginIn(BaseModel): username:str; password:str
class UserCreate(BaseModel): email:str; password:str; role:str="lector"
class NewsIn(BaseModel): title:str; body:str
class CommunicationIn(BaseModel):
    title:str
    body:str
    kind:str="Información"
    audience:str="Todo el club"
class MatchIn(BaseModel):
    competition:str; division:Optional[str]=None; round_name:Optional[str]=None; date:Optional[str]=None; home:str; away:str; home_score:Optional[int]=None; away_score:Optional[int]=None; status:str="scheduled"; venue:Optional[str]=None
class FefiScheduleItem(BaseModel): category:str; time:Optional[str]=None; note:Optional[str]=None
class FefiScheduleIn(BaseModel): items:List[FefiScheduleItem]
class ArgenMatch(BaseModel): date:Optional[str]=None; home:str; away:str; home_score:Optional[int]=None; away_score:Optional[int]=None; status:str="scheduled"
class ArgenImport(BaseModel): matches:List[ArgenMatch]
class TeamIn(BaseModel): competition:str; division:str; season:int=2026; gender:Optional[str]=None
class PersonIn(BaseModel): first_name:str; last_name:str; birth_year:Optional[int]=None; role:str="player"; position:Optional[str]=None; shirt_number:Optional[int]=None; photo_url:Optional[str]=None
class TeamMemberIn(BaseModel): person_id:int; member_role:str="player"
class CallUpIn(BaseModel): match_id:int; team_id:int; person_ids:List[int]; notes:Optional[str]=None
class AttendanceIn(BaseModel): attendance:str; starter:bool=False; minutes:Optional[int]=None
class PlayerStatIn(BaseModel): match_id:int; person_id:int; goals:int=0; assists:int=0; yellow_cards:int=0; red_cards:int=0; minutes:Optional[int]=None
class SuspensionIn(BaseModel): person_id:int; competition:str; reason:str; start_date:Optional[str]=None; end_date:Optional[str]=None; status:str="active"
class FavoriteIn(BaseModel): favorite_type:str; favorite_id:str
class NotificationPrefsIn(BaseModel): match_changes:bool=True; results:bool=True; news:bool=True; callups:bool=True; favorite_only:bool=False
class MediaIn(BaseModel): match_id:Optional[int]=None; person_id:Optional[int]=None; title:Optional[str]=None; media_type:str="photo"; url:str; caption:Optional[str]=None; published:bool=True
class PlayerOfMatchIn(BaseModel): match_id:int; person_id:int; note:Optional[str]=None