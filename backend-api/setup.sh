#!/bin/bash
set -e

echo "=================================================="
echo "🚀 CredSmart Backend API & Database Auto-Deployer"
echo "=================================================="

SERVER_DIR="$HOME/server"
API_DIR="$SERVER_DIR/api"
SRC_DIR="$API_DIR/src"
ROUTES_DIR="$SRC_DIR/routes"
MIDDLEWARE_DIR="$SRC_DIR/middleware"

# 1. Create directories
mkdir -p "$ROUTES_DIR" "$MIDDLEWARE_DIR" "$SERVER_DIR/uploads"

echo "📁 Directories ensured at $API_DIR"

# 2. Ensure JWT_SECRET exists in .env
if ! grep -q "JWT_SECRET=" "$SERVER_DIR/.env" 2>/dev/null; then
    RANDOM_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "credsmart_super_secret_jwt_key_2026")
    echo "JWT_SECRET=$RANDOM_SECRET" >> "$SERVER_DIR/.env"
    echo "🔑 Generated and appended JWT_SECRET to $SERVER_DIR/.env"
fi

if ! grep -q "API_BASE_URL=" "$SERVER_DIR/.env" 2>/dev/null; then
    echo "API_BASE_URL=https://api.credsmart.online" >> "$SERVER_DIR/.env"
    echo "🌐 Appended API_BASE_URL to $SERVER_DIR/.env"
fi

echo "✅ Environment configured."
echo "=================================================="
