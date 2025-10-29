"""
Admin API routes for user management and monitoring
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
from models import User, UserLimit, UsageLog
from middleware import require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ==================== Schemas ====================

class UserInfo(BaseModel):
    id: str
    username: str
    email: str
    api_key: str
    is_active: bool
    is_admin: bool
    role: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserLimitInfo(BaseModel):
    user_id: str
    max_requests_per_day: int
    max_tokens_per_day: int
    max_tokens_per_month: int
    is_limited: bool
    
    class Config:
        from_attributes = True


class UserWithLimit(BaseModel):
    user: UserInfo
    limit: Optional[UserLimitInfo]
    total_requests: int
    total_tokens: int
    requests_today: int
    tokens_today: int


class UpdateUserLimitRequest(BaseModel):
    max_requests_per_day: int
    max_tokens_per_day: int
    max_tokens_per_month: int
    is_limited: bool


class UpdateUserStatusRequest(BaseModel):
    is_active: bool


class PlatformStats(BaseModel):
    total_users: int
    active_users: int
    admin_users: int
    total_requests: int
    total_tokens: int
    requests_today: int
    tokens_today: int
    top_models: List[dict]


# ==================== Routes ====================

@router.get("/users", response_model=List[UserWithLimit])
async def get_all_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get all users with their usage statistics and limits
    """
    users = db.query(User).all()
    
    result = []
    for user in users:
        # Get user limit
        user_limit = db.query(UserLimit).filter(UserLimit.user_id == user.id).first()
        
        # Get total usage
        total_usage = db.query(
            func.count(UsageLog.id).label("total_requests"),
            func.sum(UsageLog.total_tokens).label("total_tokens")
        ).filter(UsageLog.user_id == user.id).first()
        
        # Get today's usage
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_usage = db.query(
            func.count(UsageLog.id).label("requests_today"),
            func.sum(UsageLog.total_tokens).label("tokens_today")
        ).filter(
            UsageLog.user_id == user.id,
            UsageLog.timestamp >= today_start
        ).first()
        
        result.append(UserWithLimit(
            user=UserInfo.from_orm(user),
            limit=UserLimitInfo.from_orm(user_limit) if user_limit else None,
            total_requests=total_usage.total_requests or 0,
            total_tokens=total_usage.total_tokens or 0,
            requests_today=today_usage.requests_today or 0,
            tokens_today=today_usage.tokens_today or 0
        ))
    
    return result


@router.get("/user/{user_id}/usage")
async def get_user_usage(
    user_id: str,
    days: int = 30,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get detailed usage for a specific user
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    since = datetime.utcnow() - timedelta(days=days)
    
    logs = db.query(UsageLog).filter(
        UsageLog.user_id == user_id,
        UsageLog.timestamp >= since
    ).order_by(UsageLog.timestamp.desc()).all()
    
    # Calculate stats by model
    model_stats = {}
    for log in logs:
        if log.model_name not in model_stats:
            model_stats[log.model_name] = {
                "requests": 0,
                "tokens": 0
            }
        model_stats[log.model_name]["requests"] += 1
        model_stats[log.model_name]["tokens"] += log.total_tokens
    
    # Calculate stats by task type
    task_stats = {}
    for log in logs:
        if log.task_type not in task_stats:
            task_stats[log.task_type] = {
                "requests": 0,
                "tokens": 0
            }
        task_stats[log.task_type]["requests"] += 1
        task_stats[log.task_type]["tokens"] += log.total_tokens
    
    return {
        "user_id": user_id,
        "username": user.username,
        "total_requests": len(logs),
        "total_tokens": sum(log.total_tokens for log in logs),
        "by_model": model_stats,
        "by_task": task_stats,
        "recent_logs": [
            {
                "id": log.id,
                "timestamp": log.timestamp,
                "model_name": log.model_name,
                "task_type": log.task_type,
                "total_tokens": log.total_tokens,
                "response_time_ms": log.response_time_ms
            }
            for log in logs[:50]  # Return last 50 logs
        ]
    }


@router.put("/user/{user_id}/limit")
async def update_user_limit(
    user_id: str,
    limit_data: UpdateUserLimitRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Update or create user limits
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_limit = db.query(UserLimit).filter(UserLimit.user_id == user_id).first()
    
    if user_limit:
        # Update existing limit
        user_limit.max_requests_per_day = limit_data.max_requests_per_day
        user_limit.max_tokens_per_day = limit_data.max_tokens_per_day
        user_limit.max_tokens_per_month = limit_data.max_tokens_per_month
        user_limit.is_limited = limit_data.is_limited
        user_limit.updated_at = datetime.utcnow()
    else:
        # Create new limit
        user_limit = UserLimit(
            user_id=user_id,
            max_requests_per_day=limit_data.max_requests_per_day,
            max_tokens_per_day=limit_data.max_tokens_per_day,
            max_tokens_per_month=limit_data.max_tokens_per_month,
            is_limited=limit_data.is_limited
        )
        db.add(user_limit)
    
    db.commit()
    db.refresh(user_limit)
    
    return {
        "message": "User limit updated successfully",
        "limit": UserLimitInfo.from_orm(user_limit)
    }


@router.put("/user/{user_id}/status")
async def update_user_status(
    user_id: str,
    status_data: UpdateUserStatusRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Update user active status (enable/disable user)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_admin:
        raise HTTPException(status_code=403, detail="Cannot modify admin user status")
    
    user.is_active = status_data.is_active
    user.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "message": f"User {'activated' if status_data.is_active else 'deactivated'} successfully",
        "user_id": user_id,
        "is_active": user.is_active
    }


@router.get("/stats", response_model=PlatformStats)
async def get_platform_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get overall platform statistics
    """
    # User stats
    total_users = db.query(func.count(User.id)).scalar()
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
    admin_users = db.query(func.count(User.id)).filter(User.is_admin == True).scalar()
    
    # Usage stats
    total_requests = db.query(func.count(UsageLog.id)).scalar()
    total_tokens = db.query(func.sum(UsageLog.total_tokens)).scalar() or 0
    
    # Today's stats
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_stats = db.query(
        func.count(UsageLog.id).label("requests"),
        func.sum(UsageLog.total_tokens).label("tokens")
    ).filter(UsageLog.timestamp >= today_start).first()
    
    # Top models
    top_models_query = db.query(
        UsageLog.model_name,
        func.count(UsageLog.id).label("requests"),
        func.sum(UsageLog.total_tokens).label("tokens")
    ).group_by(UsageLog.model_name).order_by(func.count(UsageLog.id).desc()).limit(10).all()
    
    top_models = [
        {
            "model": model.model_name,
            "requests": model.requests,
            "tokens": model.tokens
        }
        for model in top_models_query
    ]
    
    return PlatformStats(
        total_users=total_users,
        active_users=active_users,
        admin_users=admin_users,
        total_requests=total_requests,
        total_tokens=total_tokens,
        requests_today=today_stats.requests or 0,
        tokens_today=today_stats.tokens or 0,
        top_models=top_models
    )


@router.delete("/user/{user_id}")
async def delete_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Delete a user (admin only, cannot delete other admins)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_admin:
        raise HTTPException(status_code=403, detail="Cannot delete admin users")
    
    db.delete(user)
    db.commit()
    
    return {
        "message": "User deleted successfully",
        "user_id": user_id
    }

