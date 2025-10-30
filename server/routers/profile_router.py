"""
User Profile API routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from pydantic import BaseModel

from database import get_db
from models import User
from models_profile import UserProfile
from auth import get_current_user_from_token

router = APIRouter(prefix="/api/profile", tags=["profile"])


# ==================== Schemas ====================

class ProfileResponse(BaseModel):
    user_id: str
    avatar_url: Optional[str]
    role: Optional[str]
    research_direction: Optional[str]
    institution: Optional[str]
    bio: Optional[str]
    location: Optional[str]
    website: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    avatar_url: Optional[str] = None
    role: Optional[str] = None
    research_direction: Optional[str] = None
    institution: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None


# ==================== Routes ====================

@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get current user's profile
    """
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    
    if not profile:
        # Create default profile
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    return ProfileResponse.from_orm(profile)


@router.get("/{user_id}", response_model=ProfileResponse)
async def get_user_profile(
    user_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get any user's profile
    """
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    
    if not profile:
        # Create default profile
        profile = UserProfile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    return ProfileResponse.from_orm(profile)


@router.put("/me", response_model=ProfileResponse)
async def update_my_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Update current user's profile
    """
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    
    if not profile:
        # Create profile if doesn't exist
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
    
    # Update fields
    if request.avatar_url is not None:
        profile.avatar_url = request.avatar_url
    if request.role is not None:
        profile.role = request.role
    if request.research_direction is not None:
        profile.research_direction = request.research_direction
    if request.institution is not None:
        profile.institution = request.institution
    if request.bio is not None:
        profile.bio = request.bio
    if request.location is not None:
        profile.location = request.location
    if request.website is not None:
        profile.website = request.website
    
    profile.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(profile)
    
    return ProfileResponse.from_orm(profile)


