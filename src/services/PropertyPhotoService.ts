import { supabase } from '../lib/supabase';

const STORAGE_BUCKET = 'property-photos';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];

export interface PropertyPhoto {
  id: string;
  propertyId: string;
  organizationId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  storagePath: string;
  caption?: string;
  isPrimary: boolean;
  displayOrder: number;
  uploadedBy?: string;
  uploadedAt: string;
  url?: string; // Public URL for displaying the image
}

export interface PhotoUploadRequest {
  propertyId: string;
  organizationId: string;
  file: File;
  caption?: string;
  isPrimary?: boolean;
  displayOrder?: number;
}

export class PropertyPhotoService {
  /**
   * Validate file before upload
   */
  private static validateFile(file: File): void {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(
        `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }
  }

  /**
   * Upload a property photo to storage and create database record
   */
  static async uploadPhoto(request: PhotoUploadRequest): Promise<PropertyPhoto> {
    try {
      // 1. Validate file
      this.validateFile(request.file);

      // 2. Generate storage path
      const timestamp = Date.now();
      const sanitizedFileName = request.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${request.organizationId}/${request.propertyId}/${timestamp}_${sanitizedFileName}`;

      // 3. Upload file to storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, request.file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (storageError) {
        console.error('Storage error:', storageError);
        throw new Error(`Failed to upload photo: ${storageError.message}`);
      }

      // 4. Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // 5. If this is marked as primary, unset any existing primary photos
      if (request.isPrimary) {
        await supabase
          .from('property_photos')
          .update({ is_primary: false })
          .eq('property_id', request.propertyId);
      }

      // 6. Create photo record in database
      const { data: photoData, error: photoError } = await supabase
        .from('property_photos')
        .insert({
          property_id: request.propertyId,
          organization_id: request.organizationId,
          file_name: request.file.name,
          file_size: request.file.size,
          file_type: request.file.type,
          storage_path: storagePath,
          caption: request.caption,
          is_primary: request.isPrimary || false,
          display_order: request.displayOrder || 0,
          uploaded_by: user?.id,
        })
        .select()
        .single();

      if (photoError) {
        // Rollback: Delete uploaded file
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        throw new Error(`Failed to create photo record: ${photoError.message}`);
      }

      return this.mapToPropertyPhoto(photoData);
    } catch (error) {
      console.error('Error uploading property photo:', error);
      throw error;
    }
  }

  /**
   * Get all photos for a property
   */
  static async getPropertyPhotos(propertyId: string): Promise<PropertyPhoto[]> {
    try {
      const { data, error } = await supabase
        .from('property_photos')
        .select('*')
        .eq('property_id', propertyId)
        .order('display_order', { ascending: true })
        .order('uploaded_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Get signed URLs for all photos
      const photosWithUrls = await Promise.all(
        (data || []).map(async (photo) => {
          const mapped = this.mapToPropertyPhoto(photo);
          mapped.url = await this.getPhotoUrl(photo.storage_path);
          return mapped;
        })
      );

      return photosWithUrls;
    } catch (error) {
      console.error('Error fetching property photos:', error);
      throw error;
    }
  }

  /**
   * Get the primary photo for a property
   */
  static async getPrimaryPhoto(propertyId: string): Promise<PropertyPhoto | null> {
    try {
      const { data, error } = await supabase
        .from('property_photos')
        .select('*')
        .eq('property_id', propertyId)
        .eq('is_primary', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No primary photo found
          return null;
        }
        throw error;
      }

      const photo = this.mapToPropertyPhoto(data);
      photo.url = await this.getPhotoUrl(data.storage_path);
      return photo;
    } catch (error) {
      console.error('Error fetching primary photo:', error);
      return null;
    }
  }

  /**
   * Delete a photo
   */
  static async deletePhoto(photoId: string): Promise<void> {
    try {
      // 1. Get photo details
      const { data: photo, error: fetchError } = await supabase
        .from('property_photos')
        .select('storage_path')
        .eq('id', photoId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // 2. Delete from storage
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([photo.storage_path]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        // Continue with database deletion even if storage deletion fails
      }

      // 3. Delete from database
      const { error: deleteError } = await supabase
        .from('property_photos')
        .delete()
        .eq('id', photoId);

      if (deleteError) {
        throw deleteError;
      }
    } catch (error) {
      console.error('Error deleting property photo:', error);
      throw error;
    }
  }

  /**
   * Set a photo as primary
   */
  static async setPrimaryPhoto(photoId: string, propertyId: string): Promise<void> {
    try {
      // 1. Unset all primary flags for this property
      await supabase
        .from('property_photos')
        .update({ is_primary: false })
        .eq('property_id', propertyId);

      // 2. Set this photo as primary
      const { error } = await supabase
        .from('property_photos')
        .update({ is_primary: true })
        .eq('id', photoId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error setting primary photo:', error);
      throw error;
    }
  }

  /**
   * Get a signed URL for a photo
   * Handles both real storage paths and placeholder URLs
   */
  private static async getPhotoUrl(storagePath: string): Promise<string> {
    try {
      // Check if this is a placeholder URL (starts with "placeholder:")
      if (storagePath.startsWith('placeholder:')) {
        // Handle format: "placeholder:{property_id}:{url}" or "placeholder:{url}"
        const withoutPrefix = storagePath.replace('placeholder:', '');
        // If it contains a colon after the prefix, it's the new format with property_id
        const parts = withoutPrefix.split(':');
        if (parts.length > 1 && parts[0].includes('-')) {
          // New format: property_id:url - extract just the URL (everything after first colon)
          return withoutPrefix.substring(withoutPrefix.indexOf(':') + 1);
        }
        // Old format: just the URL
        return withoutPrefix;
      }

      // Otherwise, get signed URL from storage
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      if (error) {
        console.error('Error creating signed URL:', error);
        return '';
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error getting photo URL:', error);
      return '';
    }
  }

  /**
   * Map database record to PropertyPhoto interface
   */
  private static mapToPropertyPhoto(data: any): PropertyPhoto {
    return {
      id: data.id,
      propertyId: data.property_id,
      organizationId: data.organization_id,
      fileName: data.file_name,
      fileSize: data.file_size,
      fileType: data.file_type,
      storagePath: data.storage_path,
      caption: data.caption,
      isPrimary: data.is_primary,
      displayOrder: data.display_order,
      uploadedBy: data.uploaded_by,
      uploadedAt: data.uploaded_at,
    };
  }

  /**
   * Get placeholder image URLs for demo purposes
   */
  static getPlaceholderImageUrl(propertyType: 'house' | 'flat' | 'hmo', index: number = 0): string {
    const placeholders = {
      house: [
        'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80', // Modern house
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80', // House with garden
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80', // Suburban house
      ],
      flat: [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80', // Modern apartment building
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80', // Apartment interior
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80', // City apartment
      ],
      hmo: [
        'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80', // Shared house
        'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80', // Multi-unit building
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80', // HMO property
      ],
    };

    const typeImages = placeholders[propertyType] || placeholders.house;
    return typeImages[index % typeImages.length];
  }
}

