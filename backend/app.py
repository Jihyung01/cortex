# app.py - Cortex Complete Backend
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import os
import openai
import requests
import json
import uuid
from functools import wraps
import logging
from typing import Optional, Dict, List, Any
import time
import re

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Flask 앱 초기화
app = Flask(__name__)

# 설정
app.config['SECRET_KEY'] = 'cortex-ultra-secure-key-2025-v2'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///cortex_v2.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'cortex-jwt-super-secret-2025'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# 확장 초기화
db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(app, 
     origins=['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000'], 
     supports_credentials=True,
     allow_headers=['Content-Type', 'Authorization'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

# API 키 설정
NOTION_TOKEN = "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"
NOTION_DB_ID = "1d7ffbc06edc807280bdc6c14abfe288"
OPENAI_API_KEY = "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"
GITHUB_TOKEN = "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"

# OpenAI 클라이언트 설정
openai.api_key = OPENAI_API_KEY

# 데이터베이스 모델
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    username = db.Column(db.String(80), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    avatar_url = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    
    # 설정
    theme = db.Column(db.String(20), default='light')
    timezone = db.Column(db.String(50), default='Asia/Seoul')
    language = db.Column(db.String(10), default='ko')
    plan = db.Column(db.String(20), default='free')  # free, premium, enterprise
    
    # 생산성 설정
    work_start_time = db.Column(db.String(5), default='09:00')
    work_end_time = db.Column(db.String(5), default='18:00')
    break_duration = db.Column(db.Integer, default=15)  # 분
    focus_session_duration = db.Column(db.Integer, default=25)  # 포모도로 기본값
    
    # AI 설정
    ai_coaching_enabled = db.Column(db.Boolean, default=True)
    ai_notifications_enabled = db.Column(db.Boolean, default=True)
    ai_analysis_frequency = db.Column(db.String(20), default='daily')
    
    # 외부 연동
    notion_integration_enabled = db.Column(db.Boolean, default=False)
    github_integration_enabled = db.Column(db.Boolean, default=False)
    
    # 관계
    notes = db.relationship('Note', backref='author', lazy=True, cascade='all, delete-orphan')
    tasks = db.relationship('Task', backref='user', lazy=True, cascade='all, delete-orphan')
    events = db.relationship('Event', backref='user', lazy=True, cascade='all, delete-orphan')
    ai_insights = db.relationship('AIInsight', backref='user', lazy=True, cascade='all, delete-orphan')
    focus_sessions = db.relationship('FocusSession', backref='user', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'avatar_url': self.avatar_url,
            'theme': self.theme,
            'timezone': self.timezone,
            'language': self.language,
            'plan': self.plan,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'settings': {
                'work_start_time': self.work_start_time,
                'work_end_time': self.work_end_time,
                'break_duration': self.break_duration,
                'focus_session_duration': self.focus_session_duration,
                'ai_coaching_enabled': self.ai_coaching_enabled,
                'ai_notifications_enabled': self.ai_notifications_enabled
            }
        }

class Note(db.Model):
    __tablename__ = 'notes'
    
    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(500), nullable=False)
    content = db.Column(db.Text, nullable=False)
    content_type = db.Column(db.String(20), default='markdown')  # markdown, rich_text, code
    note_type = db.Column(db.String(50), default='note')  # note, idea, meeting, project
    emoji = db.Column(db.String(10), default='📝')
    
    # 메타데이터
    tags = db.Column(db.Text)  # JSON array
    category = db.Column(db.String(100))
    word_count = db.Column(db.Integer, default=0)
    character_count = db.Column(db.Integer, default=0)
    reading_time = db.Column(db.Integer, default=0)  # 분
    
    # 상태
    is_favorite = db.Column(db.Boolean, default=False)
    is_archived = db.Column(db.Boolean, default=False)
    is_public = db.Column(db.Boolean, default=False)
    is_template = db.Column(db.Boolean, default=False)
    
    # AI 분석
    sentiment_score = db.Column(db.Float)  # -1.0 to 1.0
    sentiment_label = db.Column(db.String(20))  # positive, negative, neutral
    key_topics = db.Column(db.Text)  # JSON array
    ai_summary = db.Column(db.Text)
    
    # 협업
    shared_with = db.Column(db.Text)  # JSON array of user IDs
    permissions = db.Column(db.Text)  # JSON object
    
    # 외부 연동
    notion_page_id = db.Column(db.String(100))
    github_issue_url = db.Column(db.String(500))
    
    # 타임스탬프
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_accessed = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 외래키
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    parent_note_id = db.Column(db.Integer, db.ForeignKey('notes.id'))  # 하위 노트
    
    # 관계
    child_notes = db.relationship('Note', backref=db.backref('parent_note', remote_side=[id]))

    def calculate_metrics(self):
        """노트 메트릭 계산"""
        if self.content:
            self.character_count = len(self.content)
            self.word_count = len(self.content.split())
            self.reading_time = max(1, self.word_count // 200)  # 분당 200단어 기준

    def to_dict(self):
        return {
            'id': self.id,
            'uuid': self.uuid,
            'title': self.title,
            'content': self.content,
            'content_type': self.content_type,
            'note_type': self.note_type,
            'emoji': self.emoji,
            'tags': json.loads(self.tags) if self.tags else [],
            'category': self.category,
            'word_count': self.word_count,
            'character_count': self.character_count,
            'reading_time': self.reading_time,
            'is_favorite': self.is_favorite,
            'is_archived': self.is_archived,
            'is_public': self.is_public,
            'sentiment_score': self.sentiment_score,
            'sentiment_label': self.sentiment_label,
            'ai_summary': self.ai_summary,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'author': self.author.username if self.author else None
        }

class Task(db.Model):
    __tablename__ = 'tasks'
    
    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text)
    
    # 상태 및 우선순위
    status = db.Column(db.String(20), default='todo')  # todo, in_progress, review, completed, cancelled
    priority = db.Column(db.String(10), default='medium')  # low, medium, high, urgent
    progress = db.Column(db.Integer, default=0)  # 0-100
    
    # 시간 관리
    due_date = db.Column(db.DateTime)
    start_date = db.Column(db.DateTime)
    estimated_hours = db.Column(db.Float)
    actual_hours = db.Column(db.Float, default=0.0)
    
    # 분류
    tags = db.Column(db.Text)  # JSON array
    category = db.Column(db.String(100))
    project = db.Column(db.String(100))
    
    # AI 기능
    ai_priority_score = db.Column(db.Float)  # AI가 계산한 우선순위 점수
    ai_time_estimate = db.Column(db.Float)  # AI가 예측한 소요시간
    complexity_score = db.Column(db.Integer)  # 1-10
    
    # 반복 작업
    is_recurring = db.Column(db.Boolean, default=False)
    recurrence_pattern = db.Column(db.String(100))  # daily, weekly, monthly
    
    # 외부 연동
    notion_task_id = db.Column(db.String(100))
    github_issue_number = db.Column(db.Integer)
    github_repo = db.Column(db.String(200))
    
    # 타임스탬프
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    
    # 외래키
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    parent_task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'))
    
    # 관계
    subtasks = db.relationship('Task', backref=db.backref('parent_task', remote_side=[id]))

    def to_dict(self):
        return {
            'id': self.id,
            'uuid': self.uuid,
            'title': self.title,
            'description': self.description,
            'status': self.status,
            'priority': self.priority,
            'progress': self.progress,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'estimated_hours': self.estimated_hours,
            'actual_hours': self.actual_hours,
            'tags': json.loads(self.tags) if self.tags else [],
            'category': self.category,
            'project': self.project,
            'is_recurring': self.is_recurring,
            'complexity_score': self.complexity_score,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

class Event(db.Model):
    __tablename__ = 'events'
    
    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text)
    
    # 시간
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    timezone = db.Column(db.String(50), default='Asia/Seoul')
    is_all_day = db.Column(db.Boolean, default=False)
    
    # 유형 및 상태
    event_type = db.Column(db.String(50), default='meeting')  # meeting, task, reminder, personal
    status = db.Column(db.String(20), default='confirmed')  # confirmed, tentative, cancelled
    
    # 위치 및 참석자
    location = db.Column(db.String(500))
    is_online = db.Column(db.Boolean, default=False)
    meeting_url = db.Column(db.String(1000))
    attendees = db.Column(db.Text)  # JSON array
    
    # 알림
    reminders = db.Column(db.Text)  # JSON array of reminder times
    
    # 반복
    is_recurring = db.Column(db.Boolean, default=False)
    recurrence_rule = db.Column(db.Text)  # RRULE format
    
    # 색상 및 카테고리
    color = db.Column(db.String(7), default='#3B82F6')  # hex color
    category = db.Column(db.String(100))
    
    # 타임스탬프
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 외래키
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'uuid': self.uuid,
            'title': self.title,
            'description': self.description,
            'start_time': self.start_time.isoformat(),
            'end_time': self.end_time.isoformat(),
            'timezone': self.timezone,
            'is_all_day': self.is_all_day,
            'event_type': self.event_type,
            'status': self.status,
            'location': self.location,
            'is_online': self.is_online,
            'meeting_url': self.meeting_url,
            'attendees': json.loads(self.attendees) if self.attendees else [],
            'color': self.color,
            'category': self.category,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class AIInsight(db.Model):
    __tablename__ = 'ai_insights'
    
    id = db.Column(db.Integer, primary_key=True)
    insight_type = db.Column(db.String(50), nullable=False)  # daily_summary, weekly_analysis, suggestion
    title = db.Column(db.String(200))
    content = db.Column(db.Text, nullable=False)
    metadata = db.Column(db.Text)  # JSON object
    confidence_score = db.Column(db.Float)  # 0.0 to 1.0
    is_read = db.Column(db.Boolean, default=False)
    is_actionable = db.Column(db.Boolean, default=False)
    
    # 타임스탬프
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)
    
    # 외래키
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'insight_type': self.insight_type,
            'title': self.title,
            'content': self.content,
            'metadata': json.loads(self.metadata) if self.metadata else {},
            'confidence_score': self.confidence_score,
            'is_read': self.is_read,
            'is_actionable': self.is_actionable,
            'created_at': self.created_at.isoformat()
        }

