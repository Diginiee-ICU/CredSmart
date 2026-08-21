# Vercel Deployment Quick Start

## 5-Minute Quick Deploy

### Step 1: Prepare Project
```bash
# Ensure everything is committed and pushed
git status
git push origin main
```

### Step 2: Go to Vercel
Visit https://vercel.com/new

### Step 3: Connect Repository
1. Click "Import Git Repository"
2. Search for `Final-Pos` repository
3. Click "Import"

### Step 4: Configure Project
**Settings Page** will appear:
- **Project Name**: final-pos (auto-filled)
- **Framework Preset**: Vite ✓
- **Build Command**: `npm run build` ✓
- **Output Directory**: `dist` ✓

Click "Continue"

### Step 5: Add Environment Variables
Click "Add Environment Variables" and add:

```
VITE_SUPABASE_URL: https://reutxqmxiuqrmgmgrlai.supabase.co

VITE_SUPABASE_PROJECT_ID: reutxqmxiuqrmgmgrlai

VITE_SUPABASE_PUBLISHABLE_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJldXR4cW14aXVxcm1nbWdybGFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyNTI1MzksImV4cCI6MjEwMjgyODUzOX0.T_9Gocf1w3hIrPPHsfs1AJkRMF7E6Tnn5bU_0V4RoJs
```

**Apply to**: Production, Preview, Development

Click "Deploy"

### Step 6: Wait for Build
- Build takes ~2-5 minutes
- Watch the deployment logs
- Once "Ready" shows, click the live URL

### Step 7: Test
- [ ] Page loads
- [ ] No console errors (F12)
- [ ] Can access Supabase
- [ ] Try login/signup

**Done! 🎉**

---

## Deploy Changes (After Initial Setup)

### Option A: Automatic (Recommended)
```bash
git push origin main
# Vercel automatically redeploys
```

### Option B: Manual CLI
```bash
npm i -g vercel  # One time only
vercel --prod
```

### Option C: Manual Dashboard
1. Go to https://vercel.com/dashboard
2. Select `final-pos` project
3. Go to Deployments tab
4. Click "Redeploy" on latest deployment

---

## Environment Variables Reference

### How to Update Them
1. Vercel Dashboard > Project > Settings
2. Click "Environment Variables"
3. Edit or add variables
4. **Redeploy** after changes

### Current Variables
| Name | Value | Used For |
|------|-------|----------|
| `VITE_SUPABASE_URL` | https://reutxqmxiuqrmgmgrlai.supabase.co | Supabase host |
| `VITE_SUPABASE_PROJECT_ID` | reutxqmxiuqrmgmgrlai | Project ID |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | (JWT token) | Client auth |

---

## Troubleshooting Quick Fixes

### "Build failed"
```bash
# Try rebuilding locally first
npm run build

# Clear Vercel cache and redeploy
# Vercel Dashboard > Settings > Deployment > Redeploy
```

### "Environment variables undefined"
1. Verify variables are added in Vercel Settings
2. Check variable names (must start with `VITE_`)
3. Redeploy after adding
4. Refresh browser (Ctrl+Shift+R for hard refresh)

### "Can't connect to Supabase"
1. Check Supabase project is running
2. Verify URL in environment variable
3. Check browser DevTools Network tab
4. Try from different network

### "Functions not working"
1. Check Supabase Edge Functions are deployed
2. Verify secrets are set in Supabase
3. Check Authorization header in requests
4. Review function logs in browser console

---

## Useful Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Project URL**: Will be provided after first deployment
- **Supabase Dashboard**: https://supabase.com/projects
- **Vercel Docs**: https://vercel.com/docs

---

## Important Remember

- **Never** put `.env` file in GitHub
- **Always** use Vercel's Environment Variables feature
- **Check** deployment logs for errors
- **Redeploy** after changing environment variables
- **Test** functionality after each deployment

---

Need help? Check `VERCEL_DEPLOYMENT_PLAN.md` for detailed guide
