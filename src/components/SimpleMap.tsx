import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Property } from '../types';

interface SimpleMapProps {
  width?: string;
  height?: string;
  properties?: Property[];
}

export const SimpleMap: React.FC<SimpleMapProps> = ({ 
  width = '100%', 
  height = '400px',
  properties = []
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    // Don't initialize twice
    if (map.current) return;

    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    
    if (!token) {
      console.error('No Mapbox token found');
      return;
    }

    if (!mapContainer.current) {
      console.error('Map container not found');
      return;
    }

    // Set token
    mapboxgl.accessToken = token;

    // Create map with absolute minimal config
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11', // Most basic style
      center: [-98.5795, 39.8283], // Center of USA
      zoom: 3
    });

    // Add property markers
    properties.forEach((property) => {
      if (property.latitude && property.longitude) {
        // Create custom marker element for better visibility
        const markerElement = document.createElement('div');
        const markerColor = getMarkerColor(property.property_type);
        
        markerElement.style.cssText = `
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: ${markerColor};
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
          font-size: 12px;
        `;
        
        // Add property initial or number for identification
        markerElement.textContent = property.name.charAt(0);

        // Create popup with property info
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 12px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #333;">${property.name}</h3>
            <p style="margin: 0 0 4px 0; color: #666; font-size: 14px; font-weight: bold;">$${property.current_value?.toLocaleString() || 'N/A'}</p>
            <p style="margin: 0 0 4px 0; color: #888; font-size: 12px;">${property.address}</p>
            <p style="margin: 0; color: #888; font-size: 12px; text-transform: capitalize;">${(property.property_type || 'unknown').replace('_', ' ')}</p>
          </div>
        `);

        // Create marker with custom element
        const marker = new mapboxgl.Marker(markerElement)
          .setLngLat([property.longitude, property.latitude])
          .setPopup(popup)
          .addTo(map.current!);
          
        console.log(`Added marker for ${property.name} at [${property.longitude}, ${property.latitude}]`);
      }
    });

    console.log(`✅ Simple map created with ${properties.length} properties`);

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [properties]);

  const getMarkerColor = (propertyType: string) => {
    switch (propertyType) {
      case 'stand_alone_buildings':
        return '#ef4444'; // red
      case 'horizontal_properties':
        return '#3b82f6'; // blue  
      case 'land':
        return '#10b981'; // green
      default:
        return '#6b7280'; // gray
    }
  };

  return (
    <div 
      ref={mapContainer} 
      style={{ 
        width, 
        height,
        border: '2px solid #e5e7eb',
        borderRadius: '8px'
      }} 
    />
  );
};