"""
Database migration script to add admin fields and user limits
"""
import sqlite3
from pathlib import Path

def migrate():
    db_path = Path(__file__).parent / "app.db"
    
    if not db_path.exists():
        print("⚠️ Database doesn't exist yet. Run the server once to create it.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Add is_admin column to users table
        print("🔄 Adding is_admin column to users table...")
        cursor.execute("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0")
        print("✅ Added is_admin column")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("⏭️  is_admin column already exists")
        else:
            raise
    
    try:
        # Add role column to users table
        print("🔄 Adding role column to users table...")
        cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'")
        print("✅ Added role column")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("⏭️  role column already exists")
        else:
            raise
    
    try:
        # Create user_limits table
        print("🔄 Creating user_limits table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_limits (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL UNIQUE,
                max_requests_per_day INTEGER DEFAULT 1000,
                max_tokens_per_day INTEGER DEFAULT 100000,
                max_tokens_per_month INTEGER DEFAULT 1000000,
                is_limited BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        print("✅ Created user_limits table")
    except sqlite3.OperationalError as e:
        print(f"⏭️  user_limits table already exists: {e}")
    
    conn.commit()
    conn.close()
    
    print("\n✅ Migration completed successfully!")
    print("📝 Next steps:")
    print("   1. Create an admin account using create_admin.py")
    print("   2. Restart the server")

if __name__ == "__main__":
    migrate()

