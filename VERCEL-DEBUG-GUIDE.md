# Vercel Warmup Debug Guide

## 🐛 Issue: Health endpoint not working & Empty logs

### Problem URLs:
- ❌ `https://leadsup-git-main-essabaryassine-gmailcoms-projects.vercel.app/api/warmup/health` (404)
- 📝 Empty logs in Vercel dashboard

## 🔍 Debugging Steps

### Step 1: Test Debug Endpoint First
Try this new endpoint I just created:
```
https://leadsup-git-main-essabaryassine-gmailcoms-projects.vercel.app/api/warmup/debug
```

This will show:
- Environment variables status
- Database connectivity
- Table existence
- Configuration details

### Step 2: Test Warmup Endpoints Manually
Test these endpoints manually in your browser:

```bash
# Scheduler (creates activities)
https://leadsup-git-main-essabaryassine-gmailcoms-projects.vercel.app/api/warming/scheduler

# Executor (sends emails) 
https://leadsup-git-main-essabaryassine-gmailcoms-projects.vercel.app/api/warming/execute

# Health check (after deployment)
https://leadsup-git-main-essabaryassine-gmailcoms-projects.vercel.app/api/warmup/health
```

### Step 3: Check Vercel Environment Variables
In Vercel Dashboard → Settings → Environment Variables, verify these exist:

```bash
# Required variables:
NEXT_PUBLIC_SUPABASE_URL=https://ajcubavmrrxzmonsdnsj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SENDGRID_API_KEY=SG.36hVZqcST4y6Gig6UOb3Cw...
EMAIL_SIMULATION_MODE=false

# Optional but recommended:
NODE_ENV=production
```

### Step 4: Deploy New Health Endpoint
After committing the new health endpoint, deploy:

```bash
git add .
git commit -m "Add warmup health and debug endpoints"
git push
```

Then redeploy in Vercel (auto-deploy should trigger).

### Step 5: Check Vercel Function Logs
1. Go to Vercel Dashboard
2. Click on your project
3. Go to "Functions" tab
4. Look for warmup function executions
5. Click on individual function calls to see logs

### Step 6: Manual Cron Trigger Test
Test if cron jobs work manually:

```bash
# In Vercel Dashboard → Functions → Crons
# Click "Trigger" next to each cron job to test manually
```

## 🔧 Common Issues & Fixes

### Issue 1: 404 on Health Endpoint
**Cause**: Health endpoint didn't exist
**Fix**: ✅ Created `/app/api/warmup/health/route.ts`

### Issue 2: Environment Variables Missing
**Fix**: Add them in Vercel Dashboard → Settings → Environment Variables

### Issue 3: Database Connection Failed  
**Fix**: Verify Supabase URL and service role key

### Issue 4: Cron Jobs Not Running
**Possible Causes**:
- Environment variables missing
- Function timeout (already set to 300s)
- Database connection issues
- Supabase RLS policies blocking access

### Issue 5: Empty Logs
**Possible Causes**:
- Functions not being called
- Console.log statements not showing
- Need to check correct log location in Vercel

## 🎯 Next Steps

1. **Deploy the new endpoints** (health & debug)
2. **Test debug endpoint** to see environment status
3. **Check Vercel environment variables**
4. **Test warmup endpoints manually**
5. **Monitor function logs** in Vercel dashboard

## 📊 Expected Behavior

Once working, you should see:
- Health endpoint returns JSON with campaign status
- Cron jobs appear in Vercel Functions tab
- Logs show warmup activity every 5-15 minutes
- Warmup activities in your Supabase database

## 🚨 Immediate Actions Needed

1. **Commit and push** the new health endpoint
2. **Add environment variables** in Vercel if missing
3. **Test debug endpoint** first to diagnose issues
4. **Check Vercel function logs** for error details

Let me know what the debug endpoint returns and we can troubleshoot from there!