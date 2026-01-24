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
    activeRide: 'Active Ride',
    navigateToPickup: 'Navigate to Pickup',
    navigateToDropoff: 'Navigate to Dropoff',
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
    activeRide: 'Course Active',
    navigateToPickup: 'Naviguer vers prise en charge',
    navigateToDropoff: 'Naviguer vers dépose',
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
    activeRide: 'رحلة نشطة',
    navigateToPickup: 'انتقل إلى نقطة الانطلاق',
    navigateToDropoff: 'انتقل إلى نقطة الوصول',
  }
};

export default function DriverMapView({ isOnline, driverId }: DriverMapViewProps) {
  const { language } = useAuth();
  const t = translations[language as keyof typeof translations] || translations.en;
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);
  const rideMarkers = useRef<mapboxgl.Marker[]>([]);
  const activeRideMarkers = useRef<{ pickup?: mapboxgl.Marker; dropoff?: mapboxgl.Marker }>({});
  const previewRideMarkers = useRef<{ pickup?: mapboxgl.Marker; dropoff?: mapboxgl.Marker }>({});
  
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingRides, setPendingRides] = useState<PendingRide[]>([]);
  const [selectedRide, setSelectedRide] = useState<PendingRide | null>(null);
  const [activeRide, setActiveRide] = useState<PendingRide | null>(null);
  const [loading, setLoading] = useState(true);

  const ACTIVE_RIDE_STATUSES = ['accepted', 'driver_en_route', 'driver_arrived', 'in_progress'] as const;

  const defaultCenter = { lat: 36.8065, lng: 10.1815 }; // Tunis

  useEffect(() => {
    initializeMap();
    return () => {
      map.current?.remove();
    };
  }, []);

  // When going offline, clear any in-map ride UI immediately (card + route + markers)
  useEffect(() => {
    if (isOnline) return;
    setSelectedRide(null);
    setPendingRides([]);
    setActiveRide(null);
    clearActiveRideMarkers();
  }, [isOnline]);

  // Fetch active ride on mount and subscribe to updates
  useEffect(() => {
    if (!isOnline || !driverId) return;

    const fetchActiveRide = async () => {
      const { data } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', driverId)
        .in('status', [...ACTIVE_RIDE_STATUSES])
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setActiveRide(data as unknown as PendingRide);
      }
    };

    fetchActiveRide();

    // Subscribe to driver's ride updates
    const channel = supabase
      .channel('driver-active-ride')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides', filter: `driver_id=eq.${driverId}` },
        (payload) => {
          const ride = payload.new as any;
          if (ACTIVE_RIDE_STATUSES.includes(ride.status)) {
            setActiveRide(ride as PendingRide);
          } else {
            // Ride completed or cancelled
            setActiveRide(null);
            clearActiveRideMarkers();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOnline, driverId]);

  // If the driver cancels/relinquishes a ride, DriverDashboard/DriverRideManagement sets driver_id to null.
  // In that case, the above `driver_id=eq.${driverId}` subscription won't fire, so we also watch by ride id.
  useEffect(() => {
    if (!activeRide?.id || !driverId) return;

    const channel = supabase
      .channel(`active-ride-watch-${activeRide.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${activeRide.id}` },
        (payload) => {
          const ride = payload.new as any;
          if (!ride) return;

          // If it no longer belongs to me or is no longer in an active status, clear UI immediately.
          if (ride.driver_id !== driverId || !ACTIVE_RIDE_STATUSES.includes(ride.status)) {
            setActiveRide(null);
            setSelectedRide(null);
            clearActiveRideMarkers();
            return;
          }

          setActiveRide(ride as PendingRide);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRide?.id, driverId]);

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

  // Update active ride route and markers when active ride changes
  useEffect(() => {
    if (map.current && activeRide) {
      showActiveRideRoute();
    } else if (map.current && !activeRide) {
      // Clear markers and route when ride is cancelled/completed
      clearActiveRideMarkers();
    }
  }, [activeRide, currentLocation]);

  // Show preview route when driver clicks on a pending ride (before accepting)
  useEffect(() => {
    if (map.current && selectedRide && !activeRide) {
      showPreviewRoute(selectedRide);
    } else if (map.current && !selectedRide) {
      clearPreviewMarkers();
    }
  }, [selectedRide, activeRide]);

  const buildGoogleMapsDirectionsUrl = (lat: number, lng: number) => {
    const destination = `${lat},${lng}`;
    const origin = currentLocation ? `${currentLocation.lat},${currentLocation.lng}` : 'My Location';
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  };

  const initializeMap = async () => {
    try {
      const { data: apiKey } = await supabase.functions.invoke('get-maps-api-key');
      if (!apiKey || !mapContainer.current) return;

      mapboxgl.accessToken = apiKey.key;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [defaultCenter.lng, defaultCenter.lat],
        zoom: 13,
        pitch: 45,
        bearing: -17.6,
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true }),
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
    
    // First check if driver has an active ride (accepted, en_route, arrived, in_progress)
    const { data: activeRide } = await supabase
      .from('rides')
      .select('id, status')
      .eq('driver_id', driverId)
      .in('status', ['accepted', 'driver_en_route', 'driver_arrived', 'in_progress'])
      .limit(1)
      .maybeSingle();
    
    // If driver has an active ride, don't show any pending rides
    if (activeRide) {
      console.log('🚗 Driver has active ride, hiding pending rides');
      setPendingRides([]);
      return;
    }
    
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20);

    if (!error && data) {
      // Only show rides assigned to this driver OR unassigned rides
      // Rides assigned to OTHER drivers should not appear
      const assignedToMe = data.filter(r => r.driver_id === driverId);
      const unassigned = data.filter(r => !r.driver_id);
      const sortedRides = [...assignedToMe, ...unassigned];
      
      console.log(`✅ Found ${assignedToMe.length} assigned rides, ${unassigned.length} unassigned rides`);
      setPendingRides(sortedRides as unknown as PendingRide[]);
    } else if (error) {
      console.error('❌ Error fetching rides:', error);
    }
  };

  const createModernMarker = (type: 'driver' | 'ride' | 'assigned') => {
    const el = document.createElement('div');
    el.className = 'modern-marker';
    
    if (type === 'driver') {
      el.innerHTML = `
        <div class="relative">
          <div class="absolute -inset-3 rounded-full bg-blue-500/20 animate-ping"></div>
          <div class="absolute -inset-2 rounded-full bg-blue-500/30 animate-pulse"></div>
          <div class="relative w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/50 flex items-center justify-center border-2 border-white text-lg">
            🚗
          </div>
          <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg">
            YOU
          </div>
        </div>
      `;
    } else if (type === 'assigned') {
      el.innerHTML = `
        <div class="relative">
          <div class="absolute -inset-4 rounded-full bg-amber-500/20 animate-ping"></div>
          <div class="absolute -inset-2 rounded-full bg-amber-500/30 animate-pulse"></div>
          <div class="relative w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/50 flex items-center justify-center border-2 border-white">
            <div class="w-2 h-2 rounded-full bg-white"></div>
          </div>
          <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg">
            🎯 ASSIGNED
          </div>
        </div>
      `;
    } else {
      el.innerHTML = `
        <div class="relative">
          <div class="absolute -inset-2 rounded-full bg-emerald-500/30 animate-pulse"></div>
          <div class="relative w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/50 flex items-center justify-center border-2 border-white">
            <div class="w-2 h-2 rounded-full bg-white"></div>
          </div>
        </div>
      `;
    }
    
    return el;
  };

  const updateDriverMarker = () => {
    if (!map.current || !currentLocation) return;

    if (driverMarker.current) {
      driverMarker.current.setLngLat([currentLocation.lng, currentLocation.lat]);
    } else {
      driverMarker.current = new mapboxgl.Marker({ element: createModernMarker('driver') })
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
      
      const el = createModernMarker(isAssignedToMe ? 'assigned' : 'ride');
      el.style.cursor = 'pointer';
      
      // Add price badge
      const priceEl = document.createElement('div');
      priceEl.className = 'absolute -top-8 left-1/2 -translate-x-1/2';
      priceEl.innerHTML = `
        <div class="bg-black/80 text-white text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap shadow-lg backdrop-blur-sm">
          ${ride.estimated_price ? `${ride.estimated_price} TND` : 'New'}
        </div>
      `;
      el.querySelector('.relative')?.appendChild(priceEl);
      
      el.onclick = () => setSelectedRide(ride);
      
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([ride.pickup_lng, ride.pickup_lat])
        .addTo(map.current!);
      
      rideMarkers.current.push(marker);
    });
  };

  const clearActiveRideMarkers = () => {
    if (activeRideMarkers.current.pickup) {
      activeRideMarkers.current.pickup.remove();
      activeRideMarkers.current.pickup = undefined;
    }
    if (activeRideMarkers.current.dropoff) {
      activeRideMarkers.current.dropoff.remove();
      activeRideMarkers.current.dropoff = undefined;
    }
    // Remove route layer if exists
    if (map.current) {
      try {
        if (map.current.getLayer('active-route-glow')) {
          map.current.removeLayer('active-route-glow');
        }
        if (map.current.getLayer('active-route-line')) {
          map.current.removeLayer('active-route-line');
        }
        if (map.current.getSource('active-route')) {
          map.current.removeSource('active-route');
        }
      } catch (e) {
        console.warn('Error clearing route layers:', e);
      }
    }
  };

  const clearPreviewMarkers = () => {
    if (previewRideMarkers.current.pickup) {
      previewRideMarkers.current.pickup.remove();
      previewRideMarkers.current.pickup = undefined;
    }
    if (previewRideMarkers.current.dropoff) {
      previewRideMarkers.current.dropoff.remove();
      previewRideMarkers.current.dropoff = undefined;
    }
    // Remove preview route layer if exists
    if (map.current) {
      try {
        if (map.current.getLayer('preview-route-glow')) {
          map.current.removeLayer('preview-route-glow');
        }
        if (map.current.getLayer('preview-route-line')) {
          map.current.removeLayer('preview-route-line');
        }
        if (map.current.getSource('preview-route')) {
          map.current.removeSource('preview-route');
        }
      } catch (e) {
        console.warn('Error clearing preview route layers:', e);
      }
    }
  };

  const createPreviewMarker = (type: 'pickup' | 'dropoff') => {
    const el = document.createElement('div');
    el.className = 'preview-ride-marker';
    
    if (type === 'pickup') {
      el.innerHTML = `
        <div class="relative">
          <div class="absolute -inset-2 rounded-full bg-amber-500/30 animate-pulse"></div>
          <div class="relative w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/50 flex items-center justify-center border-2 border-white">
            <div class="w-2 h-2 rounded-full bg-white"></div>
          </div>
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg">
            ${t.pickup}
          </div>
        </div>
      `;
    } else {
      el.innerHTML = `
        <div class="relative">
          <div class="absolute -inset-2 rounded-full bg-orange-500/30 animate-pulse"></div>
          <div class="relative w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/50 flex items-center justify-center border-2 border-white">
            <div class="w-2 h-2 rounded-full bg-white"></div>
          </div>
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg">
            ${t.dropoff}
          </div>
        </div>
      `;
    }
    
    return el;
  };

  const showPreviewRoute = async (ride: PendingRide) => {
    if (!map.current || !ride) return;

    // Clear any previous preview
    clearPreviewMarkers();

    // Add pickup marker
    previewRideMarkers.current.pickup = new mapboxgl.Marker({ element: createPreviewMarker('pickup') })
      .setLngLat([ride.pickup_lng, ride.pickup_lat])
      .addTo(map.current);

    // Add dropoff marker
    previewRideMarkers.current.dropoff = new mapboxgl.Marker({ element: createPreviewMarker('dropoff') })
      .setLngLat([ride.dropoff_lng, ride.dropoff_lat])
      .addTo(map.current);

    // Calculate and draw preview route
    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${ride.pickup_lng},${ride.pickup_lat};${ride.dropoff_lng},${ride.dropoff_lat}?geometries=geojson&access_token=${mapboxgl.accessToken}`
      );
      const data = await response.json();

      if (data.routes && data.routes[0]) {
        const route = data.routes[0].geometry;

        // Add route source
        map.current.addSource('preview-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: route
          }
        });

        // Add glow effect
        map.current.addLayer({
          id: 'preview-route-glow',
          type: 'line',
          source: 'preview-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#f59e0b',
            'line-width': 8,
            'line-opacity': 0.3,
            'line-blur': 3
          }
        });

        // Add main route line
        map.current.addLayer({
          id: 'preview-route-line',
          type: 'line',
          source: 'preview-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#f59e0b',
            'line-width': 4,
            'line-opacity': 1
          }
        });

        // Fit map to show the entire route
        const coordinates = route.coordinates;
        const bounds = coordinates.reduce((bounds: mapboxgl.LngLatBounds, coord: [number, number]) => {
          return bounds.extend(coord as mapboxgl.LngLatLike);
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

        map.current.fitBounds(bounds, {
          padding: { top: 100, bottom: 250, left: 50, right: 50 }
        });
      }
    } catch (error) {
      console.error('Error calculating preview route:', error);
    }
  };

  const createActiveRideMarker = (type: 'pickup' | 'dropoff') => {
    const el = document.createElement('div');
    el.className = 'active-ride-marker';
    
    if (type === 'pickup') {
      el.innerHTML = `
        <div class="relative">
          <div class="absolute -inset-3 rounded-full bg-emerald-500/20 animate-ping"></div>
          <div class="absolute -inset-2 rounded-full bg-emerald-500/30 animate-pulse"></div>
          <div class="relative w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/50 flex items-center justify-center border-2 border-white">
            <div class="w-3 h-3 rounded-full bg-white"></div>
          </div>
          <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg">
            ${t.pickup}
          </div>
        </div>
      `;
    } else {
      el.innerHTML = `
        <div class="relative">
          <div class="absolute -inset-3 rounded-full bg-red-500/20 animate-ping"></div>
          <div class="absolute -inset-2 rounded-full bg-red-500/30 animate-pulse"></div>
          <div class="relative w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-lg shadow-red-500/50 flex items-center justify-center border-2 border-white">
            <div class="w-3 h-3 rounded-full bg-white"></div>
          </div>
          <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg">
            ${t.dropoff}
          </div>
        </div>
      `;
    }
    
    return el;
  };

  const showActiveRideRoute = async () => {
    if (!map.current || !activeRide) return;

    // Clear any pending ride markers when showing active ride
    rideMarkers.current.forEach(marker => marker.remove());
    rideMarkers.current = [];

    // Add pickup marker
    if (!activeRideMarkers.current.pickup) {
      activeRideMarkers.current.pickup = new mapboxgl.Marker({ element: createActiveRideMarker('pickup') })
        .setLngLat([activeRide.pickup_lng, activeRide.pickup_lat])
        .addTo(map.current);
    } else {
      activeRideMarkers.current.pickup.setLngLat([activeRide.pickup_lng, activeRide.pickup_lat]);
    }

    // Add dropoff marker
    if (!activeRideMarkers.current.dropoff) {
      activeRideMarkers.current.dropoff = new mapboxgl.Marker({ element: createActiveRideMarker('dropoff') })
        .setLngLat([activeRide.dropoff_lng, activeRide.dropoff_lat])
        .addTo(map.current);
    } else {
      activeRideMarkers.current.dropoff.setLngLat([activeRide.dropoff_lng, activeRide.dropoff_lat]);
    }

    // Calculate and draw route
    try {
      const startPoint = currentLocation 
        ? `${currentLocation.lng},${currentLocation.lat}`
        : `${activeRide.pickup_lng},${activeRide.pickup_lat}`;
      const waypoints = currentLocation 
        ? `${activeRide.pickup_lng},${activeRide.pickup_lat};${activeRide.dropoff_lng},${activeRide.dropoff_lat}`
        : `${activeRide.dropoff_lng},${activeRide.dropoff_lat}`;
      
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${startPoint};${waypoints}?geometries=geojson&access_token=${mapboxgl.accessToken}`
      );
      const data = await response.json();

      if (data.routes && data.routes[0]) {
        const route = data.routes[0].geometry;

        // Remove existing route layers
        if (map.current.getSource('active-route')) {
          map.current.removeLayer('active-route-glow');
          map.current.removeLayer('active-route-line');
          map.current.removeSource('active-route');
        }

        // Add route source
        map.current.addSource('active-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: route
          }
        });

        // Add glow effect
        map.current.addLayer({
          id: 'active-route-glow',
          type: 'line',
          source: 'active-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#10b981',
            'line-width': 10,
            'line-opacity': 0.3,
            'line-blur': 3
          }
        });

        // Add main route line
        map.current.addLayer({
          id: 'active-route-line',
          type: 'line',
          source: 'active-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#10b981',
            'line-width': 4,
            'line-opacity': 1
          }
        });

        // Fit map to show the entire route
        const coordinates = route.coordinates;
        const bounds = coordinates.reduce((bounds: mapboxgl.LngLatBounds, coord: [number, number]) => {
          return bounds.extend(coord as mapboxgl.LngLatLike);
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

        map.current.fitBounds(bounds, {
          padding: { top: 100, bottom: 200, left: 50, right: 50 }
        });
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  };

  const acceptRide = async (rideId: string) => {
    try {
      // Only accept if the ride is still pending AND (unassigned OR already assigned to me)
      const { data: updated, error: rideError } = await supabase
        .from('rides')
        .update({
          status: 'accepted',
          driver_id: driverId,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', rideId)
        .eq('status', 'pending')
        .or(`driver_id.is.null,driver_id.eq.${driverId}`)
        .select('id, status, driver_id');

      if (rideError) {
        console.error('Accept ride error:', rideError);
        toast.error(t.acceptError);
        return;
      }

      const updatedRows = Array.isArray(updated) ? updated : updated ? [updated] : [];
      if (updatedRows.length === 0) {
        toast.error(language === 'ar'
          ? 'هذه الرحلة لم تعد متاحة'
          : language === 'fr'
          ? 'Cette course n\'est plus disponible'
          : 'This ride is no longer available');
        return;
      }

      // Mark driver as busy (unavailable) so they don't appear on customer maps
      const { error: locationError } = await supabase
        .from('driver_locations')
        .update({ is_available: false })
        .eq('driver_id', driverId);

      if (locationError) {
        console.warn('Driver location busy update failed:', locationError);
      }

      // Set the accepted ride as active ride immediately
      const acceptedRide = pendingRides.find(r => r.id === rideId);
      if (acceptedRide) {
        setActiveRide({ ...acceptedRide, driver_id: driverId });
      }

      toast.success(t.acceptSuccess);
      setSelectedRide(null);
      setPendingRides([]);
    } catch (err) {
      console.error('Accept ride unexpected error:', err);
      toast.error(t.acceptError);
    }
  };

  return (
    <div className="relative w-full h-[600px] rounded-xl overflow-hidden">
      {loading && (
        <div className="absolute inset-0 bg-background flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">{t.loadingMap}</span>
          </div>
        </div>
      )}
      
      <div ref={mapContainer} className="w-full h-full" />
      
      {!isOnline && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
          <Card className="bg-background/95 backdrop-blur-sm border-none shadow-2xl">
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Navigation className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold mb-2">{t.youAreOffline}</p>
              <p className="text-sm text-muted-foreground">{t.goOnline}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedRide && (
        <Card className="absolute bottom-4 left-4 right-4 z-20 shadow-2xl bg-background/95 backdrop-blur-sm border-none">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg mb-1">{t.newRideRequest}</h3>
                {selectedRide.estimated_price && (
                  <Badge className="text-base bg-emerald-500 hover:bg-emerald-600">{selectedRide.estimated_price} TND</Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRide(null)}
                className="rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10">
                <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1.5 ring-4 ring-emerald-500/20" />
                <div>
                  <p className="text-xs font-medium text-emerald-600 uppercase">{t.pickup}</p>
                  <p className="text-sm text-foreground">{selectedRide.pickup_location}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10">
                <div className="w-3 h-3 rounded-full bg-red-500 mt-1.5 ring-4 ring-red-500/20" />
                <div>
                  <p className="text-xs font-medium text-red-600 uppercase">{t.dropoff}</p>
                  <p className="text-sm text-foreground">{selectedRide.dropoff_location}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => acceptRide(selectedRide.id)}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
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

      {isOnline && pendingRides.length > 0 && !selectedRide && !activeRide && (
        <div className="absolute top-4 left-4 z-10">
          <Badge className="text-base px-4 py-2 bg-emerald-500 hover:bg-emerald-600 shadow-lg">
            <span className="animate-pulse mr-2">●</span>
            {pendingRides.length} {t.ridesNearby}
          </Badge>
        </div>
      )}

      {/* Active Ride Card */}
      {isOnline && activeRide && !selectedRide && (
        <Card className="absolute bottom-4 left-4 right-4 z-20 shadow-2xl bg-background/95 backdrop-blur-sm border-emerald-500/50 border-2">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-bold text-lg text-emerald-600">{t.activeRide}</h3>
              {activeRide.estimated_price && (
                <Badge className="ml-auto bg-emerald-500">{activeRide.estimated_price} TND</Badge>
              )}
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-3 p-2 rounded-lg bg-emerald-500/10">
                <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1 ring-2 ring-emerald-500/20" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-emerald-600 uppercase">{t.pickup}</p>
                  <p className="text-sm text-foreground truncate">{activeRide.pickup_location}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-emerald-600 hover:bg-emerald-500/20"
                  asChild
                >
                  <a
                    href={buildGoogleMapsDirectionsUrl(activeRide.pickup_lat, activeRide.pickup_lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t.navigateToPickup}
                  >
                    <Navigation className="h-4 w-4" />
                  </a>
                </Button>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-lg bg-red-500/10">
                <div className="w-3 h-3 rounded-full bg-red-500 mt-1 ring-2 ring-red-500/20" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-red-600 uppercase">{t.dropoff}</p>
                  <p className="text-sm text-foreground truncate">{activeRide.dropoff_location}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-red-600 hover:bg-red-500/20"
                  asChild
                >
                  <a
                    href={buildGoogleMapsDirectionsUrl(activeRide.dropoff_lat, activeRide.dropoff_lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t.navigateToDropoff}
                  >
                    <Navigation className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}