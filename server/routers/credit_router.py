"""
Credit management routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from database import get_db
from models import User
from models_credit import UserCredit, CreditTransaction, ModelPricing
from schemas_credit import (
    CreditBalanceResponse, CreditDepositRequest, CreditTransactionResponse,
    ModelPricingResponse, CreditStatsResponse, CreditTransferRequest, UserSearchResult
)
from auth import get_current_user_from_token, get_current_user_from_api_key
from credit_service import CreditService

router = APIRouter(prefix="/credits", tags=["Credits"])


@router.get("/balance", response_model=CreditBalanceResponse)
def get_my_balance(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Get current user's credit balance"""
    user_credit = CreditService.get_or_create_user_credit(current_user.id, db)
    
    # Return explicit dict to avoid relationship serialization issues
    return {
        "user_id": user_credit.user_id,
        "balance": user_credit.balance,
        "total_deposited": user_credit.total_deposited,
        "total_consumed": user_credit.total_consumed
    }


@router.get("/balance/{user_id}", response_model=CreditBalanceResponse)
def get_user_balance(
    user_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Get specific user's credit balance (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user_credit = CreditService.get_or_create_user_credit(user_id, db)
    
    # Return explicit dict to avoid relationship serialization issues
    return {
        "user_id": user_credit.user_id,
        "balance": user_credit.balance,
        "total_deposited": user_credit.total_deposited,
        "total_consumed": user_credit.total_consumed
    }


@router.post("/deposit", response_model=CreditTransactionResponse)
def deposit_credits(
    request: CreditDepositRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Deposit credits to user account (admin only)
    Admins can deposit credits to any user's account
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Verify user exists
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Deposit credits
    transaction = CreditService.deposit(
        user_id=request.user_id,
        amount=request.amount,
        description=request.description or f"Admin deposit by {current_user.username}",
        db=db
    )
    
    return transaction


@router.get("/transactions", response_model=List[CreditTransactionResponse])
def get_my_transactions(
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Get current user's credit transaction history"""
    transactions = CreditService.get_transactions(current_user.id, db, limit, offset)
    return transactions


@router.get("/transactions/{user_id}", response_model=List[CreditTransactionResponse])
def get_user_transactions(
    user_id: str,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Get specific user's credit transaction history (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    transactions = CreditService.get_transactions(user_id, db, limit, offset)
    return transactions


@router.get("/pricing", response_model=List[ModelPricingResponse])
def get_model_pricing(
    db: Session = Depends(get_db)
):
    """Get pricing for all models"""
    pricing = db.query(ModelPricing).filter(ModelPricing.is_active == True).all()
    return pricing


@router.get("/pricing/{model_id}", response_model=ModelPricingResponse)
def get_single_model_pricing(
    model_id: str,
    db: Session = Depends(get_db)
):
    """Get pricing for a specific model"""
    pricing = CreditService.get_model_pricing(model_id, db)
    if not pricing:
        raise HTTPException(status_code=404, detail=f"Pricing not found for model: {model_id}")
    return pricing


@router.get("/stats", response_model=CreditStatsResponse)
def get_credit_stats(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Get platform-wide credit statistics (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get statistics
    total_users = db.query(func.count(UserCredit.id)).scalar()
    total_balance = db.query(func.sum(UserCredit.balance)).scalar() or 0.0
    total_deposited = db.query(func.sum(UserCredit.total_deposited)).scalar() or 0.0
    total_consumed = db.query(func.sum(UserCredit.total_consumed)).scalar() or 0.0
    total_transactions = db.query(func.count(CreditTransaction.id)).scalar()
    
    return CreditStatsResponse(
        total_users_with_credits=total_users,
        total_credits_in_circulation=round(total_balance, 2),
        total_deposited_all_time=round(total_deposited, 2),
        total_consumed_all_time=round(total_consumed, 2),
        total_transactions=total_transactions
    )


@router.post("/transfer", response_model=List[CreditTransactionResponse])
def transfer_credits(
    request: CreditTransferRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Transfer credits to another user"""
    # Find recipient by username
    recipient = db.query(User).filter(User.username == request.to_username).first()
    if not recipient:
        raise HTTPException(status_code=404, detail=f"User '{request.to_username}' not found")
    
    # Transfer credits
    sender_tx, receiver_tx = CreditService.transfer(
        from_user_id=current_user.id,
        to_user_id=recipient.id,
        amount=request.amount,
        description=request.description,
        db=db
    )
    
    return [sender_tx, receiver_tx]


@router.get("/search-users", response_model=List[UserSearchResult])
def search_users(
    query: str,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Search users by username or email (for transfer)"""
    if len(query) < 2:
        return []
    
    users = db.query(User).filter(
        (User.username.contains(query)) | (User.email.contains(query)),
        User.id != current_user.id,  # Exclude self
        User.is_active == True
    ).limit(10).all()
    
    return users

