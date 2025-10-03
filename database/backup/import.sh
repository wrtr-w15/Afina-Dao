#!/bin/bash

# Import script for Afina DAO Wiki database
# Usage: ./import.sh <dump_file.sql>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_NAME="${DB_NAME:-afina_dao_wiki}"

echo -e "${GREEN}=== Afina DAO Wiki Database Import ===${NC}"
echo ""

# Check if dump file is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: No dump file specified${NC}"
    echo "Usage: $0 <dump_file.sql>"
    echo ""
    echo "Available dump files:"
    ls -lh *.sql 2>/dev/null || echo "No dump files found"
    exit 1
fi

DUMP_FILE="$1"

# Check if file exists
if [ ! -f "$DUMP_FILE" ]; then
    echo -e "${RED}Error: File $DUMP_FILE not found${NC}"
    exit 1
fi

echo -e "${YELLOW}Database Configuration:${NC}"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo "  Dump File: $DUMP_FILE"
echo ""

# Confirm import
read -p "Continue with import? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Import cancelled${NC}"
    exit 0
fi

# Create database if it doesn't exist
echo -e "${YELLOW}Creating database if not exists...${NC}"
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1

# Import dump
echo -e "${YELLOW}Importing database...${NC}"
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < "$DUMP_FILE" 2>&1

# Verify import
echo -e "${YELLOW}Verifying import...${NC}"
TABLE_COUNT=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME';" 2>&1)

echo ""
echo -e "${GREEN}✓ Import completed successfully!${NC}"
echo "  Tables imported: $TABLE_COUNT"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update .env.local with database credentials"
echo "2. Test the connection: npm run dev"
echo "3. Verify data in the application"

