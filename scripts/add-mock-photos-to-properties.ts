/**
 * Script to add mock/placeholder photos to all existing properties
 * Uses placeholder images from Unsplash based on property type
 * 
 * Run this script to populate existing properties with sample photos
 */

// Placeholder image URLs by property type
const PLACEHOLDER_IMAGES = {
  house: [
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
  ],
  flat: [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
  ],
  hmo: [
    'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80',
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
  ],
  default: [
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
  ],
};

/**
 * Download image from URL and convert to blob
 */
async function downloadImageAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  return await response.blob();
}

/**
 * Get property type from property data
 */
function getPropertyType(propertyData: any): 'house' | 'flat' | 'hmo' | 'default' {
  const subType = propertyData?.property_sub_type || propertyData?.propertyType;
  if (subType === 'house' || subType === 'flat' || subType === 'hmo') {
    return subType;
  }
  return 'default';
}

/**
 * Add mock photos to a property
 * This function will be called via MCP SQL execution
 */
export async function addMockPhotosToProperty(
  propertyId: string,
  organizationId: string,
  propertyType: string | null,
  numPhotos: number = 3
): Promise<void> {
  // Determine property type
  const type = (propertyType || 'default') as 'house' | 'flat' | 'hmo' | 'default';
  const images = PLACEHOLDER_IMAGES[type] || PLACEHOLDER_IMAGES.default;
  
  // Limit to available images
  const photosToAdd = Math.min(numPhotos, images.length);
  
  console.log(`Adding ${photosToAdd} mock photos to property ${propertyId} (type: ${type})`);
  
  // For each photo, we'll insert a record with the placeholder URL as storage_path
  // In production, you'd download and upload to storage, but for mock data,
  // we'll store the URL directly and fetch it when needed
  
  // Note: Since we can't easily download and upload via MCP, we'll store
  // the placeholder URLs in a special format that the service can recognize
  for (let i = 0; i < photosToAdd; i++) {
    const imageUrl = images[i % images.length];
    const fileName = `placeholder_${type}_${i + 1}.jpg`;
    
    // Insert photo record with placeholder URL
    // We'll use a special storage_path format: "placeholder:{url}"
    const storagePath = `placeholder:${imageUrl}`;
    
    // This will be executed via MCP
    const insertQuery = `
      INSERT INTO property_photos (
        property_id,
        organization_id,
        file_name,
        file_size,
        file_type,
        storage_path,
        is_primary,
        display_order,
        uploaded_at
      ) VALUES (
        '${propertyId}',
        '${organizationId}',
        '${fileName}',
        0,
        'image/jpeg',
        '${storagePath}',
        ${i === 0 ? 'true' : 'false'},
        ${i},
        now()
      )
      ON CONFLICT DO NOTHING;
    `;
    
    // Return the query to be executed
    return insertQuery as any;
  }
}

