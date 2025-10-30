"""
Marketplace API Routes - Resource Trading Platform
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from database import get_db
from models import User
from models_marketplace import (
    ResourceListing, ResourceTransaction, ResourceReview, APIKeyVault,
    ResourceStatus, TransactionStatus
)
from auth import get_current_user
from credit_service import CreditService


router = APIRouter(prefix="/marketplace", tags=["Marketplace"])


# ============= Pydantic Schemas =============

class ListingCreate(BaseModel):
    """创建资源列表"""
    model_id: str
    model_name: str
    provider: str
    price_per_1m_tokens: float
    official_price: Optional[float] = None
    total_quota: float
    min_purchase: float = 1.0
    title: str
    description: Optional[str] = None
    api_key_encrypted: Optional[str] = None  # 临时方案，后续需要加密


class ListingUpdate(BaseModel):
    """更新资源列表"""
    price_per_1m_tokens: Optional[float] = None
    available_quota: Optional[float] = None
    min_purchase: Optional[float] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class ListingResponse(BaseModel):
    """资源列表响应"""
    id: str
    user_id: str
    seller_username: str
    model_id: str
    model_name: str
    provider: str
    price_per_1m_tokens: float
    official_price: Optional[float]
    discount_percentage: Optional[float]
    total_quota: float
    available_quota: float
    min_purchase: float
    title: str
    description: Optional[str]
    status: str
    total_sales: float
    total_orders: int
    success_rate: float
    rating: float
    review_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class PurchaseRequest(BaseModel):
    """购买请求"""
    listing_id: str
    amount: float = Field(..., gt=0, description="购买金额（美元）")


class ReviewCreate(BaseModel):
    """创建评价"""
    transaction_id: str
    rating: float = Field(..., ge=1, le=5)
    speed_rating: Optional[float] = Field(None, ge=1, le=5)
    reliability_rating: Optional[float] = Field(None, ge=1, le=5)
    value_rating: Optional[float] = Field(None, ge=1, le=5)
    comment: Optional[str] = None


class MarketplaceStats(BaseModel):
    """市场统计"""
    total_listings: int
    total_sellers: int
    total_transactions: int
    total_volume: float  # 总交易额
    avg_discount: float  # 平均折扣
    active_models: int


# ============= API Routes =============

@router.get("/stats", response_model=MarketplaceStats)
async def get_marketplace_stats(db: Session = Depends(get_db)):
    """获取市场统计数据"""
    
    total_listings = db.query(ResourceListing).filter(
        ResourceListing.status == ResourceStatus.ACTIVE
    ).count()
    
    total_sellers = db.query(func.count(func.distinct(ResourceListing.user_id))).scalar()
    
    total_transactions = db.query(ResourceTransaction).filter(
        ResourceTransaction.status == TransactionStatus.COMPLETED
    ).count()
    
    total_volume = db.query(func.sum(ResourceTransaction.amount)).filter(
        ResourceTransaction.status == TransactionStatus.COMPLETED
    ).scalar() or 0.0
    
    avg_discount = db.query(func.avg(ResourceListing.discount_percentage)).filter(
        ResourceListing.status == ResourceStatus.ACTIVE,
        ResourceListing.discount_percentage.isnot(None)
    ).scalar() or 0.0
    
    active_models = db.query(func.count(func.distinct(ResourceListing.model_id))).filter(
        ResourceListing.status == ResourceStatus.ACTIVE
    ).scalar()
    
    return MarketplaceStats(
        total_listings=total_listings,
        total_sellers=total_sellers,
        total_transactions=total_transactions,
        total_volume=total_volume,
        avg_discount=avg_discount,
        active_models=active_models
    )


@router.get("/listings", response_model=List[ListingResponse])
async def get_listings(
    model_id: Optional[str] = None,
    provider: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_rating: Optional[float] = None,
    sort_by: str = Query("price_asc", regex="^(price_asc|price_desc|rating|sales|newest)$"),
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    获取资源列表（市场大厅）
    
    - model_id: 按模型ID筛选
    - provider: 按提供商筛选
    - min_price/max_price: 价格范围
    - min_rating: 最低评分
    - sort_by: 排序方式 (price_asc, price_desc, rating, sales, newest)
    """
    
    query = db.query(ResourceListing).filter(
        ResourceListing.status == ResourceStatus.ACTIVE,
        ResourceListing.available_quota > 0
    )
    
    # 筛选条件
    if model_id:
        query = query.filter(ResourceListing.model_id == model_id)
    if provider:
        query = query.filter(ResourceListing.provider == provider)
    if min_price is not None:
        query = query.filter(ResourceListing.price_per_1m_tokens >= min_price)
    if max_price is not None:
        query = query.filter(ResourceListing.price_per_1m_tokens <= max_price)
    if min_rating is not None:
        query = query.filter(ResourceListing.rating >= min_rating)
    
    # 排序
    if sort_by == "price_asc":
        query = query.order_by(ResourceListing.price_per_1m_tokens.asc())
    elif sort_by == "price_desc":
        query = query.order_by(ResourceListing.price_per_1m_tokens.desc())
    elif sort_by == "rating":
        query = query.order_by(desc(ResourceListing.rating))
    elif sort_by == "sales":
        query = query.order_by(desc(ResourceListing.total_sales))
    elif sort_by == "newest":
        query = query.order_by(desc(ResourceListing.created_at))
    
    listings = query.offset(offset).limit(limit).all()
    
    # 添加卖家用户名
    result = []
    for listing in listings:
        seller = db.query(User).filter(User.id == listing.user_id).first()
        listing_dict = {
            **listing.__dict__,
            "seller_username": seller.username if seller else "Unknown"
        }
        result.append(ListingResponse(**listing_dict))
    
    return result


