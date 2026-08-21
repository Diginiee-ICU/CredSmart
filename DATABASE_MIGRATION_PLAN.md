# Database Migration Plan: Supabase → Alternative Options

## Current Supabase Usage Analysis

### Features Used:
- ✅ PostgreSQL Database (14+ tables with complex schemas)
- ✅ Row-Level Security (RLS) policies for multi-tenant isolation
- ✅ Authentication (email/password, auth management)
- ✅ Realtime subscriptions (optional)
- ✅ Storage buckets (store-logos)
- ✅ Edge Functions (Deno-based: invite-staff, scrape-products)
- ✅ Remote Procedure Calls (RPCs): `bootstrap_organization`, `is_org_owner_or_manager`
- ✅ Complex migrations (15+ schema versions)

### Integration Depth:
- **Frontend**: ~14 pages using `@supabase/supabase-js` client
- **Backend**: 2 Deno edge functions, 4 RPCs
- **Auth**: Session management, JWT tokens, persistent login
- **Database**: 14 tables with cascading deletes, triggers, RLS policies

---

## Top Database Alternatives Comparison

### 1. **PlanetScale** ⭐ RECOMMENDED
**Type**: MySQL Serverless (free tier included)  
**Pricing**: Free tier (5GB, dev), Pro starts $39/mo  
**Speed**: Ultra-fast MySQL 8.0, optimized for HTTP  

**Pros:**
- ✅ Free tier with solid limits
- ✅ Vercel native integration
- ✅ Branching/schema migrations (like Git)
- ✅ Global edge caching
- ✅ JSON fields (similar to JSON in Postgres)
- ✅ Connection pooling (prisma/nodejs)
- ✅ Simple to migrate from Postgres

**Cons:**
- ❌ No Row-Level Security (Postgres-specific feature)
- ❌ Must implement RLS in application layer
- ❌ No native Auth (need NextAuth/Supabase Auth for free)
- ❌ No built-in storage (need S3/Vercel Blob)
- ❌ No serverless edge functions
- ⚠️ Need separate auth service

**Migration Effort**: **HIGH** (8-10 days)
- Convert RLS policies → App-level authorization
- Add NextAuth for authentication
- Connect S3/Vercel Blob for storage
- Migrate Edge Functions → Vercel Functions

**Cost**: **$39-80/mo** + auth service ($0-20/mo)

---

### 2. **Neon** ⭐⭐ BEST FOR STAYING WITH POSTGRES
**Type**: PostgreSQL Serverless (free tier)  
**Pricing**: Free tier (3GB), Pro starts $19/mo  
**Speed**: PostgreSQL on-demand, instant scaling  

**Pros:**
- ✅ 100% PostgreSQL compatible (easiest migration)
- ✅ RLS policies work unchanged
- ✅ Affordable free tier
- ✅ Serverless, scales automatically
- ✅ Connection pooling built-in
- ✅ Time-travel debugging (rewind DB)
- ✅ Zoom integration for dashboards

**Cons:**
- ❌ No authentication service (need NextAuth/Clerk)
- ❌ No storage buckets (use S3/Vercel Blob)
- ❌ No edge functions (use Vercel Functions)
- ⚠️ No RLS enforcement at DB level without middleware
- ⚠️ Free tier resets after 1 month of inactivity

**Migration Effort**: **MEDIUM** (3-5 days)
- Connect RPC calls unchanged
- Add NextAuth for authentication
- Connect Vercel Blob for storage
- No RLS policy rewrites needed

**Cost**: **$19-50/mo** + auth ($0-20/mo)

---

### 3. **Pocketbase** ⭐⭐⭐ BEST FOR SELF-HOSTING + LOW COST
**Type**: All-in-one backend (self-hosted, open-source)  
**Pricing**: Self-hosted FREE (or ~$10/mo VPS)  
**Speed**: Fast, minimal overhead  

**Pros:**
- ✅ **100% FREE** if self-hosted
- ✅ Built-in auth (email, OAuth, MFA)
- ✅ Built-in storage (file management)
- ✅ Real-time subscriptions (websockets)
- ✅ Admin dashboard included
- ✅ SDK for frontend (similar to Supabase)
- ✅ Backup/restore tools
- ✅ Open-source (self-control)
- ✅ Single binary deployment (easy DevOps)

**Cons:**
- ❌ No multi-tenant RLS (manual implementation required)
- ❌ Must manage your own hosting
- ❌ Smaller ecosystem than Supabase
- ❌ No native Vercel integration
- ❌ Different DB schema (SQLite-based, then SQL)
- ⚠️ Community-driven support

