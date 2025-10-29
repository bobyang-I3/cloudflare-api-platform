"""
Script to create an admin account
"""
import sys
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from database import SessionLocal, init_db
from models import User, UserLimit
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin(username: str, email: str, password: str):
    """Create an admin user"""
    db = SessionLocal()
    
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(
            (User.username == username) | (User.email == email)
        ).first()
        
        if existing_user:
            print(f"❌ User with username '{username}' or email '{email}' already exists!")
            return False
        
        # Create admin user
        admin_user = User(
            username=username,
            email=email,
            password_hash=pwd_context.hash(password),
            is_admin=True,
            role="admin",
            is_active=True
        )
        
        db.add(admin_user)
        db.flush()  # Get the user ID
        
        # Create unlimited user limit for admin
        admin_limit = UserLimit(
            user_id=admin_user.id,
            max_requests_per_day=0,  # 0 = unlimited
            max_tokens_per_day=0,
            max_tokens_per_month=0,
            is_limited=False
        )
        
        db.add(admin_limit)
        db.commit()
        
        print("\n✅ Admin account created successfully!")
        print(f"   Username: {username}")
        print(f"   Email: {email}")
        print(f"   API Key: {admin_user.api_key}")
        print(f"   Role: admin")
        print(f"   Limits: Unlimited")
        
        return True
    
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating admin: {e}")
        return False
    finally:
        db.close()

def main():
    # Initialize database if needed
    print("🔧 Initializing database...")
    init_db()
    
    # Get admin credentials from command line or use defaults
    if len(sys.argv) >= 4:
        username = sys.argv[1]
        email = sys.argv[2]
        password = sys.argv[3]
    else:
        print("\n📝 Creating admin account...")
        print("Usage: python create_admin.py <username> <email> <password>")
        print("Using default credentials:\n")
        username = "admin"
        email = "admin@example.com"
        password = "admin123"
        print(f"   Username: {username}")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print("\n⚠️  Please change these credentials in production!\n")
    
    create_admin(username, email, password)

if __name__ == "__main__":
    main()

