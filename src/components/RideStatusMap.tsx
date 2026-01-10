import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';

interface MapLocation {
  lat: number;
  lng: number;
}

interface RideStatusMapProps {
  pickupLocation: MapLocation;
  dropoffLocation: MapLocation;
  driverLocation?: MapLocation | null;
}

const RideStatusMap = ({
  pickupLocation,
  dropoffLocation,
  driverLocation,
}: RideStatusMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const pickupMarker = useRef<mapboxgl.Marker | null>(null);
  const dropoffMarker = useRef<mapboxgl.Marker | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const routeAnimRef = useRef<number | null>(null);

  useEffect(() => {
    initializeMap();
    return () => {
      if (routeAnimRef.current) window.clearInterval(routeAnimRef.current);
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (map.current) {
      updateMapMarkers();
      calculateRoute();
    }
  }, [pickupLocation, dropoffLocation, driverLocation]);

  const initializeMap = async () => {
    try {
      const { data: apiKey, error } = await supabase.functions.invoke('get-maps-api-key');
      
      if (error || !apiKey) {
        console.error('Failed to load map API key');
        return;
      }

      if (!mapContainer.current) return;

      mapboxgl.accessToken = apiKey.key;
      
      // Center between pickup and dropoff
      const centerLng = (pickupLocation.lng + dropoffLocation.lng) / 2;
      const centerLat = (pickupLocation.lat + dropoffLocation.lat) / 2;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [centerLng, centerLat],
        zoom: 13,
        pitch: 45,
        bearing: -17.6,
      });

      map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');

      map.current.on('load', () => {
        updateMapMarkers();
        calculateRoute();
      });
    } catch (error) {
      console.error('Error loading Mapbox:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateRoute = async () => {
    if (!map.current || !pickupLocation || !dropoffLocation) return;

    try {
      const query = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${pickupLocation.lng},${pickupLocation.lat};${dropoffLocation.lng},${dropoffLocation.lat}?geometries=geojson&access_token=${mapboxgl.accessToken}`
      );
      const json = await query.json();
      if (!json.routes || json.routes.length === 0) return;
      
      const data = json.routes[0];
      const route = data.geometry.coordinates;

      const geojson: any = {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: route }
      };

      const layerId = 'route-layer';
      const glowId = 'route-glow';

      if (routeAnimRef.current) {
        window.clearInterval(routeAnimRef.current);
        routeAnimRef.current = null;
      }

      if (map.current.getSource(layerId)) {
        (map.current.getSource(layerId) as any).setData(geojson);
      } else {
        // Glow layer
        if (!map.current.getSource(glowId)) {
          map.current.addSource(glowId, { type: 'geojson', data: geojson });
          map.current.addLayer({
            id: glowId,
            type: 'line',
            source: glowId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#10b981',
              'line-width': 16,
              'line-opacity': 0.3,
              'line-blur': 8
            }
          });
        }

        // Main route
        map.current.addSource(layerId, { type: 'geojson', data: geojson });
        map.current.addLayer({
          id: layerId,
          type: 'line',
          source: layerId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#10b981',
            'line-width': 5,
            'line-opacity': 1
          }
        });
      }

      // Fit bounds with padding
      const bounds = route.reduce(
        (b: mapboxgl.LngLatBounds, c: [number, number]) => b.extend(c as mapboxgl.LngLatLike),
        new mapboxgl.LngLatBounds(route[0], route[0])
      );
      
      // Include driver location in bounds if available
      if (driverLocation) {
        bounds.extend([driverLocation.lng, driverLocation.lat]);
      }
      
      map.current.fitBounds(bounds, { padding: { top: 60, bottom: 60, left: 40, right: 40 } });
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  };

  const createModernMarker = (type: 'pickup' | 'dropoff' | 'driver') => {
    const el = document.createElement('div');
    el.className = 'modern-marker';
    
    if (type === 'pickup') {
      el.innerHTML = `
        <div class="relative">
          <div class="absolute -inset-4 rounded-full bg-emerald-500/20 animate-ping"></div>
          <div class="absolute -inset-2 rounded-full bg-emerald-500/30 animate-pulse"></div>
          <div class="relative w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/50 flex items-center justify-center border-3 border-white">
            <div class="w-2 h-2 rounded-full bg-white"></div>
          </div>
          <div class="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap shadow-lg">
            PICKUP
          </div>
        </div>
      `;
    } else if (type === 'dropoff') {
      el.innerHTML = `
        <div class="relative">
          <div class="absolute -inset-4 rounded-full bg-red-500/20 animate-ping" style="animation-delay: 0.5s"></div>
          <div class="absolute -inset-2 rounded-full bg-red-500/30 animate-pulse" style="animation-delay: 0.5s"></div>
          <div class="relative w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-lg shadow-red-500/50 flex items-center justify-center border-3 border-white">
            <div class="w-2 h-2 rounded-full bg-white"></div>
          </div>
          <div class="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap shadow-lg">
            DROPOFF
          </div>
        </div>
      `;
    } else {
      el.innerHTML = `
        <div class="relative">
          <div class="absolute -inset-3 rounded-full bg-blue-500/30 animate-pulse"></div>
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/50 flex items-center justify-center border-2 border-white text-xl">
            🚕
          </div>
        </div>
      `;
    }
    
    return el;
  };

  const updateMapMarkers = () => {
    if (!map.current) return;

    // Pickup marker
    if (pickupMarker.current) {
      pickupMarker.current.setLngLat([pickupLocation.lng, pickupLocation.lat]);
    } else {
      pickupMarker.current = new mapboxgl.Marker({ element: createModernMarker('pickup') })
        .setLngLat([pickupLocation.lng, pickupLocation.lat])
        .addTo(map.current);
    }

    // Dropoff marker
    if (dropoffMarker.current) {
      dropoffMarker.current.setLngLat([dropoffLocation.lng, dropoffLocation.lat]);
    } else {
      dropoffMarker.current = new mapboxgl.Marker({ element: createModernMarker('dropoff') })
        .setLngLat([dropoffLocation.lng, dropoffLocation.lat])
        .addTo(map.current);
    }

    // Driver marker
    if (driverLocation) {
      if (driverMarker.current) {
        driverMarker.current.setLngLat([driverLocation.lng, driverLocation.lat]);
      } else {
        driverMarker.current = new mapboxgl.Marker({ element: createModernMarker('driver') })
          .setLngLat([driverLocation.lng, driverLocation.lat])
          .addTo(map.current);
      }
    } else if (driverMarker.current) {
      driverMarker.current.remove();
      driverMarker.current = null;
    }
  };

  return (
    <div className="relative w-full h-72 sm:h-80">
      {isLoading && (
        <div className="absolute inset-0 bg-background flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Loading map...</span>
          </div>
        </div>
      )}
      
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1.5 bg-background/90 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg border border-border/50">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">Pickup</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-muted-foreground">Dropoff</span>
        </div>
        {driverLocation && (
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">Driver</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RideStatusMap;
