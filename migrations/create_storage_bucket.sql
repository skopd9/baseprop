-- =====================================================
-- STORAGE BUCKET SETUP FOR TENANT DOCUMENTS
-- Run this AFTER creating the bucket in Supabase Dashboard
-- =====================================================

-- =====================================================
-- STEP 1: Create the bucket via Supabase Dashboard
-- =====================================================
-- Go to: Storage > New Bucket
-- Name: tenant-documents
-- Public: NO (Private)
-- File Size Limit: 52428800 (50MB)

-- =====================================================
-- STEP 2: Set up Storage RLS Policies
-- =====================================================

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can upload to their organization's tenant folders
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

-- Policy: Users can read their organization's tenant documents
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

-- Policy: Users can update their organization's tenant documents
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

-- Policy: Users can delete their organization's tenant documents
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

-- =====================================================
-- STEP 3: Verify Setup
-- =====================================================

-- Check if bucket exists
SELECT 
  id, 
  name, 
  public, 
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE name = 'tenant-documents';

-- Check storage policies
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%tenant%';

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================

-- If you need to drop and recreate policies:
/*
DROP POLICY IF EXISTS "Users can upload tenant documents for their organization" ON storage.objects;
DROP POLICY IF EXISTS "Users can view tenant documents for their organization" ON storage.objects;
DROP POLICY IF EXISTS "Users can update tenant documents for their organization" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete tenant documents for their organization" ON storage.objects;
*/

-- If you need to delete the bucket (WARNING: deletes all files)
/*
DELETE FROM storage.objects WHERE bucket_id = 'tenant-documents';
DELETE FROM storage.buckets WHERE name = 'tenant-documents';
*/

