import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Navigation, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export interface MapLocation {
  lat: number;
  lng: number;
}

import type { DriverLocation } from '@/hooks/useDriverLocations';

interface MapProps {
  pickupLocation?: MapLocation | null;
  dropoffLocation?: MapLocation | null;
  driverLocation?: MapLocation | null; // for single driver (active ride)
  driverLocations?: DriverLocation[]; // for showing all available drivers
  onPickupChange?: (location: MapLocation) => void;
  onDropoffChange?: (location: MapLocation) => void;
  onDistanceCalculated?: (distance: number) => void;
  height?: string;
  showCurrentLocation?: boolean;
  interactive?: boolean;
}

const Map = ({ 
  pickupLocation = null, 
  dropoffLocation = null,
  driverLocation = null,
  driverLocations = [],
  onPickupChange,
  onDropoffChange,
  onDistanceCalculated,
  height = 'h-64',
  showCurrentLocation = true,
  interactive = false
}: MapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const pickupMarker = useRef<mapboxgl.Marker | null>(null);
  const dropoffMarker = useRef<mapboxgl.Marker | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);
  const driverMarkers = useRef<mapboxgl.Marker[]>([]); // for multiple drivers
  const currentLocationMarker = useRef<mapboxgl.Marker | null>(null);
  const [currentLocation, setCurrentLocation] = useState<MapLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [distance, setDistance] = useState<number | null>(null);
  // routeLayer state not needed — use a stable id for the route layer to avoid flicker
  const routeAnimRef = useRef<number | null>(null);
  const selectingLocationRef = useRef<'pickup' | 'dropoff' | null>(null);
  const [selectingLocation, setSelectingLocation] = useState<'pickup' | 'dropoff' | null>(null);
  const { toast } = useToast();

  // Tunisia center coordinates (Tunis)
  const defaultCenter: MapLocation = { lat: 36.8065, lng: 10.1815 };

  useEffect(() => {
    initializeMap();
    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (map.current) {
      updateMapMarkers();
      if (pickupLocation && dropoffLocation) {
        calculateRoute();
      }
    }
  }, [pickupLocation, dropoffLocation, driverLocation, driverLocations, currentLocation]);

  const initializeMap = async () => {
    try {
      // Get API key from edge function
      const { data: apiKey, error } = await supabase.functions.invoke('get-maps-api-key');
      
      if (error || !apiKey) {
        toast({
          title: "Map Error",
          description: "Failed to load map. Please check API configuration.",
          variant: "destructive",
        });
        return;
      }

      if (!mapContainer.current) return;

      mapboxgl.accessToken = apiKey.key;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [defaultCenter.lng, defaultCenter.lat],
        zoom: 12,
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: false,
        }),
        'top-right'
      );

      // Add click handler for interactive mode
      if (interactive) {
        map.current.on('click', (e) => {
          const selecting = selectingLocationRef.current;
          if (selecting) {
            const location = { lat: e.lngLat.lat, lng: e.lngLat.lng };
            if (selecting === 'pickup') {
              onPickupChange?.(location);
              toast({
                title: "Pickup Location Set",
                description: `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}`,
              });
            } else {
              onDropoffChange?.(location);
              toast({
                title: "Dropoff Location Set",
                description: `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}`,
              });
            }
            selectingLocationRef.current = null;
            setSelectingLocation(null);
            map.current!.getCanvas().style.cursor = '';
          }
        });
      }

      getCurrentLocation();
    } catch (error) {
      console.error('Error loading Mapbox:', error);
      toast({
        title: "Map Error",
        description: "Failed to initialize map.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(location);
          
          if (map.current) {
            map.current.flyTo({
              center: [location.lng, location.lat],
              zoom: 15,
              duration: 1500,
            });
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            title: "Location Access",
            description: "Unable to get your location. Using default location.",
          });
          setCurrentLocation(defaultCenter);
        }
      );
    } else {
      toast({
        title: "Geolocation Not Supported",
        description: "Your browser doesn't support geolocation.",
      });
      setCurrentLocation(defaultCenter);
    }
  };

  const calculateRoute = async () => {
    if (!map.current || !pickupLocation || !dropoffLocation) return;

    try {
      const query = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${pickupLocation.lng},${pickupLocation.lat};${dropoffLocation.lng},${dropoffLocation.lat}?geometries=geojson&access_token=${mapboxgl.accessToken}`
      );
      const json = await query.json();
      const data = json.routes[0];
      const route = data.geometry.coordinates;
      const distanceInKm = data.distance / 1000; // Convert meters to km
      
      setDistance(distanceInKm);
      onDistanceCalculated?.(distanceInKm);

      const geojson: any = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: route
        }
      };

      // Use a fixed layer id so we update the source data instead of remove/add repeatedly.
      const layerId = 'route-layer';
      const shadowLayerId = 'route-shadow-layer';

      // If the source exists update data, otherwise create source + two layers (shadow + main)
      // clear any previous animation before updating route
      if (routeAnimRef.current) {
        window.clearInterval(routeAnimRef.current);
        routeAnimRef.current = null;
      }

      if (map.current.getSource(layerId)) {
        try {
          (map.current.getSource(layerId) as any).setData(geojson);
          if (map.current.getSource(shadowLayerId)) {
            (map.current.getSource(shadowLayerId) as any).setData(geojson);
          }
        } catch (err) {
          // If setData fails, remove and recreate
          if (map.current.getLayer(layerId)) map.current.removeLayer(layerId);
          if (map.current.getLayer(shadowLayerId)) map.current.removeLayer(shadowLayerId);
          if (map.current.getSource(layerId)) map.current.removeSource(layerId);
          if (map.current.getSource(shadowLayerId)) map.current.removeSource(shadowLayerId);
          addRouteLayers(map.current, layerId, shadowLayerId, geojson);
        }
      } else {
        addRouteLayers(map.current, layerId, shadowLayerId, geojson);
      }

      // Start a subtle dash animation on the route to indicate direction/motion
      try {
        let offset = 0;
        routeAnimRef.current = window.setInterval(() => {
          if (!map.current) return;
          // cycle dash pattern to create motion illusion
          const dash = [Math.abs(Math.sin(offset)) * 2 + 1, 6];
          try {
            map.current.setPaintProperty(layerId, 'line-dasharray', dash as any);
            offset += 0.3;
          } catch (e) {
            // ignore if paint property not supported
          }
        }, 300) as unknown as number;
      } catch (e) {
        // ignore animation errors
      }

      // Fit map to show the entire route
      const coordinates = route;
      const bounds = coordinates.reduce((bounds: mapboxgl.LngLatBounds, coord: [number, number]) => {
        return bounds.extend(coord as mapboxgl.LngLatLike);
      }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

      map.current.fitBounds(bounds, {
        padding: 50
      });
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  };

  // Helper to add shadow + main route layers
  const addRouteLayers = (mapInstance: mapboxgl.Map, layerId: string, shadowLayerId: string, geojson: any) => {
    // Add source
    mapInstance.addSource(layerId, { type: 'geojson', data: geojson });

    // Shadow (wider, subtle darker line)
    mapInstance.addLayer({
      id: shadowLayerId,
      type: 'line',
      source: layerId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#7f1d1d',
        'line-width': 10,
        'line-opacity': 0.12
      }
    });

    // Main route
    mapInstance.addLayer({
      id: layerId,
      type: 'line',
      source: layerId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        // Use a red gradient for the route
        'line-color': '#ef4444',
        'line-width': 6,
        'line-opacity': 0.98,
        'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, '#fca5a5', 1, '#ef4444']
      }
    });
  };

  const updateMapMarkers = () => {
    if (!map.current) return;

    // Update pickup marker
    if (pickupLocation) {
      if (pickupMarker.current) {
        pickupMarker.current.setLngLat([pickupLocation.lng, pickupLocation.lat]);
      } else {
        const wrapper = document.createElement('div');
  wrapper.className = 'map-marker-wrapper';
  wrapper.style.position = 'relative';

  const pulse = document.createElement('div');
  pulse.className = 'marker-pulse';
  // place pulse behind svg
  pulse.style.zIndex = '0';

  // ensure svg and label are above pulse

        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.innerHTML = `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="#10b981" stroke="white" stroke-width="4"/>
          <circle cx="20" cy="20" r="8" fill="white"/>
        </svg>`;

        const label = document.createElement('div');
        label.style.marginTop = '6px';
        label.style.padding = '4px 8px';
        label.style.background = 'white';
        label.style.borderRadius = '9999px';
        label.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
        label.style.fontSize = '12px';
        label.style.fontWeight = '600';
        label.textContent = 'My place';

  wrapper.appendChild(pulse);
  wrapper.appendChild(el);
  wrapper.appendChild(label);

        pickupMarker.current = new mapboxgl.Marker({ element: wrapper })
          .setLngLat([pickupLocation.lng, pickupLocation.lat])
          .addTo(map.current!);
      }
    }

    // Update dropoff marker
    if (dropoffLocation) {
      if (dropoffMarker.current) {
        dropoffMarker.current.setLngLat([dropoffLocation.lng, dropoffLocation.lat]);
      } else {
  const wrapper = document.createElement('div');
  wrapper.className = 'map-marker-wrapper';
  wrapper.style.position = 'relative';

  const pulse = document.createElement('div');
  pulse.className = 'marker-pulse';
  pulse.style.zIndex = '0';

        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.innerHTML = `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="#ef4444" stroke="white" stroke-width="4"/>
          <circle cx="20" cy="20" r="8" fill="white"/>
        </svg>`;

        const label = document.createElement('div');
        label.style.marginTop = '6px';
        label.style.padding = '4px 8px';
        label.style.background = 'white';
        label.style.borderRadius = '9999px';
        label.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
        label.style.fontSize = '12px';
        label.style.fontWeight = '600';
        label.textContent = 'Want to go to';

  wrapper.appendChild(pulse);
  wrapper.appendChild(el);
  wrapper.appendChild(label);

        dropoffMarker.current = new mapboxgl.Marker({ element: wrapper })
          .setLngLat([dropoffLocation.lng, dropoffLocation.lat])
          .addTo(map.current!);
      }
    }

    // Update single driver marker (for active ride)
    if (driverLocation) {
      if (driverMarker.current) {
        driverMarker.current.setLngLat([driverLocation.lng, driverLocation.lat]);
      } else {
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.innerHTML = `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="#3b82f6" stroke="white" stroke-width="4"/>
          <text x="20" y="25" text-anchor="middle" font-size="20">🚗</text>
        </svg>`;
        driverMarker.current = new mapboxgl.Marker({ element: el })
          .setLngLat([driverLocation.lng, driverLocation.lat])
          .addTo(map.current);
      }
    }

    // Remove old driver markers (for available drivers)
    driverMarkers.current.forEach((marker) => marker.remove());
    driverMarkers.current = [];
    // Add markers for all available drivers (if provided)
    if (driverLocations && driverLocations.length > 0) {
      driverLocations.forEach((loc) => {
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.innerHTML = `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="14" fill="#2563eb" stroke="white" stroke-width="3"/>
          <text x="16" y="22" text-anchor="middle" font-size="16">🚗</text>
        </svg>`;
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([loc.longitude, loc.latitude])
          .addTo(map.current!);
        driverMarkers.current.push(marker);
      });
    }

    // Update current location marker
    if (showCurrentLocation && currentLocation) {
      if (currentLocationMarker.current) {
        currentLocationMarker.current.setLngLat([currentLocation.lng, currentLocation.lat]);
      } else {
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.innerHTML = `<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
          <circle cx="15" cy="15" r="13" fill="#3b82f6" stroke="white" stroke-width="3"/>
          <circle cx="15" cy="15" r="6" fill="white"/>
        </svg>`;
        currentLocationMarker.current = new mapboxgl.Marker({ element: el })
          .setLngLat([currentLocation.lng, currentLocation.lat])
          .addTo(map.current);
      }
    }
  };

  return (
    <div className={`relative w-full ${height} rounded-lg overflow-hidden border shadow-sm`}>
      {isLoading && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center z-10">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">Loading map...</span>
          </div>
        </div>
      )}
      
      <div ref={mapContainer} className="w-full h-full" />
      
      {showCurrentLocation && (
        <div className="absolute top-3 right-16 flex gap-2 z-10">
          <Button
            size="sm"
            variant="secondary"
            onClick={getCurrentLocation}
            className="bg-white/90 hover:bg-white shadow-md"
          >
            <Navigation className="h-4 w-4" />
          </Button>
        </div>
      )}

      {interactive && (
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          <Button
            size="sm"
            variant={selectingLocation === 'pickup' ? 'default' : 'secondary'}
            onClick={() => {
              selectingLocationRef.current = 'pickup';
              setSelectingLocation('pickup');
              if (map.current) {
                map.current.getCanvas().style.cursor = 'crosshair';
              }
              toast({
                title: "Select Pickup Location",
                description: "Click anywhere on the map to set pickup location",
              });
            }}
            className="bg-white/90 hover:bg-white shadow-md"
          >
            {selectingLocation === 'pickup' ? '📍 Click Map' : 'Set Pickup'}
          </Button>
          <Button
            size="sm"
            variant={selectingLocation === 'dropoff' ? 'default' : 'secondary'}
            onClick={() => {
              selectingLocationRef.current = 'dropoff';
              setSelectingLocation('dropoff');
              if (map.current) {
                map.current.getCanvas().style.cursor = 'crosshair';
              }
              toast({
                title: "Select Dropoff Location",
                description: "Click anywhere on the map to set dropoff location",
              });
            }}
            className="bg-white/90 hover:bg-white shadow-md"
          >
            {selectingLocation === 'dropoff' ? '📍 Click Map' : 'Set Dropoff'}
          </Button>
        </div>
      )}

      {distance !== null && (
        <div className="absolute bottom-3 left-3 bg-white/90 px-3 py-2 rounded-lg shadow-md z-10">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-medium">{distance.toFixed(2)} km</span>
          </div>
        </div>
      )}

      {pickupLocation && dropoffLocation && (
        <div className="absolute top-3 right-3 bg-white/90 px-3 py-2 rounded-lg shadow-md z-10 text-xs space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Pickup</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Dropoff</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;
