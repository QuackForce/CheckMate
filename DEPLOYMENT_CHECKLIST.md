# Pre-Deployment Checklist for CheckMate

## ✅ Critical Items (Must Do Before Deploying)

### 1. Environment Variables
- [ ] Set `DATABASE_URL` (Supabase PostgreSQL connection string)
- [ ] Set `AUTH_SECRET` (generate with: `openssl rand -base64 32`)
- [ ] Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`
- [ ] Set `NEXTAUTH_URL` to your production domain (e.g., `https://checkmate.yourdomain.com`)
- [ ] Update Google OAuth redirect URI in Google Cloud Console to production URL
- [ ] Configure integrations in Settings > Integrations (Notion, Slack, Harvest, Google Calendar)

### 2. Database Setup
- [ ] Run `npx prisma generate` to generate Prisma client
- [ ] Run `npx prisma db push` to push schema to production database
- [ ] Verify database connection works
- [ ] Test that migrations are working correctly

### 3. Build & Test
- [ ] Run `npm run build` locally to ensure no build errors
- [ ] Test all critical user flows:
  - [ ] User login/authentication
  - [ ] Creating a new check
  - [ ] Completing a check
  - [ ] Posting to Slack
  - [ ] Creating calendar events
  - [ ] Harvest time tracking
  - [ ] Notion sync

### 4. Security
- [ ] Remove or wrap all `console.log` statements (138 found - many should be removed)
- [ ] Ensure all API routes have proper authentication checks
- [ ] Verify email domain restriction (`@itjones.com`) is working
- [ ] Review and secure any admin-only routes
- [ ] Ensure sensitive data is not exposed in client-side code

### 5. Configuration Files
- [ ] Update `next.config.js` to add favicon service domain:
  ```js
  images: {
    remotePatterns: [
      // ... existing patterns
      {
        protocol: 'https',
        hostname: 'www.google.com',
      },
    ],
  },
  ```
- [ ] Verify `middleware.ts` handles production correctly
- [ ] Check that demo mode is disabled in production

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
- [ ] Connect GitHub repository
- [ ] Set all environment variables in Vercel dashboard
- [ ] Configure build command: `npm run build`
- [ ] Set output directory: `.next`
- [ ] Enable automatic deployments from main branch
- [ ] Set up custom domain (if needed)

### Netlify
- [ ] Connect GitHub repository
- [ ] Set all environment variables in Netlify dashboard
- [ ] Configure build command: `npm run build`
- [ ] Set publish directory: `.next`
- [ ] Add `_redirects` file for Next.js routing
- [ ] Set up custom domain (if needed)

## 🚨 Known Issues to Address

1. **Console.log statements**: 138 console.log statements found - should be cleaned up for production
2. **Image domains**: Need to add `www.google.com` to `next.config.js` for favicon service
3. **Error boundaries**: No error boundaries currently implemented - should add for better error handling
4. **Demo mode**: Ensure demo mode is properly disabled in production

