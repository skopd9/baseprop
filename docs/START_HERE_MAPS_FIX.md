# 🗺️ Google Maps Fix - Start Here

## ✅ What's Been Fixed

The error **"Cannot read properties of undefined (reading 'ROADMAP')"** has been resolved.

### The Problem
The Google Maps API object was being accessed incorrectly after loading, causing the `MapTypeId.ROADMAP` property to be undefined.

### The Solution
Updated `src/components/PropertyMap.tsx` to correctly access the Google Maps API object structure.

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable these APIs:
   - **Maps JavaScript API** → [Enable here](https://console.cloud.google.com/apis/library/maps-backend.googleapis.com)
   - **Geocoding API** → [Enable here](https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com)
4. Create API Key:
   - Go to [Credentials](https://console.cloud.google.com/apis/credentials)
   - Click "Create Credentials" → "API Key"
   - Copy your key
5. **Enable Billing** (required but free tier available):
   - [Billing Setup](https://console.cloud.google.com/billing)
   - $200 free credit per month

### Step 2: Add API Key to Your Project

Create or edit `.env` file in project root:

```bash
VITE_GOOGLE_MAP_API=paste_your_api_key_here
```

**Important Notes:**
- ✅ Use `VITE_GOOGLE_MAP_API` (with VITE_ prefix)
- ❌ Don't use `GOOGLE_MAP_API` (missing VITE_ prefix won't work)
- Replace `paste_your_api_key_here` with your actual key
- No quotes needed around the key

### Step 3: Restart Dev Server

```bash
# Stop current server (Ctrl+C or Cmd+C)

# Start it again
npm run dev
```

**Must restart!** Just saving .env isn't enough.

### Step 4: Verify It Works

Open your app and check:
- ✅ Map loads and displays
- ✅ Property markers appear
- ✅ No errors in browser console (F12)

---

## 🧪 Testing Tools

### Option 1: Automated Check (Recommended)
```bash
node check-maps-setup.js
```

This will verify:
- ✅ .env file exists
- ✅ API key is configured correctly
- ✅ Required dependencies are installed
- ⚠️  Common issues

### Option 2: Interactive Browser Test
```bash
# Open in browser
open test-google-maps.html
```

This interactive tool will:
- Test your API key
- Show specific error messages
- Display a test map if successful

---

## 📁 Documentation Files

| File | Purpose |
|------|---------|
| **START_HERE_MAPS_FIX.md** | This file - quick start guide |
| **GOOGLE_MAPS_SETUP.md** | Complete detailed setup guide |
| **GOOGLE_MAPS_FIX_SUMMARY.md** | Technical details of the fix |
| **check-maps-setup.js** | Automated verification script |
| **test-google-maps.html** | Interactive browser test tool |

---

## ❓ Troubleshooting

### Maps Still Not Working?

Run the check script first:
```bash
node check-maps-setup.js
```

### Common Issues

#### ❌ "API key not configured"
**Solution**: Add `VITE_GOOGLE_MAP_API=your_key` to .env and restart dev server

#### ❌ "Maps JavaScript API has not been activated"
**Solution**: [Enable Maps JavaScript API](https://console.cloud.google.com/apis/library/maps-backend.googleapis.com)

#### ❌ "InvalidKeyMapError"  
**Solution**: Check your API key in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

#### ❌ "RefererNotAllowedMapError"
**Solution**: In Google Cloud Console → API Key → Add `http://localhost:*` to allowed referrers

#### ❌ "REQUEST_DENIED" (Geocoding)
**Solution**: [Enable Geocoding API](https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com)

#### ❌ "ApiTargetBlockedMapError"
**Solution**: [Enable billing](https://console.cloud.google.com/billing) (free tier available)

### Still Stuck?

1. Check browser console (F12) for specific error
2. See detailed solutions in `GOOGLE_MAPS_SETUP.md`
3. Use test tools to diagnose the issue

---

## 💰 Pricing Info

**Good News**: You likely won't be charged anything!

**Google Maps Free Tier:**
- $200 credit per month
- 28,500 map loads per month  
- 40,000 geocoding requests per month

**Typical landlord app usage:**
- Small (1-10 properties): ~500 loads/month = **$0**
- Medium (10-50 properties): ~2,000 loads/month = **$0**
- Large (50+ properties): ~5,000 loads/month = **$0**

You'll get email alerts if approaching limits.

---

## ✨ What You Get When Working

Once configured, your maps will show:

- 📍 **Property Locations**: Automatically geocoded from addresses
- 🎯 **Status Markers**:
  - 🟢 Green = Occupied (shows tenant count)
  - 🟡 Yellow = Vacant
  - ⚪ Gray = Sold
- 💬 **Info Windows**: Click markers to see property details
- 🎨 **Auto-Centering**: Map centers on your properties
- 📱 **Responsive**: Works on all devices

---

## 🔒 Security Best Practices

### For Development
Your API key in `.env` is safe for local development (file is gitignored).

### For Production
1. Add API key to your hosting platform's environment variables
2. Set API key restrictions in Google Cloud Console:
   - **Application restrictions**: HTTP referrers
   - **Allowed referrers**: Your production domain
   - **API restrictions**: Only Maps JavaScript API and Geocoding API

---

## 📚 Next Steps

1. **Right Now**: Add API key to `.env` and restart server
2. **Test**: Run `node check-maps-setup.js`
3. **Verify**: Check maps work in your app
4. **Deploy**: Add API key to production environment variables
5. **Optimize**: Review usage in [Google Cloud Console](https://console.cloud.google.com/apis/dashboard)

---

## 📖 Need More Details?

- **Full Setup Guide**: See `GOOGLE_MAPS_SETUP.md`
- **Technical Details**: See `GOOGLE_MAPS_FIX_SUMMARY.md`  
- **Test Your Setup**: Run `node check-maps-setup.js`
- **Interactive Test**: Open `test-google-maps.html`

---

## ✅ Success Checklist

- [ ] Went to Google Cloud Console
- [ ] Created/selected project
- [ ] Enabled Maps JavaScript API
- [ ] Enabled Geocoding API
- [ ] Enabled billing
- [ ] Created API key
- [ ] Added `VITE_GOOGLE_MAP_API=key` to .env
- [ ] Restarted dev server
- [ ] Maps load without errors
- [ ] Property markers display correctly

---

**That's it!** Your Google Maps integration is now fixed and ready to use. Just add your API key and restart the server. 🎉

