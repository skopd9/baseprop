// =====================================================
// TENANT DOCUMENT SERVICE
// Manages tenant document storage and retrieval
// =====================================================

import { supabase } from '../lib/supabase';
import {
  TenantDocument,
  TenantDocumentRequirement,
  DocumentUploadRequest,
  DocumentCheckResult,
  ExpiringDocument,
  CountryCode,
  DocumentType,
  DocumentStatus,
} from '../types/tenantDocuments';

const STORAGE_BUCKET = 'tenant-documents';

export class TenantDocumentService {
  // =====================================================
  // DOCUMENT REQUIREMENTS
  // =====================================================

  /**
   * Get all document requirements for a country
   */
  static async getDocumentRequirements(countryCode: CountryCode): Promise<TenantDocumentRequirement[]> {
    const { data, error } = await supabase
      .from('tenant_document_requirements')
      .select('*')
      .eq('country_code', countryCode)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching document requirements:', error);
      throw error;
    }

    return data.map(this.mapToDocumentRequirement);
  }

  /**
   * Get required documents for onboarding
   */
  static async getOnboardingRequirements(countryCode: CountryCode): Promise<TenantDocumentRequirement[]> {
    const { data, error } = await supabase
      .from('tenant_document_requirements')
      .select('*')
      .eq('country_code', countryCode)
      .eq('required_for_onboarding', true)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching onboarding requirements:', error);
      throw error;
    }

    return data.map(this.mapToDocumentRequirement);
  }

  /**
   * Get required documents for existing tenants
   */
  static async getExistingTenantRequirements(countryCode: CountryCode): Promise<TenantDocumentRequirement[]> {
    const { data, error } = await supabase
      .from('tenant_document_requirements')
      .select('*')
      .eq('country_code', countryCode)
      .eq('required_for_existing', true)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching existing tenant requirements:', error);
      throw error;
    }

    return data.map(this.mapToDocumentRequirement);
  }

  // =====================================================
  // DOCUMENT OPERATIONS
  // =====================================================

  /**
   * Upload a document for a tenant
   */
  static async uploadDocument(request: DocumentUploadRequest): Promise<TenantDocument> {
    try {
      // 1. Get organization ID from property
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select('organization_id')
        .eq('id', request.propertyId)
        .single();

      if (propertyError || !propertyData) {
        throw new Error('Property not found');
      }

      const organizationId = propertyData.organization_id;

      // 2. Generate storage path
      const timestamp = Date.now();
      const sanitizedFileName = request.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${organizationId}/${request.tenantId}/${request.documentType}/${timestamp}_${sanitizedFileName}`;

      // 3. Upload file to storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, request.file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (storageError) {
        console.error('Storage error:', storageError);
        throw new Error(`Failed to upload file: ${storageError.message}`);
      }

      // 4. Create document record in database
      const documentRecord = {
        tenant_id: request.tenantId,
        property_id: request.propertyId,
        country_code: request.countryCode,
        document_type: request.documentType,
        document_name: request.documentName,
        description: request.description,
        file_name: request.file.name,
        file_size: request.file.size,
        file_type: request.file.type,
        storage_path: storagePath,
        status: 'uploaded' as DocumentStatus,
        is_required: true, // Will be determined by requirements
        uploaded_at: new Date().toISOString(),
        related_to: request.relatedTo || 'tenant',
        guarantor_name: request.guarantorName,
        expiry_date: request.expiryDate,
      };

      const { data: dbData, error: dbError } = await supabase
        .from('tenant_documents')
        .insert(documentRecord)
        .select()
        .single();

      if (dbError) {
        // Rollback: Delete uploaded file
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        throw dbError;
      }

      return this.mapToTenantDocument(dbData);
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  /**
   * Get all documents for a tenant
   */
  static async getTenantDocuments(tenantId: string): Promise<TenantDocument[]> {
    const { data, error } = await supabase
      .from('tenant_documents')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tenant documents:', error);
      throw error;
    }

    return data.map(this.mapToTenantDocument);
  }

  /**
   * Get documents by type for a tenant
   */
  static async getDocumentsByType(tenantId: string, documentType: DocumentType): Promise<TenantDocument[]> {
    const { data, error } = await supabase
      .from('tenant_documents')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('document_type', documentType)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents by type:', error);
      throw error;
    }

    return data.map(this.mapToTenantDocument);
  }

  /**
   * Download a document (get signed URL)
   */
  static async getDocumentDownloadUrl(documentId: string): Promise<string> {
    // 1. Get document record
    const { data: docData, error: docError } = await supabase
      .from('tenant_documents')
      .select('storage_path')
      .eq('id', documentId)
      .single();

    if (docError || !docData) {
      throw new Error('Document not found');
    }

    // 2. Get signed URL from storage
    const { data: urlData, error: urlError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(docData.storage_path, 3600); // Valid for 1 hour

    if (urlError || !urlData) {
      throw new Error('Failed to generate download URL');
    }

    return urlData.signedUrl;
  }

  /**
   * Update document status
   */
  static async updateDocumentStatus(
    documentId: string,
    status: DocumentStatus,
    verifiedBy?: string,
    notes?: string,
    rejectionReason?: string
  ): Promise<TenantDocument> {
    const updates: any = {
      status,
      notes,
      rejection_reason: rejectionReason,
    };

    if (status === 'verified') {
      updates.verified_at = new Date().toISOString();
      updates.verified_by = verifiedBy;
    }

    const { data, error } = await supabase
      .from('tenant_documents')
      .update(updates)
      .eq('id', documentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating document status:', error);
      throw error;
    }

    return this.mapToTenantDocument(data);
  }

  /**
   * Delete a document
   */
  static async deleteDocument(documentId: string): Promise<boolean> {
    try {
      // 1. Get document to get storage path
      const { data: docData, error: docError } = await supabase
        .from('tenant_documents')
        .select('storage_path')
        .eq('id', documentId)
        .single();

      if (docError || !docData) {
        throw new Error('Document not found');
      }

      // 2. Delete from storage
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([docData.storage_path]);

      if (storageError) {
        console.error('Error deleting from storage:', storageError);
        // Continue anyway - db record is more important
      }

      // 3. Delete database record
      const { error: dbError } = await supabase
        .from('tenant_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) {
        throw dbError;
      }

      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  // =====================================================
  // DOCUMENT CHECKING & COMPLIANCE
  // =====================================================

  /**
   * Check which required documents are missing for a tenant
   */
  static async checkRequiredDocuments(
    tenantId: string,
    countryCode: CountryCode
  ): Promise<DocumentCheckResult[]> {
    const { data, error } = await supabase.rpc('check_tenant_required_documents', {
      p_tenant_id: tenantId,
      p_country_code: countryCode,
    });

    if (error) {
      console.error('Error checking required documents:', error);
      throw error;
    }

    return data as DocumentCheckResult[];
  }

  /**
   * Get expiring documents for all tenants (within specified days)
   */
  static async getExpiringDocuments(daysAhead: number = 30): Promise<ExpiringDocument[]> {
    const { data, error } = await supabase.rpc('get_expiring_tenant_documents', {
      p_days_ahead: daysAhead,
    });

    if (error) {
      console.error('Error fetching expiring documents:', error);
      throw error;
    }

    return data.map((doc: any) => ({
      documentId: doc.document_id,
      tenantId: doc.tenant_id,
      tenantName: doc.tenant_name,
      documentType: doc.document_type,
      documentName: doc.document_name,
      expiryDate: doc.expiry_date,
      daysUntilExpiry: doc.days_until_expiry,
    }));
  }

  /**
   * Check if tenant has all required documents uploaded
   */
  static async isTenantDocumentationComplete(
    tenantId: string,
    countryCode: CountryCode
  ): Promise<boolean> {
    const results = await this.checkRequiredDocuments(tenantId, countryCode);
    return results.every((result) => !result.isRequired || result.isUploaded);
  }

  /**
   * Get document completion percentage
   */
  static async getDocumentCompletionPercentage(
    tenantId: string,
    countryCode: CountryCode
  ): Promise<number> {
    const results = await this.checkRequiredDocuments(tenantId, countryCode);
    const requiredDocs = results.filter((r) => r.isRequired);
    const uploadedDocs = results.filter((r) => r.isRequired && r.isUploaded);

    if (requiredDocs.length === 0) return 100;
    return Math.round((uploadedDocs.length / requiredDocs.length) * 100);
  }

  // =====================================================
  // BULK OPERATIONS
  // =====================================================

  /**
   * Get all documents for a property
   */
  static async getPropertyDocuments(propertyId: string): Promise<TenantDocument[]> {
    const { data, error } = await supabase
      .from('tenant_documents')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching property documents:', error);
      throw error;
    }

    return data.map(this.mapToTenantDocument);
  }

  /**
   * Get documents that need verification
   */
  static async getDocumentsNeedingVerification(organizationId: string): Promise<TenantDocument[]> {
    const { data, error } = await supabase
      .from('tenant_documents')
      .select(`
        *,
        properties!inner(organization_id)
      `)
      .eq('properties.organization_id', organizationId)
      .eq('status', 'uploaded')
      .order('uploaded_at', { ascending: true });

    if (error) {
      console.error('Error fetching documents needing verification:', error);
      throw error;
    }

    return data.map((doc: any) => this.mapToTenantDocument(doc));
  }

  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================

  private static mapToTenantDocument(data: any): TenantDocument {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      propertyId: data.property_id,
      countryCode: data.country_code,
      documentType: data.document_type,
      documentName: data.document_name,
      description: data.description,
      fileName: data.file_name,
      fileSize: data.file_size,
      fileType: data.file_type,
      storagePath: data.storage_path,
      status: data.status,
      isRequired: data.is_required,
      uploadedAt: data.uploaded_at,
      verifiedAt: data.verified_at,
      verifiedBy: data.verified_by,
      expiryDate: data.expiry_date,
      notes: data.notes,
      rejectionReason: data.rejection_reason,
      relatedTo: data.related_to,
      guarantorName: data.guarantor_name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private static mapToDocumentRequirement(data: any): TenantDocumentRequirement {
    return {
      id: data.id,
      countryCode: data.country_code,
      documentType: data.document_type,
      documentLabel: data.document_label,
      description: data.description,
      isRequired: data.is_required,
      requiredForOnboarding: data.required_for_onboarding,
      requiredForExisting: data.required_for_existing,
      canExpire: data.can_expire,
      typicalExpiryYears: data.typical_expiry_years,
      orderIndex: data.order_index,
    };
  }
}

