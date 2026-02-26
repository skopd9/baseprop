# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Turnkey (package name: `baseprop`) is an AI-powered real estate operations platform. It is a **React 18 + TypeScript + Vite 5** single-page application with **Tailwind CSS** styling, backed by **Supabase** (hosted PostgreSQL + Auth + Storage) and **Netlify Functions** for serverless endpoints.

### Quick reference

| Action | Command |
|--------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (port 5173) |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Preview build | `npm run preview` |

See `README.md` for full environment variable list and feature documentation.

### Key caveats

- **Supabase credentials required**: The app throws at runtime if `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not set. These are injected as environment secrets. To create the `.env` file for the dev server, run: `printf "VITE_SUPABASE_URL=%s\nVITE_SUPABASE_ANON_KEY=%s\n" "$VITE_SUPABASE_URL" "$VITE_SUPABASE_ANON_KEY" > .env`. Build and lint work without a valid `.env`, but the dev server UI will show "Failed to fetch" on auth attempts if credentials are missing/placeholder.
- **No automated test framework**: The project has no test runner (no Jest, Vitest, etc. in devDependencies). Testing is manual via the browser. ESLint is the only automated code quality check.
- **Lint exits non-zero**: The existing codebase has ~367 pre-existing ESLint errors (mostly `@typescript-eslint/no-explicit-any` and `@typescript-eslint/no-unused-vars`). This is normal and not caused by your changes.
- **Magic link auth**: Authentication uses magic links (passwordless OTP via email). In dev mode (`localhost`), it falls back to Supabase's built-in email; in production it uses a custom Netlify function with Resend.
- **Netlify Functions** (in `netlify/functions/`) are serverless and not served by the Vite dev server. They only run when deployed to Netlify or via `netlify dev` CLI.
- **No Docker or local database needed**: All data lives in the hosted Supabase instance. No Docker setup required for development.
