# Microsoft 365 OAuth Setup Guide

The Microsoft 365 connection feature is now **functional** but requires proper OAuth app registration in Azure Active Directory. Follow these steps to complete the setup:

## ✅ What's Already Working

- Microsoft 365 OAuth URL generation
- OAuth callback handling
- Database integration (`microsoft365_accounts` table)
- UI integration in sender tab dropdown
- Error handling and user feedback

## 🚀 What You Need to Do

### Step 1: Create Azure App Registration

1. **Go to Azure Portal:**
   - Visit: https://portal.azure.com
   - Sign in with your Microsoft 365 admin account

2. **Navigate to App Registrations:**
   - Go to `Azure Active Directory` > `App registrations`
   - Click `+ New registration`

3. **Configure the App:**
   - **Name:** `LeadsUp Email Integration`
   - **Supported account types:** Choose based on your needs:
     - `Personal Microsoft accounts only` - for @outlook.com, @hotmail.com accounts
     - `Accounts in any organizational directory and personal Microsoft accounts` - for both work and personal accounts
   - **Redirect URI:** 
     - Platform: `Web`
     - URI: `http://localhost:3000/api/microsoft365/oauth-callback`

4. **Click Register**

### Step 2: Configure API Permissions

1. **In your new app registration:**
   - Go to `API permissions`
   - Click `+ Add a permission`
   - Select `Microsoft Graph`
   - Choose `Delegated permissions`

2. **Add these permissions:**
   - `Mail.Send` - Send mail as the signed-in user
   - `User.Read` - Read user profile
   - `offline_access` - Maintain access to data you have given it access to

3. **Grant admin consent:**
   - Click `Grant admin consent for [your organization]`
   - Click `Yes` to confirm

### Step 3: Create Client Secret

1. **Go to `Certificates & secrets`:**
   - Click `+ New client secret`
   - Description: `LeadsUp Integration Secret`
   - Expires: `24 months` (recommended)
   - Click `Add`

2. **Copy the secret value immediately:**
   - ⚠️ **IMPORTANT:** Copy the secret value now - it won't be shown again!

### Step 4: Update Environment Variables

1. **Open `.env.local` file**
2. **Replace the placeholder values:**

```env
# Microsoft 365 OAuth Configuration (for email sending)
MICROSOFT365_CLIENT_ID=your-actual-client-id-from-azure
MICROSOFT365_CLIENT_SECRET=your-actual-client-secret-from-step-3
MICROSOFT365_REDIRECT_URI=http://localhost:3000/api/microsoft365/oauth-callback
MICROSOFT365_TENANT=consumers
```

**Tenant Options:**
- `consumers` - Personal Microsoft accounts (@outlook.com, @hotmail.com, @live.com)
- `organizations` - Work/school accounts (Azure AD)
- `common` - Both personal and work accounts

3. **Get your Client ID:**
   - From your app registration overview page
   - Copy the `Application (client) ID`

### Step 5: Test the Connection

1. **Restart your development server:**
   ```bash
   npm run dev
   ```

2. **Test the connection:**
   - Go to your campaign → Sender tab
   - Click `Connect Account` → `Connect a Microsoft 365 account`
   - You should be redirected to Microsoft login
   - After successful auth, you'll be returned to your app

## 🔍 Troubleshooting

### Common Issues:

1. **"Selected user account does not exist in tenant" error:**
   - This happens when using placeholder credentials or wrong tenant type
   - ✅ **FIXED:** Updated to use `consumers` tenant for personal accounts
   - Make sure to create a real app registration in Azure
   - Choose correct account type: "Personal Microsoft accounts only" for @outlook.com accounts

2. **"Invalid client" error:**
   - Check that `MICROSOFT365_CLIENT_ID` matches your Azure app
   - Ensure redirect URI in Azure matches exactly: `http://localhost:3000/api/microsoft365/oauth-callback`

2. **"Invalid redirect URI" error:**
   - Verify the redirect URI is correctly set in Azure app registration
   - Make sure it's exactly: `http://localhost:3000/api/microsoft365/oauth-callback`

3. **Permission errors:**
   - Ensure `Mail.Send`, `User.Read`, and `offline_access` permissions are granted
   - Make sure admin consent was given

4. **Database errors:**
   - Ensure the `microsoft365_accounts` table exists in your Supabase database
   - Check Supabase connection and permissions

## 🎯 Current Status

- ✅ **UI Integration:** Microsoft 365 button available in sender tab
- ✅ **Backend Logic:** OAuth flow implemented
- ✅ **Database Integration:** Accounts stored in `microsoft365_accounts` table
- ✅ **Error Handling:** Comprehensive error messages and fallbacks
- ⚠️ **Credentials:** Need real Azure app registration (currently using placeholders)

## 🔧 Test Commands

Once configured, you can test the OAuth flow:

```bash
# Test OAuth URL generation
curl -X POST http://localhost:3000/api/microsoft365/oauth-url

# Check connected accounts
curl http://localhost:3000/api/microsoft365/accounts
```

After completing these steps, your Microsoft 365 email integration will be fully functional!