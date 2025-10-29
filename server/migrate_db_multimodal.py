#!/usr/bin/env python3
"""
Database migration script: Add multimodal support fields and remove cost fields
Adds: task_type, has_image, has_audio
Removes: cost_usd, model_pricing
"""
import sqlite3
import shutil
from datetime import datetime
import os

DATABASE_FILE = "app.db"

def run_migration():
    print("=" * 70)
    print("数据库迁移：添加多模态支持，移除成本追踪")
    print("=" * 70)
    
    # Check if database exists
    if not os.path.exists(DATABASE_FILE):
        print(f"\n⚠️  数据库文件 {DATABASE_FILE} 不存在")
        print("   这可能是首次运行，将自动创建新数据库")
        return
    
    # Backup database
    backup_filename = f"app.db.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    print(f"\n📦 备份数据库...")
    shutil.copyfile(DATABASE_FILE, backup_filename)
    print(f"   ✅ 备份完成: {backup_filename}")
    
    # Connect to database
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    
    try:
        # Get existing columns
        cursor.execute("PRAGMA table_info(usage_logs)")
        columns = {row[1] for row in cursor.fetchall()}
        
        print("\n🔧 更新 usage_logs 表...")
        
        # Add new columns if they don't exist
        if 'task_type' not in columns:
            cursor.execute("ALTER TABLE usage_logs ADD COLUMN task_type VARCHAR DEFAULT 'text-generation'")
            print("   ✅ 添加 task_type 字段")
        else:
            print("   ⏭️  跳过：task_type 字段已存在")
        
        if 'has_image' not in columns:
            cursor.execute("ALTER TABLE usage_logs ADD COLUMN has_image BOOLEAN DEFAULT 0")
            print("   ✅ 添加 has_image 字段")
        else:
            print("   ⏭️  跳过：has_image 字段已存在")
        
        if 'has_audio' not in columns:
            cursor.execute("ALTER TABLE usage_logs ADD COLUMN has_audio BOOLEAN DEFAULT 0")
            print("   ✅ 添加 has_audio 字段")
        else:
            print("   ⏭️  跳过：has_audio 字段已存在")
        
        # Note: SQLite doesn't support DROP COLUMN directly
        # We'll need to recreate the table to remove cost_usd and model_pricing
        if 'cost_usd' in columns or 'model_pricing' in columns:
            print("\n🔄 重建表以移除成本相关字段...")
            
            # Create new table without cost fields
            cursor.execute("""
                CREATE TABLE usage_logs_new (
                    id VARCHAR PRIMARY KEY,
                    user_id VARCHAR NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    model_name VARCHAR NOT NULL,
                    task_type VARCHAR DEFAULT 'text-generation',
                    input_tokens INTEGER DEFAULT 0,
                    output_tokens INTEGER DEFAULT 0,
                    total_tokens INTEGER DEFAULT 0,
                    response_time_ms FLOAT DEFAULT 0.0,
                    request_data TEXT,
                    has_image BOOLEAN DEFAULT 0,
                    has_audio BOOLEAN DEFAULT 0,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            
            # Copy data from old table to new table
            cursor.execute("""
                INSERT INTO usage_logs_new 
                (id, user_id, timestamp, model_name, task_type, input_tokens, 
                 output_tokens, total_tokens, response_time_ms, request_data, 
                 has_image, has_audio)
                SELECT 
                    id, user_id, timestamp, model_name, 
                    COALESCE(task_type, 'text-generation'),
                    input_tokens, output_tokens, total_tokens, 
                    response_time_ms, request_data,
                    COALESCE(has_image, 0),
                    COALESCE(has_audio, 0)
                FROM usage_logs
            """)
            
            # Drop old table and rename new table
            cursor.execute("DROP TABLE usage_logs")
            cursor.execute("ALTER TABLE usage_logs_new RENAME TO usage_logs")
            
            # Recreate indices
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_usage_logs_user_id ON usage_logs(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_usage_logs_timestamp ON usage_logs(timestamp)")
            
            print("   ✅ 表重建完成，已移除 cost_usd 和 model_pricing 字段")
        
        conn.commit()
        
        # Get row count
        cursor.execute("SELECT COUNT(*) FROM usage_logs")
        row_count = cursor.fetchone()[0]
        
        print("\n🎉 迁移成功！")
        print(f"   总记录数: {row_count}")
        print(f"   新增字段: task_type, has_image, has_audio")
        print(f"   移除字段: cost_usd, model_pricing")
        print("=" * 70)
        
    except Exception as e:
        print(f"\n❌ 迁移失败: {e}")
        conn.rollback()
        print(f"   可以从备份恢复: {backup_filename}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    run_migration()

