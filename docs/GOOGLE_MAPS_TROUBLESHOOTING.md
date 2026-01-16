# Google Maps API Troubleshooting Guide

## Quick Checklist

✅ Before proceeding, verify:
- [ ] You have a Google Cloud account
- [ ] You have a project created in Google Cloud Console
- [ ] You have billing enabled (required even for free tier)
- [ ] Your API key is correctly copied (no extra spaces/characters)
- [ ] You've restarted your dev server after adding/changing the API key

## Step-by-Step Setup

### 1. Enable Required APIs

Go to Google Cloud Console and enable these APIs:

**Maps JavaScript API** (Required for displaying maps)
- URL: https://console.cloud.google.com/apis/library/maps-backend.googleapis.com
- Click "Enable"

**Geocoding API** (Required for converting addresses to coordinates)
- URL: https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com
- Click "Enable"

### 2. Create/Configure API Key

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click "Create Credentials" → "API Key"
3. Copy the API key
4. Click "Edit API key" to configure restrictions

### 3. Configure API Key Restrictions

**Application Restrictions:**
- For development: Choose "HTTP referrers (web sites)"
- Add these referrers:
  - `http://localhost:*`
  - `http://127.0.0.1:*`
  - Your production domain (e.g., `https://yourdomain.com/*`)

**API Restrictions:**
- Select "Restrict key"
- Check these APIs:
  - Maps JavaScript API
  - Geocoding API

### 4. Enable Billing

**IMPORTANT:** Google Maps requires billing to be enabled, even for free usage.

1. Go to: https://console.cloud.google.com/billing
2. Link a billing account to your project
3. Google provides $200 free credit per month
4. You won't be charged unless you exceed the free tier

**Free tier includes:**
- 28,500 map loads per month
- 40,000 geocoding requests per month

### 5. Add API Key to Your Project

1. Open your `.env` file in the project root
2. Add (or update) this line:
   ```
   VITE_GOOGLE_MAP_API=your_api_key_here
   ```
3. Replace `your_api_key_here` with your actual API key
4. Save the file
5. **RESTART YOUR DEV SERVER** (this is crucial!)

### 6. Verify Setup

Run the diagnostic script:
```bash
node check-env.js
```

## Common Errors and Solutions

### Error: "Google Maps JavaScript API has not been activated"
**Solution:** Enable "Maps JavaScript API" in Google Cloud Console
- URL: https://console.cloud.google.com/apis/library/maps-backend.googleapis.com

### Error: "InvalidKeyMapError"
**Solution:** 
- Verify your API key is correct (no extra spaces)
- Check that the API key exists in Google Cloud Console
- Make sure you copied the entire key

### Error: "RefererNotAllowedMapError"
**Solution:** Update API key restrictions
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your API key
3. Under "Website restrictions", add:
   - `http://localhost:*`
   - `http://127.0.0.1:*`

### Error: "REQUEST_DENIED" (Geocoding)
**Solution:** Enable "Geocoding API"
- URL: https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com

### Error: "ApiTargetBlockedMapError"
**Solution:** Enable billing in Google Cloud Console
- URL: https://console.cloud.google.com/billing

## Testing Your API Key

### Method 1: Using the test HTML file
1. Open `test-maps.html` in your project
2. Replace `YOUR_API_KEY_HERE` with your actual API key
3. Open the file in a browser
4. Check for any error messages

### Method 2: Direct API test
Open this URL in your browser (replace YOUR_API_KEY):
```
https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY
```

If it loads without errors, your API key is valid.

### Method 3: Test Geocoding API
Open this URL (replace YOUR_API_KEY):
```
https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&key=YOUR_API_KEY
```

You should see a JSON response with coordinates.

## Still Having Issues?

### Check Browser Console
1. Open your app in the browser
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Look for red error messages
5. Share the exact error message for more specific help

### Check Network Tab
1. Open Developer Tools (F12)
2. Go to the Network tab
3. Filter by "maps"
4. Look for failed requests (red)
5. Click on the failed request to see the error details

### Verify Environment Variables
The app looks for these environment variables (in order):
1. `VITE_GOOGLE_MAP_API` ← Most common
2. `VITE_GOOGLE_MAPS_API_KEY`
3. `GOOGLE_MAP_API` ← Won't work (needs VITE_ prefix)
4. `GOOGLE_MAPS_API_KEY` ← Won't work (needs VITE_ prefix)

**IMPORTANT:** In Vite apps, environment variables MUST start with `VITE_` to be available in the browser.

## Additional Resources

- [Google Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript)
- [Google Maps API Key Best Practices](https://developers.google.com/maps/api-security-best-practices)
- [Google Cloud Free Tier](https://cloud.google.com/free)
- [Google Maps Pricing](https://mapsplatform.google.com/pricing/)

## Need More Help?

If you're still stuck:
1. Check the browser console for the exact error message
2. Verify all APIs are enabled in Google Cloud Console
3. Confirm billing is enabled
4. Try creating a new API key
5. Test the API key using the methods above

