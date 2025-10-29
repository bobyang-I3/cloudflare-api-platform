"""
User quota/limit checking utilities
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import User, UserLimit, UsageLog
from datetime import datetime, timedelta
from fastapi import HTTPException, status


def check_user_limits(user: User, db: Session, estimated_tokens: int = 0):
    """
    Check if user has exceeded their usage limits
    
    Args:
        user: The user to check
        db: Database session
        estimated_tokens: Estimated tokens for the upcoming request
        
    Raises:
        HTTPException: If user has exceeded limits
    """
    # Admin users bypass all limits
    if user.is_admin:
        return
    
    # Get user's limit settings
    user_limit = db.query(UserLimit).filter(UserLimit.user_id == user.id).first()
    
    # If no limit record or limits are disabled, allow request
    if not user_limit or not user_limit.is_limited:
        return
    
    # Calculate time boundaries
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    month_start = datetime(now.year, now.month, 1)
    
    # Query today's usage
    today_usage = db.query(
        func.count(UsageLog.id).label('requests'),
        func.sum(UsageLog.total_tokens).label('tokens')
    ).filter(
        UsageLog.user_id == user.id,
        UsageLog.timestamp >= today_start
    ).first()
    
    # Query this month's usage
    month_usage = db.query(
        func.sum(UsageLog.total_tokens).label('tokens')
    ).filter(
        UsageLog.user_id == user.id,
        UsageLog.timestamp >= month_start
    ).first()
    
    # Extract values (handle None)
    today_requests = today_usage.requests or 0
    today_tokens = today_usage.tokens or 0
    month_tokens = month_usage.tokens or 0
    
    # Check daily request limit
    if user_limit.max_requests_per_day > 0:  # 0 means unlimited
        if today_requests >= user_limit.max_requests_per_day:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Daily request limit exceeded. Limit: {user_limit.max_requests_per_day} requests/day. Used: {today_requests}. Resets at midnight UTC."
            )
    
    # Check daily token limit
    if user_limit.max_tokens_per_day > 0:  # 0 means unlimited
        if today_tokens + estimated_tokens > user_limit.max_tokens_per_day:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Daily token limit exceeded. Limit: {user_limit.max_tokens_per_day} tokens/day. Used: {today_tokens}. Resets at midnight UTC."
            )
    
    # Check monthly token limit
    if user_limit.max_tokens_per_month > 0:  # 0 means unlimited
        if month_tokens + estimated_tokens > user_limit.max_tokens_per_month:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Monthly token limit exceeded. Limit: {user_limit.max_tokens_per_month} tokens/month. Used: {month_tokens}. Resets on 1st of next month."
            )


def get_user_remaining_quota(user: User, db: Session) -> dict:
    """
    Get user's remaining quota information
    
    Returns:
        dict with remaining quotas
    """
    # Admin users have unlimited quota
    if user.is_admin:
        return {
            "unlimited": True,
            "requests_remaining": -1,
            "daily_tokens_remaining": -1,
            "monthly_tokens_remaining": -1
        }
    
    # Get user's limit settings
    user_limit = db.query(UserLimit).filter(UserLimit.user_id == user.id).first()
    
    # If no limit record or limits are disabled, unlimited
    if not user_limit or not user_limit.is_limited:
        return {
            "unlimited": True,
            "requests_remaining": -1,
            "daily_tokens_remaining": -1,
            "monthly_tokens_remaining": -1
        }
    
    # Calculate time boundaries
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    month_start = datetime(now.year, now.month, 1)
    
    # Query today's usage
    today_usage = db.query(
        func.count(UsageLog.id).label('requests'),
        func.sum(UsageLog.total_tokens).label('tokens')
    ).filter(
        UsageLog.user_id == user.id,
        UsageLog.timestamp >= today_start
    ).first()
    
    # Query this month's usage
    month_usage = db.query(
        func.sum(UsageLog.total_tokens).label('tokens')
    ).filter(
        UsageLog.user_id == user.id,
        UsageLog.timestamp >= month_start
    ).first()
    
    # Calculate remaining quotas
    today_requests = today_usage.requests or 0
    today_tokens = today_usage.tokens or 0
    month_tokens = month_usage.tokens or 0
    
    return {
        "unlimited": False,
        "requests_remaining": max(0, user_limit.max_requests_per_day - today_requests) if user_limit.max_requests_per_day > 0 else -1,
        "daily_tokens_remaining": max(0, user_limit.max_tokens_per_day - today_tokens) if user_limit.max_tokens_per_day > 0 else -1,
        "monthly_tokens_remaining": max(0, user_limit.max_tokens_per_month - month_tokens) if user_limit.max_tokens_per_month > 0 else -1,
        "limits": {
            "max_requests_per_day": user_limit.max_requests_per_day,
            "max_tokens_per_day": user_limit.max_tokens_per_day,
            "max_tokens_per_month": user_limit.max_tokens_per_month
        },
        "used": {
            "today_requests": today_requests,
            "today_tokens": today_tokens,
            "month_tokens": month_tokens
        }
    }

