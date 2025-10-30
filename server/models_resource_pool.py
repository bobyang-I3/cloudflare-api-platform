"""
Resource Pool Models - Bank-style Resource Sharing System

This is separate from Marketplace (P2P trading).
Resource Pool is a centralized bank where users deposit API resources
and the platform intelligently routes requests to available resources.
"""
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid
import enum
from datetime import datetime


class PoolResourceStatus(str, enum.Enum):
    """资源池状态"""
    ACTIVE = "active"              # 活跃可用
    DEPLETED = "depleted"          # 已耗尽
    SUSPENDED = "suspended"        # 暂停使用
    EXPIRED = "expired"            # 已过期
    FAILED = "failed"              # 验证失败


class PoolDepositStatus(str, enum.Enum):
    """存款状态"""
    PENDING = "pending"            # 待验证
    APPROVED = "approved"          # 已批准
    REJECTED = "rejected"          # 已拒绝
    REFUNDED = "refunded"          # 已退款


class PoolResource(Base):
    """
    资源池 - 托管的API资源
    
    用户贡献API Key给平台，平台托管并智能分配使用
    """
    __tablename__ = "pool_resources"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 所有者信息
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    owner_type = Column(String, default="user")  # "user" or "platform"
    
    # 资源信息
    provider = Column(String, nullable=False)  # "openai", "anthropic", "cloudflare"等
    model_family = Column(String)  # "gpt-4", "claude-3", "llama-3"等
    resource_type = Column(String, default="api_key")  # "api_key", "quota", "credits"
    
    # API密钥（加密存储）
    api_key_encrypted = Column(Text, nullable=False)
    api_endpoint = Column(String)
    api_config = Column(JSON)  # 额外配置信息
    
    # 配额信息
    original_quota = Column(Float, nullable=False)  # 原始配额（美元或tokens）
    current_quota = Column(Float, nullable=False)  # 当前剩余配额
    quota_unit = Column(String, default="usd")  # "usd", "tokens", "credits"
    
    # 使用统计
    total_requests = Column(Integer, default=0)  # 总请求数
    successful_requests = Column(Integer, default=0)  # 成功请求数
    failed_requests = Column(Integer, default=0)  # 失败请求数
    total_consumed = Column(Float, default=0.0)  # 总消耗量
    
    # 性能指标
    avg_response_time = Column(Float)  # 平均响应时间（ms）
    success_rate = Column(Float, default=100.0)  # 成功率（%）
    last_used_at = Column(DateTime(timezone=True))  # 最后使用时间
    
    # 状态和限制
    status = Column(SQLEnum(PoolResourceStatus), default=PoolResourceStatus.ACTIVE)
    is_available = Column(Boolean, default=True)  # 是否可用
    priority = Column(Integer, default=0)  # 优先级（数字越大越优先）
    max_requests_per_minute = Column(Integer)  # 速率限制
    
    # 有效期
    expires_at = Column(DateTime(timezone=True))  # 过期时间
    
    # 备注
    notes = Column(Text)
    tags = Column(JSON)  # 标签，用于分类和筛选
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    owner = relationship("User", foreign_keys=[owner_id])
    deposits = relationship("PoolDeposit", back_populates="resource")
    usage_logs = relationship("PoolUsageLog", back_populates="resource")


