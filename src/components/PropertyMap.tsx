import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { SimplifiedProperty } from '../utils/simplifiedDataTransforms';
import { MapPinIcon } from '@heroicons/react/24/outline';

interface PropertyMapProps {
  properties: SimplifiedProperty[];
  selectedProperty?: SimplifiedProperty | null;
  onPropertySelect?: (property: SimplifiedProperty) => void;
  height?: string;
  className?: string;
}

interface PropertyWithCoordinates extends SimplifiedProperty {
  lat?: number;
  lng?: number;
}

export const PropertyMap: React.FC<PropertyMapProps> = ({
  properties = [],
  selectedProperty,
  onPropertySelect,
  height = '400px',
  className = ''
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const isLoadingRef = useRef(false);
  const loaderInstanceRef = useRef<Loader | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [propertiesWithCoords, setPropertiesWithCoords] = useState<PropertyWithCoordinates[]>([]);

  // Get Google Maps API key from environment
  const apiKey = import.meta.env.VITE_GOOGLE_MAP_API || import.meta.env.GOOGLE_MAP_API;

  // Geocode addresses to get coordinates
  const geocodeProperties = async (props: SimplifiedProperty[], googleMaps: any): Promise<PropertyWithCoordinates[]> => {
    if (!apiKey || !googleMaps) {
      return props;
    }

    try {
      const geocoder = new googleMaps.Geocoder();
      
      const geocodedProperties = await Promise.all(
        props.map(async (property) => {
          try {
            const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
              geocoder.geocode({ address: property.address }, (results, status) => {
                if (status === 'OK' && results) {
                  resolve(results);
                } else {
                  reject(new Error(`Geocoding failed: ${status}`));
                }
              });
            });

            if (result && result[0]) {
              const location = result[0].geometry.location;
              return {
                ...property,
                lat: location.lat(),
                lng: location.lng()
              };
            }
          } catch (error) {
            console.warn(`Failed to geocode ${property.address}:`, error);
          }
          
          return property;
        })
      );

      return geocodedProperties;
    } catch (error) {
      // Silently fail geocoding - we'll still show the map without coordinates
      return props;
    }
  };

  // Initialize map
  useEffect(() => {
    if (!apiKey) {
      setError('Google Maps API key not configured. Please add VITE_GOOGLE_MAP_API to your .env file.');
      setIsLoading(false);
      return;
    }

    // Prevent multiple simultaneous initialization attempts
    if (isLoadingRef.current) {
      return;
    }

    const initMap = async () => {
      // Prevent concurrent calls
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;

      try {
        setIsLoading(true);

        // Wait for mapRef to be available
        if (!mapRef.current) {
          // Retry after a short delay
          await new Promise(resolve => setTimeout(resolve, 100));
          if (!mapRef.current) {
            isLoadingRef.current = false;
            setIsLoading(false);
            setError('Map container not available');
            return;
          }
        }
        
        // Use existing loader instance if available, otherwise create new one
        let googleMaps: any;
        if (loaderInstanceRef.current) {
          try {
            googleMaps = await loaderInstanceRef.current.load();
          } catch (e) {
            // If existing loader fails, create a new one
            loaderInstanceRef.current = new Loader({
              apiKey,
              version: 'weekly',
              libraries: ['places']
            });
            googleMaps = await loaderInstanceRef.current.load();
          }
        } else {
          loaderInstanceRef.current = new Loader({
            apiKey,
            version: 'weekly',
            libraries: ['places']
          });
          googleMaps = await loaderInstanceRef.current.load();
        }
        
        // Geocode properties after loading Google Maps
        const geocodedProps = await geocodeProperties(properties, googleMaps);
        setPropertiesWithCoords(geocodedProps);

        if (!mapRef.current) return;

        // Default center (London, UK)
        let center = { lat: 51.5074, lng: -0.1278 };
        let zoom = 10;

        // If we have properties with coordinates, center on them
        const propertiesWithValidCoords = geocodedProps.filter(p => p.lat && p.lng);
        if (propertiesWithValidCoords.length > 0) {
          if (propertiesWithValidCoords.length === 1) {
            center = { lat: propertiesWithValidCoords[0].lat!, lng: propertiesWithValidCoords[0].lng! };
            zoom = 15;
          } else {
            // Calculate bounds to fit all properties
            const bounds = new googleMaps.LatLngBounds();
            propertiesWithValidCoords.forEach(property => {
              bounds.extend({ lat: property.lat!, lng: property.lng! });
            });
            
            // We'll fit bounds after map is created
          }
        }

        const map = new googleMaps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeId: googleMaps.MapTypeId.ROADMAP,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        mapInstanceRef.current = map;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        // Add markers for properties with coordinates
        propertiesWithValidCoords.forEach((property) => {
          const marker = new googleMaps.Marker({
            position: { lat: property.lat!, lng: property.lng! },
            map,
            title: property.address,
            icon: {
              path: googleMaps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: property.status === 'sold' ? '#6B7280' : 
                        property.tenantCount > 0 ? '#10B981' : '#F59E0B',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2
            }
          });

          // Create info window
          const infoWindow = new googleMaps.InfoWindow({
            content: `
              <div class="p-2 min-w-[200px]">
                <h3 class="font-semibold text-gray-900 mb-1">${property.propertyName || property.address}</h3>
                <p class="text-sm text-gray-600 mb-2">${property.address}</p>
                <div class="flex items-center justify-between text-xs">
                  <span class="px-2 py-1 rounded-full ${
                    property.status === 'sold' ? 'bg-gray-100 text-gray-800' :
                    property.tenantCount > 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }">
                    ${property.status === 'sold' ? 'Sold' : 
                      property.tenantCount > 0 ? `Occupied (${property.tenantCount})` : 'Vacant'}
                  </span>
                  <span class="text-gray-600">£${property.targetRent}/month</span>
                </div>
              </div>
            `
          });

          marker.addListener('click', () => {
            // Close other info windows
            markersRef.current.forEach(m => {
              if ((m as any).infoWindow) {
                (m as any).infoWindow.close();
              }
            });
            
            infoWindow.open(map, marker);
            
            if (onPropertySelect) {
              onPropertySelect(property);
            }
          });

          // Store info window reference
          (marker as any).infoWindow = infoWindow;
          markersRef.current.push(marker);
        });

        // Fit bounds if we have multiple properties
        if (propertiesWithValidCoords.length > 1) {
          const bounds = new googleMaps.LatLngBounds();
          propertiesWithValidCoords.forEach(property => {
            bounds.extend({ lat: property.lat!, lng: property.lng! });
          });
          map.fitBounds(bounds);
          
          // Ensure minimum zoom level
          const listener = googleMaps.event.addListener(map, 'idle', () => {
            if (map.getZoom()! > 16) map.setZoom(16);
            googleMaps.event.removeListener(listener);
          });
        }

        setError(null);
      } catch (error) {
        // Ensure we always set loading to false, even on error
        setIsLoading(false);
        isLoadingRef.current = false;
        
        // Only log error once, don't spam console
        try {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Check for specific API errors
          if (errorMessage.includes('ApiNotActivatedMapError')) {
            setError('Google Maps JavaScript API is not enabled. Please enable it in Google Cloud Console.');
          } else if (errorMessage.includes('InvalidKeyMapError')) {
            setError('Invalid Google Maps API key. Please check your API key in the .env file.');
          } else if (errorMessage.includes('RefererNotAllowedMapError')) {
            setError('API key restrictions prevent loading. Please check your API key settings.');
          } else if (errorMessage.includes('could not load')) {
            setError('Failed to load Google Maps. Please check your API key and internet connection.');
          } else {
            // For other errors, show generic message but don't spam console
            setError('Google Maps is not available. Please check your API key configuration.');
          }
        } catch (setErrorErr) {
          // Fallback if setError itself fails - silently fail to prevent app crash
          // Don't log here to avoid infinite loops
        }
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    };

    initMap();

    // Cleanup function
    return () => {
      // Don't reset isLoadingRef here - let it complete naturally
      // This prevents cleanup from interfering with initialization
    };
  }, [properties, apiKey]);

  // Update selected property marker
  useEffect(() => {
    if (!selectedProperty || !mapInstanceRef.current) return;

    const selectedPropertyWithCoords = propertiesWithCoords.find(p => p.id === selectedProperty.id);
    if (selectedPropertyWithCoords && selectedPropertyWithCoords.lat && selectedPropertyWithCoords.lng) {
      mapInstanceRef.current.panTo({
        lat: selectedPropertyWithCoords.lat,
        lng: selectedPropertyWithCoords.lng
      });
      
      // Find and open the info window for the selected property
      const marker = markersRef.current.find(m => m.getTitle() === selectedPropertyWithCoords.address);
      if (marker && (marker as any).infoWindow) {
        (marker as any).infoWindow.open(mapInstanceRef.current, marker);
      }
    }
  }, [selectedProperty, propertiesWithCoords]);

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 ${className}`} style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-6">
            <MapPinIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Map Setup Required</h3>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <div className="text-xs text-gray-500 space-y-2">
              <p className="font-medium">To enable maps:</p>
              <ol className="text-left space-y-1">
                <li>1. Go to Google Cloud Console</li>
                <li>2. Enable "Maps JavaScript API"</li>
                <li>3. Enable "Geocoding API"</li>
                <li>4. Enable billing (free $200/month)</li>
              </ol>
              <p className="mt-3">
                <a 
                  href="https://console.cloud.google.com/apis/library/maps-backend.googleapis.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Enable APIs →
                </a>
              </p>
            </div>
            
            {/* Property List Fallback */}
            {properties.length > 0 && (
              <div className="mt-6 max-w-md mx-auto">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Your Properties:</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {properties.slice(0, 5).map((property) => (
                    <div 
                      key={property.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs cursor-pointer hover:bg-gray-100"
                      onClick={() => onPropertySelect?.(property)}
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          property.status === 'sold' ? 'bg-gray-500' : 
                          property.tenantCount > 0 ? 'bg-green-500' : 'bg-yellow-500'
                        }`}></div>
                        <span className="truncate">{property.address}</span>
                      </div>
                      <span className="text-gray-500">
                        {property.status === 'sold' ? 'Sold' : 
                         property.tenantCount > 0 ? 'Occupied' : 'Vacant'}
                      </span>
                    </div>
                  ))}
                  {properties.length > 5 && (
                    <p className="text-center text-gray-500 py-1">
                      +{properties.length - 5} more properties
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`} style={{ height }}>
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
        <h4 className="text-xs font-medium text-gray-900 mb-2">Property Status</h4>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs text-gray-600">Occupied</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-xs text-gray-600">Vacant</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span className="text-xs text-gray-600">Sold</span>
          </div>
        </div>
      </div>
    </div>
  );
};