class FocusSession(db.Model):
    __tablename__ = 'focus_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    session_type = db.Column(db.String(20), default='pomodoro')  # pomodoro, deep_work, break
    planned_duration = db.Column(db.Integer)  # 분
    actual_duration = db.Column(db.Integer)  # 분
    
    # 상태
    status = db.Column(db.String(20), default='planned')  # planned, active, completed, cancelled
    quality_rating = db.Column(db.Integer)  # 1-5
    
    # 작업 연결
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'))
    notes = db.Column(db.Text)
    
    # 분석 데이터
    interruptions = db.Column(db.Integer, default=0)
    focus_score = db.Column(db.Float)  # 0.0 to 10.0
    
    # 타임스탬프
    started_at = db.Column(db.DateTime)
    ended_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 외래키
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'session_type': self.session_type,
            'planned_duration': self.planned_duration,
            'actual_duration': self.actual_duration,
            'status': self.status,
            'quality_rating': self.quality_rating,
            'focus_score': self.focus_score,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None
        }

# Notion API 통합
class NotionClient:
    def __init__(self, token: str):
        self.token = token
        self.base_url = "https://api.notion.com/v1"
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28"
        }
    
    def create_page(self, database_id: str, properties: dict, content: str = ""):
        """Notion 데이터베이스에 새 페이지 생성"""
        try:
            url = f"{self.base_url}/pages"
            
            # 콘텐츠를 블록으로 변환
            children = []
            if content:
                # 간단한 텍스트 블록으로 변환
                paragraphs = content.split('\n\n')
                for paragraph in paragraphs[:10]:  # 최대 10개 문단
                    if paragraph.strip():
                        children.append({
                            "object": "block",
                            "type": "paragraph",
                            "paragraph": {
                                "rich_text": [{
                                    "type": "text",
                                    "text": {"content": paragraph.strip()[:2000]}  # 2000자 제한
                                }]
                            }
                        })
            
            data = {
                "parent": {"database_id": database_id},
                "properties": properties,
                "children": children
            }
            
            response = requests.post(url, headers=self.headers, json=data)
            response.raise_for_status()
            return response.json()
            
        except Exception as e:
            logger.error(f"AI 인사이트 생성 실패: {e}")
            # 기본 인사이트 반환
            return {
                "daily_summary": f"{user.username}님, 오늘도 수고하셨습니다! 꾸준한 노력이 성과로 이어지고 있어요.",
                "focus_score": 7.5,
                "productivity_trend": "유지",
                "suggestions": [
                    "중요한 작업부터 우선순위를 정해보세요",
                    "25분 집중 + 5분 휴식의 포모도로 기법을 활용해보세요",
                    "하루 3개의 핵심 목표를 설정해보세요"
                ],
                "achievements": [
                    "꾸준한 노트 작성으로 아이디어 정리",
                    "체계적인 작업 관리 습관 형성"
                ],
                "next_actions": [
                    "미완료 작업 중 가장 중요한 것 1개 선택하기",
                    "내일의 주요 목표 3가지 미리 계획하기"
                ],
                "motivation_message": "작은 진전도 큰 성취입니다! 계속 화이팅하세요! 💪"
            }

    @staticmethod
    def analyze_sentiment(text: str) -> tuple:
        """텍스트 감정 분석"""
        try:
            if not text or len(text.strip()) < 10:
                return 0.0, 'neutral'
            
            prompt = f"""
다음 텍스트의 감정을 분석해주세요:

"{text[:1000]}"

감정 점수(-1.0 ~ 1.0)와 라벨(positive/negative/neutral)을 JSON으로 반환:
{{"score": 0.0, "label": "neutral"}}
"""
            
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=50,
                temperature=0.3
            )
            
            result = json.loads(response.choices[0].message.content)
            return float(result.get('score', 0.0)), result.get('label', 'neutral')
            
        except Exception as e:
            logger.error(f"감정 분석 실패: {e}")
            return 0.0, 'neutral'

    @staticmethod
    def estimate_task_time(task_title: str, description: str = "") -> float:
        """AI 기반 작업 시간 예측"""
        try:
            prompt = f"""
다음 작업의 예상 소요 시간을 시간 단위로 예측해주세요:

제목: {task_title}
설명: {description[:500]}

복잡도와 일반적인 소요 시간을 고려하여 시간(소수점 가능)만 반환해주세요.
예: 2.5
"""
            
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=10,
                temperature=0.3
            )
            
            time_str = response.choices[0].message.content.strip()
            return float(re.findall(r'\d+\.?\d*', time_str)[0])
            
        except Exception as e:
            logger.error(f"작업 시간 예측 실패: {e}")
            return 2.0  # 기본값

