# Pre-Deployment Checklist for CheckMate

> **📖 See `VERCEL_DEPLOYMENT.md` for detailed Vercel deployment instructions**

## ✅ Critical Items (Must Do Before Deploying)

### 1. Environment Variables
- [ ] Set `DATABASE_URL` (Supabase PostgreSQL connection string)
- [ ] Set `AUTH_SECRET` (generate with: `openssl rand -base64 32`)
- [ ] Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`
- [ ] Set `NEXTAUTH_URL` to your deployment URL (Vercel auto-sets for previews, set manually for production)
- [ ] Update Google OAuth redirect URIs in Google Cloud Console:
  - [ ] Add Vercel preview URL pattern: `https://checkmate-*.vercel.app/api/auth/callback/google`
  - [ ] Add production URL: `https://yourdomain.com/api/auth/callback/google`
  - [ ] Add Google Calendar callback: `https://checkmate-*.vercel.app/api/calendar/callback`
- [ ] Configure integrations in Settings > Integrations (Notion, Slack, Harvest, Google Calendar) - **After deployment**

### 2. Database Setup
- [x] Database schema is ready (Prisma schema exists)
- [ ] Verify database connection works from Vercel
- [ ] Test that database is accessible (Supabase should be accessible by default)
- [ ] **Note**: `prisma generate` runs automatically on Vercel, `db push` is done manually

### 3. Build & Test
- [x] Run `npm run build` locally - ✅ Build succeeds (warnings about dynamic routes are normal)
- [ ] Test on Vercel preview deployment:
  - [ ] User login/authentication
  - [ ] Creating a new check
  - [ ] Completing a check
  - [ ] Posting to Slack (after configuring)
  - [ ] Creating calendar events (after configuring)
  - [ ] Harvest time tracking (after configuring)
  - [ ] Notion sync (after configuring)

### 4. Security
- [ ] Remove or wrap all `console.log` statements (138 found - many should be removed)
- [ ] Ensure all API routes have proper authentication checks
- [ ] Verify email domain restriction (`@itjones.com`) is working
- [ ] Review and secure any admin-only routes
- [ ] Ensure sensitive data is not exposed in client-side code

### 5. Configuration Files
- [x] Update `next.config.js` to add favicon service domain - ✅ Already configured
- [x] Verify `middleware.ts` handles production correctly - ✅ Demo mode auto-disables when OAuth is configured
- [x] Check that demo mode is disabled in production - ✅ Auto-disabled when `AUTH_GOOGLE_ID` is set

## ⚠️ Recommended Items (Should Do)

### 6. Code Cleanup
- [ ] Remove debug `console.log` statements (keep only `console.error` for production)
- [ ] Remove any test/debug API routes if they exist
- [ ] Clean up unused imports and code

### 7. Error Handling
- [ ] Add error boundaries for React components
- [ ] Add global error handler for API routes
- [ ] Ensure user-friendly error messages (no stack traces in production)

### 8. Performance
- [ ] Enable Next.js production optimizations
- [ ] Verify images are optimized
- [ ] Check bundle size (should be reasonable)
- [ ] Test page load times

### 9. Monitoring & Analytics
- [ ] Set up error tracking (e.g., Sentry, LogRocket)
- [ ] Add analytics if needed (optional)
- [ ] Set up uptime monitoring

### 10. Documentation
- [ ] Update README with production deployment steps
- [ ] Document all environment variables
- [ ] Create runbook for common issues

## 📋 Post-Deployment

### 11. Initial Setup
- [ ] Create first admin user
- [ ] Configure all integrations (Notion, Slack, Harvest, Google Calendar)
- [ ] Sync initial data from Notion
- [ ] Test Slack channel connections
- [ ] Verify Google Calendar events are created

### 12. Team Onboarding
- [ ] Share login URL with team
- [ ] Ensure all team members can sign in
- [ ] Walk team through key features
- [ ] Set up team members' personal integrations (Harvest, Google Calendar)

## 🔧 Platform-Specific Notes

### Vercel
- [ ] Connect GitHub repository (`QuackForce/CheckMate`)
- [ ] Set all environment variables in Vercel dashboard (see `VERCEL_DEPLOYMENT.md`)
- [x] Configure build command: `npm run build` - ✅ Auto-detected by Vercel
- [x] Set output directory: `.next` - ✅ Auto-detected by Vercel
- [ ] Enable automatic deployments from main branch (default)
- [ ] Set up custom domain (optional, for production)

**📖 See `VERCEL_DEPLOYMENT.md` for complete Vercel setup guide**

### Vercel Environments
- **Preview**: Automatically created for every branch/PR (perfect for testing)
- **Production**: Deployed from `main` branch (your live app)
- **Staging**: Can set a specific branch (e.g., `staging`) for pre-production testing

**Recommendation**: Start with a preview deployment to test, then promote to production.

### Netlify
- [ ] Connect GitHub repository
- [ ] Set all environment variables in Netlify dashboard
- [ ] Configure build command: `npm run build`
- [ ] Set publish directory: `.next`
- [ ] Add `_redirects` file for Next.js routing
- [ ] Set up custom domain (if needed)

## 🚨 Known Issues to Address

1. **Console.log statements**: ~194 console.log statements found (many in scripts - fine for now, can clean up later)
2. **Image domains**: ✅ Already added `www.google.com` to `next.config.js`
3. **Error boundaries**: No error boundaries currently implemented - can add after initial deployment
4. **Demo mode**: ✅ Auto-disabled when OAuth is configured (middleware checks for `AUTH_GOOGLE_ID`)

## ✅ Already Completed

- [x] Build works locally
- [x] `next.config.js` configured with favicon service
- [x] Middleware handles production correctly
- [x] Demo mode auto-disables
- [x] Code is on GitHub
- [x] README is up to date

