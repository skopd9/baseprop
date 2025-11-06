import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { SimplifiedProperty } from '../utils/simplifiedDataTransforms';
import { MapPinIcon, ArrowsPointingOutIcon, XMarkIcon } from '@heroicons/react/24/outline';

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
  const mapInstanceRef = useRef<any>(null); // Use any to avoid type errors before Google Maps loads
  const markersRef = useRef<any[]>([]); // Use any to avoid type errors before Google Maps loads
  const isLoadingRef = useRef(false);
  const loaderInstanceRef = useRef<Loader | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Start false to allow immediate render
  const [error, setError] = useState<string | null>(null);
  const [propertiesWithCoords, setPropertiesWithCoords] = useState<PropertyWithCoordinates[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenMapRef = useRef<HTMLDivElement>(null);
  const fullscreenMapInstanceRef = useRef<any>(null);
  const fullscreenMarkersRef = useRef<any[]>([]);

  // Get Google Maps API key from environment (check multiple possible names)
  const apiKey = import.meta.env.VITE_GOOGLE_MAP_API 
    || import.meta.env.VITE_GOOGLE_MAPS_API_KEY 
    || import.meta.env.GOOGLE_MAP_API
    || import.meta.env.GOOGLE_MAPS_API_KEY;

  // Geocode addresses to get coordinates
  const geocodeProperties = async (props: SimplifiedProperty[], google: any): Promise<PropertyWithCoordinates[]> => {
    if (!apiKey || !google || !google.maps) {
      return props;
    }

    try {
      const geocoder = new google.maps.Geocoder();
      
      const geocodedProperties = await Promise.all(
        props.map(async (property) => {
          try {
            const result = await new Promise<any[]>((resolve, reject) => {
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
            // Silently fail geocoding for individual properties
            // Only log if it's not a ZERO_RESULTS error (which is common for invalid addresses)
            const errorMsg = error instanceof Error ? error.message : String(error);
            if (!errorMsg.includes('ZERO_RESULTS')) {
              console.warn(`Failed to geocode ${property.address}:`, error);
            }
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
    // Always allow component to render first
    setIsLoading(false);
    
    if (!apiKey) {
      setError('Google Maps API key not configured. Please add VITE_GOOGLE_MAP_API or VITE_GOOGLE_MAPS_API_KEY to your environment variables.');
      return;
    }

    // Prevent multiple simultaneous initialization attempts
    if (isLoadingRef.current) {
      return;
    }

    // Set up global error handler for Google Maps authentication failures
    (window as any).gm_authFailure = () => {
      console.error('Google Maps Authentication Failure');
      setError('Google Maps authentication failed. Please check your API key and restrictions in Google Cloud Console.');
      setIsLoading(false);
      isLoadingRef.current = false;
    };

    const initMap = async () => {
      // Prevent concurrent calls
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;

      try {
        setIsLoading(true);

        // Wait for mapRef to be available with multiple retries
        let retries = 0;
        while (!mapRef.current && retries < 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }
        
        if (!mapRef.current) {
          isLoadingRef.current = false;
          setIsLoading(false);
          // Don't set error - just return silently to allow page to render
          return;
        }
        
        // Use existing loader instance if available, otherwise create new one
        let google: any;
        if (loaderInstanceRef.current) {
          try {
            google = await loaderInstanceRef.current.load();
          } catch (e) {
            // If existing loader fails, create a new one
            loaderInstanceRef.current = new Loader({
              apiKey,
              version: 'weekly',
              libraries: ['places']
            });
            google = await loaderInstanceRef.current.load();
          }
        } else {
          loaderInstanceRef.current = new Loader({
            apiKey,
            version: 'weekly',
            libraries: ['places']
          });
          google = await loaderInstanceRef.current.load();
        }
        
        // Verify Google Maps API is properly loaded
        if (!google || !google.maps || !google.maps.Map) {
          throw new Error('Google Maps API failed to load properly');
        }

        const googleMaps = google.maps;
        
        // Geocode properties after loading Google Maps
        const geocodedProps = await geocodeProperties(properties, google);
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
          fullscreenControl: false, // Disable default fullscreen control
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

        // Track if a marker was just clicked to prevent map click from closing info window
        let markerJustClicked = false;

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
            // Set flag to prevent map click from closing this info window
            markerJustClicked = true;
            
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

        // Close info windows when clicking on the map
        map.addListener('click', () => {
          // Only close if a marker wasn't just clicked
          if (!markerJustClicked) {
            markersRef.current.forEach(m => {
              if ((m as any).infoWindow) {
                (m as any).infoWindow.close();
              }
            });
          }
          // Reset flag after a short delay
          markerJustClicked = false;
        });
        
        // Also listen to clicks on the map container for better reliability
        googleMaps.event.addListenerOnce(map, 'idle', () => {
          const mapDiv = mapRef.current;
          if (mapDiv) {
            const handleMapClick = (e: MouseEvent) => {
              const target = e.target as HTMLElement;
              // Close info windows if clicking on the map canvas, but not on info windows or controls
              const isInfoWindow = target.closest('.gm-style-iw') || target.closest('.gm-style-iw-c');
              const isControl = target.closest('.gm-control') || target.closest('.gm-fullscreen-control');
              
              if (!isInfoWindow && !isControl) {
                markersRef.current.forEach(m => {
                  if ((m as any).infoWindow) {
                    (m as any).infoWindow.close();
                  }
                });
              }
            };
            
            // Add click listener with a small delay to ensure map is fully rendered
            setTimeout(() => {
              mapDiv.addEventListener('click', handleMapClick, true);
            }, 100);
          }
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
        
        // Log detailed error information for debugging
        console.error('Google Maps initialization error:', error);
        
        // Only log error once, don't spam console
        try {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorString = JSON.stringify(error, null, 2);
          console.error('Error message:', errorMessage);
          console.error('Full error:', errorString);
          
          // Check for specific API errors (more comprehensive list)
          if (errorMessage.includes('ApiNotActivatedMapError') || 
              errorMessage.includes('Google Maps JavaScript API has not been activated')) {
            setError('Google Maps JavaScript API is not enabled. Please enable "Maps JavaScript API" in Google Cloud Console.');
          } else if (errorMessage.includes('InvalidKeyMapError') || 
                     errorMessage.includes('InvalidKey')) {
            setError('Invalid Google Maps API key. Please verify your API key in Google Cloud Console matches your .env file.');
          } else if (errorMessage.includes('RefererNotAllowedMapError') || 
                     errorMessage.includes('RefererNotAllowed')) {
            setError('API key restrictions prevent loading from this domain. Please update your API key restrictions in Google Cloud Console to allow "localhost" and your production domain.');
          } else if (errorMessage.includes('ApiTargetBlockedMapError')) {
            setError('This API project is blocked. Please check your billing status in Google Cloud Console.');
          } else if (errorMessage.includes('GeocodingDisabled') || 
                     errorMessage.includes('REQUEST_DENIED')) {
            setError('Geocoding API is not enabled or has restrictions. Please enable "Geocoding API" in Google Cloud Console.');
          } else if (errorMessage.includes('OVER_QUERY_LIMIT')) {
            setError('Google Maps API quota exceeded. Please check your usage and billing in Google Cloud Console.');
          } else if (errorMessage.includes('could not load')) {
            setError('Failed to load Google Maps. Please check your API key configuration and internet connection.');
          } else {
            // For other errors, show more specific error message with details
            setError(`Google Maps error: ${errorMessage}. Check browser console for more details.`);
          }
        } catch (setErrorErr) {
          // Fallback if setError itself fails - silently fail to prevent app crash
          console.error('Error setting error:', setErrorErr);
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

  // Handle ESC key to close fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFullscreen]);

  // Initialize fullscreen map when modal opens
  useEffect(() => {
    if (!isFullscreen || !apiKey) return;

    const initFullscreenMap = async () => {
      try {
        // Wait for fullscreenMapRef to be available (DOM needs to render first)
        let retries = 0;
        while (!fullscreenMapRef.current && retries < 20) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }
        
        if (!fullscreenMapRef.current) return;

        // Use existing loader instance if available
        let google: any;
        if (loaderInstanceRef.current) {
          try {
            google = await loaderInstanceRef.current.load();
          } catch (e) {
            loaderInstanceRef.current = new Loader({
              apiKey,
              version: 'weekly',
              libraries: ['places']
            });
            google = await loaderInstanceRef.current.load();
          }
        } else {
          loaderInstanceRef.current = new Loader({
            apiKey,
            version: 'weekly',
            libraries: ['places']
          });
          google = await loaderInstanceRef.current.load();
        }

        if (!google || !google.maps || !google.maps.Map) return;

        const googleMaps = google.maps;
        
        // Use the same properties with coordinates
        const propertiesWithValidCoords = propertiesWithCoords.filter(p => p.lat && p.lng);
        
        // Default center (London, UK)
        let center = { lat: 51.5074, lng: -0.1278 };
        let zoom = 10;

        if (propertiesWithValidCoords.length > 0) {
          if (propertiesWithValidCoords.length === 1) {
            center = { lat: propertiesWithValidCoords[0].lat!, lng: propertiesWithValidCoords[0].lng! };
            zoom = 15;
          }
        }

        const fullscreenMap = new googleMaps.Map(fullscreenMapRef.current, {
          center,
          zoom,
          mapTypeId: googleMaps.MapTypeId.ROADMAP,
          fullscreenControl: false,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        fullscreenMapInstanceRef.current = fullscreenMap;

        // Clear existing fullscreen markers
        fullscreenMarkersRef.current.forEach(marker => marker.setMap(null));
        fullscreenMarkersRef.current = [];

        // Track if a marker was just clicked to prevent map click from closing info window
        let fullscreenMarkerJustClicked = false;

        // Add markers for properties with coordinates
        propertiesWithValidCoords.forEach((property) => {
          const marker = new googleMaps.Marker({
            position: { lat: property.lat!, lng: property.lng! },
            map: fullscreenMap,
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
            // Set flag to prevent map click from closing this info window
            fullscreenMarkerJustClicked = true;
            
            fullscreenMarkersRef.current.forEach(m => {
              if ((m as any).infoWindow) {
                (m as any).infoWindow.close();
              }
            });
            
            infoWindow.open(fullscreenMap, marker);
            
            if (onPropertySelect) {
              onPropertySelect(property);
            }
          });

          (marker as any).infoWindow = infoWindow;
          fullscreenMarkersRef.current.push(marker);
        });

        // Close info windows when clicking on the fullscreen map
        fullscreenMap.addListener('click', () => {
          // Only close if a marker wasn't just clicked
          if (!fullscreenMarkerJustClicked) {
            fullscreenMarkersRef.current.forEach(m => {
              if ((m as any).infoWindow) {
                (m as any).infoWindow.close();
              }
            });
          }
          // Reset flag after a short delay
          fullscreenMarkerJustClicked = false;
        });
        
        // Also listen to clicks on the fullscreen map container for better reliability
        googleMaps.event.addListenerOnce(fullscreenMap, 'idle', () => {
          const fullscreenMapDiv = fullscreenMapRef.current;
          if (fullscreenMapDiv) {
            const handleFullscreenMapClick = (e: MouseEvent) => {
              const target = e.target as HTMLElement;
              // Close info windows if clicking on the map canvas, but not on info windows or controls
              const isInfoWindow = target.closest('.gm-style-iw') || target.closest('.gm-style-iw-c');
              const isControl = target.closest('.gm-control') || target.closest('.gm-fullscreen-control');
              
              if (!isInfoWindow && !isControl) {
                fullscreenMarkersRef.current.forEach(m => {
                  if ((m as any).infoWindow) {
                    (m as any).infoWindow.close();
                  }
                });
              }
            };
            
            // Add click listener with a small delay to ensure map is fully rendered
            setTimeout(() => {
              fullscreenMapDiv.addEventListener('click', handleFullscreenMapClick, true);
            }, 100);
          }
        });

        // Fit bounds if we have multiple properties
        if (propertiesWithValidCoords.length > 1) {
          const bounds = new googleMaps.LatLngBounds();
          propertiesWithValidCoords.forEach(property => {
            bounds.extend({ lat: property.lat!, lng: property.lng! });
          });
          fullscreenMap.fitBounds(bounds);
          
          const listener = googleMaps.event.addListener(fullscreenMap, 'idle', () => {
            if (fullscreenMap.getZoom()! > 16) fullscreenMap.setZoom(16);
            googleMaps.event.removeListener(listener);
          });
        }

        // Update selected property in fullscreen map
        if (selectedProperty) {
          const selectedPropertyWithCoords = propertiesWithValidCoords.find(p => p.id === selectedProperty.id);
          if (selectedPropertyWithCoords && selectedPropertyWithCoords.lat && selectedPropertyWithCoords.lng) {
            fullscreenMap.panTo({
              lat: selectedPropertyWithCoords.lat,
              lng: selectedPropertyWithCoords.lng
            });
            
            const marker = fullscreenMarkersRef.current.find(m => m.getTitle() === selectedPropertyWithCoords.address);
            if (marker && (marker as any).infoWindow) {
              (marker as any).infoWindow.open(fullscreenMap, marker);
            }
          }
        }

      } catch (error) {
        console.error('Error initializing fullscreen map:', error);
      }
    };

    initFullscreenMap();

    // Cleanup function
    return () => {
      // Clear fullscreen markers
      fullscreenMarkersRef.current.forEach(marker => {
        if ((marker as any).infoWindow) {
          (marker as any).infoWindow.close();
        }
        marker.setMap(null);
      });
      fullscreenMarkersRef.current = [];
      fullscreenMapInstanceRef.current = null;
    };
  }, [isFullscreen, propertiesWithCoords, selectedProperty, apiKey, onPropertySelect]);

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
    <>
      <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden relative ${className}`} style={{ height }}>
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" />
        {/* Custom Fullscreen Button */}
        <button
          onClick={() => setIsFullscreen(true)}
          className="absolute top-2 right-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-md p-2 shadow-md z-10 transition-colors"
          title="Toggle fullscreen view"
          aria-label="Toggle fullscreen view"
        >
          <ArrowsPointingOutIcon className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col"
          onClick={(e) => {
            // Close modal when clicking on the backdrop (outside the map container)
            if (e.target === e.currentTarget) {
              setIsFullscreen(false);
            }
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gray-900 bg-opacity-95">
            <h2 className="text-lg font-semibold text-white">Property Map</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsFullscreen(false)}
                className="text-white hover:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-800 transition-colors flex items-center space-x-2"
                aria-label="Exit fullscreen"
              >
                <XMarkIcon className="w-5 h-5" />
                <span className="text-sm">Exit Fullscreen</span>
              </button>
            </div>
          </div>
          
          {/* Map Container */}
          <div 
            className="flex-1 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div ref={fullscreenMapRef} className="w-full h-full" />
          </div>
        </div>
      )}
    </>
  );
};