# 클라이언트 인스턴스
notion_client = NotionClient(NOTION_TOKEN) if NOTION_TOKEN else None
github_client = GitHubClient(GITHUB_TOKEN) if GITHUB_TOKEN else None

# 유틸리티 함수
def handle_errors(f):
    """에러 핸들링 데코레이터"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"API 에러 in {f.__name__}: {e}")
            return jsonify({
                'success': False,
                'error': str(e),
                'message': '서버 내부 오류가 발생했습니다.'
            }), 500
    return decorated_function

def validate_json(required_fields):
    """JSON 유효성 검사 데코레이터"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            data = request.get_json()
            if not data:
                return jsonify({
                    'success': False,
                    'message': 'JSON 데이터가 필요합니다.'
                }), 400
            
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                return jsonify({
                    'success': False,
                    'message': f'필수 필드가 누락되었습니다: {", ".join(missing_fields)}'
                }), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# API 라우트

# 헬스 체크
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '2.0.0',
        'services': {
            'database': 'connected',
            'openai': 'available' if OPENAI_API_KEY else 'unavailable',
            'notion': 'available' if NOTION_TOKEN else 'unavailable',
            'github': 'available' if GITHUB_TOKEN else 'unavailable'
        }
    })

# 인증 관련 라우트
@app.route('/api/auth/register', methods=['POST'])
@handle_errors
@validate_json(['email', 'username', 'password'])
def register():
    data = request.get_json()
    
    # 이메일 중복 확인
    if User.query.filter_by(email=data['email']).first():
        return jsonify({
            'success': False,
            'message': '이미 존재하는 이메일입니다.'
        }), 400
    
    # 사용자 생성
    user = User(
        email=data['email'],
        username=data['username'],
        password_hash=generate_password_hash(data['password']),
        avatar_url=f"https://ui-avatars.com/api/?name={data['username']}&background=6366f1&color=fff"
    )
    
    db.session.add(user)
    db.session.commit()
    
    # JWT 토큰 생성
    access_token = create_access_token(identity=user.id)
    
    return jsonify({
        'success': True,
        'message': '회원가입이 완료되었습니다.',
        'access_token': access_token,
        'user': user.to_dict()
    })

@app.route('/api/auth/login', methods=['POST'])
@handle_errors
@validate_json(['email', 'password'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()
    
    if user and check_password_hash(user.password_hash, data['password']):
        # 로그인 시간 업데이트
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'success': True,
            'message': '로그인되었습니다.',
            'access_token': access_token,
            'user': user.to_dict()
        })
    else:
        return jsonify({
            'success': False,
            'message': '이메일 또는 비밀번호가 올바르지 않습니다.'
        }), 401

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
@handle_errors
def get_current_user():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({
            'success': False,
            'message': '사용자를 찾을 수 없습니다.'
        }), 404
    
    return jsonify({
        'success': True,
        'user': user.to_dict()
    })

# 대시보드 라우트
@app.route('/api/dashboard/summary', methods=['GET'])
@jwt_required()
@handle_errors
def get_dashboard_summary():
    user_id = get_jwt_identity()
    
    # 기본 통계
    total_notes = Note.query.filter_by(user_id=user_id, is_archived=False).count()
    total_tasks = Task.query.filter_by(user_id=user_id).count()
    completed_tasks = Task.query.filter_by(user_id=user_id, status='completed').count()
    in_progress_tasks = Task.query.filter_by(user_id=user_id, status='in_progress').count()
    
    # 이번 주 통계
    week_ago = datetime.utcnow() - timedelta(days=7)
    weekly_notes = Note.query.filter(
        Note.user_id == user_id,
        Note.created_at >= week_ago
    ).count()
    
    weekly_completed_tasks = Task.query.filter(
        Task.user_id == user_id,
        Task.status == 'completed',
        Task.completed_at >= week_ago
    ).count()
    
    # 오늘의 이벤트
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    today_events = Event.query.filter(
        Event.user_id == user_id,
        Event.start_time >= today_start,
        Event.start_time < today_end
    ).order_by(Event.start_time).all()
    
    # 최근 활동
    recent_notes = Note.query.filter_by(user_id=user_id).order_by(
        Note.updated_at.desc()
    ).limit(5).all()
    
    # AI 인사이트
    latest_insight = AIInsight.query.filter_by(
        user_id=user_id,
        insight_type='daily_summary'
    ).order_by(AIInsight.created_at.desc()).first()
    
    return jsonify({
        'success': True,
        'data': {
            'stats': {
                'total_notes': total_notes,
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'in_progress_tasks': in_progress_tasks,
                'completion_rate': (completed_tasks / max(1, total_tasks)) * 100,
                'weekly_notes': weekly_notes,
                'weekly_completed_tasks': weekly_completed_tasks
            },
            'today_events': [event.to_dict() for event in today_events],
            'recent_notes': [note.to_dict() for note in recent_notes],
            'ai_insight': latest_insight.to_dict() if latest_insight else None
        }
    })

# 노트 관련 라우트
@app.route('/api/notes', methods=['GET'])
@jwt_required()
@handle_errors
def get_notes():
    user_id = get_jwt_identity()
    
    # 쿼리 파라미터
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    search = request.args.get('search', '')
    category = request.args.get('category', '')
    note_type = request.args.get('type', '')
    is_favorite = request.args.get('favorite', type=bool)
    
    # 기본 쿼리
    query = Note.query.filter_by(user_id=user_id, is_archived=False)
    
    # 필터 적용
    if search:
        query = query.filter(
            db.or_(
                Note.title.contains(search),
                Note.content.contains(search)
            )
        )
    
    if category:
        query = query.filter_by(category=category)
    
    if note_type:
        query = query.filter_by(note_type=note_type)
    
    if is_favorite is not None:
        query = query.filter_by(is_favorite=is_favorite)
    
    # 정렬 및 페이지네이션
    notes = query.order_by(Note.updated_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'success': True,
        'data': {
            'notes': [note.to_dict() for note in notes.items],
            'pagination': {
                'page': page,
                'pages': notes.pages,
                'per_page': per_page,
                'total': notes.total
            }
        }
    })

