# Vercel Deployment Guide for CheckMate

## 🎯 Vercel Environments Overview

Vercel provides **three types of deployments**:

1. **Production** - Deployed from `main` branch (or your default branch)
   - Gets a production URL like `checkmate.vercel.app`
   - Can have a custom domain
   - This is your "live" app

2. **Preview** - Deployed from every push to any branch/PR
   - Gets a unique URL like `checkmate-git-feature-branch-username.vercel.app`
   - Perfect for testing before merging
   - Automatically created for every branch/PR

3. **Staging** - Deployed from a specific branch (e.g., `staging`)
   - You can set a branch to always deploy to a staging URL
   - Good for pre-production testing
   - Can have its own environment variables

**Recommendation**: Start with **Preview deployments** from feature branches to test, then promote to **Production** when ready.

## ✅ Pre-Deployment Checklist

### Critical Items (Do These First)

#### 1. Test Build Locally
```bash
npm run build
```
✅ **Status**: Build works (warnings about dynamic routes are normal)

#### 2. Environment Variables Needed

You'll need to set these in Vercel dashboard:

**Required:**
- `DATABASE_URL` - Your Supabase PostgreSQL connection string
- `AUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `AUTH_GOOGLE_ID` - From Google Cloud Console
- `AUTH_GOOGLE_SECRET` - From Google Cloud Console
- `NEXTAUTH_URL` - For preview: `https://checkmate-git-*.vercel.app` (auto-set) or production: `https://yourdomain.com`

**Optional (stored in DB, but you can set defaults):**
- Notion, Slack, Harvest, Google Calendar configs are stored in database via Settings > Integrations

#### 3. Google OAuth Setup
- Add Vercel preview URLs to Google OAuth redirect URIs:
  - `https://checkmate-*.vercel.app/api/auth/callback/google` (wildcard for previews)
  - `https://your-production-domain.com/api/auth/callback/google` (production)
- Add Vercel preview URLs to Google Calendar OAuth redirect URIs:
  - `https://checkmate-*.vercel.app/api/calendar/callback` (wildcard for previews)
  - `https://your-production-domain.com/api/calendar/callback` (production)

#### 4. Database Setup
- Ensure your Supabase database is accessible from Vercel (should be by default)
- Run migrations if needed (Vercel will run `prisma generate` automatically)

### Nice-to-Have (Can Do Later)

- [ ] Clean up `console.log` statements (194 found, but many are in scripts - fine for now)
- [ ] Add error boundaries (can add after initial deployment)
- [ ] Set up monitoring (Sentry, etc.)

## 🚀 Step-by-Step Deployment

### Option 1: Quick Preview Deployment (Recommended First Step)

1. **Go to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Sign in with GitHub

2. **Import Your Repository**
   - Click "Add New" → "Project"
   - Select `QuackForce/CheckMate` from your GitHub repos
   - Click "Import"

3. **Configure Project**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

4. **Add Environment Variables**
   - Click "Environment Variables"
   - Add each variable:
     ```
     DATABASE_URL=your-supabase-connection-string
     AUTH_SECRET=your-generated-secret
     AUTH_GOOGLE_ID=your-google-client-id
     AUTH_GOOGLE_SECRET=your-google-client-secret
     NEXTAUTH_URL=https://checkmate-xxxxx.vercel.app
     ```
   - **Important**: For preview deployments, you can use a wildcard or set `NEXTAUTH_URL` to auto-detect

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)
   - You'll get a preview URL like `checkmate-xxxxx.vercel.app`

6. **Update Google OAuth**
   - Go to Google Cloud Console
   - Add the preview URL to authorized redirect URIs:
     - `https://checkmate-xxxxx.vercel.app/api/auth/callback/google`
     - `https://checkmate-xxxxx.vercel.app/api/calendar/callback`

7. **Test**
   - Visit your preview URL
   - Try logging in
   - Test key features

### Option 2: Production Deployment

Once preview works:

1. **Set Production Branch**
   - In Vercel project settings → Git
   - Set "Production Branch" to `main` (default)

2. **Add Production Environment Variables**
   - In Environment Variables, add production-specific values
   - Set `NEXTAUTH_URL` to your production domain

3. **Deploy to Production**
   - Merge to `main` branch (auto-deploys)
   - Or manually deploy from Vercel dashboard

4. **Add Custom Domain** (Optional)
   - In project settings → Domains
   - Add your custom domain
   - Follow DNS setup instructions

## 🔧 Vercel-Specific Configuration

### Build Settings (Auto-configured, but verify)

Vercel should auto-detect Next.js, but verify:
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Node Version**: 18.x or 20.x (set in Vercel dashboard)

### Environment Variables by Environment

You can set different values for:
- **Production** - Only for `main` branch
- **Preview** - For all other branches/PRs
- **Development** - For local development (not used by Vercel)

**Tip**: Set `NEXTAUTH_URL` to use Vercel's auto-detection:
```
NEXTAUTH_URL=$VERCEL_URL  # Auto-detects the deployment URL
```

### Prisma on Vercel

Vercel will automatically:
1. Run `npm install`
2. Run `prisma generate` (if in `postinstall` script)
3. Build your app

**Note**: You don't need to run `prisma db push` on Vercel - that's for schema changes. Your database should already be set up.

## 🧪 Testing Your Deployment

After deployment, test:

1. ✅ **Authentication**
   - Sign in with Google
   - Verify redirect works

2. ✅ **Database Connection**
   - View dashboard
   - Check if data loads

3. ✅ **Key Features**
   - Create a check
   - View clients
   - Access settings

4. ✅ **Integrations** (after initial setup)
   - Configure Notion sync
   - Connect Slack
   - Test Harvest timer
   - Test Google Calendar

## 🐛 Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Verify `package.json` scripts are correct

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check Supabase allows connections from Vercel IPs
- Ensure database is not paused (Supabase free tier pauses after inactivity)

### OAuth Redirect Errors
- Verify redirect URIs match exactly in Google Cloud Console
- Check `NEXTAUTH_URL` matches your deployment URL
- For previews, you may need to add wildcard or update for each preview URL

### Environment Variables Not Working
- Ensure variables are set for the correct environment (Production/Preview)
- Redeploy after adding new variables
- Check variable names match exactly (case-sensitive)

## 📝 Next Steps After Deployment

1. **Initial Setup**
   - Create first admin user
   - Configure integrations in Settings > Integrations
   - Sync data from Notion

2. **Team Access**
   - Share preview/production URL
   - Have team members sign in
   - Set up their personal integrations (Harvest, Google Calendar)

3. **Monitor**
   - Check Vercel dashboard for errors
   - Monitor build times
   - Set up error tracking (optional)

## 🔒 Security Notes

- ✅ `.env` is in `.gitignore` - secrets won't be committed
- ✅ Environment variables in Vercel are encrypted
- ✅ Email domain restriction (`@itjones.com`) is enforced
- ⚠️ Review API routes for proper auth checks
- ⚠️ Consider adding rate limiting for production

## 🎉 You're Ready!

Your app is ready to deploy to Vercel. Start with a preview deployment to test, then promote to production when everything works.

**Quick Start Command:**
1. Go to [vercel.com](https://vercel.com)
2. Import `QuackForce/CheckMate`
3. Add environment variables
4. Deploy!

