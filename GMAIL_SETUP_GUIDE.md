# Gmail OAuth Integration Setup Guide

## 🚀 Quick Setup Steps

### 1. Database Setup

You need to create the Gmail accounts table in your Supabase database.

#### Option A: Via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run this SQL script:

```sql
-- Drop table if it exists with wrong foreign key
DROP TABLE IF EXISTS gmail_accounts;

-- Create Gmail accounts table for storing OAuth tokens and account info
CREATE TABLE IF NOT EXISTS gmail_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  
  -- Ensure one Gmail account per email per user
  UNIQUE(user_id, email)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_gmail_accounts_user_id ON gmail_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_accounts_email ON gmail_accounts(email);
```

#### Option B: Via CLI (if you have Supabase CLI installed)
```bash
supabase db push
```

### 2. Google Cloud Console Setup

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create or select a project**
3. **Enable Gmail API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - **Application type**: Web application
   - **Name**: LeadsUp Gmail Integration (or any name you prefer)
   - **Authorized redirect URIs**: 
     - For development: `http://localhost:3002/api/gmail/oauth-callback`
     - For production: `https://yourdomain.com/api/gmail/oauth-callback`

5. **Download credentials**:
   - Copy the **Client ID** and **Client Secret**

### 3. Environment Variables

Add these to your `.env` or `.env.local` file:

```env
# Gmail OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# This should match your domain + /api/gmail/oauth-callback
GOOGLE_REDIRECT_URI=http://localhost:3002/api/gmail/oauth-callback

# Your app URL (use your actual domain for production)
NEXTAUTH_URL=http://localhost:3002
```

### 4. Test the Integration

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to**: Campaign Dashboard > Sender Tab

3. **Click "Connect a Gmail account"**

4. **Complete OAuth flow**:
   - You'll be redirected to Google's consent screen
   - Authorize the application
   - You should be redirected back with success

5. **Test email sending**: 
   - Click the "Test" button next to your connected account

## 🔧 Troubleshooting

### Error: "Gmail accounts table not found"
- **Solution**: Run the database migration SQL script in Supabase dashboard

### Error: "Google OAuth not configured"
- **Solution**: Add the required environment variables to your `.env` file

### Error: "Failed to get OAuth URL"
- **Solution**: Check that `GOOGLE_CLIENT_ID` is set in your environment variables

### Error: "redirect_uri_mismatch"
- **Solution**: Ensure the redirect URI in Google Cloud Console matches your environment exactly:
  - Development: `http://localhost:3002/api/gmail/oauth-callback`
  - Production: `https://yourdomain.com/api/gmail/oauth-callback`

### Error: "Access blocked: This app's request is invalid"
- **Solution**: 
  1. Go to Google Cloud Console > OAuth consent screen
  2. Add your email to "Test users" if the app is in testing mode
  3. Or publish the app if ready for production

## 🛡️ Security Notes

- **Never commit** your `GOOGLE_CLIENT_SECRET` to version control
- The **access tokens** are stored encrypted in your Supabase database
- **Refresh tokens** are used to automatically renew expired access tokens
- All API endpoints require user authentication

## 📧 Gmail API Scopes Used

- `https://www.googleapis.com/auth/gmail.send` - Send emails on behalf of the user
- `https://www.googleapis.com/auth/userinfo.email` - Get user's email address
- `https://www.googleapis.com/auth/userinfo.profile` - Get user's basic profile info

## ✅ Verification Checklist

- [ ] Database table created in Supabase
- [ ] Gmail API enabled in Google Cloud Console
- [ ] OAuth 2.0 credentials created
- [ ] Environment variables set
- [ ] Redirect URI configured correctly
- [ ] Test user added (if app is in testing mode)
- [ ] Gmail connection button works
- [ ] OAuth flow completes successfully
- [ ] Test email sends successfully