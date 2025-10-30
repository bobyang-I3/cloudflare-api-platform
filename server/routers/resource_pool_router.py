"""
Resource Pool API Routes - Bank-style Resource Sharing System
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from database import get_db
from models import User
from models_resource_pool import (
    PoolResource, PoolDeposit, PoolUsageLog, PoolLedger,
    PoolResourceStatus, PoolDepositStatus
)
from auth import get_current_user_from_token
from credit_service import CreditService
from api_key_validator import APIKeyValidator, ValidationResult


router = APIRouter(prefix="/pool", tags=["Resource Pool"])


# ============= Pydantic Schemas =============

class DepositRequest(BaseModel):
    """用户存入API资源请求"""
    model_id: str = Field(..., description="Model ID (e.g., gpt-3.5-turbo)")
    model_name: str = Field(..., description="Model name for display")
    provider: str = Field(..., description="Provider name (OpenAI, Anthropic, Cloudflare)")
    api_key: str = Field(..., description="API Key to deposit")
    quota_credits: float = Field(..., description="Claimed quota value in Credits")
    base_url: Optional[str] = Field(None, description="Optional custom API endpoint")


class DepositResponse(BaseModel):
    """存款响应"""
    deposit_id: str
    estimated_value: float  # Credits
    fee_rate: float
    fee_amount: float  # Credits
    credits_to_receive: float  # Credits
    status: str
    message: str

    class Config:
        from_attributes = True


class PoolResourceInfo(BaseModel):
    """资源池资源信息"""
    id: str
    owner_id: str
    provider: str
    model_family: Optional[str]
    original_quota: float
    current_quota: float
    quota_unit: str
    status: str
    total_requests: int
    successful_requests: int
    success_rate: float
    created_at: datetime

    class Config:
        from_attributes = True


class PoolStatsResponse(BaseModel):
    """资源池统计"""
    total_resources: int
    active_resources: int
    total_value: float  # Credits
    user_contributed: float  # Credits
    platform_owned: float  # Credits
    total_requests: int
    total_contributors: int


class MyContributionResponse(BaseModel):
    """我的贡献统计"""
    total_deposited: float  # Credits
    total_consumed: float  # Credits
    remaining_value: float  # Credits
    resources_count: int
    deposits_count: int


# ============= API Routes =============

@router.get("/stats", response_model=PoolStatsResponse)
async def get_pool_stats(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """获取资源池统计信息"""
    
    total_resources = db.query(PoolResource).count()
    active_resources = db.query(PoolResource).filter(
        PoolResource.status == PoolResourceStatus.ACTIVE
    ).count()
    
    # Calculate total value (sum of current quota)
    total_value_query = db.query(func.sum(PoolResource.current_quota)).filter(
        PoolResource.status == PoolResourceStatus.ACTIVE
    ).scalar()
    total_value = total_value_query or 0.0
    
    # User vs Platform contributions
    user_contrib = db.query(func.sum(PoolResource.current_quota)).filter(
        PoolResource.owner_type == "user",
        PoolResource.status == PoolResourceStatus.ACTIVE
    ).scalar() or 0.0
    
    platform_owned = db.query(func.sum(PoolResource.current_quota)).filter(
        PoolResource.owner_type == "platform",
        PoolResource.status == PoolResourceStatus.ACTIVE
    ).scalar() or 0.0
    
    # Total requests
    total_requests = db.query(func.sum(PoolResource.total_requests)).scalar() or 0
    
    # Total contributors
    total_contributors = db.query(func.count(func.distinct(PoolResource.owner_id))).filter(
        PoolResource.owner_type == "user"
    ).scalar()
    
    return PoolStatsResponse(
        total_resources=total_resources,
        active_resources=active_resources,
        total_value=total_value,
        user_contributed=user_contrib,
        platform_owned=platform_owned,
        total_requests=total_requests,
        total_contributors=total_contributors
    )


@router.post("/deposit", response_model=DepositResponse)
async def deposit_resource(
    data: DepositRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    用户存入API资源到资源池（带验证）
    
    流程：
    1. **验证API Key真实性** - 实际调用API测试
    2. 估算资源价值（Credits）
    3. **初始只给 10% Credits**（防欺诈）
    4. 扣除手续费（10%）
    5. 给用户增加Credits
    6. 将API Key加密存储到资源池
    7. 剩余 90% 在资源成功使用后逐步释放
    """
    
    # ===== STEP 1: Validate API Key =====
    print(f"🔐 Validating API key for {data.provider}...")
    validation_result, estimated_quota, error_msg = await APIKeyValidator.validate_key(
        provider=data.provider,
        api_key=data.api_key,
        model_id=data.model_id,
        base_url=data.base_url
    )
    
    # Check validation result
    if validation_result != ValidationResult.VALID:
        raise HTTPException(
            status_code=400,
            detail=f"API key validation failed: {validation_result.value}. {error_msg or ''}"
        )
    
    print(f"✅ API key validated successfully")
    if estimated_quota:
        print(f"   Estimated quota: {estimated_quota} Credits")
    
    # ===== STEP 2: Calculate Initial Credits =====
    # Use trust-based system: give 10% initially, 90% released later
    initial_credits, explanation = APIKeyValidator.calculate_initial_credit(
        claimed_quota=data.quota_credits,
        validation_result=validation_result,
        estimated_quota=estimated_quota
    )
    
    # Determine actual quota to use (lower of claimed vs estimated)
    actual_quota = min(data.quota_credits, estimated_quota) if estimated_quota else data.quota_credits
    
    # Calculate fee (10%)
    fee_rate = 0.10
    fee_amount = actual_quota * fee_rate
    credits_to_receive = initial_credits  # This already includes the 10% initial + fee calculation
    
    try:
        # Create PoolDeposit record
        deposit = PoolDeposit(
            user_id=current_user.id,
            provider=data.provider,
            resource_type="api_key",
            deposited_amount=estimated_credits,
            deposited_unit="credits",
            platform_fee_rate=fee_rate,
            platform_fee=fee_amount,
            credits_received=credits_to_receive,
            credit_conversion_rate=1.0,
            verification_method="auto",
            status=PoolDepositStatus.PENDING
        )
        
        db.add(deposit)
        db.flush()
        
        # Create PoolResource (encrypted storage)
        # TODO: Implement proper encryption
        resource = PoolResource(
            owner_id=current_user.id,
            owner_type="user",
            provider=data.provider,
            resource_type="api_key",
            api_key_encrypted=f"encrypted_{data.api_key}",  # TODO: Real encryption
            api_endpoint=data.api_endpoint,
            original_quota=estimated_credits,
            current_quota=estimated_credits,
            quota_unit="credits",
            status=PoolResourceStatus.ACTIVE,
            priority=0,
            notes=data.notes
        )
        
        db.add(resource)
        db.flush()
        
        # Link deposit to resource
        deposit.resource_id = resource.id
        
        # Add Credits to user account
        credit_service = CreditService(db)
        credit_service.add_credits(
            user_id=current_user.id,
            amount=credits_to_receive,
            description=f"Resource Pool deposit: {data.provider} API Key"
        )
        
        # Approve deposit
        deposit.status = PoolDepositStatus.APPROVED
        deposit.processed_at = datetime.utcnow()
        deposit.verified_at = datetime.utcnow()
        
        db.commit()
        db.refresh(deposit)
        
        return DepositResponse(
            deposit_id=deposit.id,
            estimated_value=estimated_credits,
            fee_rate=fee_rate,
            fee_amount=fee_amount,
            credits_to_receive=credits_to_receive,
            status=deposit.status.value,
            message=f"Successfully deposited {data.provider} API Key. You received {credits_to_receive:.2f} Credits!"
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to deposit resource: {str(e)}")


@router.get("/my-contributions", response_model=MyContributionResponse)
async def get_my_contributions(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """获取我的贡献统计"""
    
    # Total deposited
    total_deposited = db.query(func.sum(PoolDeposit.credits_received)).filter(
        PoolDeposit.user_id == current_user.id,
        PoolDeposit.status == PoolDepositStatus.APPROVED
    ).scalar() or 0.0
    
    # Total consumed (from my resources)
    total_consumed_query = db.query(func.sum(PoolResource.total_consumed)).filter(
        PoolResource.owner_id == current_user.id
    ).scalar()
    total_consumed = total_consumed_query or 0.0
    
    # Remaining value
    remaining_value = db.query(func.sum(PoolResource.current_quota)).filter(
        PoolResource.owner_id == current_user.id,
        PoolResource.status == PoolResourceStatus.ACTIVE
    ).scalar() or 0.0
    
    # Resources count
    resources_count = db.query(PoolResource).filter(
        PoolResource.owner_id == current_user.id
    ).count()
    
    # Deposits count
    deposits_count = db.query(PoolDeposit).filter(
        PoolDeposit.user_id == current_user.id
    ).count()
    
    return MyContributionResponse(
        total_deposited=total_deposited,
        total_consumed=total_consumed,
        remaining_value=remaining_value,
        resources_count=resources_count,
        deposits_count=deposits_count
    )


@router.get("/my-resources", response_model=List[PoolResourceInfo])
async def get_my_resources(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """获取我贡献的资源列表"""
    
    resources = db.query(PoolResource).filter(
        PoolResource.owner_id == current_user.id
    ).order_by(desc(PoolResource.created_at)).all()
    
    return [
        PoolResourceInfo(
            id=r.id,
            owner_id=r.owner_id,
            provider=r.provider,
            model_family=r.model_family,
            original_quota=r.original_quota,
            current_quota=r.current_quota,
            quota_unit=r.quota_unit,
            status=r.status.value,
            total_requests=r.total_requests or 0,
            successful_requests=r.successful_requests or 0,
            success_rate=r.success_rate or 100.0,
            created_at=r.created_at
        )
        for r in resources
    ]


@router.get("/deposits")
async def get_my_deposits(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """获取我的存款记录"""
    
    deposits = db.query(PoolDeposit).filter(
        PoolDeposit.user_id == current_user.id
    ).order_by(desc(PoolDeposit.created_at)).all()
    
    return [
        {
            "id": d.id,
            "provider": d.provider,
            "deposited_amount": d.deposited_amount,
            "platform_fee": d.platform_fee,
            "credits_received": d.credits_received,
            "status": d.status.value,
            "created_at": d.created_at,
            "processed_at": d.processed_at
        }
        for d in deposits
    ]


# ============= Admin Routes =============

@router.get("/admin/resources", response_model=List[PoolResourceInfo])
async def admin_get_all_resources(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Admin: 获取所有资源池资源"""
    
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    resources = db.query(PoolResource).order_by(
        desc(PoolResource.created_at)
    ).all()
    
    return [
        PoolResourceInfo(
            id=r.id,
            owner_id=r.owner_id,
            provider=r.provider,
            model_family=r.model_family,
            original_quota=r.original_quota,
            current_quota=r.current_quota,
            quota_unit=r.quota_unit,
            status=r.status.value,
            total_requests=r.total_requests or 0,
            successful_requests=r.successful_requests or 0,
            success_rate=r.success_rate or 100.0,
            created_at=r.created_at
        )
        for r in resources
    ]


@router.get("/admin/usage-logs")
async def admin_get_usage_logs(
    limit: int = Query(50, le=200),
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Admin: 获取资源使用日志（账本）"""
    
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    logs = db.query(PoolUsageLog).order_by(
        desc(PoolUsageLog.created_at)
    ).limit(limit).all()
    
    result = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        resource_owner = db.query(User).filter(User.id == log.resource_owner_id).first()
        
        result.append({
            "id": log.id,
            "user": user.username if user else "Unknown",
            "resource_owner": resource_owner.username if resource_owner else "Unknown",
            "provider": log.provider,
            "model": log.model,
            "cost_amount": log.cost_amount,
            "credits_charged": log.credits_charged,
            "created_at": log.created_at
        })
    
    return result

