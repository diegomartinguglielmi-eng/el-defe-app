from sqlalchemy import String, Integer, DateTime, Boolean, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from .db import Base

class User(Base):
    __tablename__="users"
    id: Mapped[int]=mapped_column(primary_key=True)
    email: Mapped[str]=mapped_column(String(200),unique=True,index=True)
    password_hash: Mapped[str]=mapped_column(String(255))
    role: Mapped[str]=mapped_column(String(30),default="lector")
    is_active: Mapped[bool]=mapped_column(Boolean,default=True)
    created_at: Mapped[str]=mapped_column(DateTime(timezone=True),server_default=func.now())

class Communication(Base):
    __tablename__="communications"
    id: Mapped[int]=mapped_column(primary_key=True)
    title: Mapped[str]=mapped_column(String(250))
    body: Mapped[str]=mapped_column(Text)
    kind: Mapped[str]=mapped_column(String(50),default="Información")
    audience: Mapped[str]=mapped_column(String(100),default="Todo el club",index=True)
    author_id: Mapped[int|None]=mapped_column(ForeignKey("users.id"))
    published_at: Mapped[str]=mapped_column(DateTime(timezone=True),server_default=func.now(),index=True)
    is_active: Mapped[bool]=mapped_column(Boolean,default=True)

class CommunicationRead(Base):
    __tablename__="communication_reads"
    id: Mapped[int]=mapped_column(primary_key=True)
    communication_id: Mapped[int]=mapped_column(ForeignKey("communications.id"),index=True)
    user_id: Mapped[int]=mapped_column(ForeignKey("users.id"),index=True)
    read_at: Mapped[str]=mapped_column(DateTime(timezone=True),server_default=func.now())
    __table_args__=(UniqueConstraint("communication_id","user_id",name="uq_communication_user_read"),)

class Match(Base):
    __tablename__="matches"
    id: Mapped[int]=mapped_column(primary_key=True)
    external_key: Mapped[str|None]=mapped_column(String(500),unique=True,index=True)
    competition: Mapped[str]=mapped_column(String(50),index=True)
    division: Mapped[str|None]=mapped_column(String(100),index=True)
    round_name: Mapped[str|None]=mapped_column(String(100))
    date: Mapped[str|None]=mapped_column(String(30),index=True)
    home: Mapped[str]=mapped_column(String(200)); away: Mapped[str]=mapped_column(String(200))
    home_score: Mapped[int|None]=mapped_column(Integer); away_score: Mapped[int|None]=mapped_column(Integer)
    status: Mapped[str]=mapped_column(String(30),default="scheduled")
    venue: Mapped[str|None]=mapped_column(String(300)); source_url: Mapped[str|None]=mapped_column(Text)
    source_kind: Mapped[str]=mapped_column(String(30),default="manual")
    updated_at: Mapped[str]=mapped_column(DateTime(timezone=True),server_default=func.now(),onupdate=func.now())

class FefiCategorySchedule(Base):
    __tablename__="fefi_category_schedules"; id: Mapped[int]=mapped_column(primary_key=True); match_id: Mapped[int]=mapped_column(ForeignKey("matches.id"),index=True); category: Mapped[str]=mapped_column(String(20),index=True); time: Mapped[str|None]=mapped_column(String(10)); note: Mapped[str|None]=mapped_column(String(250)); updated_by: Mapped[int|None]=mapped_column(ForeignKey("users.id")); updated_at: Mapped[str]=mapped_column(DateTime(timezone=True),server_default=func.now(),onupdate=func.now()); __table_args__=(UniqueConstraint("match_id","category",name="uq_fefi_match_category_schedule"),)
