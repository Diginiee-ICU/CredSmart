# Supabase + Vercel Integration Guide

## Overview
Your Final-Pos application uses:
- **Frontend**: Vite + React on Vercel
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Hosting**: Vercel (frontend) + Supabase (backend)

---

## Architecture

```
┌─────────────────────────────────────┐
│         Vercel (Frontend)           │
│  ├─ React Application (dist/)       │
│  ├─ Static Files (CSS, JS)          │
│  └─ Environment Variables           │
└────────────────┬────────────────────┘
                 │ HTTPS Requests
                 │
        ┌────────▼────────┐
        │    Internet     │
        └────────┬────────┘
                 │
┌────────────────▼────────────────────┐
│      Supabase (Backend)             │
│  ├─ PostgreSQL Database             │
│  ├─ Authentication (JWT)            │
│  ├─ Edge Functions                  │
│  │  ├─ invite-staff                 │
│  │  └─ scrape-products              │
│  └─ Real-time Subscriptions         │
└─────────────────────────────────────┘
```

---

## Configuration Details

### Supabase Project Info
- **Project URL**: https://reutxqmxiuqrmgmgrlai.supabase.co
- **Project ID**: reutxqmxiuqrmgmgrlai
- **Region**: (US East or as configured)

### Client Keys
- **Anon (Public) Key**: Used in `VITE_SUPABASE_PUBLISHABLE_KEY`
  - Safe to expose in frontend code
  - Used for public operations
  - Authentication via Row Level Security (RLS)

- **Service Role Key**: NOT exposed in frontend
  - Used only in backend/Edge Functions
  - Has full database access
  - Configured in Supabase secrets

### API Endpoints
- **REST API**: https://reutxqmxiuqrmgmgrlai.supabase.co/rest/v1
- **GraphQL API**: https://reutxqmxiuqrmgmgrlai.supabase.co/graphql/v1
- **WebSocket**: wss://reutxqmxiuqrmgmgrlai.supabase.co/realtime/v1

---

## Vercel Environment Variables

All variables needed for Supabase connectivity:

```bash
# In Vercel Dashboard > Settings > Environment Variables

VITE_SUPABASE_URL=https://reutxqmxiuqrmgmgrlai.supabase.co
VITE_SUPABASE_PROJECT_ID=reutxqmxiuqrmgmgrlai
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJldXR4cW14aXVxcm1nbWdybGFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyNTI1MzksImV4cCI6MjEwMjgyODUzOX0.T_9Gocf1w3hIrPPHsfs1AJkRMF7E6Tnn5bU_0V4RoJs
```

**Apply to**: Production, Preview, Development

---

## Edge Functions Integration

### Available Functions

#### 1. invite-staff
**Location**: `supabase/functions/invite-staff/`
**Purpose**: Send staff invitations
**Endpoint**: `https://poljzjjpzbvievrjyhwx.supabase.co/functions/v1/invite-staff`
**Auth**: Requires JWT (Bearer token)
**Secrets Used**: None
**Database Uses**: Organizations, staff_members tables

**Usage**:
```typescript
const { data, error } = await supabase.functions.invoke("invite-staff", {
  body: {
    email: "user@example.com",
    role: "admin",
    organization_id: "org-123"
  }
});
```

#### 2. scrape-products
**Location**: `supabase/functions/scrape-products/`
**Purpose**: Scrape product data from websites
**Endpoint**: `https://poljzjjpzbvievrjyhwx.supabase.co/functions/v1/scrape-products`
**Auth**: Requires JWT (Bearer token)
**Secrets Used**: 
- `GROQ_API_KEY`
- `BROWSERLESS_API_KEY`
- `CRAWL4AI_API_URL`
**External Services**:
- Groq API (AI processing)
- Browserless (headless browser)
- Crawl4AI (web scraping)

**Usage**:
```typescript
const { data, error } = await supabase.functions.invoke("scrape-products", {
  body: {
    url: "https://example.com/products",
    selectors: { /* CSS selectors */ }
  }
});
```

---

## Database Connection Flow

### From Frontend (Vercel)
1. User loads app on Vercel
2. App initializes Supabase client with:
   - URL: `https://poljzjjpzbvievrjyhwx.supabase.co`
   - Anon Key: `VITE_SUPABASE_PUBLISHABLE_KEY`
3. User logs in → JWT token issued
4. Subsequent requests include JWT
5. Row Level Security (RLS) enforces permissions

