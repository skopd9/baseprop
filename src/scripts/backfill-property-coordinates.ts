/**
 * Backfill Script: Geocode Existing Properties
 * 
 * This script geocodes all properties in the database that don't have coordinates yet.
 * It respects Google API rate limits by adding a delay between requests.
 * 
 * Prerequisites:
 *   - Make sure .env or .env.local file exists with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 *   - Make sure VITE_GOOGLE_MAP_API is set for geocoding
 * 
 * Usage:
 *   npx tsx src/scripts/backfill-property-coordinates.ts
 */

// Load environment variables from .env files
import { config } from 'dotenv';
config();

// Initialize Supabase client directly (avoiding Vite-specific import.meta.env)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
// Try service role key first (for admin operations), fall back to anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables.');
  console.error('   Please set VITE_SUPABASE_URL and either:');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY (recommended for backfill scripts), or');
  console.error('   - VITE_SUPABASE_ANON_KEY (if RLS policies allow read access)');
  process.exit(1);
}

// Create Supabase client with service role to bypass RLS
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Rate limiting: delay between geocoding requests (in milliseconds)
const GEOCODE_DELAY_MS = 100; // 10 requests per second (well within Google's 50/sec limit)

// Sleep function for rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Geocode an address using Google Maps Geocoding API
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // Get Google Maps API key from environment
    const apiKey = process.env.VITE_GOOGLE_MAP_API 
      || process.env.VITE_GOOGLE_MAPS_API_KEY 
      || process.env.GOOGLE_MAP_API
      || process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.warn('⚠️  Google Maps API key not configured. Skipping geocoding.');
      return null;
    }

    // Use Google Geocoding API
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Geocoding API request failed:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng
      };
    } else if (data.status === 'ZERO_RESULTS') {
      console.warn(`No geocoding results found for address: ${address}`);
      return null;
    } else {
      console.error('Geocoding failed:', data.status, data.error_message || '');
      return null;
    }
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

interface BackfillStats {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
}

async function backfillPropertyCoordinates() {
  console.log('🚀 Starting property coordinates backfill...\n');
  console.log('🔍 Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Not set');
  console.log('🔍 Supabase Key Type:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Service Role' : '⚠️  Anon Key (may be limited by RLS)');
  console.log('🔍 Google API Key:', process.env.VITE_GOOGLE_MAP_API ? '✅ Set' : '❌ Not set');
  console.log('');

  const stats: BackfillStats = {
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0
  };

  try {
    // Fetch all properties without coordinates
    console.log('📊 Fetching properties without coordinates...');
    const { data: properties, error: fetchError } = await supabase
      .from('properties')
      .select('id, address, latitude, longitude')
      .is('latitude', null);

    console.log('🔍 Query result - data:', properties?.length, 'items, error:', fetchError);

    if (fetchError) {
      console.error('❌ Error fetching properties:', fetchError);
      return;
    }

    if (!properties || properties.length === 0) {
      console.log('✅ No properties need geocoding. All done!');
      return;
    }

    stats.total = properties.length;
    console.log(`📍 Found ${stats.total} properties to geocode\n`);

    // Process each property
    for (const property of properties) {
      stats.processed++;
      
      // Skip if address is empty
      if (!property.address || property.address.trim() === '') {
        console.log(`⏭️  [${stats.processed}/${stats.total}] Skipping property ${property.id}: No address`);
        stats.skipped++;
        continue;
      }

      console.log(`🔍 [${stats.processed}/${stats.total}] Geocoding: ${property.address}`);

      try {
        // Geocode the address
        const coordinates = await geocodeAddress(property.address);

        if (coordinates) {
          // Update the property with coordinates
          const { error: updateError } = await supabase
            .from('properties')
            .update({
              latitude: coordinates.lat,
              longitude: coordinates.lng,
              updated_at: new Date().toISOString()
            })
            .eq('id', property.id);

          if (updateError) {
            console.error(`❌ [${stats.processed}/${stats.total}] Failed to update property ${property.id}:`, updateError.message);
            stats.failed++;
          } else {
            console.log(`✅ [${stats.processed}/${stats.total}] Success: ${coordinates.lat}, ${coordinates.lng}`);
            stats.successful++;
          }
        } else {
          console.log(`⚠️  [${stats.processed}/${stats.total}] No coordinates found for: ${property.address}`);
          stats.failed++;
        }
      } catch (error) {
        console.error(`❌ [${stats.processed}/${stats.total}] Error processing property ${property.id}:`, error);
        stats.failed++;
      }

      // Rate limiting: wait before next request (except for the last one)
      if (stats.processed < stats.total) {
        await sleep(GEOCODE_DELAY_MS);
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📈 Backfill Summary:');
    console.log('='.repeat(50));
    console.log(`Total properties:     ${stats.total}`);
    console.log(`Processed:           ${stats.processed}`);
    console.log(`✅ Successful:        ${stats.successful}`);
    console.log(`❌ Failed:            ${stats.failed}`);
    console.log(`⏭️  Skipped:           ${stats.skipped}`);
    console.log('='.repeat(50));
    
    if (stats.successful === stats.total) {
      console.log('\n🎉 All properties geocoded successfully!');
    } else if (stats.successful > 0) {
      console.log(`\n✅ Backfill completed with ${stats.successful} successes and ${stats.failed} failures`);
    } else {
      console.log('\n⚠️  Backfill completed but no properties were successfully geocoded');
    }

  } catch (error) {
    console.error('\n❌ Fatal error during backfill:', error);
    process.exit(1);
  }
}

// Run the backfill if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  backfillPropertyCoordinates()
    .then(() => {
      console.log('\n✅ Backfill script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Backfill script failed:', error);
      process.exit(1);
    });
}

export { backfillPropertyCoordinates };

