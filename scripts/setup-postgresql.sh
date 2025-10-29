#!/bin/bash
# PostgreSQL Setup Script for GCP VM
# This script automates PostgreSQL installation and configuration

set -e

echo "============================================================"
echo "PostgreSQL Setup for Cloudflare API Platform"
echo "============================================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="cloudflare_api"
DB_USER="cloudflare_user"
DB_PASSWORD="${POSTGRES_PASSWORD:-ChangeMeInProduction123!}"

echo -e "\n${YELLOW}📦 Step 1: Installing PostgreSQL...${NC}"
sudo apt update
sudo apt install -y postgresql postgresql-contrib
echo -e "${GREEN}✅ PostgreSQL installed${NC}"

echo -e "\n${YELLOW}🔧 Step 2: Configuring PostgreSQL...${NC}"

# Create database and user
sudo -u postgres psql << EOF
-- Create database
CREATE DATABASE $DB_NAME;

-- Create user
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Connect to database and grant schema privileges
\c $DB_NAME
GRANT ALL ON SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;

-- Exit
\q
EOF

echo -e "${GREEN}✅ Database and user created${NC}"

echo -e "\n${YELLOW}🔐 Step 3: Configuring authentication...${NC}"

# Configure pg_hba.conf for local password authentication
PG_HBA_FILE=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file')
sudo sed -i '/^local.*all.*all.*peer/a local   all             cloudflare_user                          md5' $PG_HBA_FILE

# Restart PostgreSQL
sudo systemctl restart postgresql
echo -e "${GREEN}✅ Authentication configured${NC}"

echo -e "\n${YELLOW}📝 Step 4: Updating .env file...${NC}"

ENV_FILE="$HOME/api-billing-platform/server/.env"
if [ -f "$ENV_FILE" ]; then
    # Backup existing .env
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update DATABASE_URL
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME|" "$ENV_FILE"
    echo -e "${GREEN}✅ .env updated (backup created)${NC}"
else
    echo -e "${RED}⚠️  .env file not found at $ENV_FILE${NC}"
    echo -e "   Please create it manually with:"
    echo -e "   DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
fi

echo -e "\n${YELLOW}🔍 Step 5: Installing Python PostgreSQL driver...${NC}"
cd $HOME/api-billing-platform/server
source venv/bin/activate
pip install -q psycopg2-binary
echo -e "${GREEN}✅ psycopg2-binary installed${NC}"

echo -e "\n${YELLOW}📊 Step 6: Creating database tables...${NC}"
python -c "from database import init_db; init_db()"
echo -e "${GREEN}✅ Database tables created${NC}"

echo -e "\n============================================================"
echo -e "${GREEN}✅ PostgreSQL Setup Complete!${NC}"
echo -e "============================================================"
echo -e "\n📝 Next Steps:"
echo -e "1. ${YELLOW}Run migration:${NC}"
echo -e "   cd ~/api-billing-platform/server"
echo -e "   export POSTGRES_URL='postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME'"
echo -e "   python migrate_to_postgresql.py"
echo -e ""
echo -e "2. ${YELLOW}Restart backend:${NC}"
echo -e "   sudo systemctl restart backend"
echo -e ""
echo -e "3. ${YELLOW}Verify:${NC}"
echo -e "   sudo systemctl status backend"
echo -e "   curl http://localhost:8000/docs"
echo -e ""
echo -e "🔐 ${YELLOW}Database Credentials:${NC}"
echo -e "   Database: $DB_NAME"
echo -e "   User: $DB_USER"
echo -e "   Password: $DB_PASSWORD"
echo -e "   Connection: postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
echo -e ""
echo -e "⚠️  ${RED}IMPORTANT:${NC} Save these credentials securely!"