### From Edge Functions (Supabase)
1. Vercel calls Edge Function endpoint
2. Function receives request with JWT
3. JWT validated by Supabase
4. Function uses Service Role Key for database access
5. Returns response to Vercel/frontend

---

## Authentication Flow

```
1. User on Vercel fills login form
   ↓
2. Frontend calls supabase.auth.signInWithPassword()
   ↓
3. Supabase validates credentials against auth table
   ↓
4. If valid, returns JWT token
   ↓
5. Token stored in browser localStorage
   ↓
6. Subsequent requests include token in Authorization header
   ↓
7. Supabase RLS validates token for each query
   ↓
8. Only authorized data returned
```

### JWT Details
- **Algorithm**: HS256
- **Payload**: Includes user ID, role, permissions
- **TTL**: 1 hour (auto-refreshes)
- **Refresh Token**: Used to get new JWT when expired

---

## CORS Configuration

### Vercel Frontend → Supabase Backend

**Problem**: Browsers block cross-origin requests

**Solution**: Supabase allows CORS by default
- ✅ GET requests work
- ✅ POST requests work (with JWT)
- ✅ Real-time subscriptions work

**If CORS Issues**:
1. Check Supabase Project Settings > API
2. Add Vercel domain to CORS allowlist:
   - Your Vercel URL (e.g., `https://final-pos.vercel.app`)
   - Staging URLs
   - Custom domain (if used)

---

## Real-time Features

### Subscriptions (Optional)
```typescript
// Listen for changes to products table
const channel = supabase
  .channel('products')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'products' },
    (payload) => console.log(payload)
  )
  .subscribe()
```

**WebSocket**: Automatically maintains connection over HTTPS
**Rate Limits**: Check Supabase dashboard for limits

---

## Monitoring & Debugging

### View Supabase Logs
```bash
# In Supabase Dashboard
1. Go to Project Settings
2. Click "Logs" tab
3. Filter by database/functions/realtime
```

### View Vercel Logs
```bash
# In Vercel Dashboard
1. Go to Project > Deployments
2. Click current deployment
3. View "Logs" and "Function Logs"
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid/expired JWT | Login again, check token storage |
| CORS Error | Domain not in allowlist | Add Vercel domain to Supabase CORS |
| 500 Server Error | Function error | Check Supabase function logs |
| Connection Timeout | Network issue | Verify URLs, check Supabase status |
| Secrets Undefined | Not set in Supabase | Set secrets in Supabase dashboard |

---

## Security Best Practices

### ✅ Do This
- Store sensitive data in Supabase secrets (not Vercel env vars)
- Use JWT for authentication
- Enable RLS on all tables
- Keep Service Role Key private
- Rotate keys regularly (quarterly)
- Monitor Supabase audit logs

### ❌ Don't Do This
- Don't expose Service Role Key in frontend
- Don't hardcode API keys in code
- Don't disable RLS on sensitive tables
- Don't share JWT tokens
- Don't commit `.env` files
- Don't test with production credentials on public branches

---

## Scaling Considerations

### Current Setup Limits
- **API Requests**: Supabase Free tier = 50,000/day
- **Realtime Updates**: Max 100 concurrent connections
- **Storage**: 1GB database size
- **Edge Functions**: Max 512MB runtime

### For Production Scale
Consider upgrading to Supabase Pro:
- Unlimited API requests
- Better realtime performance
- Priority support
- More storage

---

## Deployment Checklist: Supabase + Vercel

- [ ] Supabase project active
- [ ] All migrations applied
- [ ] Edge Functions deployed
- [ ] Secrets configured in Supabase
- [ ] Environment variables set in Vercel
- [ ] Vercel deployed successfully
- [ ] Test Supabase connection from Vercel
- [ ] Test Edge Functions invoke
- [ ] Authentication tested
- [ ] CORS properly configured
- [ ] Domain mapping complete (if custom domain)
- [ ] SSL certificate installed (automatic)

---

## Useful Commands

```bash
# Supabase CLI
supabase status
supabase functions list
supabase functions logs invite-staff
supabase db list
supabase secrets list

# Vercel CLI
vercel ls
vercel logs final-pos
vercel env list
vercel --prod  # Deploy
```

---

## Support & Documentation

- **Supabase Status**: https://status.supabase.com
- **Vercel Status**: https://www.vercelstatus.com
- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs

---

**Integration Status**: ✅ Ready for Deployment  
**Last Updated**: February 13, 2026
