# Tenant Documents System - Setup Guide

## Overview

This system manages **personal documents for tenants** based on their country. It's separate from property compliance certificates (which are property-level, not tenant-level).

### Key Features
- ✅ **Country-Specific Requirements**: Different document types for UK, Greece, and USA
- ✅ **Onboarding Integration**: Documents collected during tenant onboarding
- ✅ **Existing Tenant Support**: Ability to add documents for tenants already in the system
- ✅ **Expiry Tracking**: Automatically tracks document expiry dates (ID, Right to Rent, etc.)
- ✅ **Document Verification**: Workflow for verifying uploaded documents
- ✅ **Secure Storage**: Private Supabase storage bucket with RLS policies
- ✅ **Guarantor Documents**: Support for guarantor-related documents

### What Documents Are Managed

This system manages **tenant personal documents**, NOT compliance certificates:

#### UK Tenant Documents (12 types)
1. Photo ID (Passport/Driving License) ⏰ *Expires*
2. Right to Rent Document ⏰ *Expires*
3. Proof of Address
4. Bank Statements (3 months)
5. Employment Reference
6. Previous Landlord Reference
7. Guarantor Photo ID ⏰ *Expires*
8. Guarantor Income Proof
9. Signed Tenancy Agreement
10. Signed Inventory
11. Check-In Report
12. Deposit Receipt

#### Greece Tenant Documents (8 types)
1. Photo ID (ID Card/Passport) ⏰ *Expires*
2. Tax Identification Number (ΑΦΜ)
3. Tax Clearance Certificate ⏰ *Expires*
4. Bank Statements (3 months)
5. Employment Verification
6. Income Declaration (E1)
7. Signed Tenancy Agreement
8. Signed Inventory