@app.route('/api/notes', methods=['POST'])
@jwt_required()
@handle_errors
@validate_json(['title', 'content'])
def create_note():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # 노트 생성
    note = Note(
        title=data['title'],
        content=data['content'],
        content_type=data.get('content_type', 'markdown'),
        note_type=data.get('note_type', 'note'),
        emoji=data.get('emoji', '📝'),
        category=data.get('category'),
        tags=json.dumps(data.get('tags', [])),
        user_id=user_id
    )
    
    # 메트릭 계산
    note.calculate_metrics()
    
    # AI 감정 분석
    sentiment_score, sentiment_label = AIService.analyze_sentiment(note.content)
    note.sentiment_score = sentiment_score
    note.sentiment_label = sentiment_label
    
    db.session.add(note)
    db.session.commit()
    
    # Notion 동기화 (옵션)
    if notion_client and data.get('sync_to_notion', False):
        try:
            notion_client.sync_note_to_notion(note)
        except Exception as e:
            logger.warning(f"Notion 동기화 실패: {e}")
    
    return jsonify({
        'success': True,
        'message': '노트가 생성되었습니다.',
        'data': note.to_dict()
    }), 201

@app.route('/api/notes/<int:note_id>', methods=['GET'])
@jwt_required()
@handle_errors
def get_note(note_id):
    user_id = get_jwt_identity()
    note = Note.query.filter_by(id=note_id, user_id=user_id).first()
    
    if not note:
        return jsonify({
            'success': False,
            'message': '노트를 찾을 수 없습니다.'
        }), 404
    
    # 마지막 접근 시간 업데이트
    note.last_accessed = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'success': True,
        'data': note.to_dict()
    })

@app.route('/api/notes/<int:note_id>', methods=['PUT'])
@jwt_required()
@handle_errors
def update_note(note_id):
    user_id = get_jwt_identity()
    note = Note.query.filter_by(id=note_id, user_id=user_id).first()
    
    if not note:
        return jsonify({
            'success': False,
            'message': '노트를 찾을 수 없습니다.'
        }), 404
    
    data = request.get_json()
    
    # 업데이트 가능한 필드들
    updateable_fields = [
        'title', 'content', 'note_type', 'emoji', 'category', 
        'is_favorite', 'is_public'
    ]
    
    for field in updateable_fields:
        if field in data:
            if field == 'tags':
                setattr(note, field, json.dumps(data[field]))
            else:
                setattr(note, field, data[field])
    
    # 메트릭 재계산
    if 'content' in data:
        note.calculate_metrics()
        # 감정 재분석
        sentiment_score, sentiment_label = AIService.analyze_sentiment(note.content)
        note.sentiment_score = sentiment_score
        note.sentiment_label = sentiment_label
    
    note.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '노트가 업데이트되었습니다.',
        'data': note.to_dict()
    })

@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
@jwt_required()
@handle_errors
def delete_note(note_id):
    user_id = get_jwt_identity()
    note = Note.query.filter_by(id=note_id, user_id=user_id).first()
    
    if not note:
        return jsonify({
            'success': False,
            'message': '노트를 찾을 수 없습니다.'
        }), 404
    
    db.session.delete(note)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '노트가 삭제되었습니다.'
    })

# 작업 관련 라우트
@app.route('/api/tasks', methods=['GET'])
@jwt_required()
@handle_errors
def get_tasks():
    user_id = get_jwt_identity()
    
    # 쿼리 파라미터
    status = request.args.get('status', '')
    priority = request.args.get('priority', '')
    project = request.args.get('project', '')
    
    # 기본 쿼리
    query = Task.query.filter_by(user_id=user_id)
    
    # 필터 적용
    if status:
        query = query.filter_by(status=status)
    if priority:
        query = query.filter_by(priority=priority)
    if project:
        query = query.filter_by(project=project)
    
    tasks = query.order_by(
        Task.priority.desc(),  # 우선순위 높은 것부터
        Task.due_date.asc()    # 마감일 가까운 것부터
    ).all()
    
    return jsonify({
        'success': True,
        'data': [task.to_dict() for task in tasks]
    })

@app.route('/api/tasks', methods=['POST'])
@jwt_required()
@handle_errors
@validate_json(['title'])
def create_task():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # AI 시간 예측
    estimated_hours = AIService.estimate_task_time(
        data['title'], 
        data.get('description', '')
    )
    
    task = Task(
        title=data['title'],
        description=data.get('description', ''),
        priority=data.get('priority', 'medium'),
        due_date=datetime.fromisoformat(data['due_date']) if data.get('due_date') else None,
        estimated_hours=estimated_hours,
        category=data.get('category'),
        project=data.get('project'),
        tags=json.dumps(data.get('tags', [])),
        user_id=user_id
    )
    
    db.session.add(task)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '작업이 생성되었습니다.',
        'data': task.to_dict()
    }), 201

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
@jwt_required()
@handle_errors
def update_task(task_id):
    user_id = get_jwt_identity()
    task = Task.query.filter_by(id=task_id, user_id=user_id).first()
    
    if not task:
        return jsonify({
            'success': False,
            'message': '작업을 찾을 수 없습니다.'
        }), 404
    
    data = request.get_json()
    
    # 상태 변경 시 완료 시간 설정
    if 'status' in data and data['status'] == 'completed' and task.status != 'completed':
        task.completed_at = datetime.utcnow()
        task.progress = 100
    
    # 업데이트 가능한 필드들
    updateable_fields = [
        'title', 'description', 'status', 'priority', 'progress',
        'due_date', 'estimated_hours', 'actual_hours', 'category', 'project'
    ]
    
    for field in updateable_fields:
        if field in data:
            if field == 'due_date' and data[field]:
                setattr(task, field, datetime.fromisoformat(data[field]))
            elif field == 'tags':
                setattr(task, field, json.dumps(data[field]))
            else:
                setattr(task, field, data[field])
    
    task.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '작업이 업데이트되었습니다.',
        'data': task.to_dict()
    })

