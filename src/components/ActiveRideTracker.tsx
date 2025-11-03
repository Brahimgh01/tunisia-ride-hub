import { useEffect, useState, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
// Helper to show browser notification
function showNotification(title: string, options?: NotificationOptions) {
  if (window.Notification && Notification.permission === 'granted') {
    new Notification(title, options);
  }
}
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Phone, CheckCircle } from 'lucide-react';
import Map from './Map';
import { RatingFeedbackDialog } from './RatingFeedbackDialog';
import { SafetyShareButton } from './SafetyShareButton';
import { useToast } from '@/hooks/use-toast';

interface MapLocation {
  lat: number;
  lng: number;
}

interface Ride {
  id: string;
  pickup_location: string;
  dropoff_location: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  status: string;
  driver_id: string;
  estimated_price?: number;
  final_price?: number;
  ride_type?: string;
  driver_rating?: number;
}

interface DriverLocation {
  latitude: number;
  longitude: number;
  driver_id: string;
}

interface ActiveRideTrackerProps {
  language: string;
}

export function ActiveRideTracker({ language }: ActiveRideTrackerProps) {
  // Ask for notification permission on mount
  useEffect(() => {
    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [driverLocation, setDriverLocation] = useState<MapLocation | null>(null);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [completedRideId, setCompletedRideId] = useState<string | null>(null);

  const translations = {
    en: {
      activeRide: 'Active Ride',
      noActiveRide: 'No active ride',
      driverEnRoute: 'Driver En Route',
      driverArrived: 'Driver Arrived',
      inProgress: 'Ride In Progress',
      waitingConfirmation: 'Waiting for confirmation',
      confirmCompletion: 'Confirm Ride Completed',
      cancelRide: 'Cancel Ride',
      from: 'From',
      to: 'To',
      estimatedPrice: 'Estimated Price',
      rideTypes: {
        taxi: 'Taxi',
        premium: 'Premium',
        carpooling: 'Carpooling',
        motorcycle: 'Motorcycle',
      }
    },
    ar: {
      activeRide: 'رحلة نشطة',
      noActiveRide: 'لا توجد رحلة نشطة',
      driverEnRoute: 'السائق في الطريق',
      driverArrived: 'وصل السائق',
      inProgress: 'الرحلة جارية',
      waitingConfirmation: 'في انتظار التأكيد',
      confirmCompletion: 'تأكيد اكتمال الرحلة',
      cancelRide: 'إلغاء الرحلة',
      from: 'من',
      to: 'إلى',
      estimatedPrice: 'السعر المتوقع',
      rideTypes: {
        taxi: 'تاكسي',
        premium: 'بريميوم',
        carpooling: 'مشاركة',
        motorcycle: 'دراجة نارية',
      }
    },
    fr: {
      activeRide: 'Course active',
      noActiveRide: 'Aucune course active',
      driverEnRoute: 'Chauffeur en route',
      driverArrived: 'Chauffeur arrivé',
      inProgress: 'Course en cours',
      waitingConfirmation: 'En attente de confirmation',
      confirmCompletion: 'Confirmer la fin de la course',
      cancelRide: 'Annuler la course',
      from: 'De',
      to: 'À',
      estimatedPrice: 'Prix estimé',
      rideTypes: {
        taxi: 'Taxi',
        premium: 'Premium',
        carpooling: 'Covoiturage',
        motorcycle: 'Moto',
      }
    }
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  // Track previous ride status for notification
  const prevStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // Request notification permission
    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const fetchActiveRide = async () => {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('customer_id', user.id)
        .in('status', ['accepted', 'en_route', 'arrived', 'in_progress', 'completed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setActiveRide(data);
        // If ride is completed, show rating dialog
        if (data.status === 'completed' && !data.driver_rating) {
          setCompletedRideId(data.id);
          setShowRatingDialog(true);
        }
      }
    };

    fetchActiveRide();

    // Subscribe to ride updates
    const rideChannel = supabase
      .channel('active-ride-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `customer_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const ride = payload.new as Ride;
            if (['accepted', 'en_route', 'arrived', 'in_progress', 'completed'].includes(ride.status)) {
              setActiveRide((prev) => {
                // Show user-friendly notification if status changed
                if (prev && prev.status !== ride.status) {
                  const statusMessages: Record<string, string> = {
                    'accepted': '✅ Driver accepted your ride!',
                    'driver_en_route': '🚗 Driver is on the way to pick you up!',
                    'driver_arrived': '📍 Driver has arrived at pickup location!',
                    'in_progress': '🛣️ Ride started! Enjoy your trip!',
                    'completed': '🎉 Ride completed! Please rate your driver.'
                  };
                  const message = statusMessages[ride.status] || `Status: ${ride.status}`;
                  showNotification('Ride Update', { 
                    body: message,
                    icon: '/favicon.ico'
                  });
                  toast({
                    description: message,
                  });
                }
                return ride;
              });
              // Show rating dialog when ride is completed
              if (ride.status === 'completed' && !ride.driver_rating) {
                setCompletedRideId(ride.id);
                setShowRatingDialog(true);
              }
            } else {
              setActiveRide(null);
            }
          }
        }
      )
      .subscribe();

    // Subscribe to chat messages for this ride
    let chatChannel: RealtimeChannel | null = null;
    if (activeRide?.id) {
      chatChannel = supabase
        .channel('ride-chat-' + activeRide.id)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'ride_chat_messages', filter: `ride_id=eq.${activeRide.id}` },
          (payload) => {
            const msg = payload.new;
            if (msg && msg.sender_id !== user.id) {
              showNotification('New chat message', { body: msg.message });
            }
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(rideChannel);
      if (chatChannel) supabase.removeChannel(chatChannel);
    };
  }, [user, activeRide?.id]);

  // Subscribe to driver location updates
  useEffect(() => {
    if (!activeRide?.driver_id) return;

    const fetchDriverLocation = async () => {
      const { data } = await supabase
        .from('driver_locations')
        .select('*')
        .eq('driver_id', activeRide.driver_id)
        .single();

      if (data) {
        setDriverLocation({ lat: data.latitude, lng: data.longitude });
      }
    };

    fetchDriverLocation();

    // Subscribe to real-time driver location updates
    const locationChannel = supabase
      .channel('driver-location-tracking')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'driver_locations',
          filter: `driver_id=eq.${activeRide.driver_id}`
        },
        (payload) => {
          const location = payload.new as DriverLocation;
          setDriverLocation({ lat: location.latitude, lng: location.longitude });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(locationChannel);
    };
  }, [activeRide?.driver_id]);

  const handleConfirmCompletion = async () => {
    if (!activeRide) return;

    const { error } = await supabase
      .from('rides')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', activeRide.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to confirm ride completion',
        variant: 'destructive',
      });
    } else {
      setCompletedRideId(activeRide.id);
      setShowRatingDialog(true);
    }
  };

  const handleCancelRide = async () => {
    if (!activeRide || activeRide.status !== 'pending') return;

    // Verify ownership and status before attempting update to avoid RLS errors
    let rideCheck: any = null;
    try {
      const { data, error: checkErr } = await supabase
        .from('rides')
        .select('customer_id, status')
        .eq('id', activeRide.id)
        .single();

      rideCheck = data;

      if (checkErr) {
        console.error('Ride check error before cancel:', checkErr);
        toast({ title: 'Error', description: 'Unable to verify ride before canceling', variant: 'destructive' });
        return;
      }

      if (!rideCheck) {
        toast({ title: 'Error', description: 'Ride not found', variant: 'destructive' });
        return;
      }

      if (rideCheck.customer_id !== user!.id) {
        toast({ title: 'Error', description: 'You are not authorized to cancel this ride', variant: 'destructive' });
        return;
      }

      if (rideCheck.status !== 'pending') {
        toast({ title: 'Error', description: 'Only pending rides can be canceled', variant: 'destructive' });
        return;
      }
    } catch (err) {
      console.error('Pre-cancel check failed:', err);
      toast({ title: 'Error', description: 'Pre-cancel verification failed', variant: 'destructive' });
      return;
    }

    // Attempt update and capture richer diagnostics on failure to diagnose RLS
    try {
      const authInfo = await supabase.auth.getUser();
      const updatePayload = {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: 'customer',
        cancellation_reason: 'Customer cancelled',
      };

      console.debug('Attempting ride cancel', {
        userFromHook: user,
        authInfo,
        rideId: activeRide.id,
        preCheck: { rideCheck },
        updatePayload,
      });

      const { data: updatedData, error: updateError } = await supabase
        .from('rides')
        .update(updatePayload)
        .eq('id', activeRide.id)
        .eq('status', 'pending')
        .select();

      if (updateError) {
        // Log the full error object and any data returned for debugging RLS
        console.error('Cancel error (full):', {
          updateError,
          updatedData,
        });
        const description = updateError.message || 'Failed to cancel ride';
        toast({
          title: 'Error',
          description: `${description}${updateError.details ? ` - ${updateError.details}` : ''}`,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Ride canceled successfully',
      });
      setActiveRide(null);
    } catch (err) {
      console.error('Unexpected error when cancelling ride:', err);
      toast({ title: 'Error', description: 'Unexpected error while cancelling ride', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      accepted: { label: t.driverEnRoute, variant: 'default' as const },
      en_route: { label: t.driverEnRoute, variant: 'default' as const },
      arrived: { label: t.driverArrived, variant: 'secondary' as const },
      in_progress: { label: t.inProgress, variant: 'default' as const },
      completed: { label: t.waitingConfirmation, variant: 'secondary' as const },
    };
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: 'default' as const };
  };

  if (!activeRide) {
    return null;
  }

  const statusInfo = getStatusBadge(activeRide.status);

  return (
    <>
      <Card className="shadow-tunisian border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" />
              {t.activeRide}
            </CardTitle>
            <div className="flex items-center gap-2">
              <SafetyShareButton rideId={activeRide.id} language={language} />
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-green-500 mt-1" />
              <div>
                <p className="text-sm font-semibold">{t.from}</p>
                <p className="text-sm text-muted-foreground">{activeRide.pickup_location}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-red-500 mt-1" />
              <div>
                <p className="text-sm font-semibold">{t.to}</p>
                <p className="text-sm text-muted-foreground">{activeRide.dropoff_location}</p>
              </div>
            </div>
          </div>

          {activeRide.ride_type && (
            <div className="text-sm">
              <span className="font-semibold">Type: </span>
              {t.rideTypes[activeRide.ride_type as keyof typeof t.rideTypes]}
            </div>
          )}

          {(activeRide.estimated_price || activeRide.final_price) && (
            <div className="text-lg font-bold text-primary">
              {t.estimatedPrice}: {activeRide.final_price || activeRide.estimated_price} TND
            </div>
          )}

          {/* Live Map with Driver Location */}
          <div className="rounded-lg overflow-hidden">
            <Map
              pickupLocation={{ lat: activeRide.pickup_lat, lng: activeRide.pickup_lng }}
              dropoffLocation={{ lat: activeRide.dropoff_lat, lng: activeRide.dropoff_lng }}
              driverLocation={driverLocation}
              height="h-80"
            />
          </div>

          {activeRide.status === 'completed' && (
            <Button onClick={handleConfirmCompletion} className="w-full" size="lg">
              <CheckCircle className="h-4 w-4 mr-2" />
              {t.confirmCompletion}
            </Button>
          )}

          {activeRide.status === 'pending' && (
            <Button onClick={handleCancelRide} variant="destructive" className="w-full" size="lg">
              {t.cancelRide}
            </Button>
          )}
        </CardContent>
      </Card>

      {completedRideId && (
        <RatingFeedbackDialog
          open={showRatingDialog}
          onOpenChange={setShowRatingDialog}
          rideId={completedRideId}
          language={language}
        />
      )}
    </>
  );
}
