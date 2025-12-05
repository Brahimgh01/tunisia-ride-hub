import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

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
  driver_id?: string;
}

interface DriverMapViewProps {
  isOnline: boolean;
  driverId: string;
}

const translations = {
  en: {
    youAreOffline: 'You are offline',
    goOnline: 'Go online to see ride requests',
    newRideRequest: 'New Ride Request',
    pickup: 'Pickup',
    dropoff: 'Dropoff',
    acceptRide: 'Accept Ride',
    decline: 'Decline',
    ridesNearby: 'ride(s) nearby',
    loadingMap: 'Loading map...',
    newRideNearby: 'New ride request nearby!',
    rideAssigned: 'New ride assigned to you!',
    checkMap: 'Check the map for details',
    locationError: 'Could not get your location',
    acceptSuccess: 'Ride accepted! Customer has been notified.',
    acceptError: 'Failed to accept ride',
  },
  fr: {
    youAreOffline: 'Vous êtes hors ligne',
    goOnline: 'Passez en ligne pour voir les demandes',
    newRideRequest: 'Nouvelle demande de course',
    pickup: 'Prise en charge',
    dropoff: 'Dépose',
    acceptRide: 'Accepter la course',
    decline: 'Refuser',
    ridesNearby: 'course(s) à proximité',
    loadingMap: 'Chargement de la carte...',
    newRideNearby: 'Nouvelle demande de course à proximité !',
    rideAssigned: 'Nouvelle course attribuée !',
    checkMap: 'Consultez la carte pour les détails',
    locationError: 'Impossible d\'obtenir votre position',
    acceptSuccess: 'Course acceptée ! Le client a été notifié.',
    acceptError: 'Échec de l\'acceptation',
  },
  ar: {
    youAreOffline: 'أنت غير متصل',
    goOnline: 'اتصل لرؤية طلبات الرحلات',
    newRideRequest: 'طلب رحلة جديد',
    pickup: 'نقطة الانطلاق',
    dropoff: 'نقطة الوصول',
    acceptRide: 'قبول الرحلة',
    decline: 'رفض',
    ridesNearby: 'رحلة(رحلات) قريبة',
    loadingMap: 'جاري تحميل الخريطة...',
    newRideNearby: 'طلب رحلة جديد بالقرب منك!',
    rideAssigned: 'تم تعيين رحلة جديدة لك!',
    checkMap: 'تحقق من الخريطة للتفاصيل',
    locationError: 'تعذر الحصول على موقعك',
    acceptSuccess: 'تم قبول الرحلة! تم إخطار العميل.',
    acceptError: 'فشل قبول الرحلة',
  }
};

export default function DriverMapView({ isOnline, driverId }: DriverMapViewProps) {
  const { language } = useAuth();
  const t = translations[language as keyof typeof translations] || translations.en;
  
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
      
      // Subscribe to ride requests - new inserts AND ALL updates (including cancellations)
      const channel = supabase
        .channel('pending-rides')
        // Listen for new pending rides
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'rides', filter: 'status=eq.pending' },
          () => {
            console.log('🆕 New ride request created');
            fetchPendingRides();
            toast.info(`🚗 ${t.newRideNearby}`);
          }
        )
        // Listen for ALL ride updates (including cancellations)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'rides' },
          (payload) => {
            console.log('📝 Ride updated:', payload);
            const ride = payload.new as any;
            
            // If ride was assigned to this driver
            if (ride.driver_id === driverId && payload.old && !(payload.old as any).driver_id) {
              toast.success(`🎯 ${t.rideAssigned}`, {
                description: t.checkMap,
                duration: 5000
              });
            }
            
            // If ride was cancelled, just refresh the list
            if (ride.status === 'cancelled') {
              console.log('🚫 Ride was cancelled');
            }
            
            fetchPendingRides();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOnline, driverId, t]);

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
          toast.error(t.locationError);
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
    console.log('📍 Updating driver location:', { driverId, lat, lng, isOnline });
    const { error } = await supabase
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
    
    if (error) {
      console.error('❌ Error updating driver location:', error);
    } else {
      console.log('✅ Driver location updated successfully');
    }
  };

  const fetchPendingRides = async () => {
    console.log('📍 Fetching pending rides for driver:', driverId);
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20);

    if (!error && data) {
      // Prioritize rides assigned to this driver
      const assignedToMe = data.filter(r => r.driver_id === driverId);
      const unassigned = data.filter(r => !r.driver_id);
      const sortedRides = [...assignedToMe, ...unassigned];
      
      console.log(`✅ Found ${assignedToMe.length} assigned rides, ${unassigned.length} unassigned rides`);
      setPendingRides(sortedRides as unknown as PendingRide[]);
    } else if (error) {
      console.error('❌ Error fetching rides:', error);
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
      const isAssignedToMe = ride.driver_id === driverId;
      
      const el = document.createElement('div');
      el.className = 'ride-marker';
      el.innerHTML = `
        <div style="
          background: ${isAssignedToMe ? '#f59e0b' : '#10b981'};
          color: white;
          padding: 8px 12px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          cursor: pointer;
          white-space: nowrap;
          animation: ${isAssignedToMe ? 'pulse 2s infinite' : 'none'};
        ">${isAssignedToMe ? '🎯' : '📍'} ${ride.estimated_price ? `${ride.estimated_price} TND` : 'New'}</div>
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
      .update({ 
        status: 'accepted', 
        driver_id: driverId,
        accepted_at: new Date().toISOString()
      })
      .eq('id', rideId);

    if (error) {
      console.error('Accept ride error:', error);
      toast.error(t.acceptError);
    } else {
      toast.success(t.acceptSuccess);
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
            <p className="text-muted-foreground">{t.loadingMap}</p>
          </div>
        </div>
      )}
      
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      
      {!isOnline && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-lg">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-lg font-semibold mb-2">{t.youAreOffline}</p>
              <p className="text-sm text-muted-foreground">{t.goOnline}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedRide && (
        <Card className="absolute bottom-4 left-4 right-4 z-20 shadow-2xl">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg mb-1">{t.newRideRequest}</h3>
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
                  <p className="text-sm font-medium">{t.pickup}</p>
                  <p className="text-sm text-muted-foreground">{selectedRide.pickup_location}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t.dropoff}</p>
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
                {t.acceptRide}
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedRide(null)}
              >
                {t.decline}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isOnline && pendingRides.length > 0 && !selectedRide && (
        <div className="absolute top-4 left-4 z-10">
          <Badge className="text-base px-4 py-2">
            {pendingRides.length} {t.ridesNearby}
          </Badge>
        </div>
      )}
    </div>
  );
}