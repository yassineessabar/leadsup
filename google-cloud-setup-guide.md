# 🔧 Google Cloud Console Setup Guide

## Issue: OAuth tokens still missing Gmail send scope after reconnection

This means the OAuth configuration in Google Cloud Console needs to be fixed.

---

## ✅ STEP-BY-STEP GOOGLE CLOUD CONSOLE FIX

### 1. 🌐 Go to Google Cloud Console
- Visit: https://console.cloud.google.com
- Select your project

### 2. 📧 Enable Gmail API
- Go to **APIs & Services** → **Library**
- Search for "Gmail API"
- Click **Enable** (if not already enabled)
- ✅ Status should show "API enabled"

### 3. 🔐 Configure OAuth Consent Screen
- Go to **APIs & Services** → **OAuth consent screen**
- Click **Edit App**

#### Scopes Section:
- Click **Add or Remove Scopes**
- In the filter box, search for: `gmail`
- Find and SELECT: `https://www.googleapis.com/auth/gmail.send`
- Find and SELECT: `https://www.googleapis.com/auth/gmail.readonly` (optional)
- Find and SELECT: `https://www.googleapis.com/auth/userinfo.email` (basic)
- Click **Update**
- Click **Save and Continue**

### 4. 👥 Add Test Users
- Still in OAuth consent screen
- Go to **Test users** section
- Click **Add Users**
- Add these emails:
  - `essabar.yassine@gmail.com`
  - `anthoy2327@gmail.com`
  - `ecomm2405@gmail.com`
- Click **Save**

### 5. 🔑 Check OAuth 2.0 Client
- Go to **APIs & Services** → **Credentials**
- Find your OAuth 2.0 Client ID
- Click the edit icon (pencil)
- Verify **Authorized redirect URIs** includes your app's callback URL
- Should be something like: `https://yourdomain.com/api/auth/google/callback`

---

## 🧪 VERIFICATION STEPS

### After completing the above setup:

1. **Clear browser cache** completely
2. **Go to your app dashboard**
3. **Disconnect Gmail account**
4. **Reconnect Gmail account**
5. **During reconnection, you should see:**
   - "View your email messages and settings" 
   - **"Send email on your behalf"** ← This is the key permission!
6. **If you don't see "Send email on your behalf", the setup is incorrect**

---

## 🔍 COMMON ISSUES & FIXES

### Issue 1: "Send email" permission not appearing
**Cause**: Gmail API not enabled or scope not added
**Fix**: Enable Gmail API and add `gmail.send` scope in OAuth consent screen

### Issue 2: "App not verified" error
**Cause**: App is in testing mode with unverified scopes
**Fix**: Either submit for verification OR add users as test users

### Issue 3: "Access blocked" error
**Cause**: User not in test users list
**Fix**: Add Gmail address to test users in OAuth consent screen

### Issue 4: Redirect URI mismatch
**Cause**: OAuth client redirect URI doesn't match app callback
**Fix**: Add correct redirect URI in OAuth 2.0 Client credentials

---

## 📋 CHECKLIST

Before reconnecting Gmail:

- [ ] Gmail API enabled in project
- [ ] OAuth consent screen has `gmail.send` scope
- [ ] Test users include your Gmail addresses  
- [ ] OAuth 2.0 client has correct redirect URIs
- [ ] Browser cache cleared

After reconnecting:

- [ ] Permission dialog showed "Send email on your behalf"
- [ ] No "Access blocked" or verification errors
- [ ] New access token generated with fresh expiry time

---

## 🚀 IMMEDIATE TEST

After fixing Google Cloud setup and reconnecting:

```bash
# Test the new tokens
node test-new-oauth-tokens.js

# If successful, run email automation
node email-sender.js
```

Expected result:
```
✅ Send Scope: AVAILABLE!
🎉 Can create drafts (send permission confirmed)
✅ Your automation is ready to send real emails!
```

---

## 💡 ALTERNATIVE: SMTP Solution (Faster)

If OAuth setup is complex, use SMTP instead:

1. Generate Gmail app password: https://myaccount.google.com/apppasswords
2. Set environment variable: `export GMAIL_APP_PASSWORD_1="your-app-password"`
3. Run: `node email-sender-smtp-production.js`

This bypasses all OAuth complexity and works immediately!