**Migration Effort**: **VERY HIGH** (14-21 days)
- Complete schema redesign (SQLite → SQL)
- Rewrite auth flows using PocketBase SDK
- Implement RLS via app logic
- Migrate storage to PocketBase buckets
- Redeploy backend infrastructure

**Cost**: **$0-120/year** (self-hosted VPS)

---

### 4. **Firebase Realtime DB + Auth** 
**Type**: NoSQL + Auth service  
**Pricing**: Spark plan FREE (generous limits)  
**Speed**: Fast, optimized for realtime  

**Pros:**
- ✅ Generous free tier
- ✅ Built-in authentication
- ✅ Realtime subscriptions (WebSocket)
- ✅ Google Cloud integration
- ✅ Easy security rules

**Cons:**
- ❌ **NO SQL** - complete data model redesign
- ❌ No complex queries (Firestore limitations)
- ❌ No RLS (security rules only)
- ❌ No arbitrary file storage
- ❌ Different paradigm (NoSQL vs relational)

**Migration Effort**: **EXTREME** (30+ days)
- Redesign all 14 tables as NoSQL collections
- Rewrite all queries (no JOINs)
- Implement RLS in security rules
- Complete app logic rewrite

**Cost**: **FREE → $25/mo** (as you scale)

---

### 5. **Appwrite** ⭐⭐ (Self-hosted)
**Type**: Open-source backend-as-a-service  
**Pricing**: Self-hosted FREE (or managed $20+/mo)  
**Speed**: Good, modular architecture  

**Pros:**
- ✅ PostgreSQL backend available
- ✅ Built-in auth (multiple providers)
- ✅ Storage included
- ✅ Functions (Node.js, Python, Deno)
- ✅ RLS via document permissions
- ✅ Open-source
- ✅ Docker deployment

**Cons:**
- ⚠️ Less mature than Pocketbase/Supabase
- ❌ Complex deployment
- ❌ Smaller community
- ❌ Less optimized for performance

**Migration Effort**: **HIGH** (10-15 days)

**Cost**: **$0-200/year** (self-hosted) or managed service

---

### 6. **Render** (PostgreSQL + Services)
**Type**: PostgreSQL + managed services  
**Pricing**: Free tier available  
**Speed**: Good, US-based  

**Pros:**
- ✅ Free tier PostgreSQL (512MB)
- ✅ Easy Vercel integration
- ✅ Simple management UI

**Cons:**
- ❌ No authentication
- ❌ No storage
- ❌ No RLS
- ❌ Free tier limited

**Migration Effort**: **HIGH** (must add auth + storage)

**Cost**: **$7-50/mo** + auth service

---

## Recommendation Matrix

| Criteria | PlanetScale | Neon | Pocketbase | Firebase | Appwrite | Render |
|----------|------------|------|-----------|----------|----------|--------|
| **Free/Cheap** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Speed** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Migration Ease** | ⭐ | ⭐⭐⭐ | ⭐ | ❌ | ⭐ | ⭐⭐ |
| **Feature Match** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ | ⭐⭐ | ⭐ |
| **RLS Support** | ❌ | ✅ | ⚠️ Manual | ❌ | ⚠️ Partial | ❌ |
| **Built-in Auth** | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Storage** | ❌ | ❌ | ✅ | ❌ | ⚠️ | ❌ |
| **Edge Functions** | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Community** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |

---

## Top 3 Ranked Solutions

### 🥇 **Option 1: Neon (PostgreSQL) + Vercel** — BEST BALANCE
- **Total Cost**: ~$19-40/mo
- **Migration Time**: 3-5 days
- **Recommendation**: If you want minimal changes + Postgres RLS

**Stack**:
- Database: Neon (PostgreSQL)
- Auth: NextAuth.js (free) or Clerk ($0-25/mo)
- Storage: Vercel Blob ($5-20/mo)
- Edge Functions: Vercel Functions (free)

**Migration Path**:
1. Create Neon project, dump Supabase schema
2. Replace `@supabase/supabase-js` with Postgres client (pg)
3. Add NextAuth for authentication
4. Migrate storage to Vercel Blob
5. Redeploy functions to Vercel

---

### 🥈 **Option 2: Pocketbase (Self-Hosted)** — CHEAPEST LONG-TERM
- **Total Cost**: $0-120/year
- **Migration Time**: 14-21 days
- **Recommendation**: If budget is critical, willing to manage infrastructure

**Stack**:
- Everything built-in (auth, storage, DB, realtime)
- Deploy on: Railway ($5-10/mo), Render, or your VPS

**Migration Path**:
1. Design PocketBase schema (SQL-based)
2. Migrate data with custom scripts
3. Rewrite auth flows using PocketBase SDK
4. Implement RLS via app logic
5. Deploy to Railway or similar

---