@router.get("/my-listings", response_model=List[ListingResponse])
async def get_my_listings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取我的资源列表"""
    
    listings = db.query(ResourceListing).filter(
        ResourceListing.user_id == current_user.id,
        ResourceListing.status != ResourceStatus.DELETED
    ).order_by(desc(ResourceListing.created_at)).all()
    
    result = []
    for listing in listings:
        listing_dict = {
            **listing.__dict__,
            "seller_username": current_user.username
        }
        result.append(ListingResponse(**listing_dict))
    
    return result


@router.post("/listings", response_model=ListingResponse)
async def create_listing(
    data: ListingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建资源列表（上架资源）"""
    
    # 计算折扣
    discount_percentage = None
    if data.official_price and data.official_price > 0:
        discount_percentage = ((data.official_price - data.price_per_1m_tokens) / data.official_price) * 100
    
    listing = ResourceListing(
        user_id=current_user.id,
        model_id=data.model_id,
        model_name=data.model_name,
        provider=data.provider,
        price_per_1m_tokens=data.price_per_1m_tokens,
        official_price=data.official_price,
        discount_percentage=discount_percentage,
        total_quota=data.total_quota,
        available_quota=data.total_quota,
        min_purchase=data.min_purchase,
        title=data.title,
        description=data.description,
        api_key_encrypted=data.api_key_encrypted,
        status=ResourceStatus.ACTIVE
    )
    
    db.add(listing)
    db.commit()
    db.refresh(listing)
    
    listing_dict = {
        **listing.__dict__,
        "seller_username": current_user.username
    }
    
    return ListingResponse(**listing_dict)


