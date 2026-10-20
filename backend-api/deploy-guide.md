# CredSmart Master Production Deployment Guide

Follow these simple steps on your Ubuntu server (`woodzire@credsmart:~/server$`) to deploy the updated backend routes, run the database alignment migration, and verify health.

> [!NOTE]
> **No Heredocs (`cat << 'EOF'`)**: This deployment strictly uses direct archive extraction and `< file.sql` input redirection.

---

## Method 1: Using `backend-api.tar.gz` (Recommended & Fastest)

### Step 1: Transfer the archive to your server
From your local Windows terminal (where `backend-api.tar.gz` is located):
```bash
scp backend-api.tar.gz woodzire@credsmart:~/server/
```

*(Alternatively, if you are editing directly or have git synced, pull the latest files into `~/server/api/`)*

### Step 2: Extract the package on your Ubuntu server
On `woodzire@credsmart:~/server$`:
```bash
cd ~/server
tar -xzvf backend-api.tar.gz -C api/
cp api/fix_db.sql ./fix_db.sql
cp api/add_indexes.sql ./add_indexes.sql
chmod +x api/deploy-fix.sh
```

### Step 3: Run the one-click deployment script
```bash
./api/deploy-fix.sh
```

This automated script will:
1. Apply the master `fix_db.sql` migration to `postgres-db` (synchronizing `org_id` ⟷ `organization_id` on all 42 tables and adding all missing columns).
2. Apply high-performance tenant indexes (`add_indexes.sql`).
3. Rebuild and restart the `backend-api` container (`docker compose up -d --build api`).
4. Warm up and verify the health check at `http://localhost:3000/health`.

---

## Method 2: Manual Step-by-Step Commands

If you prefer running each step individually:

### 1. Apply Database Alignment & Columns
```bash
docker exec -i postgres-db psql -U postgres -d app_db < ~/server/fix_db.sql
```

### 2. Apply Performance Indexes
```bash
docker exec -i postgres-db psql -U postgres -d app_db < ~/server/add_indexes.sql
```

### 3. Rebuild & Restart Backend Container
```bash
cd ~/server
docker compose up -d --build api
```

### 4. Verify Health & Logs
```bash
curl -s http://localhost:3000/health
docker logs backend-api --tail 20
```

---

## Verification Checklist

| Test Item | Verification Command / URL | Expected Result |
|---|---|---|
| **API Health** | `curl -s https://api.credsmart.online/health` | `{"status":"ok",...}` (HTTP 200) |
| **Storefront Route** | `curl -s https://api.credsmart.online/api/storefront-settings` | No 404 (Returns settings or null) |
| **Customers Endpoint** | `curl -s -H "Authorization: Bearer <token>" https://api.credsmart.online/api/customers` | Array of customers (HTTP 200, no column error) |
| **Products Endpoint** | `curl -s -H "Authorization: Bearer <token>" https://api.credsmart.online/api/products` | Array of products (HTTP 200, no column error) |
| **Bill Generation** | Click "Generate Bill" on Mobile / Web | **< 500ms** instant transition to Success Screen |
