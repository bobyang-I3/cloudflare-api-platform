# Production Deployment Guide

## Current Stability Status

### Existing Configuration
- ✅ `Restart=always` - Services auto-restart on failure
- ✅ `RestartSec=10` - Wait 10 seconds before restart
- ⚠️ **Missing**: Timeout configurations
- ⚠️ **Missing**: Memory limits
- ⚠️ **Missing**: Health checks

## Improved systemd Configuration

### Backend Service - Enhanced

Create `/etc/systemd/system/backend.service`:

```ini
[Unit]
Description=Cloudflare API Platform - Backend
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
User=bob_yang
WorkingDirectory=/home/bob_yang/api-billing-platform/server
Environment="PATH=/home/bob_yang/api-billing-platform/server/venv/bin"
ExecStart=/home/bob_yang/api-billing-platform/server/venv/bin/python main.py

# Restart configuration
Restart=always
RestartSec=10

# Timeout settings (prevent hanging)
TimeoutStartSec=60
TimeoutStopSec=30

# Resource limits
MemoryLimit=2G
MemoryMax=3G

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cloudflare-backend

[Install]
WantedBy=multi-user.target
```

### Frontend Service - Enhanced

Create `/etc/systemd/system/frontend.service`:

```ini
[Unit]
Description=Cloudflare API Platform - Frontend
After=network.target backend.service
StartLimitIntervalSec=0

[Service]
Type=simple
User=bob_yang
WorkingDirectory=/home/bob_yang/api-billing-platform/client
ExecStart=/usr/bin/npm run preview

# Restart configuration
Restart=always
RestartSec=10

# Timeout settings
TimeoutStartSec=60
TimeoutStopSec=30

# Resource limits
MemoryLimit=1G
MemoryMax=2G

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cloudflare-frontend

[Install]
WantedBy=multi-user.target
```

## Key Improvements

### 1. Timeout Prevention
- `TimeoutStartSec=60` - Service must start within 60 seconds
- `TimeoutStopSec=30` - Service must stop within 30 seconds
- Prevents services from hanging indefinitely

### 2. Memory Management
- `MemoryLimit=2G` - Soft limit (warning threshold)
- `MemoryMax=3G` - Hard limit (kill if exceeded)
- Prevents OOM (Out of Memory) issues

### 3. Unlimited Restarts
- `StartLimitIntervalSec=0` - No limit on restart attempts
- Combined with `Restart=always` ensures continuous operation

### 4. Better Logging
- `StandardOutput=journal` - Logs to systemd journal
- `SyslogIdentifier` - Easy to filter logs

## Deployment Commands

```bash
# 1. Update service files on GCP VM
sudo nano /etc/systemd/system/backend.service
sudo nano /etc/systemd/system/frontend.service

# 2. Reload systemd configuration
sudo systemctl daemon-reload

# 3. Enable services (auto-start on boot)
sudo systemctl enable backend frontend

# 4. Restart services with new config
sudo systemctl restart backend frontend

# 5. Verify status
sudo systemctl status backend
sudo systemctl status frontend
```

## Monitoring Commands

### Check Service Status
```bash
# Full status
sudo systemctl status backend frontend

# Is service running?
sudo systemctl is-active backend
sudo systemctl is-active frontend

# View recent logs
sudo journalctl -u backend -n 50 --no-pager
sudo journalctl -u frontend -n 50 --no-pager

# Follow logs in real-time
sudo journalctl -u backend -f
```

### Check Resource Usage
```bash
# Memory usage
sudo systemctl show backend --property=MemoryCurrent
sudo systemctl show frontend --property=MemoryCurrent

# Process info
ps aux | grep python
ps aux | grep node
```

## Health Check Script

Create `/home/bob_yang/health-check.sh`:

```bash
#!/bin/bash

# Check backend
if ! systemctl is-active --quiet backend; then
    echo "❌ Backend is down"
    sudo systemctl restart backend
fi

# Check frontend
if ! systemctl is-active --quiet frontend; then
    echo "❌ Frontend is down"
    sudo systemctl restart frontend
fi

# Check HTTP endpoints
if ! curl -f http://localhost:8000/docs > /dev/null 2>&1; then
    echo "⚠️ Backend HTTP check failed"
fi

if ! curl -f http://localhost:5173 > /dev/null 2>&1; then
    echo "⚠️ Frontend HTTP check failed"
fi

echo "✅ Health check complete"
```

Make it executable and add to cron:
```bash
chmod +x /home/bob_yang/health-check.sh

# Add to crontab (run every 5 minutes)
crontab -e
# Add line:
*/5 * * * * /home/bob_yang/health-check.sh >> /var/log/platform-health.log 2>&1
```

## Troubleshooting

### Service Won't Start
```bash
# Check detailed error
sudo journalctl -u backend -xe
sudo journalctl -u frontend -xe

# Check file permissions
ls -la /home/bob_yang/api-billing-platform
```

### Service Keeps Restarting
```bash
# Check crash logs
sudo journalctl -u backend --since "10 minutes ago"

# Check memory issues
dmesg | grep -i "out of memory"
```

### Timeout Issues
```bash
# If service takes too long to start, increase timeout
sudo systemctl edit backend
# Add:
[Service]
TimeoutStartSec=120
```

## Performance Optimization

### 1. Enable Swap (if not already)
```bash
# Check swap
free -h

# Create swap if needed
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2. Adjust VM Resources
```bash
# If on GCP, consider upgrading machine type
gcloud compute instances stop instance-name
gcloud compute instances set-machine-type instance-name --machine-type e2-medium
gcloud compute instances start instance-name
```

## Backup Strategy

### Database Backup
```bash
# Create backup script
cat > /home/bob_yang/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/bob_yang/backups"
mkdir -p $BACKUP_DIR
cp /home/bob_yang/api-billing-platform/server/app.db \
   $BACKUP_DIR/app.db.$(date +%Y%m%d_%H%M%S)
# Keep only last 7 days
find $BACKUP_DIR -name "app.db.*" -mtime +7 -delete
EOF

chmod +x /home/bob_yang/backup-db.sh

# Add to crontab (daily at 2 AM)
# 0 2 * * * /home/bob_yang/backup-db.sh
```

## Summary

Your VM deployment will be **stable and reliable** with these configurations:

✅ **Auto-restart** on any failure  
✅ **Timeout protection** prevents hanging  
✅ **Memory limits** prevent OOM crashes  
✅ **Health checks** catch issues early  
✅ **Proper logging** for debugging  
✅ **Database backups** protect data  

After applying these changes, your platform should run continuously without manual intervention.

