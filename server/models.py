"""
SQLAlchemy database models
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from database import Base


def generate_uuid():
    return str(uuid.uuid4())


def generate_api_key():
    """Generate a unique API key"""
    return f"cb_{uuid.uuid4().hex}"


class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    api_key = Column(String, unique=True, nullable=False, default=generate_api_key, index=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)  # Admin flag
    role = Column(String, default="user")  # Role: "admin" or "user"
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    usage_logs = relationship("UsageLog", back_populates="user", cascade="all, delete-orphan")
    user_limit = relationship("UserLimit", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(username='{self.username}', email='{self.email}', role='{self.role}')>"


class UserLimit(Base):
    __tablename__ = "user_limits"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    max_requests_per_day = Column(Integer, default=1000)  # Max requests per day (0 = unlimited)
    max_tokens_per_day = Column(Integer, default=100000)  # Max tokens per day (0 = unlimited)
    max_tokens_per_month = Column(Integer, default=1000000)  # Max tokens per month (0 = unlimited)
    is_limited = Column(Boolean, default=False)  # Whether limits are enforced
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="user_limit")
    
    def __repr__(self):
        return f"<UserLimit(user_id='{self.user_id}', limited={self.is_limited})>"


class UsageLog(Base):
    __tablename__ = "usage_logs"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    model_name = Column(String, nullable=False)
    task_type = Column(String, default="text-generation")  # Task type: text-generation, text-to-image, etc.
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    response_time_ms = Column(Float, default=0.0)
    request_data = Column(Text, nullable=True)  # Store request for debugging
    has_image = Column(Boolean, default=False)  # Whether request included an image
    has_audio = Column(Boolean, default=False)  # Whether request included audio
    
    # Relationships
    user = relationship("User", back_populates="usage_logs")
    
    def __repr__(self):
        return f"<UsageLog(user_id='{self.user_id}', model='{self.model_name}', task='{self.task_type}', tokens={self.total_tokens})>"

