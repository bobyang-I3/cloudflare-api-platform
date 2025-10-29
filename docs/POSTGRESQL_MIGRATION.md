# PostgreSQL Migration Guide

Complete guide for migrating from SQLite to PostgreSQL on GCP VM.

## Why PostgreSQL?

**SQLite limitations:**
- Single file database (can corrupt)
- Limited concurrent writes
- No built-in replication
- Max database size ~280 TB (but practical limit lower)

**PostgreSQL benefits:**
- Production-grade reliability
- Better concurrent access
- Advanced features (replication, partitioning)
- Excellent performance at scale
- Industry standard

## Prerequisites

- GCP VM with sudo access
- Existing SQLite database with data
- ~500MB free disk space

## Step 1: Install PostgreSQL on GCP VM

```bash
# Connect to your GCP VM
gcloud compute ssh instance-20251029-181616 --zone=us-west1-b

# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Check installation
sudo systemctl status postgresql
```

## Step 2: Configure PostgreSQL

### Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE cloudflare_api;
CREATE USER cloudflare_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE cloudflare_api TO cloudflare_user;

# Grant schema permissions
\c cloudflare_api
GRANT ALL ON SCHEMA public TO cloudflare_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cloudflare_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cloudflare_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO cloudflare_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO cloudflare_user;

# Exit
\q
```

### Configure PostgreSQL for Remote Access (if needed)

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/14/main/postgresql.conf

# Find and change:
listen_addresses = 'localhost'  # Keep as localhost for security

# Edit pg_hba.conf (for local connections)
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add line (for password authentication):
local   all             cloudflare_user                          md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Step 3: Update Backend Configuration

### Update requirements.txt

Already done - includes `psycopg2-binary==2.9.9`

### Install PostgreSQL Driver

```bash
cd ~/api-billing-platform/server
source venv/bin/activate
pip install psycopg2-binary
```

### Update .env File

```bash
# Edit .env
nano ~/api-billing-platform/server/.env

# Change DATABASE_URL from:
# DATABASE_URL=sqlite:///./app.db

# To:
DATABASE_URL=postgresql://cloudflare_user:your_secure_password_here@localhost:5432/cloudflare_api
```

## Step 4: Run Migration Script

```bash
cd ~/api-billing-platform/server
source venv/bin/activate

# Set PostgreSQL URL for migration
export POSTGRES_URL="postgresql://cloudflare_user:your_secure_password_here@localhost:5432/cloudflare_api"

# Run migration
python migrate_to_postgresql.py
```

**Expected output:**
```
============================================================
SQLite to PostgreSQL Migration
============================================================

📦 Step 1: Backing up SQLite database...
✅ SQLite backup created: app.db.backup.20250129_123456

🔌 Step 2: Testing PostgreSQL connection...
✅ PostgreSQL connection successful

🏗️  Step 3: Creating PostgreSQL tables...
✅ PostgreSQL tables created

📤 Step 4: Migrating data...

📊 Migrating users...
   Found 5 records
   ✅ Migrated 5 records

📊 Migrating user_limits...
   Found 5 records
   ✅ Migrated 5 records

📊 Migrating user_credits...
   Found 3 records
   ✅ Migrated 3 records

📊 Migrating usage_logs...
   Found 150 records
   Progress: 100/150 records
   ✅ Migrated 150 records

📊 Migrating credit_transactions...
   Found 45 records
   ✅ Migrated 45 records

📊 Migrating model_pricing...
   Found 80 records
   ✅ Migrated 80 records

🔍 Step 5: Verifying migration...
   ✅ users: 5 records
   ✅ user_limits: 5 records
   ✅ user_credits: 3 records
   ✅ usage_logs: 150 records
   ✅ credit_transactions: 45 records
   ✅ model_pricing: 80 records

============================================================
✅ MIGRATION COMPLETED SUCCESSFULLY
============================================================

📝 Next steps:
1. Update .env to use PostgreSQL URL
2. Restart backend service: sudo systemctl restart backend
3. Test the application thoroughly
4. Keep SQLite backup: app.db.backup.20250129_123456

⚠️  Do not delete SQLite backup until you verify everything works!
```

## Step 5: Restart Backend Service

```bash
# Restart backend with new PostgreSQL configuration
sudo systemctl restart backend

# Check status
sudo systemctl status backend

# Check logs
sudo journalctl -u backend -n 50
```

## Step 6: Verify Migration

### Check Database Connection

```bash
# Connect to PostgreSQL
sudo -u postgres psql cloudflare_api

# Check tables
\dt

# Check record counts
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'user_credits', COUNT(*) FROM user_credits
UNION ALL
SELECT 'usage_logs', COUNT(*) FROM usage_logs
UNION ALL
SELECT 'credit_transactions', COUNT(*) FROM credit_transactions
UNION ALL
SELECT 'model_pricing', COUNT(*) FROM model_pricing;

