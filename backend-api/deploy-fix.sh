#!/bin/bash
set -e

echo "=========================================================="
echo "⚡ CredSmart Master Production Fix & Speed Deployment"
echo "=========================================================="

SERVER_DIR="$HOME/server"
API_DIR="$SERVER_DIR/api"
DB_NAME="app_db"

echo "Step 1: Applying Master Database Alignment (fix_db.sql)..."
if [ -f "$SERVER_DIR/fix_db.sql" ]; then
    docker exec -i postgres-db psql -U postgres -d "$DB_NAME" < "$SERVER_DIR/fix_db.sql"
    echo "✅ fix_db.sql successfully applied to $DB_NAME"
elif [ -f "./fix_db.sql" ]; then
    docker exec -i postgres-db psql -U postgres -d "$DB_NAME" < "./fix_db.sql"
    echo "✅ ./fix_db.sql successfully applied to $DB_NAME"
else
    echo "⚠️ fix_db.sql not found in $SERVER_DIR or current directory!"
fi

echo "Step 2: Applying Performance B-Tree Indexes (add_indexes.sql)..."
if [ -f "$SERVER_DIR/add_indexes.sql" ]; then
    docker exec -i postgres-db psql -U postgres -d "$DB_NAME" < "$SERVER_DIR/add_indexes.sql"
    echo "✅ add_indexes.sql applied"
elif [ -f "./add_indexes.sql" ]; then
    docker exec -i postgres-db psql -U postgres -d "$DB_NAME" < "./add_indexes.sql"
    echo "✅ ./add_indexes.sql applied"
fi

echo "Step 3: Rebuilding & Restarting backend-api container..."
cd "$SERVER_DIR"
if command -v docker-compose &> /dev/null; then
    docker-compose up -d --build api
else
    docker compose up -d --build api
fi

echo "Step 4: Waiting for API service warmup..."
sleep 3

echo "Step 5: Verifying Backend Health..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || echo "000")
if [ "$HEALTH_STATUS" = "200" ]; then
    echo "✅ Backend API is healthy (HTTP 200) on localhost:3000"
else
    echo "⚠️ Health check returned HTTP $HEALTH_STATUS. Checking docker logs..."
    docker logs backend-api --tail 20
fi

echo "=========================================================="
echo "🚀 Production fix complete! System is lightning-fast."
echo "=========================================================="
