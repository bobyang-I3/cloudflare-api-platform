"""
Usage tracking and statistics routes
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
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


@router.get("/charts/daily")
def get_daily_usage_chart(
    days: int = Query(default=7, ge=1, le=90),
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get daily usage statistics for charts (token usage, requests, cost)
    """
    from models_credit import CreditTransaction, TransactionType
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Query usage logs grouped by date
    # Use cast() for cross-database compatibility (SQLite and PostgreSQL)
    daily_data = db.query(
        cast(UsageLog.timestamp, Date).label('date'),
        func.count(UsageLog.id).label('requests'),
        func.sum(UsageLog.total_tokens).label('tokens'),
        func.sum(UsageLog.input_tokens).label('input_tokens'),
        func.sum(UsageLog.output_tokens).label('output_tokens')
    ).filter(
        UsageLog.user_id == current_user.id,
        UsageLog.timestamp >= start_date
    ).group_by(
        cast(UsageLog.timestamp, Date)
    ).order_by(
        cast(UsageLog.timestamp, Date)
    ).all()
    
    # Query credit consumption by date
    daily_cost = db.query(
        cast(CreditTransaction.created_at, Date).label('date'),
        func.sum(CreditTransaction.amount).label('cost')
    ).filter(
        CreditTransaction.user_id == current_user.id,
        CreditTransaction.type == TransactionType.CONSUMPTION,
        CreditTransaction.created_at >= start_date
    ).group_by(
        cast(CreditTransaction.created_at, Date)
    ).all()
    
    # Create a dictionary for easy lookup
    cost_by_date = {str(row.date): abs(row.cost) for row in daily_cost}
    
    # Format data for chart
    chart_data = []
    for row in daily_data:
        date_str = str(row.date)
        chart_data.append({
            "date": date_str,
            "requests": row.requests or 0,
            "tokens": row.tokens or 0,
            "input_tokens": row.input_tokens or 0,
            "output_tokens": row.output_tokens or 0,
            "cost": cost_by_date.get(date_str, 0.0)
        })
    
    return chart_data


@router.get("/charts/model-usage")
def get_model_usage_chart(
    days: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get model usage distribution for pie/bar charts
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    model_data = db.query(
        UsageLog.model_name,
        func.count(UsageLog.id).label('requests'),
        func.sum(UsageLog.total_tokens).label('tokens')
    ).filter(
        UsageLog.user_id == current_user.id,
        UsageLog.timestamp >= start_date
    ).group_by(
        UsageLog.model_name
    ).order_by(
        func.sum(UsageLog.total_tokens).desc()
    ).limit(10).all()  # Top 10 models
    
    chart_data = []
    for row in model_data:
        # Extract model name (remove @cf/ prefix)
        model_name = row.model_name.replace('@cf/', '').replace('-', ' ').title()
        chart_data.append({
            "name": model_name,
            "requests": row.requests or 0,
            "tokens": row.tokens or 0,
            "value": row.tokens or 0  # for pie chart
        })
    
    return chart_data

