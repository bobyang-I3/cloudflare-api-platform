"""
User Profile models
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class UserProfile(Base):
    """Extended user profile information"""
    __tablename__ = "user_profiles"
    
    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    avatar_url = Column(Text, nullable=True)  # Base64 encoded avatar or URL
    role = Column(String(50), nullable=True)  # student, professor, phd, researcher, industry, etc.
    research_direction = Column(String(200), nullable=True)  # AI, ML, NLP, CV, etc.
    institution = Column(String(200), nullable=True)  # University or Company
    bio = Column(Text, nullable=True)  # Short bio
    location = Column(String(100), nullable=True)
    website = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])


