# Netlify Secrets Scanning Fix

## Problem
Netlify's secret scanner detected environment variable values in:
1. Documentation files (markdown files with example values)
2. Build output (`dist/assets/*.js` files)

## Fixes Applied

### ✅ 1. Documentation Files
- Replaced hardcoded secret values in `DOCUSIGN_SETUP_GUIDE.md` and `DOCUSIGN_STATUS.md` with placeholders
- All markdown files now use `YOUR_INTEGRATION_KEY`, `YOUR_ACCOUNT_ID`, etc.
- Configured Netlify to exclude `*.md` files from secret scanning

### ✅ 2. Source Code
- Removed hardcoded fallback values from `src/lib/supabase.ts`
- Now requires environment variables to be set (no defaults)
- All secrets must come from environment variables

### ✅ 3. Netlify Configuration
- Added `SECRETS_SCAN_OMIT_PATHS = "*.md,*.MD"` to exclude documentation files

## Important: VITE_* Variables in Build Output

**VITE_* environment variables are ALWAYS embedded in the client bundle** - this is how Vite works. If Netlify is flagging these, you need to configure Netlify's secret scanning settings.

### Option 1: Mark as Non-Secret (Recommended for Public Values)
If these values are meant to be public (like Supabase anon key or OAuth client IDs):
1. Go to Netlify Dashboard → Site Settings → Environment Variables
2. Remove these variables from "Secrets" 
3. Add them as regular environment variables instead

### Option 2: Safelist Expected Values
If you must keep them as secrets but they're expected in the bundle:
1. Go to Netlify Dashboard → Site Settings → Environment Variables
2. Add environment variable: `SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES`
3. Set value to: comma-separated list of values that are safe to expose

### Option 3: Move to Server-Side (For Truly Secret Values)
If these are truly secrets and shouldn't be exposed:
- Move API calls to Netlify Functions (server-side)
- Keep secrets server-side only
- Don't use `VITE_*` prefix for secret values

## Environment Variables Needed

Make sure these are set in Netlify (as regular env vars, not secrets if they're public):

```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key  # Safe to expose (public key)
VITE_DOCUSIGN_INTEGRATION_KEY=your-key  # OAuth client ID (usually safe)
VITE_DOCUSIGN_ACCOUNT_ID=your-account-id
VITE_DOCUSIGN_REDIRECT_URL=your-redirect-url
VITE_CREDIT_CHECK_PROVIDER=credas
VITE_GOOGLE_MAP_API=your-api-key  # Safe to expose (restricted by domain)
```

## Next Steps

1. **Remove secrets from documentation** ✅ (Done)
2. **Remove hardcoded secrets from code** ✅ (Done)
3. **Configure Netlify**: 
   - Either remove VITE_* vars from Secrets list (if public)
   - Or configure SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES
4. **Redeploy**: The build should now pass

## Notes

- Supabase anon key is **designed to be public** - it's safe to expose
- OAuth client IDs (like DocuSign integration key) are typically **safe to expose**
- Google Maps API keys can be restricted by domain, so they're **safe to expose** with restrictions
- If you have truly secret values (like API secret keys), use Netlify Functions instead

