"""
Add missing columns to pool_deposits table

This migration adds:
- model_id
- model_name
- claimed_quota
- fee_amount
"""

import os
from sqlalchemy import create_engine, text

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://cloudflare_user:bob.yang@localhost:5432/cloudflare_api")

def migrate():
    print("🔧 Adding missing columns to pool_deposits table...")
    
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Start transaction
        trans = conn.begin()
        
        try:
            # Add model_id column
            print("  Adding model_id column...")
            conn.execute(text("""
                ALTER TABLE pool_deposits 
                ADD COLUMN IF NOT EXISTS model_id VARCHAR
            """))
            
            # Add model_name column
            print("  Adding model_name column...")
            conn.execute(text("""
                ALTER TABLE pool_deposits 
                ADD COLUMN IF NOT EXISTS model_name VARCHAR
            """))
            
            # Add claimed_quota column
            print("  Adding claimed_quota column...")
            conn.execute(text("""
                ALTER TABLE pool_deposits 
                ADD COLUMN IF NOT EXISTS claimed_quota FLOAT
            """))
            
            # Add fee_amount column
            print("  Adding fee_amount column...")
            conn.execute(text("""
                ALTER TABLE pool_deposits 
                ADD COLUMN IF NOT EXISTS fee_amount FLOAT
            """))
            
            # Update existing records to set fee_amount = platform_fee
            print("  Updating existing records...")
            conn.execute(text("""
                UPDATE pool_deposits 
                SET fee_amount = platform_fee 
                WHERE fee_amount IS NULL
            """))
            
            # Commit transaction
            trans.commit()
            print("✅ Migration completed successfully!")
            
        except Exception as e:
            trans.rollback()
            print(f"❌ Migration failed: {e}")
            raise

if __name__ == "__main__":
    migrate()

