"""
Pydantic schemas for Credit system
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CreditBalanceResponse(BaseModel):
    """User credit balance"""
    user_id: str
    balance: float
    total_deposited: float
    total_consumed: float
    
    class Config:
        from_attributes = True


class CreditDepositRequest(BaseModel):
    """Request to deposit credits"""
    user_id: str = Field(..., description="User ID to deposit credits to")
    amount: float = Field(..., gt=0, description="Amount of credits to deposit (must be positive)")
    description: Optional[str] = Field(None, description="Optional description for the transaction")


class CreditTransactionResponse(BaseModel):
    """Credit transaction record"""
    id: str
    user_id: str
    type: str
    amount: float
    balance_before: float
    balance_after: float
    description: Optional[str]
    reference_id: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class ModelPricingResponse(BaseModel):
    """Model pricing information"""
    id: str
    model_id: str
    model_name: str
    provider: str
    tier: str
    credits_per_1k_input: float
    credits_per_1k_output: float
    vision_surcharge: float
    is_active: bool
    
    class Config:
        from_attributes = True


class CreditStatsResponse(BaseModel):
    """Platform-wide credit statistics"""
    total_users_with_credits: int
    total_credits_in_circulation: float
    total_deposited_all_time: float
    total_consumed_all_time: float
    total_transactions: int

