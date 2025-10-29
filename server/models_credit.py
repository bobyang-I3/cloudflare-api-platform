"""
Extended database models for Credit billing system
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from database import Base


def generate_uuid():
    return str(uuid.uuid4())


class TransactionType(str, enum.Enum):
    """Credit transaction types"""
    DEPOSIT = "deposit"  # 充值
    CONSUMPTION = "consumption"  # 消费
    REFUND = "refund"  # 退款
    BONUS = "bonus"  # 赠送
    ADMIN_ADJUSTMENT = "admin_adjustment"  # 管理员调整


class ModelTier(str, enum.Enum):
    """Model pricing tiers"""
    TINY = "tiny"  # 1B-3B parameters
    SMALL = "small"  # 7B-8B parameters
    MEDIUM = "medium"  # 13B-20B parameters
    LARGE = "large"  # 70B+ parameters


class UserCredit(Base):
    """User credit balance"""
    __tablename__ = "user_credits"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    balance = Column(Float, default=0.0)  # Current credit balance
    total_deposited = Column(Float, default=0.0)  # Total credits deposited (all time)
    total_consumed = Column(Float, default=0.0)  # Total credits consumed (all time)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="credit")
    transactions = relationship("CreditTransaction", back_populates="user_credit", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<UserCredit(user_id='{self.user_id}', balance={self.balance})>"


class CreditTransaction(Base):
    """Credit transaction history"""
    __tablename__ = "credit_transactions"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_credit_id = Column(String, ForeignKey("user_credits.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String, nullable=False)  # deposit, consumption, refund, bonus, admin_adjustment
    amount = Column(Float, nullable=False)  # Positive for deposit/refund/bonus, negative for consumption
    balance_before = Column(Float, nullable=False)  # Balance before transaction
    balance_after = Column(Float, nullable=False)  # Balance after transaction
    description = Column(Text, nullable=True)  # Transaction description
    reference_id = Column(String, nullable=True)  # Reference to usage_log or external payment ID
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user_credit = relationship("UserCredit", back_populates="transactions")
    user = relationship("User")
    
    def __repr__(self):
        return f"<CreditTransaction(user_id='{self.user_id}', type='{self.type}', amount={self.amount})>"


class ModelPricing(Base):
    """Model pricing configuration"""
    __tablename__ = "model_pricing"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    model_id = Column(String, unique=True, nullable=False, index=True)  # e.g., "@cf/meta/llama-3.3-70b-instruct"
    model_name = Column(String, nullable=False)
    provider = Column(String, nullable=False)  # e.g., "Meta", "OpenAI"
    tier = Column(String, nullable=False)  # tiny, small, medium, large
    credits_per_1k_input = Column(Float, nullable=False)  # Credits per 1000 input tokens
    credits_per_1k_output = Column(Float, nullable=False)  # Credits per 1000 output tokens
    vision_surcharge = Column(Float, default=0.0)  # Extra credits for vision models per image
    is_active = Column(Boolean, default=True)  # Whether model is available for use
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<ModelPricing(model_id='{self.model_id}', tier='{self.tier}')>"
    
    def calculate_cost(self, input_tokens: int, output_tokens: int, has_image: bool = False) -> float:
        """Calculate credit cost for a request"""
        input_cost = (input_tokens / 1000.0) * self.credits_per_1k_input
        output_cost = (output_tokens / 1000.0) * self.credits_per_1k_output
        image_cost = self.vision_surcharge if has_image else 0.0
        return round(input_cost + output_cost + image_cost, 4)

