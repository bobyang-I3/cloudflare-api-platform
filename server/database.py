"""
Database configuration and session management
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

# Create SQLAlchemy engine
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
    echo=True  # Set to False in production
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()


def get_db():
    """
    Dependency to get database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database (create all tables)
    """
    from models import User, UserLimit, UsageLog  # Import models to register them
    from models_credit import UserCredit, CreditTransaction, ModelPricing  # Import credit models
    from models_message import Message  # Import message model
    from models_forum import Post, Comment, PostLike  # Import forum models
    from models_profile import UserProfile  # Import profile model
    from models_group import ChatGroup, GroupMember, GroupMessage  # Import group chat models
    Base.metadata.create_all(bind=engine)
    print("✅ Database initialized successfully")

