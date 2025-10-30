"""
Database models for API Resource Marketplace
"""
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid
import enum


class ResourceStatus(str, enum.Enum):
    """资源状态"""
    ACTIVE = "active"           # 上架中
    PAUSED = "paused"          # 暂停
    OUT_OF_STOCK = "out_of_stock"  # 缺货
    DELETED = "deleted"        # 已删除


class TransactionStatus(str, enum.Enum):
    """交易状态"""
    PENDING = "pending"        # 待处理
    COMPLETED = "completed"    # 已完成
    FAILED = "failed"          # 失败
    REFUNDED = "refunded"      # 已退款


class ResourceListing(Base):
    """资源列表 - 卖家上架的API资源"""
    __tablename__ = "resource_listings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)  # 卖家ID
    
    # 资源信息
    model_id = Column(String, nullable=False)  # 模型ID，如 "@cf/meta/llama-3.1-8b-instruct"
    model_name = Column(String, nullable=False)  # 模型名称，如 "Llama 3.1 8B"
    provider = Column(String, nullable=False)  # 提供商，如 "Meta", "OpenAI"
    
    # 定价信息
    price_per_1m_tokens = Column(Float, nullable=False)  # 每百万tokens价格
    official_price = Column(Float)  # 官方价格（用于对比）
    discount_percentage = Column(Float)  # 折扣百分比
    
    # 库存信息
    total_quota = Column(Float, nullable=False)  # 总配额（美元）
    available_quota = Column(Float, nullable=False)  # 剩余配额
    min_purchase = Column(Float, default=1.0)  # 最小购买量（美元）
    
    # 描述和说明
    title = Column(String, nullable=False)  # 标题
    description = Column(Text)  # 描述
    
    # API密钥（加密存储）
    api_key_encrypted = Column(Text)  # 加密的API Key
    api_endpoint = Column(String)  # API端点
    
    # 状态和统计
    status = Column(SQLEnum(ResourceStatus), default=ResourceStatus.ACTIVE)
    total_sales = Column(Float, default=0.0)  # 总销售额
    total_orders = Column(Integer, default=0)  # 总订单数
    success_rate = Column(Float, default=100.0)  # 成功率
    avg_response_time = Column(Float)  # 平均响应时间（毫秒）
    rating = Column(Float, default=5.0)  # 平均评分
    review_count = Column(Integer, default=0)  # 评价数量
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    seller = relationship("User", foreign_keys=[user_id])
    transactions = relationship("ResourceTransaction", back_populates="listing")
    reviews = relationship("ResourceReview", back_populates="listing")


class ResourceTransaction(Base):
    """资源交易记录"""
    __tablename__ = "resource_transactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 交易双方
    buyer_id = Column(String, ForeignKey("users.id"), nullable=False)
    seller_id = Column(String, ForeignKey("users.id"), nullable=False)
    listing_id = Column(String, ForeignKey("resource_listings.id"), nullable=False)
    
    # 交易信息
    amount = Column(Float, nullable=False)  # 交易金额（美元）
    tokens_purchased = Column(Integer)  # 购买的tokens数量
    price_per_1m_tokens = Column(Float, nullable=False)  # 成交价格
    
    # 费用明细
    seller_revenue = Column(Float, nullable=False)  # 卖家收入（85%）
    platform_fee = Column(Float, nullable=False)  # 平台抽成（10%）
    reserve_fund = Column(Float, nullable=False)  # 风险准备金（5%）
    
    # 使用情况
    tokens_used = Column(Integer, default=0)  # 已使用的tokens
    tokens_remaining = Column(Integer)  # 剩余tokens
    
    # 状态
    status = Column(SQLEnum(TransactionStatus), default=TransactionStatus.PENDING)
    payment_method = Column(String, default="credit")  # 支付方式
    
    # 时间
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    
    # 关系
    buyer = relationship("User", foreign_keys=[buyer_id])
    seller = relationship("User", foreign_keys=[seller_id])
    listing = relationship("ResourceListing", back_populates="transactions")
    review = relationship("ResourceReview", back_populates="transaction", uselist=False)


class ResourceReview(Base):
    """资源评价"""
    __tablename__ = "resource_reviews"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    transaction_id = Column(String, ForeignKey("resource_transactions.id"), nullable=False, unique=True)
    buyer_id = Column(String, ForeignKey("users.id"), nullable=False)
    listing_id = Column(String, ForeignKey("resource_listings.id"), nullable=False)
    
    # 评价内容
    rating = Column(Float, nullable=False)  # 1-5星
    speed_rating = Column(Float)  # 速度评分
    reliability_rating = Column(Float)  # 可靠性评分
    value_rating = Column(Float)  # 性价比评分
    comment = Column(Text)  # 评论
    
    # 状态
    is_verified = Column(Boolean, default=True)  # 是否已验证（真实交易）
    helpful_count = Column(Integer, default=0)  # 有帮助数
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关系
    transaction = relationship("ResourceTransaction", back_populates="review")
    buyer = relationship("User", foreign_keys=[buyer_id])
    listing = relationship("ResourceListing", back_populates="reviews")


class APIKeyVault(Base):
    """API密钥保管库（加密存储）"""
    __tablename__ = "api_key_vault"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # 提供商信息
    provider = Column(String, nullable=False)  # OpenAI, Anthropic, Cloudflare等
    provider_name = Column(String)  # 显示名称
    
    # API密钥（加密）
    api_key_encrypted = Column(Text, nullable=False)  # 加密存储
    api_endpoint = Column(String)  # API端点
    
    # 配额信息
    total_quota = Column(Float)  # 总配额（美元）
    used_quota = Column(Float, default=0.0)  # 已使用配额
    remaining_quota = Column(Float)  # 剩余配额
    
    # 验证状态
    is_verified = Column(Boolean, default=False)  # 是否已验证
    last_verified_at = Column(DateTime(timezone=True))  # 最后验证时间
    verification_error = Column(Text)  # 验证错误信息
    
    # 使用统计
    total_requests = Column(Integer, default=0)  # 总请求数
    failed_requests = Column(Integer, default=0)  # 失败请求数
    avg_response_time = Column(Float)  # 平均响应时间
    
    # 状态
    is_active = Column(Boolean, default=True)
    notes = Column(Text)  # 备注
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    user = relationship("User", foreign_keys=[user_id])

