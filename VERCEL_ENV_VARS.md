# Vercel Environment Variables Guide

## Your Current Values (Local Development)
```
HARVEST_REDIRECT_URI=http://localhost:3000/api/harvest/callback
NEXTAUTH_URL="http://localhost:3000"
AUTH_SECRET="jit-infra-checks-secret-key-change-in-production"
```

## ✅ What to Set in Vercel

### 1. **AUTH_SECRET** (CRITICAL - Must Change!)

**Current (Local):**
```
AUTH_SECRET="jit-infra-checks-secret-key-change-in-production"
```

**For Vercel (Generate New Secret):**
```bash
# Generate a secure random secret
openssl rand -base64 32
```

**Set in Vercel:**
```
AUTH_SECRET=<paste-generated-secret-here>
```

**⚠️ Important:** 
- **DO NOT** use your local dev secret in production
- Generate a new one for Vercel
- Keep it secret and never commit it

---

### 2. **NEXTAUTH_URL** (Auto-Detection Recommended)

**Option A: Auto-Detection (Recommended for Previews)**
```
NEXTAUTH_URL=$VERCEL_URL
```

**Option B: Specific URL (For Production)**
```
# For production deployment
NEXTAUTH_URL=https://checkmate.vercel.app

# Or your custom domain
NEXTAUTH_URL=https://checkmate.itjones.com
```

**How It Works:**
- `$VERCEL_URL` is automatically provided by Vercel
- It changes for each preview deployment (e.g., `checkmate-git-feature-abc123.vercel.app`)
- For production, set a fixed URL

**For Preview Deployments:**
- Use `$VERCEL_URL` - it auto-updates for each preview
- No need to change it manually

**For Production:**
- Set to your production domain
- Update in Vercel dashboard → Environment Variables → Production

---

### 3. **HARVEST_REDIRECT_URI** (Optional - Can Configure in Database)

**Option A: Use Environment Variable**
```
# For preview deployments (auto-detects)
HARVEST_REDIRECT_URI=$VERCEL_URL/api/harvest/callback

# For production (specific URL)
HARVEST_REDIRECT_URI=https://checkmate.vercel.app/api/harvest/callback
```

**Option B: Configure in Database (Recommended)**
- After deployment, go to **Settings > Integrations > Harvest**
- Enter the redirect URI there
- This is stored in the database and works for all environments

**Note:** The code checks the database first, then falls back to `HARVEST_REDIRECT_URI` env var.

---

## 📋 Step-by-Step: Setting in Vercel

### For Preview Deployments (First Time)

1. **Go to Vercel Dashboard** → Your Project → Settings → Environment Variables

2. **Add Variables:**
   ```
   AUTH_SECRET=<generate-with-openssl-rand-base64-32>
   NEXTAUTH_URL=$VERCEL_URL
   HARVEST_REDIRECT_URI=$VERCEL_URL/api/harvest/callback
   ```

3. **Select Environment:**
   - Check ✅ **Preview** (for preview deployments)
   - Leave Production unchecked for now

4. **Save and Redeploy**

### For Production Deployment

1. **Add Production-Specific Variables:**
   ```
   AUTH_SECRET=<same-or-different-secret>
   NEXTAUTH_URL=https://checkmate.vercel.app
   HARVEST_REDIRECT_URI=https://checkmate.vercel.app/api/harvest/callback
   ```

2. **Select Environment:**
   - Check ✅ **Production** (for main branch)

3. **Save**

---

## 🔧 Quick Reference

### Generate AUTH_SECRET
```bash
openssl rand -base64 32
```

### Vercel Environment Variables

**Preview (Auto-Detection):**
```
AUTH_SECRET=<generated-secret>
NEXTAUTH_URL=$VERCEL_URL
HARVEST_REDIRECT_URI=$VERCEL_URL/api/harvest/callback
```

**Production (Fixed URLs):**
```
AUTH_SECRET=<generated-secret>
NEXTAUTH_URL=https://your-production-domain.com
HARVEST_REDIRECT_URI=https://your-production-domain.com/api/harvest/callback
```

---

## ⚠️ Important Notes

1. **AUTH_SECRET:**
   - Must be different from your local dev secret
   - Generate a new one for production
   - Keep it secure (never commit)

2. **NEXTAUTH_URL:**
   - Vercel provides `$VERCEL_URL` automatically
   - Use it for preview deployments (auto-updates)
   - Set specific URL for production

3. **HARVEST_REDIRECT_URI:**
   - Can be set in env var OR database
   - Database is preferred (Settings > Integrations)
   - Must match what's configured in Harvest OAuth app

4. **After Setting Variables:**
   - You must **redeploy** for changes to take effect
   - Vercel will use the new values on next deployment

---

## 🧪 Testing

After setting variables:

1. **Deploy to Preview**
   - Push to a branch
   - Vercel creates a preview URL
   - Test authentication

2. **Verify NEXTAUTH_URL:**
   - Check Vercel deployment logs
   - Should show the correct URL

3. **Test OAuth:**
   - Try Google login
   - Try Harvest connection
   - Verify redirects work

---

## 📝 Summary

**For Your First Preview Deployment:**

1. Generate new AUTH_SECRET:
   ```bash
   openssl rand -base64 32
   ```

2. Set in Vercel (Preview environment):
   ```
   AUTH_SECRET=<paste-generated-secret>
   NEXTAUTH_URL=$VERCEL_URL
   HARVEST_REDIRECT_URI=$VERCEL_URL/api/harvest/callback
   ```

3. Deploy and test!

**For Production:**

1. Set production-specific URLs:
   ```
   AUTH_SECRET=<same-or-new-secret>
   NEXTAUTH_URL=https://checkmate.vercel.app
   HARVEST_REDIRECT_URI=https://checkmate.vercel.app/api/harvest/callback
   ```

2. Make sure Production environment is checked ✅

