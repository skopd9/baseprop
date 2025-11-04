# Schema Design Explanation & Improvements

## Why Current Design Separates Email from user_profiles

### Original Design (Current)
```
auth.users (Supabase managed)
├── id (UUID)
├── email
├── encrypted_password
└── ...

user_profiles (Our table)
├── id (references auth.users.id)
├── full_name
├── has_completed_onboarding
└── onboarding_data

organization_members (Junction table)
├── organization_id
├── user_id
└── role
```

### Why This Design?
1. **Normalization** - Email lives in `auth.users`, no duplication
2. **Supabase manages auth.users** - We can't easily modify it
3. **Many-to-Many Relationship** - Users can belong to multiple organizations

### Problems with This Design
1. ❌ Need JOINs to get basic user info (email + org)
2. ❌ Can't easily query user_profiles by email
3. ❌ More complex queries in application code
4. ❌ RLS policies are harder to write

## Improved Design

### What We're Adding

#### 1. Email Column in user_profiles
```sql
ALTER TABLE user_profiles ADD COLUMN email TEXT;
```
**Benefits:**
- ✅ Single table query for user info
- ✅ Easier filtering and searching
- ✅ Faster queries (no JOIN needed)
- ✅ Better for application code

**How it stays in sync:**
- Trigger automatically copies email from `auth.users` on insert/update

#### 2. Convenient Views

**`user_organizations_view`** - One query to get everything:
```sql
SELECT * FROM user_organizations_view WHERE user_id = auth.uid();
```
Returns:
- User email, name
- Organization id, name
- Role in each organization
- Join date

#### 3. Helper Functions

**`get_complete_user_profile()`** - Returns user with all their organizations:
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "has_completed_onboarding": true,
  "organizations": [
    {
      "id": "uuid",
      "name": "My Workspace",
      "role": "owner",
      "joined_at": "2024-01-01"
    }
  ]
}
```

**`get_user_primary_organization()`** - Gets user's main organization:
- Returns first organization they created (if owner)
- Or their oldest membership

## Why We Don't Add organization_id to user_profiles

### Multi-Tenant Design
Users can belong to **multiple organizations**:
- Your personal workspace
- Your company's workspace  
- Client workspace you're invited to

### How We Handle It
1. **organization_members** table tracks all memberships
2. **currentOrganization** in React context (active workspace)
3. **localStorage** remembers last selected workspace
4. Organization selector in UI (if user has multiple)

### Example Scenario
```
User: john@example.com
├── "John's Workspace" (owner)
├── "ACME Properties Ltd" (member)
└── "Client Portfolio" (member)

Current active: "John's Workspace"
```

If we added `organization_id` to `user_profiles`, we could only store ONE organization. That wouldn't work for multi-tenant!

## Migration Steps

### Step 1: Run Migration Check
```bash
# In Supabase SQL Editor, run:
scripts/checkMigrationStatus.sql
```

This will tell you:
- ✅ Which tables exist
- ✅ If you have a user profile
- ✅ If you have organization memberships
- ✅ If RLS is enabled

### Step 2: Run Schema Improvements
```bash
# In Supabase SQL Editor, run:
migrations/improve_user_profiles_schema.sql
```

This adds:
- Email column to user_profiles (with auto-sync)
- Convenient views for querying
- Helper functions

### Step 3: Create Your Organization
```bash
# In Supabase SQL Editor, run:
scripts/createOrganization.sql
```

### Step 4: Verify
```sql
-- Should now show your email
SELECT * FROM user_profiles WHERE id = auth.uid();

-- Should show your organizations
SELECT * FROM user_organizations_view WHERE user_id = auth.uid();

-- Should return complete profile
SELECT * FROM get_complete_user_profile();
```

## Updating Application Code (Optional)

You can now use these simpler queries in your services:

```typescript
// Old way (multiple queries/JOINs)
const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', userId)
  .single();

const { data: { user } } = await supabase.auth.getUser();
const email = user.email;

// New way (single query)
const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', userId)
  .single();

const email = profile.email; // ✅ Now available directly!

// Or use the helper function
const { data, error } = await supabase
  .rpc('get_complete_user_profile');

// Returns everything including organizations array!
```

## Summary

**Q: Why not store email in user_profiles?**  
A: We ARE now! The improvement adds it with auto-sync.

**Q: Why not store organization_id in user_profiles?**  
A: Users can have MULTIPLE organizations. We use `organization_members` table to track all of them, plus a "current organization" in the app state.

**Q: How do I know which organization I'm in?**  
A: The app's `OrganizationContext` tracks your current organization. The sidebar shows "X workspaces" and lets you switch between them.

