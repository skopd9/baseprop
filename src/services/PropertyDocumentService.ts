import { supabase } from '../lib/supabase';

const STORAGE_BUCKET = 'property-documents';

export interface PropertyDocument {
  id: string;
  propertyId: string;
  organizationId: string;
  documentTypeId: string;
  documentTypeName: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  storagePath: string;
  uploadedBy?: string;
  uploadedAt: Date;
  notes?: string;
}

export interface DocumentUploadRequest {
  propertyId: string;
  organizationId: string;
  documentTypeId: string;
  documentTypeName: string;
  file: File;
  notes?: string;
}

export class PropertyDocumentService {
  /**
   * Upload a property document to storage and create database record
   */
  static async uploadDocument(request: DocumentUploadRequest): Promise<PropertyDocument> {
    try {
      // 1. Generate storage path
      const timestamp = Date.now();
      const sanitizedFileName = request.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${request.organizationId}/${request.propertyId}/${request.documentTypeId}/${timestamp}_${sanitizedFileName}`;

      // 2. Upload file to storage
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

      // 3. Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // 4. Create document record in database
      const { data: documentData, error: documentError } = await supabase
        .from('property_documents')
        .insert({
          property_id: request.propertyId,
          organization_id: request.organizationId,
          document_type_id: request.documentTypeId,
          document_type_name: request.documentTypeName,
          file_name: request.file.name,
          file_size: request.file.size,
          file_type: request.file.type,
          storage_path: storagePath,
          uploaded_by: user?.id,
          notes: request.notes,
        })
        .select()
        .single();

      if (documentError) {
        // Rollback: Delete uploaded file
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        throw new Error(`Failed to create document record: ${documentError.message}`);
      }

      return this.mapToPropertyDocument(documentData);
    } catch (error) {
      console.error('Error uploading property document:', error);
      throw error;
    }
  }

  /**
   * Get all documents for a property
   */
  static async getPropertyDocuments(propertyId: string): Promise<PropertyDocument[]> {
    try {
      const { data, error } = await supabase
        .from('property_documents')
        .select('*')
        .eq('property_id', propertyId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map(this.mapToPropertyDocument);
    } catch (error) {
      console.error('Error fetching property documents:', error);
      throw error;
    }
  }

  /**
   * Get a signed URL for viewing/downloading a document
   */
  static async getDocumentUrl(document: PropertyDocument, expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(document.storagePath, expiresIn);

      if (error) {
        throw new Error(`Failed to generate document URL: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error generating document URL:', error);
      throw error;
    }
  }

  /**
   * Download a document
   */
  static async downloadDocument(document: PropertyDocument): Promise<Blob> {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(document.storagePath);

      if (error) {
        throw new Error(`Failed to download document: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error downloading document:', error);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  static async deleteDocument(documentId: string): Promise<void> {
    try {
      // 1. Get document details
      const { data: document, error: fetchError } = await supabase
        .from('property_documents')
        .select('storage_path')
        .eq('id', documentId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch document: ${fetchError.message}`);
      }

      // 2. Delete from storage
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([document.storage_path]);

      if (storageError) {
        console.warn('Failed to delete file from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }

      // 3. Delete database record
      const { error: deleteError } = await supabase
        .from('property_documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) {
        throw new Error(`Failed to delete document record: ${deleteError.message}`);
      }
    } catch (error) {
      console.error('Error deleting property document:', error);
      throw error;
    }
  }

  /**
   * Update document notes
   */
  static async updateDocumentNotes(documentId: string, notes: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('property_documents')
        .update({ notes })
        .eq('id', documentId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating document notes:', error);
      throw error;
    }
  }

  /**
   * Map database record to PropertyDocument interface
   */
  private static mapToPropertyDocument(data: any): PropertyDocument {
    return {
      id: data.id,
      propertyId: data.property_id,
      organizationId: data.organization_id,
      documentTypeId: data.document_type_id,
      documentTypeName: data.document_type_name,
      fileName: data.file_name,
      fileSize: data.file_size,
      fileType: data.file_type,
      storagePath: data.storage_path,
      uploadedBy: data.uploaded_by,
      uploadedAt: new Date(data.uploaded_at),
      notes: data.notes,
    };
  }

  /**
   * Get storage bucket info
   */
  static getStorageBucket(): string {
    return STORAGE_BUCKET;
  }
}

