# Supabase Auth & Multi-Tenant Implementation

## Overview

This document summarizes the implementation of Supabase Auth with magic links and full multi-tenant organization support.

## What Was Implemented

### 1. Database Schema (`migrations/add_auth_and_organizations.sql`)

**New Tables:**
- `user_profiles` - Extended user data linked to `auth.users`
  - Stores full name, onboarding status, and onboarding data
- `organizations` - Tenant isolation for multi-org support
  - Each user can belong to multiple organizations
- `organization_members` - User-organization relationships
  - Roles: 'owner' or 'member'
  - Tracks invitation and join dates
- `organization_invitations` - Pending team invitations
  - Secure token-based invites with expiration

**Updated Tables:**
- Added `organization_id` column to:
  - properties
  - tenants
  - expenses
  - rent_payments
  - repairs
  - inspections
  - compliance_certificates

**Row Level Security (RLS):**
- All tables now have RLS enabled
- Users can only access data from their organizations
- Enforced at database level for security

### 2. Authentication (`src/lib/supabase.ts`)

**New Auth Functions:**
- `signInWithMagicLink(email)` - Sends passwordless magic link
- `signOut()` - Signs out current user
- `getCurrentUser()` - Gets authenticated user
- `getSession()` - Gets current session
- `onAuthStateChange(callback)` - Listens to auth events

### 3. Organization Management

**OrganizationService (`src/services/OrganizationService.ts`):**
- Create organizations
- Invite users via email
- Accept/decline invitations
- Manage organization members
- Remove members (owners only)

**OrganizationContext (`src/contexts/OrganizationContext.tsx`):**
- Manages current organization state
- Provides organization switching
- Tracks user role in organization
- Handles invitation management

### 4. User Interface Components

**AuthModal (`src/components/AuthModal.tsx`):**
- Replaced alpha list checking with magic link flow
- Simple email input → magic link sent
- "Check your email" success state
- Removed all waitlist logic

**OnboardingWizard (`src/components/OnboardingWizard.tsx`):**
- 6-step onboarding flow for new users:
  1. Personal Info (name, company)
  2. Role selection (landlord, property manager, etc.)
  3. Portfolio size (1-5, 6-10, 11-25, etc.)
  4. Country selection (UK, Greece, USA)
  5. Use cases (tenant mgmt, rent collection, etc.)
  6. Get started options (add property, sample data, empty)
- Creates organization automatically
- Saves onboarding data to user profile

**OrganizationSettings (`src/components/OrganizationSettings.tsx`):**
- View organization members
- Invite new members (owners only)
- Set member roles
- View pending invitations
- Remove members

**AcceptInvite (`src/components/AcceptInvite.tsx`):**
- Token-based invitation acceptance
- Shows organization details
- Accept/decline invitation
- Validates invitation status

### 5. App Integration (`src/App.tsx`)

**New Auth Flow:**
1. Check for invite token in URL
2. Verify Supabase Auth session
3. If authenticated but no profile → show onboarding
4. If authenticated with profile → load organizations
5. Show invite acceptance if token present
6. Otherwise show main app

**Features:**
- Automatic session management
- Magic link callback handling
- Onboarding trigger for new users
- Invitation acceptance flow

### 6. Navigation Updates (`src/components/SimplifiedLandlordApp.tsx`)

**Added:**
- Organization switcher (dropdown for multiple orgs)
- User menu with organization settings
- Organization name display
- Workspace count indicator

**Menu Items:**
- Organization Settings
- Quick Start Guide
- Logout

### 7. Service Updates

**SimplifiedPropertyService & SimplifiedTenantService:**
- Added `organizationId` parameter to all queries
- Filters data by organization automatically
- Includes organization ID when creating records

## How It Works

### Magic Link Authentication

1. User enters email on landing page
2. Supabase sends magic link to email
3. User clicks link in email
4. Supabase validates and creates session
5. App detects auth state change
6. User redirected to app or onboarding

### Organization Isolation

1. All data is scoped to organizations
2. RLS policies enforce data isolation at database level
3. Users can belong to multiple organizations
4. Organization switching updates all queries automatically

### Invitation Flow

1. Owner invites user via email in Organization Settings
2. Invitation record created with secure token
3. Invited user receives email with link containing token
4. User clicks link: `https://app.com?token=xxx`
5. App shows invitation acceptance screen
6. User accepts → added to organization as member/owner
7. Invitation marked as accepted

### User Onboarding

1. New user signs in with magic link
2. App detects no user profile exists
3. Shows 6-step onboarding wizard
4. Collects: name, role, portfolio size, country, use cases
5. User chooses starting option:
   - Add first property manually
   - Import sample data
   - Start with empty portfolio
6. Organization created automatically
7. User added as organization owner
8. Redirected to main app

## Migration Steps

### To Apply This Implementation:

1. **Run Database Migration:**
   ```bash
   # In Supabase SQL Editor, run:
   migrations/add_auth_and_organizations.sql
   ```

2. **Configure Supabase Auth:**
   - Go to Supabase Dashboard → Authentication → Email
   - Enable "Email provider"
   - Customize magic link email template
   - Set redirect URL to your app URL

3. **Update Environment:**
   - Ensure `VITE_SUPABASE_URL` is set
   - Ensure `VITE_SUPABASE_ANON_KEY` is set

4. **Deploy Code:**
   - Deploy updated React app
   - Test magic link flow
   - Test organization creation
   - Test invitation flow

### Migrating Existing Data:

If you have existing properties/tenants without `organization_id`:

```sql
-- Create a default organization
INSERT INTO organizations (name, created_by, settings)
VALUES ('Legacy Properties', NULL, '{}')
RETURNING id;

-- Update existing properties (replace with actual org ID)
UPDATE properties
SET organization_id = 'your-org-id-here'
WHERE organization_id IS NULL;

-- Update existing tenants
UPDATE tenants
SET organization_id = 'your-org-id-here'
WHERE organization_id IS NULL;
```

## Security Features

1. **Row Level Security:** All data access controlled at database level
2. **Magic Links:** No passwords to steal or phish
3. **Token-Based Invites:** Secure, expiring invitation tokens
4. **Organization Isolation:** Users cannot access other orgs' data
5. **Role-Based Access:** Owners vs Members have different permissions

## Testing Checklist

- [ ] Magic link email received
- [ ] Magic link successfully logs in
- [ ] Onboarding wizard completes
- [ ] Organization created automatically
- [ ] Properties filter by organization
- [ ] Organization switcher works
- [ ] Invitations can be sent
- [ ] Invitations can be accepted
- [ ] Members can be removed
- [ ] RLS prevents unauthorized access
- [ ] Logout clears session

## Next Steps

1. **Email Templates:** Customize Supabase email templates for branding
2. **Invitation Emails:** Set up email service to send invitation links
3. **Role Permissions:** Expand member/owner permissions as needed
4. **Audit Logs:** Track organization member changes
5. **Billing Integration:** Add per-organization billing if needed

## Support

For issues or questions:
1. Check Supabase Auth docs: https://supabase.com/docs/guides/auth
2. Review RLS policies in migration file
3. Check browser console for auth errors
4. Verify environment variables are set

