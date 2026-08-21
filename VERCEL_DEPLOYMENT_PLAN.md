# Vercel Deployment Plan for Final-Pos

## Project Overview

- **Framework**: React + Vite (TypeScript)
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Build Command**: `npm run build`
- **Dist Directory**: `dist`

---

## Phase 1: Pre-Deployment Setup

### 1.1 Prerequisites

- [ ] Vercel account created (<https://vercel.com>)
- [ ] GitHub repository connected to Vercel
- [ ] Supabase project deployed (`poljzjjpzbvievrjyhwx`)
- [ ] All secrets configured in Supabase
- [ ] Local testing completed successfully

### 1.2 Create vercel.json Configuration File

Create a `vercel.json` file in the root directory:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "nodeVersion": "20.x"
}
```

### 1.3 Update package.json (if needed)

Ensure these scripts exist:

- `npm run build` - Production build
- `npm run dev` - Development server
- `npm run preview` - Preview production build

---

## Phase 2: Environment Variables Setup

### 2.1 Add to Vercel Project Settings

Create environment variables in Vercel dashboard under **Settings > Environment Variables**:

| Variable | Value | Environment |
| ---------- | ------- | ------------- |
| `VITE_SUPABASE_URL` | `https://reutxqmxiuqrmgmgrlai.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_PROJECT_ID` | `reutxqmxiuqrmgmgrlai` | Production, Preview, Development |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJldXR4cW14aXVxcm1nbWdybGFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyNTI1MzksImV4cCI6MjEwMjgyODUzOX0.T_9Gocf1w3hIrPPHsfs1AJkRMF7E6Tnn5bU_0V4RoJs` | Production, Preview, Development |

**Note**: These are Vite client-side variables (prefix `VITE_` is required).

### 2.2 Verify `.env` File (Local Development)

The local `.env` file should contain:

```
VITE_SUPABASE_URL=https://reutxqmxiuqrmgmgrlai.supabase.co
VITE_SUPABASE_PROJECT_ID=reutxqmxiuqrmgmgrlai
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJldXR4cW14aXVxcm1nbWdybGFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyNTI1MzksImV4cCI6MjEwMjgyODUzOX0.T_9Gocf1w3hIrPPHsfs1AJkRMF7E6Tnn5bU_0V4RoJs
```

---

## Phase 3: Deployment Steps

### 3.1 Connect Repository to Vercel

```bash
# Option 1: Using Vercel CLI
npm i -g vercel
vercel login
vercel

# Option 2: Via Vercel Dashboard
# 1. Go to https://vercel.com/new
# 2. Click "Import Git Repository"
# 3. Select your GitHub repository
# 4. Configure project settings
```

### 3.2 Configure Build Settings in Vercel

**Project Settings → General**

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: 20.x

### 3.3 Add Environment Variables

**Project Settings → Environment Variables**

- Add all variables from Phase 2.1
- Ensure they're available for Production, Preview, and Development environments

### 3.4 Deploy

```bash
# Automatic: Push to main branch (if configured)
git push origin main

# Manual via CLI:
vercel --prod

# Or deploy via Vercel Dashboard:
# Settings > Deployments > Redeploy
```

---

## Phase 4: Post-Deployment Verification

### 4.1 Verify Build Output

- [ ] Check build logs for errors
- [ ] Verify `dist/` folder was created with assets
- [ ] Confirm all TypeScript compilation successful

### 4.2 Test Application Functionality

- [ ] Application loads successfully
- [ ] Supabase connection works
- [ ] Authentication flow works (login/signup)
- [ ] API calls to Edge Functions work
- [ ] No console errors in browser DevTools

### 4.3 Performance & Security

- [ ] Check Core Web Vitals (Vercel Analytics)
- [ ] Verify HTTPS enabled
- [ ] Test on multiple browsers/devices
- [ ] Check for mixed content warnings

### 4.4 API Integration Testing

- [ ] Edge Function: `invite-staff` responds correctly
- [ ] Edge Function: `scrape-products` responds correctly
- [ ] Supabase secrets accessible to functions
- [ ] Database queries work

---

## Phase 5: Troubleshooting

### Build Fails

```
Error: ENOENT: no such file or directory
```

**Solution**:

- Clear cache: `vercel env list` then redeploy
- Check all dependencies installed: `npm install`
- Verify package.json scripts

### Environment Variables Not Loading

```
VITE_SUPABASE_URL is undefined
```

**Solution**:

- Ensure variable names start with `VITE_`
- Verify variables added to all environments (Production, Preview, Development)
- Redeploy after adding variables
- Check browser console for actual values

### Supabase Connection Issues

```
Error: Failed to connect to Supabase
```

**Solution**:

- Verify Supabase project is running
- Check network requests in browser DevTools
- Verify CORS settings in Supabase
- Confirm URL and key are correct

### Edge Functions Not Found

```
404: Function not found
```

**Solution**:

- Verify functions deployed: `supabase functions list`
- Check function names match in code
- Verify secrets are set
- Redeploy functions: `supabase functions deploy`

### CORS Errors

```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution**:

- Check Supabase project Settings > API CORS
- Add Vercel domain to allowed origins
- Check Edge Function CORS headers

---

## Phase 6: Continuous Deployment Setup

### 6.1 Automatic Deployments

**Settings > Git**

- **Deployments**: Automatic (trigger on push to main)
- **Pull Request Previews**: Enabled
- **Preview Deployment Comments**: Enabled

### 6.2 Branch Configuration

- **Production Branch**: `main`
- **Preview Branches**: `develop`, `staging`
- **Ignore Build Step**: (leave empty)

### 6.3 Deployment Hooks (Optional)

Add webhooks to trigger deployments on Supabase updates:

```
POST https://api.vercel.com/v1/deployments
Authorization: Bearer <VERCEL_TOKEN>
```

## Phase 7: Monitoring & Maintenance

### 7.1 Vercel Analytics

- [ ] Monitor performance metrics
- [ ] Track deployment frequency
- [ ] Review error rates

### 7.2 Supabase Monitoring

- [ ] Monitor database performance
- [ ] Check Edge Function execution logs
- [ ] Review API usage

### 7.3 Regular Checks

- [ ] Weekly: Review error logs
- [ ] Monthly: Performance audit
- [ ] Quarterly: Security audit
- [ ] As needed: Dependency updates

---

## Quick Reference Commands

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Pull environment variables
vercel env pull

# List current deployments
vercel ls

# Check deployment logs
vercel logs <deployment-url>

# Remove deployment
vercel rm <deployment-url>

# Import existing project
vercel import
```

---

## Important Notes

1. **Secrets Management**:
   - Never commit `.env` files to GitHub
   - Use Vercel's Environment Variables feature
   - Rotate keys regularly

2. **Domain Setup**:
   - Add custom domain in Vercel Settings > Domains
   - Update DNS records as instructed
   - Enable automatic SSL certificate

3. **Scaling**:
   - Vercel auto-scales based on traffic
   - Monitor build times (should be < 5min)
   - Consider upgrading to Pro for advanced features

4. **Compatibility**:
   - Node.js: 20.x (as per vite.config)
   - React: 18.x
   - Vite: Latest (auto-updated)

---

## Support Resources

- **Vercel Docs**: <https://vercel.com/docs>
- **Vite Guide**: <https://vitejs.dev/guide/>
- **Supabase Docs**: <https://supabase.com/docs>
- **React Documentation**: <https://react.dev>

---

**Last Updated**: February 13, 2026
**Status**: Ready for Deployment
