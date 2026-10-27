#!/bin/bash
set -e

echo "=========================================================="
echo "⚡ CredSmart Master Production Fix & Speed Deployment"
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
API_DIR="$SCRIPT_DIR"

if [ ! -f "$SERVER_DIR/docker-compose.yml" ] && [ -d "$HOME/server" ]; then
    SERVER_DIR="$HOME/server"
fi

echo "📁 Script Dir: $SCRIPT_DIR"
echo "📁 Server Dir: $SERVER_DIR"

# 1. Detect DB Name and Postgres Container
DB_NAME="app_db"
if [ -f "$SERVER_DIR/.env" ]; then
    ENV_DB=$(grep -E "^POSTGRES_DB=" "$SERVER_DIR/.env" 2>/dev/null | cut -d '=' -f2 | tr -d ' "' || true)
    if [ -n "$ENV_DB" ]; then
        DB_NAME="$ENV_DB"
    fi
fi

# Detect postgres container name
PG_CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E 'postgres|db' | head -n 1 || true)
if [ -z "$PG_CONTAINER" ]; then
    PG_CONTAINER="postgres-db"
fi

echo "📊 Target Database: $DB_NAME"
echo "🐳 PostgreSQL Container: $PG_CONTAINER"

# 2. Locate newest fix_db.sql and add_indexes.sql
SQL_SOURCE=""
if [ -f "$SCRIPT_DIR/fix_db.sql" ]; then
    SQL_SOURCE="$SCRIPT_DIR/fix_db.sql"
elif [ -f "$API_DIR/fix_db.sql" ]; then
    SQL_SOURCE="$API_DIR/fix_db.sql"
elif [ -f "$SERVER_DIR/fix_db.sql" ]; then
    SQL_SOURCE="$SERVER_DIR/fix_db.sql"
elif [ -f "./fix_db.sql" ]; then
    SQL_SOURCE="./fix_db.sql"
fi

INDEX_SOURCE=""
if [ -f "$SCRIPT_DIR/add_indexes.sql" ]; then
    INDEX_SOURCE="$SCRIPT_DIR/add_indexes.sql"
elif [ -f "$API_DIR/add_indexes.sql" ]; then
    INDEX_SOURCE="$API_DIR/add_indexes.sql"
elif [ -f "$SERVER_DIR/add_indexes.sql" ]; then
    INDEX_SOURCE="$SERVER_DIR/add_indexes.sql"
elif [ -f "./add_indexes.sql" ]; then
    INDEX_SOURCE="./add_indexes.sql"
fi

CLEAN_MEMBERSHIP_SOURCE=""
if [ -f "$SCRIPT_DIR/clean_cross_memberships.sql" ]; then
    CLEAN_MEMBERSHIP_SOURCE="$SCRIPT_DIR/clean_cross_memberships.sql"
elif [ -f "$API_DIR/clean_cross_memberships.sql" ]; then
    CLEAN_MEMBERSHIP_SOURCE="$API_DIR/clean_cross_memberships.sql"
elif [ -f "$SERVER_DIR/clean_cross_memberships.sql" ]; then
    CLEAN_MEMBERSHIP_SOURCE="$SERVER_DIR/clean_cross_memberships.sql"
elif [ -f "./clean_cross_memberships.sql" ]; then
    CLEAN_MEMBERSHIP_SOURCE="./clean_cross_memberships.sql"
fi

# Sync to SERVER_DIR so both locations are updated with the latest version
if [ -n "$SQL_SOURCE" ] && [ "$SQL_SOURCE" != "$SERVER_DIR/fix_db.sql" ]; then
    cp "$SQL_SOURCE" "$SERVER_DIR/fix_db.sql" 2>/dev/null || true
fi
if [ -n "$INDEX_SOURCE" ] && [ "$INDEX_SOURCE" != "$SERVER_DIR/add_indexes.sql" ]; then
    cp "$INDEX_SOURCE" "$SERVER_DIR/add_indexes.sql" 2>/dev/null || true
fi
if [ -n "$CLEAN_MEMBERSHIP_SOURCE" ] && [ "$CLEAN_MEMBERSHIP_SOURCE" != "$SERVER_DIR/clean_cross_memberships.sql" ]; then
    cp "$CLEAN_MEMBERSHIP_SOURCE" "$SERVER_DIR/clean_cross_memberships.sql" 2>/dev/null || true
fi

echo "Step 1: Applying Master Database Alignment (fix_db.sql)..."
if [ -n "$SQL_SOURCE" ] && [ -f "$SQL_SOURCE" ]; then
    docker exec -i "$PG_CONTAINER" psql -U postgres -d "$DB_NAME" < "$SQL_SOURCE"
    echo "✅ fix_db.sql successfully applied to $DB_NAME"
else
    echo "⚠️ fix_db.sql not found!"
fi

echo "Step 2: Applying Performance B-Tree Indexes (add_indexes.sql)..."
if [ -n "$INDEX_SOURCE" ] && [ -f "$INDEX_SOURCE" ]; then
    docker exec -i "$PG_CONTAINER" psql -U postgres -d "$DB_NAME" < "$INDEX_SOURCE"
    echo "✅ add_indexes.sql applied"
else
    echo "⚠️ add_indexes.sql not found!"
fi

echo "Step 2b: Applying Cross-Tenant Membership Cleanup (clean_cross_memberships.sql)..."
if [ -n "$CLEAN_MEMBERSHIP_SOURCE" ] && [ -f "$CLEAN_MEMBERSHIP_SOURCE" ]; then
    docker exec -i "$PG_CONTAINER" psql -U postgres -d "$DB_NAME" < "$CLEAN_MEMBERSHIP_SOURCE"
    echo "✅ clean_cross_memberships.sql successfully applied"
else
    echo "ℹ️ clean_cross_memberships.sql not found (skipped)"
fi

echo "Step 3: Rebuilding & Restarting backend container..."
cd "$SERVER_DIR"
if command -v docker-compose &> /dev/null; then
    docker-compose up -d --build api 2>/dev/null || docker-compose up -d --build backend-api 2>/dev/null || docker-compose up -d --build
else
    docker compose up -d --build api 2>/dev/null || docker compose up -d --build backend-api 2>/dev/null || docker compose up -d --build
fi

echo "Step 4: Waiting for API service warmup..."
sleep 3

echo "Step 5: Verifying Backend Health..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || echo "000")
if [ "$HEALTH_STATUS" = "200" ]; then
    echo "✅ Backend API is healthy (HTTP 200) on localhost:3000"
else
    echo "⚠️ Health check returned HTTP $HEALTH_STATUS. Checking docker logs..."
    docker logs backend-api --tail 20 2>/dev/null || docker logs api --tail 20 2>/dev/null || true
fi

echo "=========================================================="
echo "🚀 Production fix complete! System is lightning-fast."
echo "=========================================================="
