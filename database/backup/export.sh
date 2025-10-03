#!/bin/bash

# Export script for Afina DAO Wiki database
# Usage: ./export.sh [type]
# Types: full (default), schema, data

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_NAME="${DB_NAME:-afina_dao_wiki}"
BACKUP_DIR="$(dirname "$0")"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_TYPE="${1:-full}"

echo -e "${GREEN}=== Afina DAO Wiki Database Export ===${NC}"
echo ""

# Validate backup type
case "$BACKUP_TYPE" in
    full|schema|data)
        ;;
    *)
        echo -e "${RED}Error: Invalid backup type '$BACKUP_TYPE'${NC}"
        echo "Valid types: full, schema, data"
        exit 1
        ;;
esac

echo -e "${YELLOW}Export Configuration:${NC}"
echo "  Type: $BACKUP_TYPE"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo "  Backup Directory: $BACKUP_DIR"
echo ""

# Build mysqldump command based on type
DUMP_OPTIONS="--no-tablespaces --single-transaction --quick --lock-tables=false"

case "$BACKUP_TYPE" in
    full)
        FILENAME="afina_dao_wiki_full_${TIMESTAMP}.sql"
        DUMP_OPTIONS="$DUMP_OPTIONS --routines --triggers"
        echo -e "${YELLOW}Creating full backup (schema + data + routines + triggers)...${NC}"
        ;;
    schema)
        FILENAME="afina_dao_wiki_schema_${TIMESTAMP}.sql"
        DUMP_OPTIONS="$DUMP_OPTIONS --no-data --routines --triggers"
        echo -e "${YELLOW}Creating schema backup (no data)...${NC}"
        ;;
    data)
        FILENAME="afina_dao_wiki_data_${TIMESTAMP}.sql"
        DUMP_OPTIONS="$DUMP_OPTIONS --no-create-info --complete-insert"
        echo -e "${YELLOW}Creating data backup (no schema)...${NC}"
        ;;
esac

FILEPATH="$BACKUP_DIR/$FILENAME"

# Create backup
mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" $DUMP_OPTIONS "$DB_NAME" > "$FILEPATH" 2>&1

# Check if backup was created
if [ ! -f "$FILEPATH" ]; then
    echo -e "${RED}Error: Backup file was not created${NC}"
    exit 1
fi

# Get file size
FILE_SIZE=$(ls -lh "$FILEPATH" | awk '{print $5}')

# Count tables
TABLE_COUNT=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME';" 2>&1)

echo ""
echo -e "${GREEN}✓ Export completed successfully!${NC}"
echo "  File: $FILENAME"
echo "  Size: $FILE_SIZE"
echo "  Tables: $TABLE_COUNT"
echo "  Path: $FILEPATH"
echo ""

# Optionally compress
read -p "Compress backup with gzip? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Compressing...${NC}"
    gzip "$FILEPATH"
    COMPRESSED_SIZE=$(ls -lh "$FILEPATH.gz" | awk '{print $5}')
    echo -e "${GREEN}✓ Compressed: ${FILENAME}.gz ($COMPRESSED_SIZE)${NC}"
fi

echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test restore: ./import.sh $FILENAME"
echo "2. Transfer to server: scp $FILENAME user@server:/path/"
echo "3. Keep backups secure and encrypted"

