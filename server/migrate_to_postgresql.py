#!/usr/bin/env python3
"""
SQLite to PostgreSQL Migration Script

This script migrates data from SQLite to PostgreSQL while preserving all data integrity.
"""

import os
import sys
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# Import models
from models import Base, User, UserLimit, UsageLog
from models_credit import UserCredit, CreditTransaction, ModelPricing

# Configuration
SQLITE_URL = "sqlite:///./app.db"
POSTGRES_URL = os.getenv("POSTGRES_URL", "postgresql://user:password@localhost:5432/cloudflare_api")


def backup_sqlite():
    """Create a backup of the SQLite database"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"app.db.backup.{timestamp}"
    
    if os.path.exists("app.db"):
        import shutil
        shutil.copy2("app.db", backup_file)
        print(f"✅ SQLite backup created: {backup_file}")
        return backup_file
    else:
        print("⚠️  No SQLite database found")
        return None


def test_postgres_connection(pg_url):
    """Test PostgreSQL connection"""
    try:
        engine = create_engine(pg_url)
        with engine.connect() as conn:
            print("✅ PostgreSQL connection successful")
            return True
    except Exception as e:
        print(f"❌ PostgreSQL connection failed: {e}")
        return False


def create_postgres_tables(pg_url):
    """Create all tables in PostgreSQL"""
    try:
        engine = create_engine(pg_url)
        Base.metadata.create_all(bind=engine)
        print("✅ PostgreSQL tables created")
        return engine
    except Exception as e:
        print(f"❌ Failed to create PostgreSQL tables: {e}")
        return None


def migrate_table(sqlite_session, postgres_session, model_class):
    """Migrate a single table from SQLite to PostgreSQL"""
    table_name = model_class.__tablename__
    print(f"\n📊 Migrating {table_name}...")
    
    try:
        # Get all records from SQLite
        records = sqlite_session.query(model_class).all()
        count = len(records)
        
        if count == 0:
            print(f"   ℹ️  No records to migrate")
            return True
        
        print(f"   Found {count} records")
        
        # Insert records into PostgreSQL
        for i, record in enumerate(records, 1):
            # Create new instance with same data
            new_record = model_class()
            for column in inspect(model_class).columns:
                setattr(new_record, column.name, getattr(record, column.name))
            
            postgres_session.add(new_record)
            
            if i % 100 == 0:
                print(f"   Progress: {i}/{count} records")
        
        postgres_session.commit()
        print(f"   ✅ Migrated {count} records")
        return True
        
    except Exception as e:
        postgres_session.rollback()
        print(f"   ❌ Migration failed: {e}")
        return False


def verify_migration(sqlite_session, postgres_session, model_class):
    """Verify that data was migrated correctly"""
    table_name = model_class.__tablename__
    
    sqlite_count = sqlite_session.query(model_class).count()
    postgres_count = postgres_session.query(model_class).count()
    
    if sqlite_count == postgres_count:
        print(f"   ✅ {table_name}: {postgres_count} records")
        return True
    else:
        print(f"   ❌ {table_name}: SQLite={sqlite_count}, PostgreSQL={postgres_count}")
        return False


def main():
    print("=" * 60)
    print("SQLite to PostgreSQL Migration")
    print("=" * 60)
    
    # Step 1: Backup SQLite
    print("\n📦 Step 1: Backing up SQLite database...")
    backup_file = backup_sqlite()
    if not backup_file and os.path.exists("app.db"):
        print("⚠️  Warning: Backup failed but continuing...")
    
    # Step 2: Test PostgreSQL connection
    print("\n🔌 Step 2: Testing PostgreSQL connection...")
    if not test_postgres_connection(POSTGRES_URL):
        print("\n❌ Migration aborted: Cannot connect to PostgreSQL")
        print(f"   Please check POSTGRES_URL: {POSTGRES_URL}")
        sys.exit(1)
    
    # Step 3: Create PostgreSQL tables
    print("\n🏗️  Step 3: Creating PostgreSQL tables...")
    pg_engine = create_postgres_tables(POSTGRES_URL)
    if not pg_engine:
        print("\n❌ Migration aborted: Cannot create tables")
        sys.exit(1)
    
    # Step 4: Migrate data
    print("\n📤 Step 4: Migrating data...")
    
    # Create sessions
    sqlite_engine = create_engine(SQLITE_URL)
    SQLiteSession = sessionmaker(bind=sqlite_engine)
    PostgresSession = sessionmaker(bind=pg_engine)
    
    sqlite_session = SQLiteSession()
    postgres_session = PostgresSession()
    
    # Migration order (respecting foreign key dependencies)
    migration_order = [
        User,           # Must be first (referenced by others)
        UserLimit,
        UserCredit,
        UsageLog,
        CreditTransaction,
        ModelPricing,
    ]
    
    success = True
    for model in migration_order:
        if not migrate_table(sqlite_session, postgres_session, model):
            success = False
            break
    
    # Step 5: Verify migration
    if success:
        print("\n🔍 Step 5: Verifying migration...")
        all_verified = True
        for model in migration_order:
            if not verify_migration(sqlite_session, postgres_session, model):
                all_verified = False
        
        if all_verified:
            print("\n" + "=" * 60)
            print("✅ MIGRATION COMPLETED SUCCESSFULLY")
            print("=" * 60)
            print("\n📝 Next steps:")
            print("1. Update .env to use PostgreSQL URL")
            print("2. Restart backend service: sudo systemctl restart backend")
            print("3. Test the application thoroughly")
            print(f"4. Keep SQLite backup: {backup_file}")
            print("\n⚠️  Do not delete SQLite backup until you verify everything works!")
        else:
            print("\n❌ MIGRATION VERIFICATION FAILED")
            print("Some data may not have been migrated correctly")
    else:
        print("\n❌ MIGRATION FAILED")
        print("PostgreSQL database may be in an inconsistent state")
        print("Recommend: Drop PostgreSQL database and retry")
    
    sqlite_session.close()
    postgres_session.close()


if __name__ == "__main__":
    main()

