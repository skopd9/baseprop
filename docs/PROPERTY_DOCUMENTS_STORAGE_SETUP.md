# Property Documents Storage Setup Guide

This guide will help you set up the Supabase Storage bucket and database tables for storing property-specific documents.

## Overview

The Property Documents system allows you to store documents like:

### 🇬🇧 UK Properties
- Title Deeds
- Property Survey/Valuation
- Building Insurance Policy
- EICR Certificate
- Energy Performance Certificate (EPC)
- Purchase Documents
- Mortgage Documents
- Property Tax Documents
- Planning Permissions
- Building Regulations Certificates
- Warranty Documents (NHBC)
- Floor Plans & Photos

### 🇬🇷 Greece Properties
- Title Deeds (Τίτλος Ιδιοκτησίας)
- Building Permit (Οικοδομική Άδεια)
- Energy Certificate (ΠΕΑ)
- ENFIA Tax Documents
- Cadastral Registry
- Topographic Diagram

### 🇺🇸 USA Properties
- Property Deed
- Title Insurance
- Home Inspection Report
- Homeowners Insurance
- Property Tax Records
- HOA Documents
- Building Permits
- Lead Paint Disclosure

---

## Setup Steps

### Step 1: Create the Storage Bucket

1. **Go to Supabase Dashboard** → [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Storage** in the left sidebar
4. Click **"New bucket"** button
5. Configure the bucket:
   - **Name**: `property-documents`
   - **Public**: ❌ **NO** (Keep it private for security)
   - **File size limit**: `52428800` (50MB)
   - **Allowed MIME types**: Leave empty (we'll handle validation in code)

6. Click **"Create bucket"**

### Step 2: Run the Database Migration

1. **Go to Supabase Dashboard** → **SQL Editor**
2. Click **"New query"**
3. Copy the entire contents of `migrations/create_property_documents_storage.sql`
4. Paste into the SQL Editor
5. Click **"Run"** (or press Cmd/Ctrl + Enter)

This migration creates:
- ✅ `property_documents` table to track uploaded documents
- ✅ Indexes for performance
- ✅ Row Level Security (RLS) policies for data protection
- ✅ Storage bucket policies for file access control
- ✅ Helper functions for querying documents

### Step 3: Verify the Setup

Run these verification queries in the SQL Editor:

```sql
-- 1. Check that the property_documents table was created
SELECT * FROM property_documents LIMIT 1;

-- 2. Verify the storage bucket exists
SELECT * FROM storage.buckets WHERE name = 'property-documents';

-- 3. Check RLS policies were created
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'property_documents';

-- 4. Check storage policies were created
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%property-documents%';
```

Expected results:
- Table should exist (even if empty)
- Bucket should show `property-documents` with `public: false`
- Should see 4 RLS policies for property_documents
- Should see 4 storage policies for the bucket

---

## Storage Structure

Documents are organized by organization and property:

```
property-documents/
├── {organization_id}/
│   ├── {property_id}/
│   │   ├── title_deeds/
│   │   │   └── 1699123456789_title_deed.pdf
│   │   ├── epc/
│   │   │   └── 1699123456790_epc_certificate.pdf
│   │   ├── building_insurance/
│   │   │   └── 1699123456791_insurance_policy.pdf
│   │   ├── mortgage_documents/
│   │   │   └── 1699123456792_mortgage_agreement.pdf
│   │   └── photos/
│   │       ├── 1699123456793_front_view.jpg
│   │       └── 1699123456794_kitchen.jpg
```

**Benefits of this structure:**
- ✅ Easy to find all documents for a property
- ✅ Organized by document type
- ✅ Secure - users can only access their organization's documents
- ✅ Scalable - supports multiple properties and organizations

---

## Security Features

### Row Level Security (RLS)

The setup includes RLS policies that ensure:
- ✅ Users can only view documents for properties in their organization
- ✅ Users can only upload documents to properties they manage
- ✅ Users can only delete documents from their organization
- ✅ All operations are tied to the authenticated user

### Storage Policies

Storage policies ensure:
- ✅ Files are private (not publicly accessible)
- ✅ Signed URLs expire after 1 hour (configurable)
- ✅ Users can only access files in their organization's folder
- ✅ No anonymous access to any files

---

## How It Works

### Uploading a Document

1. User selects document type from dropdown
2. User uploads a file (PDF, DOC, DOCX, JPG, PNG)
3. File is validated (max 10MB)
4. File is uploaded to Supabase Storage at:
   ```
   property-documents/{org_id}/{property_id}/{doc_type}/{timestamp}_{filename}
   ```
5. Database record is created in `property_documents` table
6. Document appears in the list immediately

### Viewing a Document

1. User clicks the 👁️ (eye) icon
2. System generates a signed URL (valid for 1 hour)
3. Document opens in a modal viewer:
   - **PDFs**: Display in iframe for inline viewing
   - **Images**: Display with zoom/pan capabilities
   - **Other files**: Show download prompt

### Downloading a Document

1. User clicks the ⬇️ (download) icon
2. System generates a signed URL
3. Browser downloads the file with original filename

### Deleting a Document

1. User clicks the 🗑️ (trash) icon
2. System confirms deletion
3. File is removed from Storage bucket
4. Database record is deleted

---

## Testing the Integration

### Test Upload

1. Open a property in the Properties tab
2. Scroll to **Property Documents** section
3. Select a document type (e.g., "Title Deeds")
4. Upload a test PDF file
5. Verify the document appears in the list
6. Check Supabase Storage to see the file

### Test Viewing

1. Click the 👁️ icon on an uploaded document
2. PDF should display in a modal viewer
3. Click "Download" to download the file
4. Click X or backdrop to close viewer

### Test Download

1. Click the ⬇️ icon on a document
2. File should download with original filename
3. Verify file opens correctly

### Test Delete

1. Click the 🗑️ icon on a document
2. Document should be removed from list
3. Verify file is deleted from Storage bucket

---

## Troubleshooting

### "Failed to upload file" Error

**Possible causes:**
- Storage bucket doesn't exist
- Storage bucket name is incorrect
- User doesn't have upload permissions

**Solution:**
1. Verify bucket exists: `SELECT * FROM storage.buckets WHERE name = 'property-documents';`
2. Check storage policies are in place
3. Verify user is authenticated and part of an organization

### "Failed to create document record" Error

**Possible causes:**
- Database table doesn't exist
- RLS policies are blocking the insert
- Missing required fields

**Solution:**
1. Verify table exists: `SELECT * FROM property_documents LIMIT 1;`
2. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'property_documents';`
3. Verify user is authenticated

### "Permission denied" when viewing documents

**Possible causes:**
- User not part of the organization
- Storage policies not set up correctly

**Solution:**
1. Verify user is in organization: 
   ```sql
   SELECT * FROM organization_members WHERE user_id = auth.uid();
   ```
2. Check storage policies are created
3. Re-run the storage policies section of the migration

### Documents not appearing after upload

**Possible causes:**
- Database insert failed but file uploaded
- RLS policies blocking SELECT

**Solution:**
1. Check browser console for errors
2. Verify RLS SELECT policy exists
3. Try refreshing the page

---

## File Type Support

### Fully Supported (with preview)
- ✅ **PDF** - Full inline viewing in modal
- ✅ **JPEG/JPG** - Image viewer with zoom
- ✅ **PNG** - Image viewer with zoom

### Supported (download only)
- ✅ **DOC/DOCX** - Download to view in Word
- ✅ **Other types** - Download to view in appropriate app

### File Size Limits
- Maximum: **10MB per file** (frontend validation)
- Storage bucket limit: **50MB** (backend limit)

---

## Maintenance

### Cleaning Up Old Documents

If you need to bulk delete old documents:

```sql
-- Find documents older than 1 year
SELECT id, file_name, uploaded_at 
FROM property_documents 
WHERE uploaded_at < now() - interval '1 year';

-- Delete them (after verifying the list!)
-- This will trigger automatic cleanup from storage
DELETE FROM property_documents 
WHERE uploaded_at < now() - interval '1 year';
```

### Checking Storage Usage

```sql
-- Get total storage used per property
SELECT 
  p.address,
  COUNT(pd.id) as document_count,
  pg_size_pretty(SUM(pd.file_size)::bigint) as total_size
FROM property_documents pd
INNER JOIN properties p ON pd.property_id = p.id
GROUP BY p.address
ORDER BY SUM(pd.file_size) DESC;
```

---

## Next Steps

Once the storage is set up, you can:

1. ✅ Upload property documents directly from the property edit modal
2. ✅ View documents inline (PDFs and images)
3. ✅ Download documents for offline access
4. ✅ Organize documents by type (title deeds, insurance, etc.)
5. ✅ Track who uploaded each document and when

The system automatically adapts document types based on the property's country!

---

## Need Help?

If you encounter issues:

1. Check the browser console for errors
2. Check Supabase Dashboard → Database → Table Editor → `property_documents`
3. Check Supabase Dashboard → Storage → `property-documents`
4. Verify all migration steps completed successfully

Common issues are usually related to:
- Missing storage bucket
- RLS policies not applied correctly
- User not authenticated or not in organization

