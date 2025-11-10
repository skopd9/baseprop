# User Settings & Name Collection Implementation

## Overview
This implementation addresses two key requirements:
1. **User Settings Page**: Users can view and edit their profile name
2. **Invitation Name Collection**: New users entering their name during invitation acceptance so they appear properly in the members list

## Changes Made

### 1. New Component: UserSettings.tsx
**Location:** `src/components/UserSettings.tsx`

**Features:**
- Modal interface for viewing/editing user profile
- Email field (read-only)
- Full Name field (editable)
- Real-time validation
- Success/error messaging
- Accessible from user menu

**Key Functions:**
- `loadUserProfile()`: Fetches current user profile from database
- `handleSave()`: Updates user profile with new name
- Validates name is not empty before saving

### 2. Updated Component: AcceptInvite.tsx
**Location:** `src/components/AcceptInvite.tsx`

**New Features:**
- Name collection step before accepting invitation
- Checks if user has a valid name already set
- Shows name input form if:
  - User has no name set, OR
  - User's name is just their email prefix (default)
- Auto-populates with email prefix as starting point
- Validates name before proceeding

**New State Variables:**
- `showNameForm`: Controls display of name collection form
- `fullName`: Stores the user's entered name

**New Functions:**
- `handleAcceptClick()`: Checks if name collection is needed
- `acceptInvitationWithName(name: string)`: Accepts invitation with provided name

**User Flow:**
1. User clicks "Accept Invitation"
2. System checks if user has a valid name
3. If no valid name:
   - Shows "What's your name?" form
   - User enters their full name
   - Clicks "Continue" to accept with name
4. If valid name exists:
   - Proceeds directly to invitation acceptance

### 3. Updated Service: OrganizationService.ts
**Location:** `src/services/OrganizationService.ts`

**Function Updated:** `acceptInvitation()`

**Changes:**
- Added optional `fullName` parameter: `acceptInvitation(token: string, userId: string, fullName?: string)`
- Uses provided name if available, falls back to email prefix if not
- Creates/updates user profile with the proper name during invitation acceptance

**Before:**
```typescript
static async acceptInvitation(token: string, userId: string): Promise<void>
// Always used email prefix as default
```

**After:**
```typescript
static async acceptInvitation(token: string, userId: string, fullName?: string): Promise<void>
// Uses provided fullName, or falls back to email prefix
```

### 4. Updated Component: SimplifiedLandlordApp.tsx
**Location:** `src/components/SimplifiedLandlordApp.tsx`

**Changes:**
1. Added import for `UserSettings` component
2. Added import for `UserIcon` from heroicons
3. Added state variable: `showUserSettings`
4. Added "User Settings" menu item to user dropdown
5. Added `<UserSettings>` modal at bottom of component

**Menu Structure:**
```
User Menu (dropdown)
├── User Settings (new)
├── Organization Settings
└── Logout
```

## User Flows

### Flow 1: Existing User Changing Their Name
1. User opens app
2. Clicks user menu (chevron icon in sidebar)
3. Clicks "User Settings"
4. Edits "Full Name" field
5. Clicks "Save Changes"
6. Name is updated in database
7. Name appears in organization members list

### Flow 2: New User Accepting Invitation (No Name Set)
1. User clicks invitation link in email
2. Signs up or logs in
3. AcceptInvite modal shows invitation details
4. User clicks "Accept Invitation"
5. **Name collection form appears** (new step)
   - Shows "What's your name?" with icon
   - Pre-filled with email prefix
   - User enters their full name
   - User clicks "Continue"
6. Invitation accepted with proper name
7. User added to organization with their chosen name
8. Welcome tour appears
9. Name displays properly in members list

### Flow 3: Existing User Accepting Invitation (Has Valid Name)
1. User clicks invitation link in email
2. Logs in
3. AcceptInvite modal shows invitation details
4. User clicks "Accept Invitation"
5. **Name collection skipped** (user has valid name)
6. Invitation accepted immediately
7. Welcome tour appears
8. Existing name displays in members list

## Database Schema
No database changes required. Uses existing `user_profiles` table:
- `id` (UUID) - references auth.users
- `full_name` (TEXT) - editable by user
- `email` (TEXT) - synced from auth.users
- `has_completed_onboarding` (BOOLEAN)
- `onboarding_data` (JSONB)

## Benefits

### For Users
✅ **Clear Identity**: Users have proper names instead of "john123" from email
✅ **Team Recognition**: Members can easily identify each other
✅ **Professional Appearance**: Organization looks more polished
✅ **Control**: Users can update their name anytime

### For Organization Owners
✅ **Better Member List**: See actual names in organization settings
✅ **Easier Management**: Identify team members at a glance
✅ **Professional Communication**: Use proper names in the app

## Technical Details

### Validation
- Name is required (cannot be empty)
- Name is trimmed (leading/trailing spaces removed)
- Maximum length: 100 characters
- Email cannot be changed (read-only field)

### Smart Name Detection
The system considers a name "valid" when:
- It exists and is not empty
- It's not just the email prefix (e.g., not "john" from "john@example.com")

This ensures users who were added via the old flow (with email prefix) are prompted to enter their real name.

### Error Handling
- Profile load errors show clear messages
- Save errors display with suggestions
- Network errors are caught and reported
- Graceful fallbacks for missing data

### UI/UX Features
- Auto-focus on name input
- Enter key submits form
- Loading states during save
- Success confirmation messages
- Disabled state during operations
- Mobile-responsive design

## Testing Checklist

### User Settings
- [ ] Open User Settings from menu
- [ ] Edit name and save
- [ ] Try saving empty name (should fail)
- [ ] Verify name updates in members list
- [ ] Close modal without saving (no changes)
- [ ] Test on mobile view

### Invitation Flow (New User)
- [ ] Receive invitation email
- [ ] Click link (not logged in)
- [ ] Create account
- [ ] See name collection form
- [ ] Enter name and continue
- [ ] Verify name in members list
- [ ] Check welcome tour appears

### Invitation Flow (Existing User)
- [ ] Receive invitation email
- [ ] Click link (already logged in)
- [ ] Accept invitation
- [ ] Verify direct acceptance (no name form)
- [ ] Check existing name in members list

### Edge Cases
- [ ] User with email-prefix-only name gets prompted
- [ ] Very long names handled properly
- [ ] Special characters in names
- [ ] International characters (accents, etc.)
- [ ] Empty/whitespace-only names rejected

## Files Changed
1. ✅ `src/components/UserSettings.tsx` (new file)
2. ✅ `src/components/AcceptInvite.tsx` (updated)
3. ✅ `src/services/OrganizationService.ts` (updated)
4. ✅ `src/components/SimplifiedLandlordApp.tsx` (updated)

## Future Enhancements (Optional)
- Add profile picture/avatar
- Add timezone setting
- Add notification preferences
- Add language preference
- Add phone number field
- Email change workflow (requires auth confirmation)





