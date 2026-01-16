# Turnkey (reos-2) - Real Estate Operations Platform

Turnkey is a React + TypeScript platform for end-to-end real estate operations: property management, compliance, tenant workflows, and financial tracking. This README is the current, short-form guide for setup, security, and the latest fixes and workflows.

## ✅ Current Status (Latest)

- **Invitation auto-login flow is ready** and requires `SUPABASE_SERVICE_ROLE_KEY` on Netlify. See `docs/CURRENT_STATUS.md` and `docs/START_HERE_INVITATION_AUTO_LOGIN.md`.
- **Database migrations and RLS fixes are complete.** If you see organization errors, start with `docs/START_HERE.md` and `docs/QUICK_FIX_CHECKLIST.md`.
- **Feature guides are up to date** for compliance, rent payments, and occupancy tracking. See the Documentation section below.

## 🚀 Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the project root (see Environment Variables).
3. Set up Supabase and run the schema/migrations:
   - Use `docs/COMPLETE_DATABASE_SETUP.md` for a clean install.
   - Use `docs/QUICK_FIX_CHECKLIST.md` if you only need the fixes.
4. Start the dev server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:5173`.

## 🔐 Environment Variables

Keep secrets out of the repo. Do not commit `.env` files.

### Client (Vite) variables
- `VITE_SUPABASE_URL` (required)
- `VITE_SUPABASE_ANON_KEY` (required)
- `VITE_APP_URL` (optional, defaults to `window.location.origin`)
- `VITE_GOOGLE_MAP_API` or `VITE_GOOGLE_MAPS_API_KEY` (optional maps)
- `VITE_OPENAI_API_KEY` (optional AI features)
- `VITE_RESEND_API_KEY` + `VITE_FROM_EMAIL` (optional client-side email flows)
- `VITE_DOCUSIGN_INTEGRATION_KEY`, `VITE_DOCUSIGN_ACCOUNT_ID`, `VITE_DOCUSIGN_REDIRECT_URL` (optional DocuSign)
- `VITE_MAPBOX_ACCESS_TOKEN` (optional Mapbox)

### Serverless / Netlify variables
- `SUPABASE_SERVICE_ROLE_KEY` (required for invite auto-login and admin flows)
- `VITE_SUPABASE_URL` or `SUPABASE_URL`
- `RESEND_API_KEY` + `FROM_EMAIL` (email sending functions)
- `REDUCTO_API_KEY` (lease parsing)
- `OPENAI_API_KEY` (lease parsing)
- `DOCUSIGN_PRIVATE_KEY`, `DOCUSIGN_USER_ID`, `DOCUSIGN_INTEGRATION_KEY` (server-side DocuSign)

## 🧭 Start Here

- `docs/CURRENT_STATUS.md` - latest deploy blockers and invitation auto-login checklist
- `docs/START_HERE_INVITATION_AUTO_LOGIN.md` - fastest path to fix invite flow
- `docs/START_HERE.md` - database + RLS fix overview
- `docs/QUICK_FIX_CHECKLIST.md` - 5-minute migration checklist
- `docs/COMPLETE_DATABASE_SETUP.md` - clean Supabase setup

## 📚 Feature Documentation

- `docs/UK_COMPLIANCE_GUIDE.md` - UK compliance requirements
- `docs/OCCUPANCY_TRACKING_GUIDE.md` - occupancy tracking
- `docs/RENT_PAYMENTS_IMPLEMENTATION_COMPLETE.md` - rent payments
- `docs/TENANT_DOCUMENTS_SETUP.md` - tenant documents
- `docs/PROPERTY_PHOTOS_FEATURE.md` - property photos
- `docs/TROUBLESHOOTING.md` - common issues

## 🔒 Security Notes

- **No API keys are stored in this repo.** All secrets are read from environment variables.
- Rotate any key immediately if you suspect exposure.
- Keep `SUPABASE_SERVICE_ROLE_KEY` on serverless only, never in the browser.

## 🛠️ Scripts

- `npm run dev` - start development server
- `npm run build` - production build
- `npm run preview` - preview build
- `npm run lint` - ESLint
