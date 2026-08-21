# Vercel Deployment Checklist

## Pre-Deployment ✓
- [ ] All code pushed to GitHub main branch
- [ ] Local tests passing (`npm run build` succeeds)
- [ ] No TypeScript errors (`npm run lint` passes)
- [ ] Environment variables verified locally
- [ ] Supabase project is live and running
- [ ] All Supabase secrets configured:
  - [ ] GROQ_API_KEY
  - [ ] BROWSERLESS_API_KEY
  - [ ] CRAWL4AI_API_URL
- [ ] Database migrations applied
- [ ] Edge Functions deployed and tested

## Vercel Setup ✓
- [ ] Vercel account created
- [ ] GitHub repository connected
- [ ] Project created in Vercel dashboard
- [ ] `vercel.json` configuration file added to root
- [ ] Build settings configured:
  - [ ] Framework: Vite
  - [ ] Build Command: `npm run build`
  - [ ] Output Directory: `dist`
  - [ ] Node Version: 20.x

## Environment Variables ✓
- [ ] `VITE_SUPABASE_URL` = `https://reutxqmxiuqrmgmgrlai.supabase.co`
- [ ] `VITE_SUPABASE_PROJECT_ID` = `reutxqmxiuqrmgmgrlai`
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` = (provided anon key)
- [ ] All variables set for Production environment
- [ ] All variables set for Preview environment
- [ ] All variables set for Development environment

## Deployment ✓
- [ ] Initial deployment triggered (via manual or auto-deploy)
- [ ] Build completed successfully
- [ ] No build errors in deployment logs
- [ ] Deployment status shows "Ready"
- [ ] Vercel URL generated and accessible

## Post-Deployment Testing ✓
- [ ] Application loads at Vercel URL
- [ ] No console errors (F12 > Console)
- [ ] No TypeScript errors
- [ ] Supabase connection works
- [ ] Authentication page loads
- [ ] Can login/signup with test credentials
- [ ] Dashboard displays correctly
- [ ] Edge Functions invoke successfully:
  - [ ] invite-staff function
  - [ ] scrape-products function
- [ ] Database queries work
- [ ] Images/assets load correctly
- [ ] Responsive design works (mobile/tablet/desktop)

## Custom Domain (Optional) ✓
- [ ] Domain added in Vercel Settings > Domains
- [ ] DNS records updated
- [ ] SSL certificate provisioned
- [ ] HTTPS working (`https://yourdomain.com`)

## Performance & Monitoring ✓
- [ ] Vercel Analytics enabled
- [ ] Core Web Vitals acceptable
- [ ] No 404 errors in deployment preview
- [ ] Page load time < 3 seconds
- [ ] No mixed content warnings (HTTP/HTTPS)

## Security ✓
- [ ] HTTPS enabled
- [ ] Environment variables not exposed in logs
- [ ] Secrets stored securely (not in code)
- [ ] CORS properly configured
- [ ] No sensitive information in public files

## Continuous Integration ✓
- [ ] Auto-deploy on push to main enabled
- [ ] Preview deployments for PRs enabled
- [ ] Build status badges added (optional)
- [ ] Deployment notifications configured (optional)

## Documentation ✓
- [ ] README.md updated with deployment info
- [ ] Team notified of deployment
- [ ] Deployment URL shared
- [ ] Access credentials secured
- [ ] Rollback plan documented

## Troubleshooting Need?
- [ ] Check Vercel deployment logs
- [ ] Verify environment variables
- [ ] Test Supabase connection
- [ ] Check browser console for errors
- [ ] Review network tab for failed requests
- [ ] Contact Vercel support if needed

---

## Rollback Procedure (If Needed)
1. Go to Vercel Dashboard > Deployments
2. Find previous successful deployment
3. Click "Redeploy" on that version
4. OR revert GitHub commit and push

---

**Current Status**: Ready for Deployment  
**Deployment Date**: _________________  
**Deployed By**: _________________  
**Notes**: ___________________________________