class PoolDeposit(Base):
    """
    资源存款记录
    
    用户向平台贡献API资源的记录
    """
    __tablename__ = "pool_deposits"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 存款人信息
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    resource_id = Column(String, ForeignKey("pool_resources.id"))
    
    # 存款信息
    provider = Column(String, nullable=False)
    model_id = Column(String)  # Model ID (e.g., @cf/meta/llama-3.1-8b-instruct)
    model_name = Column(String)  # Model display name
    resource_type = Column(String, default="api_key")
    deposited_amount = Column(Float, nullable=False)  # 存入金额
    deposited_unit = Column(String, default="usd")
    claimed_quota = Column(Float)  # User's claimed quota in Credits
    
    # 手续费和Credit转换
    platform_fee_rate = Column(Float, default=0.10)  # 手续费率（10%）
    platform_fee = Column(Float, nullable=False)  # 平台手续费
    fee_amount = Column(Float)  # Alias for platform_fee (for compatibility)
    credits_received = Column(Float, nullable=False)  # 获得的Credits
    credit_conversion_rate = Column(Float, default=1.0)  # 转换率
    
    # 验证信息
    verification_method = Column(String)  # "api_test", "manual", "auto"
    verification_result = Column(JSON)  # 验证结果详情
    verified_by = Column(String, ForeignKey("users.id"))  # 验证人（admin）
    verified_at = Column(DateTime(timezone=True))
    
    # 状态
    status = Column(SQLEnum(PoolDepositStatus), default=PoolDepositStatus.PENDING)
    rejection_reason = Column(Text)
    
    # 时间
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True))
    
    # 关系
    user = relationship("User", foreign_keys=[user_id])
    verifier = relationship("User", foreign_keys=[verified_by])
    resource = relationship("PoolResource", back_populates="deposits")


class PoolUsageLog(Base):
    """
    资源池使用日志
    
    记录每次从资源池中使用API的详细信息
    这是"账本"，记录谁用了谁的资源
    """
    __tablename__ = "pool_usage_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 使用者信息
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # 资源信息
    resource_id = Column(String, ForeignKey("pool_resources.id"), nullable=False)
    resource_owner_id = Column(String, ForeignKey("users.id"), nullable=False)  # 资源所有者
    
    # 请求信息
    model = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    request_type = Column(String)  # "chat", "completion", "embedding"等
    
    # 消耗信息
    input_tokens = Column(Integer)
    output_tokens = Column(Integer)
    total_tokens = Column(Integer)
    cost_amount = Column(Float)  # 消耗的资源量（美元）
    cost_unit = Column(String, default="usd")
    credits_charged = Column(Float, nullable=False)  # 向用户收取的Credits
    
    # 性能指标
    response_time = Column(Float)  # 响应时间（ms）
    was_successful = Column(Boolean, default=True)
    error_message = Column(Text)
    
    # 路由信息
    routing_reason = Column(String)  # 为什么选择这个资源："lowest_cost", "load_balance"等
    routing_algorithm = Column(String, default="smart_v1")
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关系
    user = relationship("User", foreign_keys=[user_id])
    resource_owner = relationship("User", foreign_keys=[resource_owner_id])
    resource = relationship("PoolResource", back_populates="usage_logs")


class PoolRouterConfig(Base):
    """
    路由器配置
    
    配置智能路由算法的参数
    """
    __tablename__ = "pool_router_configs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    name = Column(String, nullable=False, unique=True)
    description = Column(Text)
    
    # 路由策略
    strategy = Column(String, default="smart")  # "smart", "round_robin", "lowest_cost", "random"
    
    # 权重配置
    cost_weight = Column(Float, default=0.4)  # 成本权重
    performance_weight = Column(Float, default=0.3)  # 性能权重
    reliability_weight = Column(Float, default=0.3)  # 可靠性权重
    
    # 限制
    max_retry_attempts = Column(Integer, default=3)
    failover_enabled = Column(Boolean, default=True)
    
    # 优先级规则
    priority_rules = Column(JSON)  # 自定义优先级规则
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class PoolLedger(Base):
    """
    账本 - 资源所有者的收益记录
    
    记录资源被使用后，所有者应得的收益
    """
    __tablename__ = "pool_ledgers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 所有者信息
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    resource_id = Column(String, ForeignKey("pool_resources.id"))
    
    # 使用情况
    usage_log_id = Column(String, ForeignKey("pool_usage_logs.id"))
    
    # 消耗和收益
    resource_consumed = Column(Float, nullable=False)  # 消耗的资源量
    resource_unit = Column(String, default="usd")
    
    # 注意：资源所有者不直接获得收益，因为他们已经在存款时获得了Credits
    # 这里只记录他们贡献的资源被消耗了多少
    
    # 平台收益（从用户那里收取的Credits - 使用的实际成本）
    platform_revenue = Column(Float)  # 平台利润
    
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关系
    owner = relationship("User", foreign_keys=[owner_id])
    resource = relationship("PoolResource")
    usage_log = relationship("PoolUsageLog")