class Standing(Base):
    __tablename__="standings"; id: Mapped[int]=mapped_column(primary_key=True); unique_key: Mapped[str]=mapped_column(String(500),unique=True,index=True); competition: Mapped[str]=mapped_column(String(50),index=True); division: Mapped[str|None]=mapped_column(String(100),index=True); season: Mapped[int|None]=mapped_column(Integer); team: Mapped[str]=mapped_column(String(200)); pts: Mapped[int|None]=mapped_column(Integer); played: Mapped[int|None]=mapped_column(Integer); won: Mapped[int|None]=mapped_column(Integer); drawn: Mapped[int|None]=mapped_column(Integer); lost: Mapped[int|None]=mapped_column(Integer); gf: Mapped[int|None]=mapped_column(Integer); gc: Mapped[int|None]=mapped_column(Integer); gd: Mapped[int|None]=mapped_column(Integer); source_url: Mapped[str|None]=mapped_column(Text); updated_at: Mapped[str]=mapped_column(DateTime(timezone=True),server_default=func.now(),onupdate=func.now())
class News(Base):
    __tablename__="news"; id: Mapped[int]=mapped_column(primary_key=True); title: Mapped[str]=mapped_column(String(250)); body: Mapped[str]=mapped_column(Text); author_id: Mapped[int|None]=mapped_column(ForeignKey("users.id")); published_at: Mapped[str]=mapped_column(DateTime(timezone=True),server_default=func.now())
class AuditLog(Base):
    __tablename__="audit_logs"; id: Mapped[int]=mapped_column(primary_key=True); user_id: Mapped[int|None]=mapped_column(ForeignKey("users.id")); action: Mapped[str]=mapped_column(String(100)); entity: Mapped[str]=mapped_column(String(100)); entity_id: Mapped[str|None]=mapped_column(String(100)); detail: Mapped[str|None]=mapped_column(Text); created_at: Mapped[str]=mapped_column(DateTime(timezone=True),server_default=func.now())
class SyncRun(Base):
    __tablename__="sync_runs"; id: Mapped[int]=mapped_column(primary_key=True); source: Mapped[str]=mapped_column(String(50)); status: Mapped[str]=mapped_column(String(30)); detail: Mapped[str|None]=mapped_column(Text); created_at: Mapped[str]=mapped_column(DateTime(timezone=True),server_default=func.now())
class Team(Base):
    __tablename__="teams"; id: Mapped[int]=mapped_column(primary_key=True); competition: Mapped[str]=mapped_column(String(50),index=True); division: Mapped[str]=mapped_column(String(100),index=True); season: Mapped[int]=mapped_column(Integer,default=2026); gender: Mapped[str|None]=mapped_column(String(30)); is_active: Mapped[bool]=mapped_column(Boolean,default=True)
class Person(Base):
    __tablename__="people"; id: Mapped[int]=mapped_column(primary_key=True); first_name: Mapped[str]=mapped_column(String(100)); last_name: Mapped[str]=mapped_column(String(100)); birth_year: Mapped[int|None]=mapped_column(Integer); role: Mapped[str]=mapped_column(String(30),default="player"); position: Mapped[str|None]=mapped_column(String(60)); shirt_number: Mapped[int|None]=mapped_column(Integer); photo_url: Mapped[str|None]=mapped_column(Text); is_active: Mapped[bool]=mapped_column(Boolean,default=True)
class TeamMember(Base):
    __tablename__="team_members"; id: Mapped[int]=mapped_column(primary_key=True); team_id: Mapped[int]=mapped_column(ForeignKey("teams.id"),index=True); person_id: Mapped[int]=mapped_column(ForeignKey("people.id"),index=True); season: Mapped[int]=mapped_column(Integer,default=2026); member_role: Mapped[str]=mapped_column(String(30),default="player"); __table_args__=(UniqueConstraint("team_id","person_id","season",name="uq_team_person_season"),)
class CallUp(Base):
    __tablename__="callups"; id: Mapped[int]=mapped_column(primary_key=True); match_id: Mapped[int]=mapped_column(ForeignKey("matches.id"),index=True); team_id: Mapped[int]=mapped_column(ForeignKey("teams.id"),index=True); created_by: Mapped[int|None]=mapped_column(ForeignKey("users.id")); status: Mapped[str]=mapped_column(String(30),default="draft"); notes: Mapped[str|None]=mapped_column(Text); created_at: Mapped[str]=mapped_column(DateTime(timezone=True),server_default=func.now())
