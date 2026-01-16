# Google Maps Setup Guide

## Quick Fix Applied ✅

The Google Maps error "Cannot read properties of undefined (reading 'ROADMAP')" has been fixed. The issue was in how the Google Maps API object was being accessed after loading.

### What Was Fixed

1. **API Object Access**: Changed from accessing `googleMaps.MapTypeId.ROADMAP` directly to properly accessing it as `google.maps.MapTypeId.ROADMAP`
2. **Added Validation**: Added checks to ensure `google.maps` is properly loaded before use
3. **Updated Geocoding**: Updated the geocoding function to use the correct API object structure

## Setup Instructions

### 1. Get Your Google Maps API Key

If you don't have a Google Maps API key yet:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - [Maps JavaScript API](https://console.cloud.google.com/apis/library/maps-backend.googleapis.com)
   - [Geocoding API](https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com)
4. Create credentials:
   - Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
   - Click "Create Credentials" → "API Key"
   - Copy your API key

### 2. Configure API Key Restrictions (Recommended)

To secure your API key:

1. Click on your API key in the Credentials page
2. Under "Application restrictions":
   - Select "HTTP referrers (web sites)"
   - Add these referrers:
     - `http://localhost:*`
     - `http://127.0.0.1:*`
     - `https://yourdomain.com/*` (your production domain)
3. Under "API restrictions":
   - Select "Restrict key"
   - Check:
     - Maps JavaScript API
     - Geocoding API

### 3. Enable Billing

⚠️ **IMPORTANT**: Google Maps requires billing to be enabled, even for free usage.

- Go to [Billing](https://console.cloud.google.com/billing)
- Link a billing account to your project
- **Don't worry**: Google provides $200 free credit per month
- You won't be charged unless you exceed the free tier

**Free tier includes:**
- 28,500 map loads per month
- 40,000 geocoding requests per month

### 4. Add API Key to Your Project

#### Local Development

Create or edit `.env` in your project root:

```bash
# Google Maps API Key
VITE_GOOGLE_MAP_API=your_api_key_here
```

Or use the alternative variable name:

```bash
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

**Important**: 
- Replace `your_api_key_here` with your actual API key
- The variable MUST start with `VITE_` to work in Vite apps
- After adding/changing the key, **restart your dev server**

#### Production Deployment

Add the environment variable to your deployment platform:

**Vercel:**
1. Go to Project Settings → Environment Variables
2. Add: `VITE_GOOGLE_MAP_API` = your_api_key

**Netlify:**
1. Go to Site Settings → Build & Deploy → Environment
2. Add: `VITE_GOOGLE_MAP_API` = your_api_key

## Testing Your Setup

### Method 1: Run Your Application

1. Restart your dev server:
   ```bash
   npm run dev
   ```

2. Navigate to a page with a map component

3. Check the browser console for any errors

### Method 2: Direct API Test

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

## Common Errors and Solutions

### Error: "Google Maps API key not configured"

**Cause**: The environment variable is not set or not accessible.

**Solution**:
1. Check that your `.env` file contains `VITE_GOOGLE_MAP_API=your_key`
2. Ensure the variable starts with `VITE_`
3. Restart your dev server (stop and run `npm run dev` again)

### Error: "Google Maps JavaScript API has not been activated"

**Cause**: The Maps JavaScript API is not enabled for your project.

**Solution**: 
- Enable it: [Maps JavaScript API](https://console.cloud.google.com/apis/library/maps-backend.googleapis.com)

### Error: "InvalidKeyMapError"

**Cause**: The API key is incorrect or doesn't exist.

**Solution**:
- Verify your API key in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- Make sure you copied the entire key with no extra spaces
- Check for typos in your `.env` file

### Error: "RefererNotAllowedMapError"

**Cause**: API key restrictions are blocking your domain.

**Solution**:
1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click on your API key
3. Under "Website restrictions", add:
   - `http://localhost:*`
   - `http://127.0.0.1:*`

### Error: "REQUEST_DENIED" (Geocoding)

**Cause**: Geocoding API is not enabled.

**Solution**: 
- Enable it: [Geocoding API](https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com)

### Error: "ApiTargetBlockedMapError"

**Cause**: Billing is not enabled.

**Solution**: 
- Enable billing: [Billing](https://console.cloud.google.com/billing)

## Environment Variables

The app checks for these environment variables (in order):

1. ✅ `VITE_GOOGLE_MAP_API` ← **Recommended**
2. ✅ `VITE_GOOGLE_MAPS_API_KEY` ← Also works
3. ❌ `GOOGLE_MAP_API` ← Won't work (missing VITE_ prefix)
4. ❌ `GOOGLE_MAPS_API_KEY` ← Won't work (missing VITE_ prefix)

## Map Features

Once configured, your maps will show:

- **Property Locations**: Automatically geocoded from addresses
- **Status Indicators**: 
  - 🟢 Green = Occupied
  - 🟡 Yellow = Vacant
  - ⚪ Gray = Sold
- **Info Windows**: Click markers to see property details
- **Auto-Centering**: Map centers on your properties
- **Responsive**: Works on all screen sizes

## Cost Estimates

With Google's free tier:

| Feature | Free Tier | Typical Monthly Usage | Cost |
|---------|-----------|----------------------|------|
| Map loads | 28,500 | ~1,000 (small app) | $0 |
| Geocoding | 40,000 | ~100 (initial setup) | $0 |
| **Total** | | | **$0** |

For most small to medium landlord portfolios, you'll stay within the free tier.

## Additional Resources

- [Google Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript)
- [Google Maps API Key Best Practices](https://developers.google.com/maps/api-security-best-practices)
- [Google Cloud Free Tier](https://cloud.google.com/free)
- [Google Maps Pricing Calculator](https://mapsplatform.google.com/pricing/)

## Still Having Issues?

If you're still experiencing problems:

1. **Check Browser Console**: Open DevTools (F12) → Console tab
2. **Check Network Tab**: Look for failed requests to Google Maps
3. **Verify All APIs**: Ensure both Maps JavaScript API and Geocoding API are enabled
4. **Test API Key**: Use the direct API test methods above
5. **Check Billing**: Confirm billing is enabled in Google Cloud Console

## Need Help?

The error messages in the app are designed to be helpful. They will tell you:
- What's wrong
- Which API to enable
- Links to enable the APIs
- Fallback list of your properties if maps can't load

The app will continue to work without maps - you'll just see a helpful message instead of the map component.