# 이벤트/캘린더 관련 라우트
@app.route('/api/events', methods=['GET'])
@jwt_required()
@handle_errors
def get_events():
    user_id = get_jwt_identity()
    
    # 날짜 범위 필터
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    query = Event.query.filter_by(user_id=user_id)
    
    if start_date:
        query = query.filter(Event.start_time >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(Event.end_time <= datetime.fromisoformat(end_date))
    
    events = query.order_by(Event.start_time).all()
    
    return jsonify({
        'success': True,
        'data': [event.to_dict() for event in events]
    })

@app.route('/api/events', methods=['POST'])
@jwt_required()
@handle_errors
@validate_json(['title', 'start_time', 'end_time'])
def create_event():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    event = Event(
        title=data['title'],
        description=data.get('description', ''),
        start_time=datetime.fromisoformat(data['start_time']),
        end_time=datetime.fromisoformat(data['end_time']),
        event_type=data.get('event_type', 'meeting'),
        location=data.get('location'),
        is_online=data.get('is_online', False),
        meeting_url=data.get('meeting_url'),
        color=data.get('color', '#3B82F6'),
        category=data.get('category'),
        attendees=json.dumps(data.get('attendees', [])),
        user_id=user_id
    )
    
    db.session.add(event)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '이벤트가 생성되었습니다.',
        'data': event.to_dict()
    }), 201

# AI 코칭 라우트
@app.route('/api/ai/insights', methods=['GET'])
@jwt_required()
@handle_errors
def get_ai_insights():
    user_id = get_jwt_identity()
    
    # 최신 인사이트 생성
    ai_content = AIService.generate_daily_insights(user_id)
    
    # 저장된 인사이트들 조회
    insights = AIInsight.query.filter_by(user_id=user_id).order_by(
        AIInsight.created_at.desc()
    ).limit(10).all()
    
    return jsonify({
        'success': True,
        'data': {
            'latest_insight': ai_content,
            'insights_history': [insight.to_dict() for insight in insights]
        }
    })

@app.route('/api/ai/chat', methods=['POST'])
@jwt_required()
@handle_errors
@validate_json(['message'])
def ai_chat():
    user_id = get_jwt_identity()
    data = request.get_json()
    user_message = data['message']
    
    try:
        # 사용자 컨텍스트 수집
        user = User.query.get(user_id)
        recent_tasks = Task.query.filter_by(user_id=user_id).order_by(
            Task.updated_at.desc()
        ).limit(5).all()
        
        context = f"""
당신은 {user.username}님의 개인 생산성 AI 어시스턴트입니다.
현재 사용자의 최근 작업: {[t.title for t in recent_tasks]}

사용자 질문: {user_message}

친근하고 도움이 되는 톤으로 한국어로 답변해주세요.
"""
        
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": context}],
            max_tokens=500,
            temperature=0.7
        )
        
        ai_response = response.choices[0].message.content
        
        return jsonify({
            'success': True,
            'data': {
                'response': ai_response,
                'timestamp': datetime.utcnow().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"AI 채팅 실패: {e}")
        return jsonify({
            'success': True,
            'data': {
                'response': "죄송합니다. 현재 AI 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.",
                'timestamp': datetime.utcnow().isoformat()
            }
        })

# 포커스 세션 라우트
@app.route('/api/focus/sessions', methods=['POST'])
@jwt_required()
@handle_errors
@validate_json(['session_type', 'planned_duration'])
def start_focus_session():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    session = FocusSession(
        session_type=data['session_type'],
        planned_duration=data['planned_duration'],
        status='active',
        started_at=datetime.utcnow(),
        task_id=data.get('task_id'),
        user_id=user_id
    )
    
    db.session.add(session)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '집중 세션이 시작되었습니다.',
        'data': session.to_dict()
    }), 201

@app.route('/api/focus/sessions/<int:session_id>/complete', methods=['POST'])
@jwt_required()
@handle_errors
def complete_focus_session(session_id):
    user_id = get_jwt_identity()
    session = FocusSession.query.filter_by(
        id=session_id, 
        user_id=user_id, 
        status='active'
    ).first()
    
    if not session:
        return jsonify({
            'success': False,
            'message': '활성 세션을 찾을 수 없습니다.'
        }), 404
    
    data = request.get_json() or {}
    
    # 세션 완료 처리
    session.status = 'completed'
    session.ended_at = datetime.utcnow()
    session.actual_duration = int((session.ended_at - session.started_at).total_seconds() / 60)
    session.quality_rating = data.get('quality_rating')
    session.notes = data.get('notes')
    session.focus_score = data.get('focus_score', 7.0)
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '집중 세션이 완료되었습니다.',
        'data': session.to_dict()
    })

# 외부 통합 라우트
@app.route('/api/integrations/notion/sync', methods=['POST'])
@jwt_required()
@handle_errors
def sync_to_notion():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    if not notion_client:
        return jsonify({
            'success': False,
            'message': 'Notion 통합이 설정되지 않았습니다.'
        }), 400
    
    # 동기화할 노트 선택
    note_id = data.get('note_id')
    if note_id:
        note = Note.query.filter_by(id=note_id, user_id=user_id).first()
        if note:
            result = notion_client.sync_note_to_notion(note)
            if result:
                return jsonify({
                    'success': True,
                    'message': 'Notion에 동기화되었습니다.',
                    'notion_url': f"https://notion.so/{result['id']}"
                })
    
    return jsonify({
        'success': False,
        'message': '동기화할 노트를 찾을 수 없습니다.'
    }), 404

@app.route('/api/integrations/github/repos', methods=['GET'])
@jwt_required()
@handle_errors
def get_github_repos():
    if not github_client:
        return jsonify({
            'success': False,
            'message': 'GitHub 통합이 설정되지 않았습니다.'
        }), 400
    
    repos = github_client.get_user_repos()
    return jsonify({
        'success': True,
        'data': repos[:20]  # 최대 20개 리포지토리
    })

@app.route('/api/integrations/github/issue', methods=['POST'])
@jwt_required()
@handle_errors
@validate_json(['repo', 'title', 'body'])
def create_github_issue():
    if not github_client:
        return jsonify({
            'success': False,
            'message': 'GitHub 통합이 설정되지 않았습니다.'
        }), 400
    
    data = request.get_json()
    
    result = github_client.create_issue(
        repo=data['repo'],
        title=data['title'],
        body=data['body'],
        labels=data.get('labels', [])
    )
    
    if result:
        return jsonify({
            'success': True,
            'message': 'GitHub 이슈가 생성되었습니다.',
            'issue_url': result['html_url']
        })
    
    return jsonify({
        'success': False,
        'message': 'GitHub 이슈 생성에 실패했습니다.'
    }), 500

# 검색 라우트
@app.route('/api/search', methods=['GET'])
@jwt_required()
@handle_errors
def search():
    user_id = get_jwt_identity()
    query = request.args.get('q', '').strip()
    
    if not query:
        return jsonify({
            'success': False,
            'message': '검색어를 입력해주세요.'
        }), 400
    
    # 노트 검색
    notes = Note.query.filter(
        Note.user_id == user_id,
        Note.is_archived == False,
        db.or_(
            Note.title.contains(query),
            Note.content.contains(query)
        )
    ).limit(10).all()
    
    # 작업 검색
    tasks = Task.query.filter(
        Task.user_id == user_id,
        db.or_(
            Task.title.contains(query),
            Task.description.contains(query)
        )
    ).limit(10).all()
    
    # 이벤트 검색
    events = Event.query.filter(
        Event.user_id == user_id,
        db.or_(
            Event.title.contains(query),
            Event.description.contains(query)
        )
    ).limit(10).all()
    
    return jsonify({
        'success': True,
        'data': {
            'query': query,
            'results': {
                'notes': [note.to_dict() for note in notes],
                'tasks': [task.to_dict() for task in tasks],
                'events': [event.to_dict() for event in events]
            },
            'total_results': len(notes) + len(tasks) + len(events)
        }
    })