# Exit
\q
```

### Test Application

```bash
# Test backend API
curl http://localhost:8000/docs

# Test login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'

# Test frontend
curl http://localhost:5173
```

### Full Application Test

1. Open browser: `http://104.154.208.245:5173`
2. Login with existing account
3. Check credit balance
4. Send a chat message
5. Check usage statistics
6. Verify all data is intact

## Performance Tuning

### PostgreSQL Configuration

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/14/main/postgresql.conf

# Recommended settings for small VM (e2-micro):
shared_buffers = 256MB          # 25% of RAM
effective_cache_size = 768MB    # 75% of RAM
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Create Database Indexes

```bash
sudo -u postgres psql cloudflare_api

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_model_pricing_model_id ON model_pricing(model_id);
CREATE INDEX IF NOT EXISTS idx_model_pricing_is_active ON model_pricing(is_active);

\q
```

## Backup Strategy

### Automated PostgreSQL Backups

```bash
# Create backup script
cat > ~/backup-postgresql.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/bob_yang/pg_backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PGPASSWORD="your_secure_password_here" pg_dump -U cloudflare_user -h localhost cloudflare_api | gzip > $BACKUP_DIR/cloudflare_api_$TIMESTAMP.sql.gz
# Keep only last 7 days
find $BACKUP_DIR -name "cloudflare_api_*.sql.gz" -mtime +7 -delete
echo "Backup completed: cloudflare_api_$TIMESTAMP.sql.gz"
EOF

chmod +x ~/backup-postgresql.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add:
0 2 * * * /home/bob_yang/backup-postgresql.sh >> /var/log/pg-backup.log 2>&1
```

### Manual Backup

```bash
# Backup
PGPASSWORD="your_secure_password_here" pg_dump -U cloudflare_user -h localhost cloudflare_api > backup.sql

# Restore (if needed)
PGPASSWORD="your_secure_password_here" psql -U cloudflare_user -h localhost cloudflare_api < backup.sql
```

## Rollback Procedure

If migration fails or has issues:

```bash
# 1. Stop backend
sudo systemctl stop backend

# 2. Restore .env to use SQLite
nano ~/api-billing-platform/server/.env
# Change back to: DATABASE_URL=sqlite:///./app.db

# 3. Restore SQLite backup if needed
cd ~/api-billing-platform/server
cp app.db.backup.TIMESTAMP app.db

# 4. Restart backend
sudo systemctl start backend
```

## Monitoring PostgreSQL

### Check Database Size

```bash
sudo -u postgres psql cloudflare_api -c "SELECT pg_size_pretty(pg_database_size('cloudflare_api'));"
```

### Check Active Connections

```bash
sudo -u postgres psql cloudflare_api -c "SELECT count(*) FROM pg_stat_activity;"
```

### View Slow Queries

```bash
sudo -u postgres psql cloudflare_api -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

## Troubleshooting

### Connection Failed

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Test connection manually
PGPASSWORD="your_secure_password_here" psql -U cloudflare_user -h localhost cloudflare_api
```

### Migration Script Fails

```bash
# Check Python dependencies
pip list | grep psycopg2

# Test PostgreSQL connection from Python
python -c "from sqlalchemy import create_engine; engine = create_engine('postgresql://cloudflare_user:password@localhost:5432/cloudflare_api'); print(engine.connect())"
```

### Backend Won't Start

```bash
# Check backend logs
sudo journalctl -u backend -n 100

# Common issues:
# - Wrong DATABASE_URL in .env
# - PostgreSQL not running
# - Missing psycopg2 package
# - Wrong password
```

## Security Best Practices

1. **Use strong password** for PostgreSQL user
2. **Keep password in .env** (not in code)
3. **Restrict PostgreSQL access** to localhost only
4. **Regular backups** (automated daily)
5. **Monitor logs** for suspicious activity
6. **Update PostgreSQL** regularly for security patches

```bash
# Update PostgreSQL
sudo apt update
sudo apt upgrade postgresql
```

## Performance Comparison

### SQLite
- Read: Fast
- Write: Moderate (locks entire database)
- Concurrent: Limited
- Scalability: Low

### PostgreSQL
- Read: Very Fast
- Write: Fast (row-level locking)
- Concurrent: Excellent
- Scalability: High

**Expected improvements:**
- 2-5x better concurrent request handling
- No database locks during writes
- Better reliability under load
- Foundation for future scaling

## Summary

After migration:
- ✅ Production-grade database
- ✅ Better concurrent access
- ✅ Automated backups
- ✅ Foundation for scaling
- ✅ Industry standard solution

Your platform is now ready for production workloads!

