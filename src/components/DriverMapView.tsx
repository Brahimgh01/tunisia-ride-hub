import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';

interface PendingRide {
  id: string;
  pickup_location: string;
  dropoff_location: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  estimated_price?: number;
  ride_type?: string;
  payment_method?: string;
}

interface DriverMapViewProps {
  isOnline: boolean;
  driverId: string;
}

export default function DriverMapView({ isOnline, driverId }: DriverMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);
  const rideMarkers = useRef<mapboxgl.Marker[]>([]);
  
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingRides, setPendingRides] = useState<PendingRide[]>([]);
  const [selectedRide, setSelectedRide] = useState<PendingRide | null>(null);
  const [loading, setLoading] = useState(true);

  const defaultCenter = { lat: 36.8065, lng: 10.1815 }; // Tunis

  useEffect(() => {
    initializeMap();
    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (isOnline && map.current) {
      startLocationTracking();
      fetchPendingRides();
      
      // Subscribe to new ride requests
      const channel = supabase
        .channel('pending-rides')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'rides', filter: 'status=eq.pending' },
          () => {
            fetchPendingRides();
            toast.info('🚗 New ride request nearby!');
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOnline]);

  useEffect(() => {
    if (map.current && currentLocation) {
      updateDriverMarker();
    }
  }, [currentLocation]);

  useEffect(() => {
    if (map.current) {
      updateRideMarkers();
    }
  }, [pendingRides]);

  const initializeMap = async () => {
    try {
      const { data: apiKey } = await supabase.functions.invoke('get-maps-api-key');
      if (!apiKey || !mapContainer.current) return;

      mapboxgl.accessToken = apiKey.key;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [defaultCenter.lng, defaultCenter.lat],
        zoom: 13,
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: false }),
        'top-right'
      );

      setLoading(false);
    } catch (error) {
      console.error('Error loading map:', error);
      setLoading(false);
    }
  };

  const startLocationTracking = () => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(newLocation);
          
          // Update location in database
          updateLocationInDb(newLocation.lat, newLocation.lng);
          
          // Center map on driver location
          if (map.current) {
            map.current.flyTo({
              center: [newLocation.lng, newLocation.lat],
              zoom: 14,
            });
          }
        },
        (error) => {
          console.error('Location error:', error);
          toast.error('Could not get your location');
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 15000
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  };

  const updateLocationInDb = async (lat: number, lng: number) => {
    await supabase
      .from('driver_locations')
      .upsert({
        driver_id: driverId,
        latitude: lat,
        longitude: lng,
        is_available: isOnline,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'driver_id'
      });
  };

  const fetchPendingRides = async () => {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (!error && data) {
      setPendingRides(data as unknown as PendingRide[]);
    }
  };

  const updateDriverMarker = () => {
    if (!map.current || !currentLocation) return;

    if (driverMarker.current) {
      driverMarker.current.setLngLat([currentLocation.lng, currentLocation.lat]);
    } else {
      const el = document.createElement('div');
      el.className = 'driver-marker';
      el.innerHTML = `
        <div style="
          width: 40px;
          height: 40px;
          background: #3b82f6;
          border: 4px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">🚗</div>
      `;
      driverMarker.current = new mapboxgl.Marker({ element: el })
        .setLngLat([currentLocation.lng, currentLocation.lat])
        .addTo(map.current);
    }
  };

  const updateRideMarkers = () => {
    if (!map.current) return;

    // Clear existing markers
    rideMarkers.current.forEach(marker => marker.remove());
    rideMarkers.current = [];

    // Add markers for each pending ride
    pendingRides.forEach((ride) => {
      const el = document.createElement('div');
      el.className = 'ride-marker';
      el.innerHTML = `
        <div style="
          background: #10b981;
          color: white;
          padding: 8px 12px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          white-space: nowrap;
        ">📍 ${ride.estimated_price ? `${ride.estimated_price} TND` : 'New'}</div>
      `;
      
      el.onclick = () => setSelectedRide(ride);
      
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([ride.pickup_lng, ride.pickup_lat])
        .addTo(map.current!);
      
      rideMarkers.current.push(marker);
    });
  };

  const acceptRide = async (rideId: string) => {
    const { error } = await supabase
      .from('rides')
      .update({ status: 'accepted', driver_id: driverId })
      .eq('id', rideId);

    if (error) {
      toast.error('Failed to accept ride');
    } else {
      toast.success('Ride accepted! Customer has been notified.');
      setSelectedRide(null);
      fetchPendingRides();
    }
  };

  return (
    <div className="relative w-full h-[600px]">
      {loading && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center z-10 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
      
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      
      {!isOnline && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-lg">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-lg font-semibold mb-2">You are offline</p>
              <p className="text-sm text-muted-foreground">Go online to see ride requests</p>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedRide && (
        <Card className="absolute bottom-4 left-4 right-4 z-20 shadow-2xl">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg mb-1">New Ride Request</h3>
                {selectedRide.estimated_price && (
                  <Badge className="text-base">{selectedRide.estimated_price} TND</Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRide(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Pickup</p>
                  <p className="text-sm text-muted-foreground">{selectedRide.pickup_location}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Dropoff</p>
                  <p className="text-sm text-muted-foreground">{selectedRide.dropoff_location}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => acceptRide(selectedRide.id)}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept Ride
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedRide(null)}
              >
                Decline
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isOnline && pendingRides.length > 0 && !selectedRide && (
        <div className="absolute top-4 left-4 z-10">
          <Badge className="text-base px-4 py-2">
            {pendingRides.length} ride{pendingRides.length !== 1 ? 's' : ''} nearby
          </Badge>
        </div>
      )}
    </div>
  );
}