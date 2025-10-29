"""
Usage tracking and statistics routes
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta
from database import get_db
from models import User, UsageLog
from schemas import UsageLogResponse, UsageStats
from auth import get_current_user_from_token
from check_limits import get_user_remaining_quota

router = APIRouter(prefix="/usage", tags=["Usage"])


@router.get("/stats", response_model=UsageStats)
def get_usage_stats(
    days: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get usage statistics for the current user
    """
    # Calculate date range
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get logs within date range
    logs = db.query(UsageLog).filter(
        UsageLog.user_id == current_user.id,
        UsageLog.timestamp >= start_date
    ).all()
    
    # Calculate totals
    total_requests = len(logs)
    total_tokens = sum(log.total_tokens for log in logs)
    total_input_tokens = sum(log.input_tokens for log in logs)
    total_output_tokens = sum(log.output_tokens for log in logs)
    
    # Group by model
    by_model = {}
    for log in logs:
        if log.model_name not in by_model:
            by_model[log.model_name] = {"requests": 0, "tokens": 0}
        by_model[log.model_name]["requests"] += 1
        by_model[log.model_name]["tokens"] += log.total_tokens
    
    # Group by task type
    by_task = {}
    for log in logs:
        task_type = log.task_type or "text-generation"
        if task_type not in by_task:
            by_task[task_type] = {"requests": 0, "tokens": 0}
        by_task[task_type]["requests"] += 1
        by_task[task_type]["tokens"] += log.total_tokens
    
    return UsageStats(
        total_requests=total_requests,
        total_tokens=total_tokens,
        total_input_tokens=total_input_tokens,
        total_output_tokens=total_output_tokens,
        by_model=by_model,
        by_task=by_task
    )


@router.get("/logs", response_model=List[UsageLogResponse])
def get_usage_logs(
    limit: int = Query(default=50, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get usage logs for the current user
    """
    logs = db.query(UsageLog).filter(
        UsageLog.user_id == current_user.id
    ).order_by(
        UsageLog.timestamp.desc()
    ).offset(offset).limit(limit).all()
    
    return logs


@router.get("/quota")
def get_user_quota(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get current user's remaining quota information
    """
    return get_user_remaining_quota(current_user, db)