#### USA Tenant Documents (11 types)
1. Photo ID (Driver's License/Passport) ⏰ *Expires*
2. Social Security Number
3. Credit Report
4. Bank Statements (2-3 months)
5. Pay Stubs (2-3 months)
6. Employment Verification Letter
7. Tax Return (W-2)
8. Previous Landlord Reference
9. Signed Lease Agreement
10. Signed Move-In Checklist
11. Renter's Insurance ⏰ *Expires*

---

## Setup Instructions

### Step 1: Run Database Migration

The migration creates:
- `tenant_documents` table
- `tenant_document_requirements` table
- Helper functions for checking documents
- RLS policies for security

```bash
# In Supabase SQL Editor, run:
migrations/create_tenant_documents_system.sql
```

**What this creates:**
- ✅ Tables with proper relationships
- ✅ Pre-populated document requirements for all countries
- ✅ Indexes for performance
- ✅ RLS policies matching your organization structure
- ✅ Helper functions: `check_tenant_required_documents()` and `get_expiring_tenant_documents()`

### Step 2: Create Storage Bucket

You need to create a storage bucket in Supabase for tenant documents.

#### Option A: Via Supabase Dashboard

1. Go to **Storage** in Supabase Dashboard
2. Click **"New bucket"**
3. Configure:
   - **Name**: `tenant-documents`
   - **Public**: ❌ **No** (Private)
   - **File size limit**: `52428800` (50MB)
   - **Allowed MIME types**: Leave empty (we'll set via SQL)

4. After creating, run this SQL to set up storage policies:

```sql
-- Run this in Supabase SQL Editor after creating the bucket

-- Storage Policy: Users can upload to their organization's tenant folders
CREATE POLICY "Users can upload tenant documents for their organization"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tenant-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Storage Policy: Users can read their organization's tenant documents
CREATE POLICY "Users can view tenant documents for their organization"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tenant-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Storage Policy: Users can update their organization's tenant documents
CREATE POLICY "Users can update tenant documents for their organization"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tenant-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Storage Policy: Users can delete their organization's tenant documents
CREATE POLICY "Users can delete tenant documents for their organization"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tenant-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);
```

#### Option B: Via Supabase API/CLI

```javascript
// Using Supabase JS client
const { data, error } = await supabase.storage.createBucket('tenant-documents', {
  public: false,
  fileSizeLimit: 52428800, // 50MB
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
});
```

### Step 3: Verify Setup

Run these queries to verify everything is set up correctly:

```sql
-- Check document requirements are loaded
SELECT country_code, COUNT(*) as document_count 
FROM tenant_document_requirements 
GROUP BY country_code;
-- Should show: UK: 12, GR: 8, US: 11

-- Check storage bucket exists
SELECT * FROM storage.buckets WHERE name = 'tenant-documents';

-- Test the helper function
SELECT * FROM check_tenant_required_documents(
  'some-tenant-id'::uuid, 
  'UK'
);
```

---

## Storage Structure

Documents are organized by organization, tenant, and document type:

```
tenant-documents/
├── {organization_id}/
│   ├── {tenant_id}/
│   │   ├── id_proof/
│   │   │   └── 1699123456789_passport.pdf
│   │   ├── right_to_rent/
│   │   │   └── 1699123456790_visa.pdf
│   │   ├── bank_statements/
│   │   │   ├── 1699123456791_statement_jan.pdf
│   │   │   ├── 1699123456792_statement_feb.pdf
│   │   │   └── 1699123456793_statement_mar.pdf
│   │   ├── references/
│   │   │   ├── 1699123456794_employment.pdf
│   │   │   └── 1699123456795_landlord.pdf
│   │   ├── guarantor/
│   │   │   ├── 1699123456796_guarantor_id.pdf
│   │   │   └── 1699123456797_guarantor_income.pdf
│   │   └── tenancy/
│   │       ├── 1699123456798_agreement_signed.pdf
│   │       ├── 1699123456799_inventory_signed.pdf
│   │       └── 1699123456800_checkin_report.pdf
```

### File Naming Convention
```
{timestamp}_{sanitized_filename}
```
Example: `1699123456789_john_smith_passport.pdf`

---

## Using the System

### TypeScript Integration

Import the types and service:

```typescript
import { TenantDocumentService } from '../services/TenantDocumentService';
import { 
  CountryCode, 
  DocumentType, 
  DocumentStatus 
} from '../types/tenantDocuments';
```

### Example: Upload a Document

```typescript
const uploadDocument = async (file: File, tenantId: string, propertyId: string) => {
  const request = {
    tenantId,
    propertyId,
    countryCode: 'UK' as CountryCode,
    documentType: 'id_proof' as DocumentType,
    documentName: 'Passport',
    description: 'UK Passport - expires 2030',
    file,
    expiryDate: '2030-12-31',
    relatedTo: 'tenant' as const,
  };
  
  const document = await TenantDocumentService.uploadDocument(request);
  console.log('Uploaded:', document.id);
};
```

### Example: Check Required Documents

```typescript
const checkDocuments = async (tenantId: string) => {
  const results = await TenantDocumentService.checkRequiredDocuments(
    tenantId,
    'UK'
  );
  
  results.forEach(result => {
    console.log(
      `${result.documentLabel}: ${result.isUploaded ? '✅' : '❌'}`
    );
  });
};
```

### Example: Get Expiring Documents

```typescript
const checkExpiring = async () => {
  // Get documents expiring in next 30 days
  const expiring = await TenantDocumentService.getExpiringDocuments(30);
  
  expiring.forEach(doc => {
    console.log(
      `${doc.tenantName} - ${doc.documentName}: ` +
      `Expires in ${doc.daysUntilExpiry} days`
    );
  });
};
```

### Example: Verify a Document

```typescript
const verifyDocument = async (documentId: string, userEmail: string) => {
  const updated = await TenantDocumentService.updateDocumentStatus(
    documentId,
    'verified',
    userEmail,
    'Document verified and approved'
  );
  
  console.log('Document verified:', updated.verifiedAt);
};
```

---

## Integration Points

### 1. Tenant Onboarding Flow

Add document collection to your onboarding modal:

```typescript
// In EnhancedTenantOnboardingModal.tsx
const requirements = await TenantDocumentService.getOnboardingRequirements('UK');

// Show upload interface for each required document
requirements.forEach(req => {
  if (req.requiredForOnboarding) {
    // Render upload component
  }
});
```

### 2. Tenant Details Modal

Show document status in tenant details:

```typescript
// In TenantDetailsModal.tsx
const documents = await TenantDocumentService.getTenantDocuments(tenantId);
const completion = await TenantDocumentService.getDocumentCompletionPercentage(
  tenantId,
  countryCode
);

// Display: "Documents: 8/12 (67% complete)"
```

### 3. Dashboard Alerts

Show expiring documents on dashboard:

```typescript
// In Dashboard.tsx
const expiring = await TenantDocumentService.getExpiringDocuments(30);

// Show alert banner: "3 tenant documents expiring soon"
```

---

## Security

### Row Level Security (RLS)

All tables have RLS enabled. Users can only:
- ✅ View documents for tenants in their organization
- ✅ Upload documents for tenants in their organization
- ✅ Update/delete documents for tenants in their organization
- ❌ Cannot access other organizations' documents

### Storage Security

Storage bucket is **private** with policies that match the database RLS:
- Documents organized by `organization_id`
- Users can only access their organization's folder
- Signed URLs expire after 1 hour
- No public access

---

## Database Schema

### tenant_documents Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `tenant_id` | uuid | FK to tenants |
| `property_id` | uuid | FK to properties |
| `country_code` | text | UK, GR, or US |
| `document_type` | text | Type of document |
| `document_name` | text | Display name |
| `file_name` | text | Original filename |
| `file_size` | bigint | Size in bytes |
| `storage_path` | text | Path in storage |
| `status` | text | pending/uploaded/verified/rejected/expired |
| `is_required` | boolean | Is this required? |
| `uploaded_at` | timestamptz | When uploaded |
| `verified_at` | timestamptz | When verified |
| `verified_by` | text | Who verified |
| `expiry_date` | date | When document expires |
| `related_to` | text | tenant/guarantor/onboarding |

### tenant_document_requirements Table

Pre-populated with country-specific requirements. Read-only reference data.

---

## Maintenance

### Expired Document Cleanup

Run periodically to mark expired documents:

```sql
-- Mark documents as expired
UPDATE tenant_documents
SET status = 'expired'
WHERE expiry_date < CURRENT_DATE
  AND status = 'verified';
```

### Document Expiry Notifications

Set up a cron job or scheduled function to send notifications:

```typescript
const notifyExpiring = async () => {
  const expiring = await TenantDocumentService.getExpiringDocuments(14);
  
  // Send emails/notifications for documents expiring in 2 weeks
  for (const doc of expiring) {
    await sendExpiryNotification(doc.tenantId, doc);
  }
};
```

---

## Testing

### Test Checklist

- [ ] Migration runs successfully
- [ ] Storage bucket created
- [ ] Can upload a document
- [ ] Can download a document
- [ ] Can verify a document
- [ ] Can delete a document
- [ ] RLS prevents access to other organizations
- [ ] Expiring documents are detected
- [ ] Required documents check works
- [ ] Country-specific requirements load correctly

### Test Query

```sql
-- Insert a test document (replace UUIDs with real ones)
INSERT INTO tenant_documents (
  tenant_id,
  property_id,
  country_code,
  document_type,
  document_name,
  file_name,
  storage_path,
  status
) VALUES (
  'your-tenant-id',
  'your-property-id',
  'UK',
  'id_proof',
  'Test Passport',
  'test_passport.pdf',
  'org-id/tenant-id/id_proof/test.pdf',
  'uploaded'
);

-- Verify it appears
SELECT * FROM tenant_documents WHERE document_name = 'Test Passport';
```

---

## Troubleshooting

### Issue: Can't upload files

**Check:**
1. Storage bucket exists and is named `tenant-documents`
2. Storage policies are created
3. User is member of an organization
4. Property belongs to user's organization

### Issue: RLS blocks access

**Fix:**
```sql
-- Temporarily disable RLS for testing (NOT for production!)
ALTER TABLE tenant_documents DISABLE ROW LEVEL SECURITY;

-- Check what policies exist
SELECT * FROM pg_policies WHERE tablename = 'tenant_documents';
```

### Issue: Documents not showing in check

**Verify:**
```sql
-- Check tenant exists and has correct country
SELECT id, name, country_code FROM tenants WHERE id = 'tenant-id';

-- Check requirements exist
SELECT * FROM tenant_document_requirements WHERE country_code = 'UK';
```

---

## Next Steps

1. ✅ Run migration
2. ✅ Create storage bucket
3. ✅ Set up storage policies
4. ⬜ Create UI component for document upload
5. ⬜ Integrate with tenant onboarding
6. ⬜ Add document verification workflow
7. ⬜ Set up expiry notifications

---

**Need Help?** Check the code:
- Types: `src/types/tenantDocuments.ts`
- Service: `src/services/TenantDocumentService.ts`
- Migration: `migrations/create_tenant_documents_system.sql`