# 통계 라우트
@app.route('/api/analytics/productivity', methods=['GET'])
@jwt_required()
@handle_errors
def get_productivity_analytics():
    user_id = get_jwt_identity()
    
    # 기간 설정 (기본: 최근 30일)
    days = request.args.get('days', 30, type=int)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # 일별 통계 계산
    daily_stats = []
    for i in range(days):
        date = start_date + timedelta(days=i)
        date_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        date_end = date_start + timedelta(days=1)
        
        # 해당 날짜의 통계
        completed_tasks = Task.query.filter(
            Task.user_id == user_id,
            Task.completed_at >= date_start,
            Task.completed_at < date_end
        ).count()
        
        created_notes = Note.query.filter(
            Note.user_id == user_id,
            Note.created_at >= date_start,
            Note.created_at < date_end
        ).count()
        
        focus_sessions = FocusSession.query.filter(
            FocusSession.user_id == user_id,
            FocusSession.created_at >= date_start,
            FocusSession.created_at < date_end,
            FocusSession.status == 'completed'
        ).all()
        
        total_focus_time = sum(s.actual_duration for s in focus_sessions if s.actual_duration)
        avg_focus_score = sum(s.focus_score for s in focus_sessions if s.focus_score) / max(1, len(focus_sessions))
        
        daily_stats.append({
            'date': date.strftime('%Y-%m-%d'),
            'completed_tasks': completed_tasks,
            'created_notes': created_notes,
            'focus_sessions': len(focus_sessions),
            'total_focus_time': total_focus_time,
            'avg_focus_score': round(avg_focus_score, 1) if focus_sessions else 0
        })
    
    # 전체 통계
    total_tasks = Task.query.filter_by(user_id=user_id).count()
    completed_tasks = Task.query.filter_by(user_id=user_id, status='completed').count()
    total_notes = Note.query.filter_by(user_id=user_id, is_archived=False).count()
    
    # 카테고리별 통계
    task_categories = db.session.query(
        Task.category, 
        db.func.count(Task.id)
    ).filter_by(user_id=user_id).group_by(Task.category).all()
    
    note_types = db.session.query(
        Note.note_type,
        db.func.count(Note.id)
    ).filter_by(user_id=user_id, is_archived=False).group_by(Note.note_type).all()
    
    return jsonify({
        'success': True,
        'data': {
            'daily_stats': daily_stats,
            'summary': {
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'completion_rate': (completed_tasks / max(1, total_tasks)) * 100,
                'total_notes': total_notes,
                'avg_productivity_score': sum(day['completed_tasks'] for day in daily_stats) / max(1, days)
            },
            'categories': {
                'tasks': [{'name': cat[0] or 'Uncategorized', 'count': cat[1]} for cat in task_categories],
                'notes': [{'name': nt[0], 'count': nt[1]} for nt in note_types]
            }
        }
    })

# 설정 라우트
@app.route('/api/settings', methods=['GET'])
@jwt_required()
@handle_errors
def get_settings():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    return jsonify({
        'success': True,
        'data': {
            'profile': {
                'username': user.username,
                'email': user.email,
                'avatar_url': user.avatar_url,
                'plan': user.plan
            },
            'preferences': {
                'theme': user.theme,
                'timezone': user.timezone,
                'language': user.language
            },
            'productivity': {
                'work_start_time': user.work_start_time,
                'work_end_time': user.work_end_time,
                'break_duration': user.break_duration,
                'focus_session_duration': user.focus_session_duration
            },
            'ai': {
                'coaching_enabled': user.ai_coaching_enabled,
                'notifications_enabled': user.ai_notifications_enabled,
                'analysis_frequency': user.ai_analysis_frequency
            },
            'integrations': {
                'notion_enabled': user.notion_integration_enabled,
                'github_enabled': user.github_integration_enabled
            }
        }
    })

@app.route('/api/settings', methods=['PUT'])
@jwt_required()
@handle_errors
def update_settings():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()
    
    # 업데이트 가능한 설정들
    settings_map = {
        'theme': 'theme',
        'timezone': 'timezone',
        'language': 'language',
        'work_start_time': 'work_start_time',
        'work_end_time': 'work_end_time',
        'break_duration': 'break_duration',
        'focus_session_duration': 'focus_session_duration',
        'ai_coaching_enabled': 'ai_coaching_enabled',
        'ai_notifications_enabled': 'ai_notifications_enabled',
        'ai_analysis_frequency': 'ai_analysis_frequency'
    }
    
    for key, attr in settings_map.items():
        if key in data:
            setattr(user, attr, data[key])
    
    user.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '설정이 업데이트되었습니다.'
    })

# 템플릿 라우트
@app.route('/api/templates', methods=['GET'])
@jwt_required()
@handle_errors
def get_templates():
    """노트 템플릿 목록 조회"""
    user_id = get_jwt_identity()
    
    # 사용자 커스텀 템플릿
    user_templates = Note.query.filter_by(
        user_id=user_id,
        is_template=True
    ).all()
    
    # 기본 템플릿들
    default_templates = [
        {
            'id': 'meeting-notes',
            'title': '회의록 템플릿',
            'emoji': '👥',
            'content': """# 회의록

## 📅 회의 정보
- **날짜**: 
- **시간**: 
- **참석자**: 
- **장소**: 

## 📋 안건
1. 
2. 
3. 

## 💡 주요 논의사항


## ✅ 결정사항


## 📝 액션 아이템
- [ ] 
- [ ] 
- [ ] 

## 📌 다음 회의
- **날짜**: 
- **안건**: 
""",
            'category': 'meeting'
        },
        {
            'id': 'daily-planning',
            'title': '일일 계획 템플릿',
            'emoji': '📋',
            'content': """# 오늘의 계획

## 🎯 주요 목표 (3가지)
1. 
2. 
3. 

## ⏰ 시간 계획
- **09:00 - 10:00**: 
- **10:00 - 12:00**: 
- **13:00 - 15:00**: 
- **15:00 - 17:00**: 
- **17:00 - 18:00**: 

## 📞 미팅/약속


## 🧠 학습/개발


## 💭 메모/아이디어


## 🌟 오늘의 성과
- 
- 
- 
""",
            'category': 'planning'
        },
        {
            'id': 'project-brief',
            'title': '프로젝트 기획서 템플릿',
            'emoji': '🚀',
            'content': """# 프로젝트 기획서

## 📖 프로젝트 개요
**프로젝트명**: 
**기간**: 
**담당자**: 

## 🎯 목표
### 주요 목표

### 성공 지표

## 📊 현황 분석
### 문제 정의

### 기회 요소

## 💡 솔루션
### 제안 방향

### 주요 기능

## 📅 일정
- **1단계**: 
- **2단계**: 
- **3단계**: 

## 💰 예산


## 🚨 리스크 요소


## 📈 기대 효과

""",
            'category': 'project'
        }
    ]
    
    return jsonify({
        'success': True,
        'data': {
            'user_templates': [note.to_dict() for note in user_templates],
            'default_templates': default_templates
        }
    })

