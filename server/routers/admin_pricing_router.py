"""
Admin Pricing Management Router - Manage model pricing and profit margins
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
from models import User
from models_credit import ModelPricing
from auth import get_current_user_from_token
from pricing_engine import PricingEngine, ModelTier

router = APIRouter(prefix="/admin/pricing", tags=["Admin - Pricing"])
pricing_engine = PricingEngine()


class PricingUpdateRequest(BaseModel):
    credits_per_1k_input: Optional[float] = None
    credits_per_1k_output: Optional[float] = None
    custom_multiplier: Optional[float] = None
    is_active: Optional[bool] = None


class PricingResponse(BaseModel):
    id: int
    model_id: str
    model_name: str
    provider: str
    tier: str
    credits_per_1k_input: float
    credits_per_1k_output: float
    is_active: bool
    provider_cost_input: Optional[float] = None  # USD per 1K
    provider_cost_output: Optional[float] = None  # USD per 1K
    profit_margin_input: Optional[float] = None  # Percentage
    profit_margin_output: Optional[float] = None  # Percentage
    
    class Config:
        from_attributes = True


class PricingStatsResponse(BaseModel):
    total_models: int
    active_models: int
    inactive_models: int
    average_profit_margin: float
    total_pricing_records: int


def require_admin(user: User = Depends(get_current_user_from_token)):
    """Dependency to ensure user is admin"""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/stats", response_model=PricingStatsResponse)
async def get_pricing_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    """Get pricing statistics"""
    all_pricing = db.query(ModelPricing).all()
    active_pricing = [p for p in all_pricing if p.is_active]
    
    # Calculate average profit margin (rough estimate)
    margins = []
    for p in all_pricing:
        # Assume base unit cost (this is approximate, in real system should store actual costs)
        estimated_cost_input = p.credits_per_1k_input / 1.5  # Reverse estimate
        estimated_cost_output = p.credits_per_1k_output / 1.5
        if estimated_cost_input > 0:
            margin_input = ((p.credits_per_1k_input - estimated_cost_input) / estimated_cost_input) * 100
            margins.append(margin_input)
        if estimated_cost_output > 0:
            margin_output = ((p.credits_per_1k_output - estimated_cost_output) / estimated_cost_output) * 100
            margins.append(margin_output)
    
    avg_margin = sum(margins) / len(margins) if margins else 0
    
    return PricingStatsResponse(
        total_models=len(all_pricing),
        active_models=len(active_pricing),
        inactive_models=len(all_pricing) - len(active_pricing),
        average_profit_margin=round(avg_margin, 1),
        total_pricing_records=len(all_pricing)
    )


@router.get("/models", response_model=List[PricingResponse])
async def get_all_model_pricing(
    active_only: bool = False,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    """Get all model pricing (admin only)"""
    query = db.query(ModelPricing)
    
    if active_only:
        query = query.filter(ModelPricing.is_active == True)
    
    if search:
        query = query.filter(
            (ModelPricing.model_name.ilike(f"%{search}%")) |
            (ModelPricing.model_id.ilike(f"%{search}%")) |
            (ModelPricing.provider.ilike(f"%{search}%"))
        )
    
    pricing_list = query.order_by(desc(ModelPricing.is_active), ModelPricing.provider, ModelPricing.model_name).all()
    
    # Enhance with profit margin calculations (estimated)
    result = []
    for p in pricing_list:
        # Rough estimate of provider cost (reverse engineering from our pricing)
        estimated_cost_input = p.credits_per_1k_input / 1.5
        estimated_cost_output = p.credits_per_1k_output / 1.5
        
        profit_margin_input = pricing_engine.estimate_profit_margin(p.credits_per_1k_input, estimated_cost_input * 0.01) if estimated_cost_input > 0 else 0
        profit_margin_output = pricing_engine.estimate_profit_margin(p.credits_per_1k_output, estimated_cost_output * 0.01) if estimated_cost_output > 0 else 0
        
        result.append(PricingResponse(
            id=p.id,
            model_id=p.model_id,
            model_name=p.model_name,
            provider=p.provider,
            tier=p.tier,
            credits_per_1k_input=p.credits_per_1k_input,
            credits_per_1k_output=p.credits_per_1k_output,
            is_active=p.is_active,
            provider_cost_input=round(estimated_cost_input, 4),
            provider_cost_output=round(estimated_cost_output, 4),
            profit_margin_input=profit_margin_input,
            profit_margin_output=profit_margin_output
        ))
    
    return result


@router.get("/models/{model_id}", response_model=PricingResponse)
async def get_model_pricing(
    model_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    """Get specific model pricing"""
    pricing = db.query(ModelPricing).filter(ModelPricing.model_id == model_id).first()
    if not pricing:
        raise HTTPException(status_code=404, detail="Model pricing not found")
    
    # Estimate costs and margins
    estimated_cost_input = pricing.credits_per_1k_input / 1.5
    estimated_cost_output = pricing.credits_per_1k_output / 1.5
    
    return PricingResponse(
        id=pricing.id,
        model_id=pricing.model_id,
        model_name=pricing.model_name,
        provider=pricing.provider,
        tier=pricing.tier,
        credits_per_1k_input=pricing.credits_per_1k_input,
        credits_per_1k_output=pricing.credits_per_1k_output,
        is_active=pricing.is_active,
        provider_cost_input=round(estimated_cost_input, 4),
        provider_cost_output=round(estimated_cost_output, 4),
        profit_margin_input=pricing_engine.estimate_profit_margin(pricing.credits_per_1k_input, estimated_cost_input * 0.01),
        profit_margin_output=pricing_engine.estimate_profit_margin(pricing.credits_per_1k_output, estimated_cost_output * 0.01)
    )


@router.patch("/models/{model_id}")
async def update_model_pricing(
    model_id: str,
    update: PricingUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    """Update model pricing (admin only)"""
    pricing = db.query(ModelPricing).filter(ModelPricing.model_id == model_id).first()
    if not pricing:
        raise HTTPException(status_code=404, detail="Model pricing not found")
    
    if update.credits_per_1k_input is not None:
        pricing.credits_per_1k_input = update.credits_per_1k_input
    
    if update.credits_per_1k_output is not None:
        pricing.credits_per_1k_output = update.credits_per_1k_output
    
    if update.is_active is not None:
        pricing.is_active = update.is_active
    
    db.commit()
    
    return {"message": "Pricing updated successfully", "model_id": model_id}


@router.post("/models/{model_id}/recalculate")
async def recalculate_model_pricing(
    model_id: str,
    provider_cost_input: float,  # USD per 1K tokens
    provider_cost_output: float,  # USD per 1K tokens
    tier: Optional[str] = None,
    demand: str = "medium",
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    """
    Recalculate model pricing based on provider costs
    
    Args:
        provider_cost_input: Provider cost in USD per 1K tokens (input)
        provider_cost_output: Provider cost in USD per 1K tokens (output)
        tier: Optional model tier override
        demand: Demand level (high/medium/low)
    """
    pricing = db.query(ModelPricing).filter(ModelPricing.model_id == model_id).first()
    if not pricing:
        raise HTTPException(status_code=404, detail="Model pricing not found")
    
    # Determine tier
    if tier:
        try:
            model_tier = ModelTier(tier)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid tier: {tier}")
    else:
        model_tier = pricing_engine.get_tier_for_model(model_id)
    
    # Calculate new pricing
    pricing_result = pricing_engine.calculate_split_price(
        provider_cost_input, 
        provider_cost_output, 
        model_tier, 
        demand
    )
    
    # Update pricing
    pricing.credits_per_1k_input = pricing_result["input"]
    pricing.credits_per_1k_output = pricing_result["output"]
    
    db.commit()
    
    return {
        "message": "Pricing recalculated successfully",
        "model_id": model_id,
        "provider_cost": {
            "input": provider_cost_input,
            "output": provider_cost_output
        },
        "new_pricing": {
            "input": pricing_result["input"],
            "output": pricing_result["output"]
        },
        "profit_margin": {
            "input": pricing_engine.estimate_profit_margin(pricing_result["input"], provider_cost_input),
            "output": pricing_engine.estimate_profit_margin(pricing_result["output"], provider_cost_output)
        }
    }


@router.post("/batch-recalculate")
async def batch_recalculate_pricing(
    profit_multiplier: float = 1.5,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    """
    Batch recalculate all pricing with a specific profit multiplier
    
    Useful when adjusting overall platform profitability
    """
    all_pricing = db.query(ModelPricing).all()
    updated_count = 0
    
    for pricing in all_pricing:
        # Estimate original provider cost
        estimated_cost_input = pricing.credits_per_1k_input / 1.5
        estimated_cost_output = pricing.credits_per_1k_output / 1.5
        
        # Recalculate with new multiplier
        new_input = round(estimated_cost_input * profit_multiplier, 2)
        new_output = round(estimated_cost_output * profit_multiplier, 2)
        
        pricing.credits_per_1k_input = new_input
        pricing.credits_per_1k_output = new_output
        updated_count += 1
    
    db.commit()
    
    return {
        "message": f"Batch recalculation complete",
        "updated_count": updated_count,
        "profit_multiplier": profit_multiplier
    }

