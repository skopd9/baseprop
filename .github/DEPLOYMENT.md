# Deployment Configuration

This project is configured to deploy from the main repository:

**Repository:** https://github.com/skopd9/baseprop

## Deployment Platforms

### Vercel (Recommended)
- **Repository:** https://github.com/skopd9/baseprop
- **Branch:** main
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Framework Preset:** Vite

### Netlify
- **Repository:** https://github.com/skopd9/baseprop
- **Branch:** main
- **Build Command:** `npm run build`
- **Publish Directory:** `dist`

## Environment Variables

Make sure these are configured in your deployment platform:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `VITE_OPENAI_API_KEY` - (Optional) For AI features
- `VITE_GOOGLE_MAPS_API_KEY` - (Optional) For maps features

## Important Notes

- Always ensure deployments are configured to use: **https://github.com/skopd9/baseprop**
- Never change the repository URL in deployment settings
- All deployments should trigger from the `main` branch