@app.route('/api/templates/<template_id>/use', methods=['POST'])
@jwt_required()
@handle_errors
def use_template(template_id):
    """템플릿으로부터 새 노트 생성"""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    # 기본 템플릿 확인
    default_templates = {
        'meeting-notes': {
            'title': '회의록',
            'emoji': '👥',
            'content': """# 회의록\n\n## 📅 회의 정보\n- **날짜**: \n- **시간**: \n- **참석자**: \n- **장소**: \n\n## 📋 안건\n1. \n2. \n3. \n\n## 💡 주요 논의사항\n\n\n## ✅ 결정사항\n\n\n## 📝 액션 아이템\n- [ ] \n- [ ] \n- [ ] \n\n## 📌 다음 회의\n- **날짜**: \n- **안건**: """,
            'note_type': 'meeting'
        }
        # 다른 템플릿들도 여기에 추가...
    }
    
    template_data = None
    
    # 기본 템플릿 확인
    if template_id in default_templates:
        template_data = default_templates[template_id]
    else:
        # 사용자 템플릿 확인
        template = Note.query.filter_by(
            id=int(template_id) if template_id.isdigit() else 0,
            user_id=user_id,
            is_template=True
        ).first()
        
        if template:
            template_data = {
                'title': template.title,
                'emoji': template.emoji,
                'content': template.content,
                'note_type': template.note_type
            }
    
    if not template_data:
        return jsonify({
            'success': False,
            'message': '템플릿을 찾을 수 없습니다.'
        }), 404
    
    # 새 노트 생성
    note = Note(
        title=data.get('title', template_data['title']),
        content=template_data['content'],
        emoji=template_data['emoji'],
        note_type=template_data['note_type'],
        user_id=user_id
    )
    
    note.calculate_metrics()
    db.session.add(note)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '템플릿으로부터 노트가 생성되었습니다.',
        'data': note.to_dict()
    }), 201

# 에러 핸들러
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Not Found',
        'message': '요청한 리소스를 찾을 수 없습니다.'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({
        'success': False,
        'error': 'Internal Server Error',
        'message': '서버 내부 오류가 발생했습니다.'
    }), 500

@app.errorhandler(400)
def bad_request(error):
    return jsonify({
        'success': False,
        'error': 'Bad Request',
        'message': '잘못된 요청입니다.'
    }), 400

# CORS 프리플라이트 처리
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = jsonify({'message': 'OK'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add('Access-Control-Allow-Headers', "*")
        response.headers.add('Access-Control-Allow-Methods', "*")
        return response

# 데이터베이스 초기화
def init_db():
    """데이터베이스 테이블 생성"""
    with app.app_context():
        db.create_all()
        logger.info("데이터베이스 테이블이 생성되었습니다.")

# 샘플 데이터 생성
def create_sample_data():
    """개발용 샘플 데이터 생성"""
    with app.app_context():
        # 샘플 사용자 확인
        user = User.query.filter_by(email='demo@cortex.app').first()
        
        if not user:
            # 샘플 사용자 생성
            user = User(
                email='demo@cortex.app',
                username='데모사용자',
                password_hash=generate_password_hash('demo123'),
                avatar_url='https://ui-avatars.com/api/?name=Demo&background=6366f1&color=fff',
                plan='premium'
            )
            db.session.add(user)
            db.session.commit()
            
            # 샘플 노트 생성
            sample_notes = [
                {
                    'title': '프로젝트 아이디어 모음',
                    'content': '# 새로운 프로젝트 아이디어들\n\n## 1. AI 기반 생산성 앱\n- 사용자 패턴 분석\n- 맞춤형 조언 제공\n\n## 2. 협업 도구 개선\n- 실시간 문서 편집\n- 버전 관리 시스템',
                    'note_type': 'idea',
                    'emoji': '💡',
                    'category': 'work',
                    'tags': json.dumps(['project', 'idea', 'ai'])
                },
                {
                    'title': '오늘의 회의록',
                    'content': '# 팀 미팅 회의록\n\n## 참석자\n- 김개발자\n- 이디자이너\n- 박기획자\n\n## 주요 안건\n1. Q1 로드맵 검토\n2. 신기능 우선순위 논의\n3. 버그 수정 계획',
                    'note_type': 'meeting',
                    'emoji': '👥',
                    'category': 'meeting',
                    'tags': json.dumps(['meeting', 'team', 'planning'])
                }
            ]
            
            for note_data in sample_notes:
                note = Note(user_id=user.id, **note_data)
                note.calculate_metrics()
                sentiment_score, sentiment_label = AIService.analyze_sentiment(note.content)
                note.sentiment_score = sentiment_score
                note.sentiment_label = sentiment_label
                db.session.add(note)
            
            # 샘플 작업 생성
            sample_tasks = [
                {
                    'title': 'API 문서 작성 완료',
                    'description': '새로운 엔드포인트들에 대한 상세 문서 작성',
                    'status': 'in_progress',
                    'priority': 'high',
                    'progress': 75,
                    'category': 'development',
                    'estimated_hours': 4.0,
                    'actual_hours': 3.0,
                    'due_date': datetime.utcnow() + timedelta(days=2)
                },
                {
                    'title': 'UI 디자인 리뷰',
                    'description': '새로운 대시보드 UI 검토 및 피드백',
                    'status': 'todo',
                    'priority': 'medium',
                    'progress': 0,
                    'category': 'design',
                    'estimated_hours': 2.0,
                    'due_date': datetime.utcnow() + timedelta(days=5)
                },
                {
                    'title': '데이터베이스 최적화',
                    'description': '쿼리 성능 개선 및 인덱스 추가',
                    'status': 'completed',
                    'priority': 'high',
                    'progress': 100,
                    'category': 'development',
                    'estimated_hours': 6.0,
                    'actual_hours': 5.5,
                    'completed_at': datetime.utcnow() - timedelta(days=1)
                }
            ]
            
            for task_data in sample_tasks:
                task = Task(user_id=user.id, **task_data)
                db.session.add(task)
            
            # 샘플 이벤트 생성
            sample_events = [
                {
                    'title': '팀 스탠드업',
                    'description': '일일 진행상황 공유',
                    'start_time': datetime.utcnow().replace(hour=9, minute=0) + timedelta(days=1),
                    'end_time': datetime.utcnow().replace(hour=9, minute=30) + timedelta(days=1),
                    'event_type': 'meeting',
                    'is_online': True,
                    'meeting_url': 'https://meet.google.com/sample',
                    'color': '#3B82F6',
                    'category': 'work'
                },
                {
                    'title': '클라이언트 미팅',
                    'description': '프로젝트 진행상황 발표',
                    'start_time': datetime.utcnow().replace(hour=14, minute=0) + timedelta(days=2),
                    'end_time': datetime.utcnow().replace(hour=15, minute=30) + timedelta(days=2),
                    'event_type': 'presentation',
                    'location': '회의실 A',
                    'color': '#EF4444',
                    'category': 'client'
                }
            ]
            
            for event_data in sample_events:
                event = Event(user_id=user.id, **event_data)
                db.session.add(event)
            
            db.session.commit()
            logger.info("샘플 데이터가 생성되었습니다.")
            logger.info("데모 계정: demo@cortex.app / demo123")

if __name__ == '__main__':
    # 데이터베이스 초기화
    init_db()
    
    # 개발 환경에서 샘플 데이터 생성
    if os.getenv('FLASK_ENV') != 'production':
        create_sample_data()
    
    # 서버 실행
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') != 'production'
    
    logger.info(f"🚀 Cortex 백엔드 서버가 포트 {port}에서 시작됩니다...")
    logger.info(f"📊 OpenAI API: {'✅ 연결됨' if OPENAI_API_KEY else '❌ 미설정'}")
    logger.info(f"📝 Notion API: {'✅ 연결됨' if NOTION_TOKEN else '❌ 미설정'}")
    logger.info(f"🐙 GitHub API: {'✅ 연결됨' if GITHUB_TOKEN else '❌ 미설정'}")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug,
        threaded=True
    )
                (f"Notion 페이지 생성 실패: {e}")
            return None
    
    def sync_note_to_notion(self, note: Note):
        """노트를 Notion으로 동기화"""
        try:
            properties = {
                "Name": {
                    "title": [{"text": {"content": note.title}}]
                },
                "Tags": {
                    "multi_select": [
                        {"name": tag} for tag in (json.loads(note.tags) if note.tags else [])
                    ]
                },
                "Type": {
                    "select": {"name": note.note_type}
                },
                "Status": {
                    "select": {"name": "Draft" if not note.is_public else "Published"}
                },
                "Created": {
                    "date": {"start": note.created_at.isoformat()}
                }
            }
            
            result = self.create_page(NOTION_DB_ID, properties, note.content)
            if result:
                note.notion_page_id = result['id']
                db.session.commit()
                return result
                
        except Exception as e:
            logger.error(f"Notion 동기화 실패: {e}")
            return None

# GitHub API 통합
class GitHubClient:
    def __init__(self, token: str):
        self.token = token
        self.base_url = "https://api.github.com"
        self.headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json"
        }
    
    def create_issue(self, repo: str, title: str, body: str, labels: List[str] = None):
        """GitHub 이슈 생성"""
        try:
            url = f"{self.base_url}/repos/{repo}/issues"
            data = {
                "title": title,
                "body": body,
                "labels": labels or []
            }
            
            response = requests.post(url, headers=self.headers, json=data)
            response.raise_for_status()
            return response.json()
            
        except Exception as e:
            logger.error(f"GitHub 이슈 생성 실패: {e}")
            return None
    
    def get_user_repos(self):
        """사용자 리포지토리 목록 조회"""
        try:
            url = f"{self.base_url}/user/repos"
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()
            
        except Exception as e:
            logger.error(f"GitHub 리포지토리 조회 실패: {e}")
            return []