class CallUpPlayer(Base):
    __tablename__="callup_players"; id: Mapped[int]=mapped_column(primary_key=True); callup_id: Mapped[int]=mapped_column(ForeignKey("callups.id"),index=True); person_id: Mapped[int]=mapped_column(ForeignKey("people.id"),index=True); attendance: Mapped[str]=mapped_column(String(30),default="pending"); starter: Mapped[bool]=mapped_column(Boolean,default=False); minutes: Mapped[int|None]=mapped_column(Integer); __table_args__=(UniqueConstraint("callup_id","person_id",name="uq_callup_person"),)
class PlayerMatchStat(Base):
    __tablename__="player_match_stats"; id: Mapped[int]=mapped_column(primary_key=True); match_id: Mapped[int]=mapped_column(ForeignKey("matches.id"),index=True); person_id: Mapped[int]=mapped_column(ForeignKey("people.id"),index=True); goals: Mapped[int]=mapped_column(Integer,default=0); assists: Mapped[int]=mapped_column(Integer,default=0); yellow_cards: Mapped[int]=mapped_column(Integer,default=0); red_cards: Mapped[int]=mapped_column(Integer,default=0); minutes: Mapped[int|None]=mapped_column(Integer); __table_args__=(UniqueConstraint("match_id","person_id",name="uq_match_person_stat"),)
class Suspension(Base):
    __tablename__="suspensions"; id: Mapped[int]=mapped_column(primary_key=True); person_id: Mapped[int]=mapped_column(ForeignKey("people.id"),index=True); competition: Mapped[str]=mapped_column(String(50)); reason: Mapped[str]=mapped_column(String(250)); start_date: Mapped[str|None]=mapped_column(String(30)); end_date: Mapped[str|None]=mapped_column(String(30)); status: Mapped[str]=mapped_column(String(30),default="active")
class Favorite(Base):
    __tablename__="favorites"; id: Mapped[int]=mapped_column(primary_key=True); user_id: Mapped[int]=mapped_column(ForeignKey("users.id"),index=True); favorite_type: Mapped[str]=mapped_column(String(30),index=True); favorite_id: Mapped[str]=mapped_column(String(100),index=True); created_at: Mapped[str]=mapped_column(DateTime(timezone=True),server_default=func.now()); __table_args__=(UniqueConstraint("user_id","favorite_type","favorite_id",name="uq_user_favorite"),)
class NotificationPreference(Base):
    __tablename__="notification_preferences"; id: Mapped[int]=mapped_column(primary_key=True); user_id: Mapped[int]=mapped_column(ForeignKey("users.id"),unique=True,index=True); match_changes: Mapped[bool]=mapped_column(Boolean,default=True); results: Mapped[bool]=mapped_column(Boolean,default=True); news: Mapped[bool]=mapped_column(Boolean,default=True); callups: Mapped[bool]=mapped_column(Boolean,default=True); favorite_only: Mapped[bool]=mapped_column(Boolean,default=False)
class MediaItem(Base):
    __tablename__="media_items"; id: Mapped[int]=mapped_column(primary_key=True); match_id: Mapped[int|None]=mapped_column(ForeignKey("matches.id"),index=True); person_id: Mapped[int|None]=mapped_column(ForeignKey("people.id"),index=True); title: Mapped[str|None]=mapped_column(String(250)); media_type: Mapped[str]=mapped_column(String(30),default="photo"); url: Mapped[str]=mapped_column(Text); caption: Mapped[str|None]=mapped_column(Text); published: Mapped[bool]=mapped_column(Boolean,default=True); created_at: Mapped[str]=mapped_column(DateTime(timezone=True),server_default=func.now())
class PlayerOfMatch(Base):
    __tablename__="player_of_match"; id: Mapped[int]=mapped_column(primary_key=True); match_id: Mapped[int]=mapped_column(ForeignKey("matches.id"),unique=True,index=True); person_id: Mapped[int]=mapped_column(ForeignKey("people.id"),index=True); note: Mapped[str|None]=mapped_column(Text); created_at: Mapped[str]=mapped_column(DateTime(timezone=True),server_default=func.now())