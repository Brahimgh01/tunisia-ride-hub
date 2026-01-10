import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Navigation, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useDriverLocations, DriverLocation } from '@/hooks/useDriverLocations';

interface MapLocation {
  lat: number;
  lng: number;
}

interface CustomerMapViewProps {
  pickupLocation?: MapLocation | null;
  dropoffLocation?: MapLocation | null;
  onPickupChange?: (location: MapLocation) => void;
  onDropoffChange?: (location: MapLocation) => void;
  onDistanceCalculated?: (distance: number) => void;
}

const CustomerMapView = ({
  pickupLocation = null,
  dropoffLocation = null,
  onPickupChange,
  onDropoffChange,
  onDistanceCalculated,
}: CustomerMapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const pickupMarker = useRef<mapboxgl.Marker | null>(null);
  const dropoffMarker = useRef<mapboxgl.Marker | null>(null);
  const driverMarkers = useRef<mapboxgl.Marker[]>([]);
  const currentLocationMarker = useRef<mapboxgl.Marker | null>(null);
  const [currentLocation, setCurrentLocation] = useState<MapLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectingLocation, setSelectingLocation] = useState<'pickup' | 'dropoff' | null>(null);
  const selectingLocationRef = useRef<'pickup' | 'dropoff' | null>(null);
  const routeAnimRef = useRef<number | null>(null);
  const { toast } = useToast();
  const { driverLocations } = useDriverLocations();

  const defaultCenter: MapLocation = { lat: 36.8065, lng: 10.1815 };

  useEffect(() => {
    initializeMap();
    return () => {
      if (routeAnimRef.current) window.clearInterval(routeAnimRef.current);
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (map.current) {
      // Update the refs so click handler has latest state
      if ((map.current as any).__updateRefs) {
        (map.current as any).__updateRefs(pickupLocation, dropoffLocation);
      }
      updateMapMarkers();
      if (pickupLocation && dropoffLocation) {
        calculateRoute();
      }
    }
  }, [pickupLocation, dropoffLocation, currentLocation, driverLocations]);

  const initializeMap = async () => {
    try {
      const { data: apiKey, error } = await supabase.functions.invoke('get-maps-api-key');
      
      if (error || !apiKey) {
        toast({ title: "Map Error", description: "Failed to load map.", variant: "destructive" });
        return;
      }

      if (!mapContainer.current) return;

      mapboxgl.accessToken = apiKey.key;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [defaultCenter.lng, defaultCenter.lat],
        zoom: 13,
        pitch: 45,
        bearing: -17.6,
      });

      map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');

      // Click handler for selecting locations
      // Use refs to track the latest pickup/dropoff state
      const pickupRef = { current: pickupLocation };
      const dropoffRef = { current: dropoffLocation };
      
      // Store update functions that will be called to sync refs
      (map.current as any).__updateRefs = (pickup: MapLocation | null, dropoff: MapLocation | null) => {
        pickupRef.current = pickup;
        dropoffRef.current = dropoff;
      };

      map.current.on('click', (e) => {
        const selecting = selectingLocationRef.current;
        
        // ONLY set location when a button has been pressed (manual selection mode)
        if (selecting) {
          const location = { lat: e.lngLat.lat, lng: e.lngLat.lng };
          if (selecting === 'pickup') {
            onPickupChange?.(location);
            toast({ title: "✓ Pickup set" });
          } else {
            onDropoffChange?.(location);
            toast({ title: "✓ Dropoff set" });
          }
          selectingLocationRef.current = null;
          setSelectingLocation(null);
          map.current!.getCanvas().style.cursor = '';
        }
        // No auto-selection - user must press a button first
      });

      getCurrentLocation();
    } catch (error) {
      console.error('Error loading Mapbox:', error);
      toast({ title: "Map Error", description: "Failed to initialize map.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = { lat: position.coords.latitude, lng: position.coords.longitude };
          setCurrentLocation(location);
          if (map.current) {
            map.current.flyTo({ center: [location.lng, location.lat], zoom: 15, duration: 1500 });
          }
        },
        () => setCurrentLocation(defaultCenter)
      );
    } else {
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
      const distanceInKm = data.distance / 1000;
      
      onDistanceCalculated?.(distanceInKm);

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

      // Animate dash
      let dashOffset = 0;
      routeAnimRef.current = window.setInterval(() => {
        if (!map.current) return;
        dashOffset = (dashOffset + 1) % 20;
        try {
          map.current.setPaintProperty(layerId, 'line-dasharray', [2, 4]);
        } catch {}
      }, 100) as unknown as number;

      // Fit bounds
      const bounds = route.reduce(
        (b: mapboxgl.LngLatBounds, c: [number, number]) => b.extend(c as mapboxgl.LngLatLike),
        new mapboxgl.LngLatBounds(route[0], route[0])
      );
      map.current.fitBounds(bounds, { padding: { top: 100, bottom: 300, left: 50, right: 50 } });
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  };

  const createModernMarker = (type: 'pickup' | 'dropoff' | 'driver' | 'current') => {
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
    } else if (type === 'driver') {
      el.innerHTML = `
        <div class="relative">
          <div class="absolute -inset-2 rounded-full bg-blue-500/30 animate-pulse"></div>
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/50 flex items-center justify-center border-2 border-white text-lg">
            🚕
          </div>
        </div>
      `;
    } else {
      el.innerHTML = `
        <div class="relative">
          <div class="absolute -inset-3 rounded-full bg-blue-500/20 animate-ping"></div>
          <div class="w-6 h-6 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 flex items-center justify-center border-2 border-white">
            <div class="w-2 h-2 rounded-full bg-white"></div>
          </div>
        </div>
      `;
    }
    
    return el;
  };

  const updateMapMarkers = () => {
    if (!map.current) return;

    // Pickup marker
    if (pickupLocation) {
      if (pickupMarker.current) {
        pickupMarker.current.setLngLat([pickupLocation.lng, pickupLocation.lat]);
      } else {
        pickupMarker.current = new mapboxgl.Marker({ element: createModernMarker('pickup') })
          .setLngLat([pickupLocation.lng, pickupLocation.lat])
          .addTo(map.current);
      }
    } else if (pickupMarker.current) {
      pickupMarker.current.remove();
      pickupMarker.current = null;
    }

    // Dropoff marker
    if (dropoffLocation) {
      if (dropoffMarker.current) {
        dropoffMarker.current.setLngLat([dropoffLocation.lng, dropoffLocation.lat]);
      } else {
        dropoffMarker.current = new mapboxgl.Marker({ element: createModernMarker('dropoff') })
          .setLngLat([dropoffLocation.lng, dropoffLocation.lat])
          .addTo(map.current);
      }
    } else if (dropoffMarker.current) {
      dropoffMarker.current.remove();
      dropoffMarker.current = null;
    }

    // Driver markers
    driverMarkers.current.forEach((m) => m.remove());
    driverMarkers.current = [];
    if (driverLocations && driverLocations.length > 0) {
      driverLocations.forEach((loc) => {
        const marker = new mapboxgl.Marker({ element: createModernMarker('driver') })
          .setLngLat([loc.longitude, loc.latitude])
          .addTo(map.current!);
        driverMarkers.current.push(marker);
      });
    }

    // Current location marker - always show when we have current location
    if (currentLocation) {
      if (currentLocationMarker.current) {
        currentLocationMarker.current.setLngLat([currentLocation.lng, currentLocation.lat]);
      } else {
        currentLocationMarker.current = new mapboxgl.Marker({ element: createModernMarker('current') })
          .setLngLat([currentLocation.lng, currentLocation.lat])
          .addTo(map.current);
      }
    } else if (currentLocationMarker.current) {
      currentLocationMarker.current.remove();
      currentLocationMarker.current = null;
    }
  };

  const startSelectingLocation = (type: 'pickup' | 'dropoff') => {
    selectingLocationRef.current = type;
    setSelectingLocation(type);
    if (map.current) {
      map.current.getCanvas().style.cursor = 'crosshair';
    }
    toast({ title: `Tap on map to set ${type}` });
  };

  const useCurrentAsPickup = () => {
    if (currentLocation) {
      onPickupChange?.(currentLocation);
      toast({ title: "✓ Using current location as pickup", description: "Now tap dropoff button to set destination" });
      // Center map on current location
      if (map.current) {
        map.current.flyTo({ center: [currentLocation.lng, currentLocation.lat], zoom: 15, duration: 1000 });
      }
    } else {
      getCurrentLocation();
      toast({ title: "Getting your location...", description: "Please wait" });
    }
  };

  return (
    <div className="absolute inset-0">
      {isLoading && (
        <div className="absolute inset-0 bg-background flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Loading map...</span>
          </div>
        </div>
      )}
      
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Floating Action Buttons */}
      <div className="absolute bottom-48 right-4 z-10 flex flex-col gap-2">
        {/* Current Location - single button that sets pickup to current location */}
        <Button
          size="icon"
          onClick={useCurrentAsPickup}
          className="h-12 w-12 rounded-2xl bg-background/95 backdrop-blur-xl shadow-lg border-0 hover:scale-105 transition-transform text-blue-500 hover:bg-background"
          title="Use my current location as pickup"
        >
          <Navigation className="h-5 w-5" />
        </Button>

        {/* Select Pickup on Map */}
        <Button
          size="icon"
          onClick={() => startSelectingLocation('pickup')}
          className={`h-12 w-12 rounded-2xl shadow-lg border-0 hover:scale-105 transition-transform ${
            selectingLocation === 'pickup' 
              ? 'bg-emerald-500 text-white' 
              : pickupLocation ? 'bg-emerald-500/20 backdrop-blur-xl text-emerald-500 hover:bg-emerald-500/30' : 'bg-background/95 backdrop-blur-xl text-emerald-500 hover:bg-background'
          }`}
          title="Tap map to set pickup"
        >
          <MapPin className="h-5 w-5" />
        </Button>

        {/* Select Dropoff on Map */}
        <Button
          size="icon"
          onClick={() => startSelectingLocation('dropoff')}
          className={`h-12 w-12 rounded-2xl shadow-lg border-0 hover:scale-105 transition-transform ${
            selectingLocation === 'dropoff' 
              ? 'bg-primary text-white' 
              : dropoffLocation ? 'bg-primary/20 backdrop-blur-xl text-primary hover:bg-primary/30' : 'bg-background/95 backdrop-blur-xl text-primary hover:bg-background'
          }`}
          title="Tap map to set dropoff"
        >
          <MapPin className="h-5 w-5" />
        </Button>
      </div>

      {/* Selection Mode Indicator */}
      {selectingLocation && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10">
          <div className={`px-4 py-2 rounded-full text-white text-sm font-medium shadow-lg animate-pulse ${
            selectingLocation === 'pickup' ? 'bg-emerald-500' : 'bg-primary'
          }`}>
            Tap to set {selectingLocation}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMapView;
