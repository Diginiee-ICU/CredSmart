# CredSmart Master Production Deployment Guide

Follow these steps on your Ubuntu server (`woodzire@credsmart:~/server$`) to deploy the updated backend routes, run the database alignment and tenant cleanup migration, update the frontend, and verify health.

> [!NOTE]
> **No Heredocs (`cat << 'EOF'`)**: This deployment strictly uses direct archive extraction and `< file.sql` input redirection.

---

## Part A: Backend API & Database Deployment

### Method 1: Automated Deployment via `backend-api.tar.gz` (Recommended)

#### Step 1: Transfer the archive to your server
From your local terminal (in the CredSmart root folder where `backend-api.tar.gz` is located):
```bash
scp backend-api.tar.gz woodzire@credsmart:~/server/
```
*(If your SSH hostname or user differs, replace `woodzire@credsmart` with your actual server user/host, e.g. `user@your-server-ip`)*

#### Step 2: Extract the package on your Ubuntu server
On your Ubuntu server terminal:
```bash
cd ~/server
tar -xzvf backend-api.tar.gz -C api/
cp api/fix_db.sql ./fix_db.sql
cp api/add_indexes.sql ./add_indexes.sql
cp api/clean_cross_memberships.sql ./clean_cross_memberships.sql
chmod +x api/deploy-fix.sh
```

#### Step 3: Run the one-click deployment script
```bash
./api/deploy-fix.sh
```

This automated script will:
1. Apply the master `fix_db.sql` schema alignment to `postgres-db`.
2. Apply high-performance tenant indexes (`add_indexes.sql`).
3. Apply cross-tenant membership cleanup (`clean_cross_memberships.sql`) to purge leaked orphan rows.
4. Rebuild and restart the `backend-api` container (`docker compose up -d --build api`).
5. Warm up and verify the health check at `http://localhost:3000/health`.

---

### Method 2: Manual Step-by-Step Commands

If you prefer executing each step manually on the Ubuntu server:

#### 1. Clean Up Cross-Tenant Memberships (Fixes User Leakage)
```bash
docker exec -i postgres-db psql -U postgres -d app_db < ~/server/clean_cross_memberships.sql
```

#### 2. Apply Database Alignment & Columns
```bash
docker exec -i postgres-db psql -U postgres -d app_db < ~/server/fix_db.sql
```

#### 3. Apply Performance Indexes
```bash
docker exec -i postgres-db psql -U postgres -d app_db < ~/server/add_indexes.sql
```

#### 4. Rebuild & Restart Backend Container
```bash
cd ~/server
docker compose up -d --build api
```

#### 5. Verify Health & Logs
```bash
curl -s http://localhost:3000/health
docker logs backend-api --tail 20
```

---

## Part B: Frontend Build & Deployment

Since the frontend application code was updated (Lockdown Guard, Command Header, Salary Roster concurrent queries, Task foreign-key fixes):

### If Frontend is Deployed from your Ubuntu Server (e.g. Nginx or Docker):
```bash
# 1. Pull the latest git changes
git pull origin main

# 2. Build the production bundle
npm run build

# 3. If using Nginx / static web directory:
sudo cp -r dist/* /var/www/html/
# Or restart frontend container if dockerized:
docker compose restart frontend
```

### If Frontend is Deployed via Cloudflare Pages / Vercel:
Push your git branch to GitHub. The connected Cloudflare Pages or Vercel pipeline will automatically build and publish the latest `/dist` bundle.

---

## Part C: Verification Checklist

| Test Item | Verification Command / URL | Expected Result |
|---|---|---|
| **API Health** | `curl -s https://api.credsmart.online/health` | `{"status":"ok",...}` (HTTP 200) |
| **Auth Tenant Check** | Log in as new user | Only sees their own org & created staff |
| **Staff Refresh Test** | Create/assign a staff member in CRM -> Refresh page | Staff stays assigned with correct role |
| **Salary Management** | Navigate to `/crm/salary` | All created staff display in roster |
| **Task Assignment** | Create a task assigned to a staff member | Task assigns successfully |
| **POS Lockdown** | Log in as non-billing staff -> Visit `/pos` | Instant redirect to `/crm` with warning toast |
| **Speed Check** | Navigate across CRM tabs | Instant loading with micro-cache (< 50ms) |