@router.patch("/listings/{listing_id}", response_model=ListingResponse)
async def update_listing(
    listing_id: str,
    data: ListingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新资源列表"""
    
    listing = db.query(ResourceListing).filter(
        ResourceListing.id == listing_id,
        ResourceListing.user_id == current_user.id
    ).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # 更新字段
    if data.price_per_1m_tokens is not None:
        listing.price_per_1m_tokens = data.price_per_1m_tokens
        # 重新计算折扣
        if listing.official_price and listing.official_price > 0:
            listing.discount_percentage = ((listing.official_price - data.price_per_1m_tokens) / listing.official_price) * 100
    
    if data.available_quota is not None:
        listing.available_quota = data.available_quota
    if data.min_purchase is not None:
        listing.min_purchase = data.min_purchase
    if data.title is not None:
        listing.title = data.title
    if data.description is not None:
        listing.description = data.description
    if data.status is not None:
        listing.status = ResourceStatus(data.status)
    
    listing.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(listing)
    
    listing_dict = {
        **listing.__dict__,
        "seller_username": current_user.username
    }
    
    return ListingResponse(**listing_dict)


@router.delete("/listings/{listing_id}")
async def delete_listing(
    listing_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除资源列表（下架）"""
    
    listing = db.query(ResourceListing).filter(
        ResourceListing.id == listing_id,
        ResourceListing.user_id == current_user.id
    ).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    listing.status = ResourceStatus.DELETED
    db.commit()
    
    return {"message": "Listing deleted successfully"}


@router.post("/purchase")
async def purchase_resource(
    data: PurchaseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """购买资源"""
    
    # 获取资源列表
    listing = db.query(ResourceListing).filter(
        ResourceListing.id == data.listing_id,
        ResourceListing.status == ResourceStatus.ACTIVE
    ).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found or not available")
    
    # 检查库存
    if listing.available_quota < data.amount:
        raise HTTPException(status_code=400, detail="Insufficient quota available")
    
    # 检查最小购买量
    if data.amount < listing.min_purchase:
        raise HTTPException(status_code=400, detail=f"Minimum purchase is ${listing.min_purchase}")
    
    # 不能购买自己的资源
    if listing.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot purchase your own resource")
    
    # 计算费用
    total_cost = data.amount
    seller_revenue = total_cost * 0.85  # 卖家85%
    platform_fee = total_cost * 0.10    # 平台10%
    reserve_fund = total_cost * 0.05    # 准备金5%
    
    # 计算购买的tokens数量
    tokens_purchased = int((data.amount / listing.price_per_1m_tokens) * 1_000_000)
    
    # 检查买家余额
    credit_service = CreditService(db)
    buyer_balance = credit_service.get_balance(current_user.id)
    
    if buyer_balance < total_cost:
        raise HTTPException(status_code=400, detail="Insufficient credit balance")
    
    try:
        # 扣除买家Credit
        credit_service.deduct_credits(
            user_id=current_user.id,
            amount=total_cost,
            description=f"Purchase resource: {listing.title}"
        )
        
        # 增加卖家Credit
        credit_service.add_credits(
            user_id=listing.user_id,
            amount=seller_revenue,
            description=f"Sale revenue: {listing.title}"
        )
        
        # 平台收入（添加到平台账户或记录）
        # TODO: 创建平台账户来接收platform_fee和reserve_fund
        
        # 更新listing库存
        listing.available_quota -= data.amount
        listing.total_sales += total_cost
        listing.total_orders += 1
        
        if listing.available_quota <= 0:
            listing.status = ResourceStatus.OUT_OF_STOCK
        
        # 创建交易记录
        transaction = ResourceTransaction(
            buyer_id=current_user.id,
            seller_id=listing.user_id,
            listing_id=listing.id,
            amount=total_cost,
            tokens_purchased=tokens_purchased,
            price_per_1m_tokens=listing.price_per_1m_tokens,
            seller_revenue=seller_revenue,
            platform_fee=platform_fee,
            reserve_fund=reserve_fund,
            tokens_used=0,
            tokens_remaining=tokens_purchased,
            status=TransactionStatus.COMPLETED,
            completed_at=datetime.utcnow()
        )
        
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        
        return {
            "message": "Purchase successful",
            "transaction_id": transaction.id,
            "tokens_purchased": tokens_purchased,
            "amount_paid": total_cost,
            "seller_revenue": seller_revenue
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Transaction failed: {str(e)}")


@router.get("/transactions")
async def get_my_transactions(
    transaction_type: str = Query("all", regex="^(all|purchases|sales)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取我的交易记录"""
    
    if transaction_type == "purchases":
        transactions = db.query(ResourceTransaction).filter(
            ResourceTransaction.buyer_id == current_user.id
        ).order_by(desc(ResourceTransaction.created_at)).all()
    elif transaction_type == "sales":
        transactions = db.query(ResourceTransaction).filter(
            ResourceTransaction.seller_id == current_user.id
        ).order_by(desc(ResourceTransaction.created_at)).all()
    else:  # all
        transactions = db.query(ResourceTransaction).filter(
            or_(
                ResourceTransaction.buyer_id == current_user.id,
                ResourceTransaction.seller_id == current_user.id
            )
        ).order_by(desc(ResourceTransaction.created_at)).all()
    
    # 添加额外信息
    result = []
    for txn in transactions:
        listing = db.query(ResourceListing).filter(ResourceListing.id == txn.listing_id).first()
        buyer = db.query(User).filter(User.id == txn.buyer_id).first()
        seller = db.query(User).filter(User.id == txn.seller_id).first()
        
        result.append({
            "id": txn.id,
            "type": "purchase" if txn.buyer_id == current_user.id else "sale",
            "listing_title": listing.title if listing else "Unknown",
            "model_name": listing.model_name if listing else "Unknown",
            "buyer_username": buyer.username if buyer else "Unknown",
            "seller_username": seller.username if seller else "Unknown",
            "amount": txn.amount,
            "tokens_purchased": txn.tokens_purchased,
            "tokens_used": txn.tokens_used,
            "tokens_remaining": txn.tokens_remaining,
            "status": txn.status.value,
            "created_at": txn.created_at,
            "seller_revenue": txn.seller_revenue if txn.seller_id == current_user.id else None
        })
    
    return result


@router.post("/reviews")
async def create_review(
    data: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建评价"""
    
    # 检查交易是否存在且属于当前用户
    transaction = db.query(ResourceTransaction).filter(
        ResourceTransaction.id == data.transaction_id,
        ResourceTransaction.buyer_id == current_user.id,
        ResourceTransaction.status == TransactionStatus.COMPLETED
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found or not eligible for review")
    
    # 检查是否已评价
    existing_review = db.query(ResourceReview).filter(
        ResourceReview.transaction_id == data.transaction_id
    ).first()
    
    if existing_review:
        raise HTTPException(status_code=400, detail="Already reviewed this transaction")
    
    # 创建评价
    review = ResourceReview(
        transaction_id=data.transaction_id,
        buyer_id=current_user.id,
        listing_id=transaction.listing_id,
        rating=data.rating,
        speed_rating=data.speed_rating,
        reliability_rating=data.reliability_rating,
        value_rating=data.value_rating,
        comment=data.comment,
        is_verified=True
    )
    
    db.add(review)
    
    # 更新listing的评分
    listing = db.query(ResourceListing).filter(
        ResourceListing.id == transaction.listing_id
    ).first()
    
    if listing:
        # 重新计算平均评分
        all_reviews = db.query(ResourceReview).filter(
            ResourceReview.listing_id == listing.id
        ).all()
        
        total_rating = sum(r.rating for r in all_reviews) + data.rating
        listing.review_count = len(all_reviews) + 1
        listing.rating = total_rating / listing.review_count
    
    db.commit()
    db.refresh(review)
    
    return {"message": "Review created successfully", "review_id": review.id}


@router.get("/reviews/{listing_id}")
async def get_listing_reviews(
    listing_id: str,
    limit: int = Query(20, le=100),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """获取资源的评价列表"""
    
    reviews = db.query(ResourceReview).filter(
        ResourceReview.listing_id == listing_id
    ).order_by(desc(ResourceReview.created_at)).offset(offset).limit(limit).all()
    
    result = []
    for review in reviews:
        buyer = db.query(User).filter(User.id == review.buyer_id).first()
        result.append({
            "id": review.id,
            "buyer_username": buyer.username if buyer else "Anonymous",
            "rating": review.rating,
            "speed_rating": review.speed_rating,
            "reliability_rating": review.reliability_rating,
            "value_rating": review.value_rating,
            "comment": review.comment,
            "helpful_count": review.helpful_count,
            "created_at": review.created_at
        })
    
    return result