### 🥉 **Option 3: PlanetScale + NextAuth** — MODERN MYSQL STACK
- **Total Cost**: $39-80/mo
- **Migration Time**: 8-10 days
- **Recommendation**: If you prefer MySQL over Postgres, want Vercel native

**Stack**:
- Database: PlanetScale (MySQL)
- Auth: NextAuth.js or Auth0
- Storage: Vercel Blob or S3
- ORM: Prisma (auto-generated)

**Migration Path**:
1. Create PlanetScale database
2. Convert Postgres schema → MySQL
3. Set up Prisma for ORM
4. Implement RLS in application layer
5. Migrate storage and auth

---

## Detailed Migration Steps (Option 1: Neon)

### Phase 1: Setup (1 day)
```bash
# 1. Create Neon project
# → https://neon.tech

# 2. Create Neon database
# 3. Get connection string: postgresql://user:password@host/dbname

# 4. Export Supabase schema
pg_dump -h db.XX.supabase.co -U postgres -d postgres --schema-only > schema.sql

# 5. Import to Neon
psql postgresql://user@host/dbname < schema.sql

# 6. Migrate data
pg_dump -h db.XX.supabase.co -U postgres -d postgres --data-only > data.sql
psql postgresql://user@host/dbname < data.sql
```

### Phase 2: Update Frontend (2 days)
```typescript
// Remove: @supabase/supabase-js
// Add: next-auth, @vercel/postgres

// Convert all Supabase queries:
// OLD:
const { data } = await supabase.from('users').select('*');

// NEW (with NextAuth):
const { data } = await postgres.query(
  'SELECT * FROM users WHERE user_id = $1',
  [session.user.id]
);
```

### Phase 3: Auth Migration (1 day)
- Set up NextAuth.js or Clerk
- Migrate user sessions
- Update Auth.tsx to use NextAuth
- Test login/signup flows

### Phase 4: Storage Migration (1 day)
- Set up Vercel Blob
- Migrate store-logos to Blob storage
- Update Settings.tsx to use Blob API

### Phase 5: Edge Functions (1 day)
- Redeploy to Vercel Functions
- Update environment variables
- Test invite-staff and scrape-products

### Phase 6: Testing & Deployment (1 day)
- Full regression testing
- Staging deployment
- Production cutover

---

## Cost Comparison (12-month)

| Option | Setup | Monthly | Annual | Notes |
|--------|-------|---------|--------|-------|
| **Supabase** (current) | $0 | $25-100 | $300-1200 | Generous free tier |
| **Neon + NextAuth** | $0 | $19-40 | $228-480 | **SAVINGS: up to 70%** |
| **Pocketbase** | $50 | $5-10 | $110-170 | **SAVINGS: up to 85%** |
| **PlanetScale** | $0 | $39-80 | $468-960 | Modern MySQL stack |
| **Firebase** | $0 | $25-50 | $300-600 | Generous free tier |

---

## Risk Analysis

### ❌ **High Risk**
- Firebase (complete app redesign)
- Pocketbase (infrastructure management)

### ⚠️ **Medium Risk**
- PlanetScale (RLS implementation)
- Appwrite (less stable APIs)

### ✅ **Low Risk**
- Neon (99% Postgres compatible)

---

## Final Recommendation

**For your use case (POS system with multi-tenant RLS):**

### 🎯 **Primary Choice: Neon PostgreSQL + NextAuth**
- **Why**: Minimal refactoring, RLS policies unchanged, 70% cheaper
- **Timeline**: 5 days to production
- **Risk**: Low (PostgreSQL compatibility)
- **Long-term**: Cost savings + scalability

### 🎯 **Alternative if budget priority: Pocketbase**
- **Why**: 85% savings, all-in-one, self-hosted control
- **Timeline**: 3 weeks to production
- **Risk**: Medium (infrastructure + schema redesign)
- **Long-term**: Lowest TCO if you can manage ops

### ❌ **Avoid: Firebase**
- Complete app rewrite needed (30+ days)
- NoSQL not suitable for POS inventory management

---

## Next Steps

1. **Decision**: Which option appeals most? (Neon, Pocketbase, or PlanetScale?)
2. **POC**: Create test instance, migrate sample data
3. **Timeline**: 2-week sprint if Neon, 3-week if Pocketbase
4. **Team**: Need dedicated DevOps for self-hosted options
5. **Testing**: Staging environment for RLS/auth validation

---

**Questions to decide:**
- Q1: How critical is cost savings? (Drives Neon vs Pocketbase)
- Q2: Do you want to manage servers? (Drives Pocketbase)
- Q3: Is speed of migration critical? (Drives Neon)
- Q4: Do you need edge functions? (Keeps Supabase/Firebase)
