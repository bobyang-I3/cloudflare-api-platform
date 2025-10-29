"""
Credit management service
Handles credit transactions, balance checks, and billing
"""
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
from datetime import datetime, timedelta
from models import User
from models_credit import UserCredit, CreditTransaction, ModelPricing, TransactionType
from fastapi import HTTPException


class CreditService:
    """Service for managing user credits and transactions"""
    
    @staticmethod
    def get_or_create_user_credit(user_id: str, db: Session) -> UserCredit:
        """Get user credit account or create if doesn't exist"""
        user_credit = db.query(UserCredit).filter(UserCredit.user_id == user_id).first()
        if not user_credit:
            user_credit = UserCredit(user_id=user_id, balance=0.0)
            db.add(user_credit)
            db.commit()
            db.refresh(user_credit)
        return user_credit
    
    @staticmethod
    def get_balance(user_id: str, db: Session) -> float:
        """Get user's current credit balance"""
        user_credit = CreditService.get_or_create_user_credit(user_id, db)
        return user_credit.balance
    
    @staticmethod
    def check_sufficient_balance(user_id: str, required_credits: float, db: Session) -> bool:
        """Check if user has sufficient credits"""
        balance = CreditService.get_balance(user_id, db)
        return balance >= required_credits
    
    @staticmethod
    def add_transaction(
        user_id: str,
        type: TransactionType,
        amount: float,
        description: str,
        reference_id: Optional[str],
        db: Session
    ) -> CreditTransaction:
        """
        Add a credit transaction and update balance
        
        Args:
            user_id: User ID
            type: Transaction type (deposit, consumption, refund, bonus, admin_adjustment)
            amount: Amount (positive for deposit/refund/bonus, negative for consumption)
            description: Transaction description
            reference_id: Reference to usage_log or payment ID
            db: Database session
        
        Returns:
            Created transaction record
        """
        user_credit = CreditService.get_or_create_user_credit(user_id, db)
        
        balance_before = user_credit.balance
        balance_after = balance_before + amount
        
        # Prevent negative balance (except for admin adjustments)
        if balance_after < 0 and type != TransactionType.ADMIN_ADJUSTMENT:
            raise HTTPException(
                status_code=402,  # Payment Required
                detail=f"Insufficient credits. Balance: {balance_before}, Required: {abs(amount)}"
            )
        
        # Create transaction record
        transaction = CreditTransaction(
            user_credit_id=user_credit.id,
            user_id=user_id,
            type=type.value,
            amount=amount,
            balance_before=balance_before,
            balance_after=balance_after,
            description=description,
            reference_id=reference_id
        )
        db.add(transaction)
        
        # Update user credit balance and totals
        user_credit.balance = balance_after
        if amount > 0:
            if type in [TransactionType.DEPOSIT, TransactionType.BONUS]:
                user_credit.total_deposited += amount
        else:
            if type == TransactionType.CONSUMPTION:
                user_credit.total_consumed += abs(amount)
        
        db.commit()
        db.refresh(transaction)
        db.refresh(user_credit)
        
        return transaction
    
    @staticmethod
    def deposit(user_id: str, amount: float, description: str, db: Session) -> CreditTransaction:
        """Deposit credits to user account"""
        if amount <= 0:
            raise ValueError("Deposit amount must be positive")
        
        return CreditService.add_transaction(
            user_id=user_id,
            type=TransactionType.DEPOSIT,
            amount=amount,
            description=description or f"Deposit {amount} credits",
            reference_id=None,
            db=db
        )
    
    @staticmethod
    def consume(
        user_id: str,
        amount: float,
        description: str,
        reference_id: Optional[str],
        db: Session
    ) -> CreditTransaction:
        """Consume credits from user account"""
        if amount <= 0:
            raise ValueError("Consumption amount must be positive")
        
        # Check balance before consuming
        if not CreditService.check_sufficient_balance(user_id, amount, db):
            balance = CreditService.get_balance(user_id, db)
            raise HTTPException(
                status_code=402,
                detail=f"Insufficient credits. Balance: {balance:.4f}, Required: {amount:.4f}"
            )
        
        return CreditService.add_transaction(
            user_id=user_id,
            type=TransactionType.CONSUMPTION,
            amount=-amount,  # Negative for consumption
            description=description or f"Consumed {amount} credits",
            reference_id=reference_id,
            db=db
        )
    
    @staticmethod
    def refund(user_id: str, amount: float, description: str, reference_id: Optional[str], db: Session) -> CreditTransaction:
        """Refund credits to user account"""
        if amount <= 0:
            raise ValueError("Refund amount must be positive")
        
        return CreditService.add_transaction(
            user_id=user_id,
            type=TransactionType.REFUND,
            amount=amount,
            description=description or f"Refund {amount} credits",
            reference_id=reference_id,
            db=db
        )
    
    @staticmethod
    def get_transactions(
        user_id: str,
        db: Session,
        limit: int = 100,
        offset: int = 0
    ) -> List[CreditTransaction]:
        """Get user's transaction history"""
        return db.query(CreditTransaction)\
            .filter(CreditTransaction.user_id == user_id)\
            .order_by(desc(CreditTransaction.created_at))\
            .limit(limit)\
            .offset(offset)\
            .all()
    
    @staticmethod
    def get_model_pricing(model_id: str, db: Session) -> Optional[ModelPricing]:
        """Get pricing for a specific model"""
        return db.query(ModelPricing)\
            .filter(ModelPricing.model_id == model_id, ModelPricing.is_active == True)\
            .first()
    
    @staticmethod
    def calculate_and_charge(
        user_id: str,
        model_id: str,
        input_tokens: int,
        output_tokens: int,
        has_image: bool,
        usage_log_id: str,
        db: Session
    ) -> CreditTransaction:
        """
        Calculate cost based on model pricing and charge user
        
        Args:
            user_id: User ID
            model_id: Model ID
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens
            has_image: Whether request included image
            usage_log_id: Reference to usage log
            db: Database session
            
        Returns:
            Credit transaction record
        """
        # Get model pricing
        pricing = CreditService.get_model_pricing(model_id, db)
        if not pricing:
            raise HTTPException(
                status_code=400,
                detail=f"No pricing found for model: {model_id}"
            )
        
        # Calculate cost
        cost = pricing.calculate_cost(input_tokens, output_tokens, has_image)
        
        # Create description
        description = f"{pricing.model_name}: {input_tokens} in + {output_tokens} out tokens"
        if has_image:
            description += " + image"
        description += f" = {cost:.4f} credits"
        
        # Charge user
        return CreditService.consume(
            user_id=user_id,
            amount=cost,
            description=description,
            reference_id=usage_log_id,
            db=db
        )