# AI 서비스
class AIService:
    @staticmethod
    def generate_daily_insights(user_id: int) -> dict:
        """일일 AI 인사이트 생성"""
        try:
            user = User.query.get(user_id)
            if not user or not user.ai_coaching_enabled:
                return None
            
            # 최근 7일 데이터 수집
            week_ago = datetime.utcnow() - timedelta(days=7)
            
            recent_tasks = Task.query.filter(
                Task.user_id == user_id,
                Task.updated_at >= week_ago
            ).all()
            
            recent_notes = Note.query.filter(
                Note.user_id == user_id,
                Note.updated_at >= week_ago
            ).all()
            
            focus_sessions = FocusSession.query.filter(
                FocusSession.user_id == user_id,
                FocusSession.created_at >= week_ago
            ).all()
            
            # 통계 계산
            completed_tasks = [t for t in recent_tasks if t.status == 'completed']
            completion_rate = (len(completed_tasks) / max(1, len(recent_tasks))) * 100
            
            total_focus_time = sum(s.actual_duration for s in focus_sessions if s.actual_duration)
            avg_focus_score = sum(s.focus_score for s in focus_sessions if s.focus_score) / max(1, len(focus_sessions))
            
            # OpenAI로 개인화된 분석 생성
            prompt = f"""
당신은 전문 생산성 코치입니다. 다음 사용자 데이터를 분석하여 한국어로 인사이트를 제공해주세요:

사용자 정보:
- 이름: {user.username}
- 계획: {user.plan}
- 근무시간: {user.work_start_time} - {user.work_end_time}

최근 7일 데이터:
- 총 작업: {len(recent_tasks)}개
- 완료된 작업: {len(completed_tasks)}개
- 완료율: {completion_rate:.1f}%
- 작성한 노트: {len(recent_notes)}개
- 집중 세션: {len(focus_sessions)}개
- 총 집중 시간: {total_focus_time}분
- 평균 집중도: {avg_focus_score:.1f}/10

다음 JSON 형식으로 응답해주세요:
{{
    "daily_summary": "오늘의 생산성 요약 (친근한 톤, 2-3문장)",
    "focus_score": 집중도점수(1-10),
    "productivity_trend": "상승/하락/유지",
    "suggestions": [
        "구체적인 개선 제안 1",
        "구체적인 개선 제안 2", 
        "구체적인 개선 제안 3"
    ],
    "achievements": [
        "이번 주 성과 1",
        "이번 주 성과 2"
    ],
    "next_actions": [
        "다음에 할 일 추천 1",
        "다음에 할 일 추천 2"
    ],
    "motivation_message": "격려 메시지"
}}
"""
            
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=800,
                temperature=0.7
            )
            
            ai_content = json.loads(response.choices[0].message.content)
            
            # 인사이트 저장
            insight = AIInsight(
                user_id=user_id,
                insight_type='daily_summary',
                title=f"{user.username}님의 일일 생산성 리포트",
                content=json.dumps(ai_content, ensure_ascii=False),
                confidence_score=0.85,
                metadata=json.dumps({
                    'completion_rate': completion_rate,
                    'focus_time': total_focus_time,
                    'tasks_count': len(recent_tasks),
                    'notes_count': len(recent_notes)
                }, ensure_ascii=False)
            )
            
            db.session.add(insight)
            db.session.commit()
            
            return ai_content
            
        except Exception as e:
            logger.error