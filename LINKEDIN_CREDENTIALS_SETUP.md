# LinkedIn Credentials Setup

## Required Environment Variables

To enable the Python scraping scripts to work automatically in the background, you need to set LinkedIn credentials as environment variables.

### 1. Add to your environment configuration:

**Option A: Using .env.local file (recommended)**
```bash
# Create or update .env.local file in your project root
LINKEDIN_EMAIL=your-linkedin-email@example.com
LINKEDIN_PASSWORD=your-linkedin-password
```

**Option B: Using system environment variables**
```bash
export LINKEDIN_EMAIL="your-linkedin-email@example.com"
export LINKEDIN_PASSWORD="your-linkedin-password"
```

**Option C: Using deployment environment (Vercel, Railway, etc.)**
Add these environment variables in your deployment platform:
- `LINKEDIN_EMAIL`
- `LINKEDIN_PASSWORD`

### 2. Security Considerations

⚠️ **Important Security Notes:**
- Use a dedicated LinkedIn account for scraping (not your personal account)
- Consider using LinkedIn's official API when possible
- Rotate credentials regularly
- Never commit credentials to version control
- Use strong, unique passwords

### 3. Headless Mode (Automatic)

The integration automatically sets:
- `HEADLESS_BROWSER=true` - Runs browser in background without GUI
- No manual CAPTCHA/MFA intervention required in most cases

### 4. Troubleshooting

**If scripts fail with authentication errors:**
1. Verify credentials are correct
2. Check if LinkedIn account has 2FA enabled (may require additional setup)
3. Ensure account isn't locked or restricted
4. Try running script manually first to test credentials

**Common Issues:**
- LinkedIn may detect automated activity and require verification
- Rate limiting may apply for excessive requests
- Some accounts may have additional security measures

### 5. Testing Credentials

You can test if credentials work by running the Python script directly:

```bash
# Set environment variables
export LINKEDIN_EMAIL="your-email@example.com"
export LINKEDIN_PASSWORD="your-password"
export HEADLESS_BROWSER="false"  # Set to false for testing with visible browser

# Test the script
python/venv/bin/python python/find_profiles.py "test" "Sydney" "Technology" 1 --campaign-id test-id --user-id test-user
```

### 6. Alternative Solutions

If LinkedIn credentials don't work reliably:
- Consider using LinkedIn Sales Navigator API
- Use third-party lead generation services
- Implement manual profile upload functionality
- Use existing prospect databases

## Changes Made

✅ **Removed manual input requirement** - Scripts now run fully automatically
✅ **Added headless browser mode** - Runs in background without GUI
✅ **Enhanced login detection** - Automatically detects successful login
✅ **Extended timeout handling** - Better error recovery for slow connections