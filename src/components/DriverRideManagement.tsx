import { useEffect, useState, useRef } from 'react';
import { Rating } from './Rating';

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
import { toast } from 'sonner';
import { MapPin, CheckCircle, Navigation, Car, Calendar, CreditCard, Star, XCircle } from 'lucide-react';
import RideChat from './RideChat';
import { Ride, RideRating } from '@/lib/types';

interface DriverRating {
  average: number;
  count: number;
}

interface DriverRideManagementProps {
  language: string;
  isOnline: boolean;
}

const translations = {
  en: {
    pending: 'Pending Requests',
    active: 'Active Ride',
    noRides: 'No pending rides',
    accept: 'Accept',
    reject: 'Reject',
    enRoute: 'En Route',
    arrived: 'Arrived',
    startRide: 'Start Ride',
    complete: 'Complete Ride',
    cancelRide: 'Cancel Ride',
    cancelSuccess: 'Ride released, searching for another driver',
    cancelError: 'Failed to cancel ride',
    from: 'From',
    to: 'To',
    rideType: 'Type',
    paymentMethod: 'Payment',
    scheduled: 'Scheduled',
    notes: 'Notes',
    rideHistory: 'Ride History',
    yourRating: 'Your Rating',
    noCompletedRides: 'No completed rides yet.',
    rideTypes: {
      taxi: 'Taxi',
      premium: 'Premium',
      carpooling: 'Carpooling',
      motorcycle: 'Motorcycle',
    },
    paymentMethods: {
      cash: 'Cash',
      konnect: 'Konnect',
      edinar: 'E-Dinar',
      card: 'Card',
    },
    offlineTitle: 'You are offline',
    offlineSubtitle: 'Go online to see ride requests',
    goOnlineToAccept: 'Go online to accept rides',
  },
  ar: {
    pending: 'الطلبات المعلقة',
    active: 'الرحلة النشطة',
    noRides: 'لا توجد رحلات معلقة',
    accept: 'قبول',
    reject: 'رفض',
    enRoute: 'في الطريق',
    arrived: 'وصلت',
    startRide: 'بدء الرحلة',
    complete: 'إنهاء الرحلة',
    cancelRide: 'إلغاء الرحلة',
    cancelSuccess: 'تم تحرير الرحلة، جاري البحث عن سائق آخر',
    cancelError: 'فشل إلغاء الرحلة',
    from: 'من',
    to: 'إلى',
    rideType: 'النوع',
    paymentMethod: 'الدفع',
    scheduled: 'مجدولة',
    notes: 'ملاحظات',
    rideHistory: 'سجل الرحلات',
    yourRating: 'تقييمك',
    noCompletedRides: 'لا توجد رحلات مكتملة بعد.',
    rideTypes: {
      taxi: 'تاكسي',
      premium: 'بريميوم',
      carpooling: 'مشاركة',
      motorcycle: 'دراجة نارية',
    },
    paymentMethods: {
      cash: 'نقداً',
      konnect: 'كونكت',
      edinar: 'إي-دينار',
      card: 'بطاقة',
    },
    offlineTitle: 'أنت غير متصل',
    offlineSubtitle: 'اتصل لرؤية طلبات الرحلات',
    goOnlineToAccept: 'اتصل لقبول الرحلات',
  },
  fr: {
    pending: 'Demandes en attente',
    active: 'Course active',
    noRides: 'Aucune course en attente',
    accept: 'Accepter',
    reject: 'Refuser',
    enRoute: 'En route',
    arrived: 'Arrivé',
    startRide: 'Démarrer',
    complete: 'Terminer',
    cancelRide: 'Annuler la course',
    cancelSuccess: 'Course libérée, recherche d\'un autre chauffeur',
    cancelError: 'Échec de l\'annulation',
    from: 'De',
    to: 'À',
    rideType: 'Type',
    paymentMethod: 'Paiement',
    scheduled: 'Prévu',
    notes: 'Notes',
    rideHistory: 'Historique des courses',
    yourRating: 'Votre évaluation',
    noCompletedRides: 'Aucune course terminée pour le moment.',
    rideTypes: {
      taxi: 'Taxi',
      premium: 'Premium',
      carpooling: 'Covoiturage',
      motorcycle: 'Moto',
    },
    paymentMethods: {
      cash: 'Espèces',
      konnect: 'Konnect',
      edinar: 'E-Dinar',
      card: 'Carte',
    },
    offlineTitle: 'Vous êtes hors ligne',
    offlineSubtitle: 'Passez en ligne pour voir les demandes',
    goOnlineToAccept: 'Passez en ligne pour accepter',
  }
};

const DriverRideManagement = ({ language, isOnline }: DriverRideManagementProps) => {
  // Ask for notification permission on mount
  useEffect(() => {
    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
  const { user } = useAuth();
  const [pendingRides, setPendingRides] = useState<Ride[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [completedRides, setCompletedRides] = useState<Ride[]>([]);
  const [driverRating, setDriverRating] = useState<DriverRating | null>(null);
  const [loading, setLoading] = useState(true);
  const t = translations[language as keyof typeof translations] || translations.en;
  const lang = language as keyof typeof translations;


  // Accept a pending ride
  const acceptRide = async (rideId: string) => {
    if (!user) return;
    if (!isOnline) {
      toast.error(t.goOnlineToAccept);
      return;
    }

    const { data: updated, error } = await supabase
      .from('rides')
      .update({
        status: 'accepted',
        driver_id: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', rideId)
      .eq('status', 'pending')
      .select('id, status, driver_id');

    if (error) {
      console.error('Failed to accept ride:', error);
      toast.error(error.message || 'Failed to accept ride');
      // Force a refresh so the list stays in sync with the map
      fetchRides();
      return;
    }

    const updatedRows = Array.isArray(updated) ? updated : updated ? [updated] : [];
    if (updatedRows.length === 0) {
      toast.error('This ride is no longer available');
      fetchRides();
      return;
    }

    // Mark driver as busy (unavailable) so they don't appear in availability pools
    const { error: locationError } = await supabase
      .from('driver_locations')
      .update({ is_available: false })
      .eq('driver_id', user.id);

    if (locationError) {
      console.warn('Driver location busy update failed:', locationError);
    }

    toast.success('Ride accepted');
    fetchRides();
  };

  // Update ride status for active ride
  const updateRideStatus = async (status: string) => {
    if (!user || !activeRide) return;
    
    // Build update data - set final_price when completing ride
    const updateData: any = { status };
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
      updateData.final_price = activeRide.estimated_price || 0;
    }
    
    const { error } = await supabase
      .from('rides')
      .update(updateData)
      .eq('id', activeRide.id);
    if (error) {
      toast.error('Failed to update ride status');
    } else {
      toast.success('Status updated');
      fetchRides();
    }
  };

  // Cancel ride - returns it to pending status for another driver
  const cancelRide = async () => {
    if (!user || !activeRide) return;
    
    const customerId = activeRide.customer_id;
    const rideId = activeRide.id;
    
    const { error } = await supabase
      .from('rides')
      .update({
        status: 'pending',
        driver_id: null,
        accepted_at: null,
      })
      .eq('id', rideId)
      .eq('driver_id', user.id);
    
    if (error) {
      console.error('Failed to cancel ride:', error);
      toast.error(t.cancelError);
      return;
    }

    // Mark driver as available again
    await supabase
      .from('driver_locations')
      .update({ is_available: true })
      .eq('driver_id', user.id);

    // Customer notification is handled by the DB trigger (notify_ride_status_change)

    toast.success(t.cancelSuccess);
    setActiveRide(null);
    fetchRides();
  };

  const fetchDriverRating = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('ride_ratings')
      .select('rating')
      .eq('driver_id', user.id);

    if (error) {
      console.error('Error fetching driver rating:', error);
      return;
    }

    if (data && data.length > 0) {
      const totalRating = data.reduce((acc, rating) => acc + rating.rating, 0);
      const average = totalRating / data.length;
      setDriverRating({ average, count: data.length });
    }
  };

  const fetchCompletedRides = async () => {
    if (!user) return;
    const { data, error } = await supabase
        .from('rides')
        .select(`
            *,
            ride_ratings ( rating, comment )
        `)
        .eq('status', 'completed')
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false });

    if (!error) {
        setCompletedRides(data as unknown as Ride[] || []);
    }
  }

  // Fetch rides (pending and active)
  const fetchRides = async () => {
    if (!user) return;
    setLoading(true);

    // Active ride (accepted or in progress for this driver)
    const { data: active, error: activeError } = await supabase
      .from('rides')
      .select('*')
      .in('status', ['accepted', 'driver_en_route', 'driver_arrived', 'in_progress'])
      .eq('driver_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const nextActiveRide = !activeError && active && active.length > 0 ? (active[0] as unknown as Ride) : null;
    setActiveRide(nextActiveRide);

    // Keep the list + map behavior consistent:
    // - If driver has an active ride, hide pending pool
    // - If driver is offline, hide pending pool
    if (nextActiveRide || !isOnline) {
      setPendingRides([]);
    } else {
      // Pending rides assigned to this driver OR unassigned rides
      const { data: pending, error: pendingError } = await supabase
        .from('rides')
        .select('*')
        .eq('status', 'pending')
        .or(`driver_id.eq.${user.id},driver_id.is.null`)
        .order('created_at', { ascending: true })
        .limit(10);

      if (!pendingError) {
        // Prioritize rides assigned to this driver
        const assignedToMe = (pending as unknown as Ride[] | null || []).filter((r) => r.driver_id === user.id);
        const unassigned = (pending as unknown as Ride[] | null || []).filter((r) => !r.driver_id);
        setPendingRides([...assignedToMe, ...unassigned]);
      }
    }

    fetchCompletedRides();
    fetchDriverRating();
    setLoading(false);
  };

  // Track previous ride status for notification
  const prevStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // Request notification permission
    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    fetchRides();

    // --- Realtime: driver-specific updates (always on) ---
    const driverChannel = supabase
      .channel(`driver-ride-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `driver_id=eq.${user.id}`,
        },
        (payload) => {
          const ride = payload.new as Ride;

          // Only show assignment notification if it was newly assigned to me
          const oldDriverId = (payload.old as any)?.driver_id as string | undefined;
          if (payload.eventType === 'UPDATE' && ride.driver_id === user.id && oldDriverId !== user.id) {
            showNotification('🎯 Ride Assigned to You!', {
              body: `New ride from ${ride.pickup_location}`,
              icon: '/favicon.ico',
              requireInteraction: true,
            });
            toast.success('New ride assigned to you!', {
              description: 'Check your pending requests',
              duration: 5000,
            });
          }

          if (ride?.status && prevStatusRef.current !== ride.status) {
            showNotification('Ride Status Updated', {
              body: `Status: ${ride.status}`,
              icon: '/favicon.ico',
            });
            prevStatusRef.current = ride.status;
          }

          fetchRides();
        }
      )
      .subscribe();

    // --- Realtime: pending pool (only when online) ---
    const pendingChannel = isOnline
      ? supabase
          .channel(`pending-rides-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'rides',
              filter: 'status=eq.pending',
            },
            (payload) => {
              const ride = payload.new as Ride;
              showNotification('🚗 New Ride Request Available!', {
                body: `From: ${ride.pickup_location}`,
                icon: '/favicon.ico',
                requireInteraction: true,
              });
              toast.info('New ride request in your area!');
              fetchRides();
            }
          )
          // Important: this keeps the list in sync when a ride becomes pending again (e.g. driver cancels)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'rides',
              filter: 'status=eq.pending',
            },
            () => {
              fetchRides();
            }
          )
          .subscribe()
      : null;

    // Subscribe to chat messages for active ride
    let chatChannel: any = null;
    if (activeRide?.id) {
      chatChannel = supabase
        .channel('ride-chat-' + activeRide.id)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'ride_chat_messages', filter: `ride_id=eq.${activeRide.id}` },
          (payload) => {
            const msg = payload.new as any;
            if (msg && msg.sender_id !== user.id) {
              showNotification('New chat message', { body: msg.message });
            }
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(driverChannel);
      if (pendingChannel) supabase.removeChannel(pendingChannel);
      if (chatChannel) supabase.removeChannel(chatChannel);
    };
  }, [user, isOnline, activeRide?.id]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {driverRating && (
        <Card>
          <CardHeader>
            <CardTitle>{t.yourRating}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="h-6 w-6 text-yellow-400" fill="currentColor" />
              <span className="text-2xl font-bold">{driverRating.average.toFixed(1)}</span>
              <span className="text-muted-foreground">({driverRating.count} ratings)</span>
            </div>
          </CardContent>
        </Card>
      )}

      {activeRide && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              {t.active}
              <Badge>{activeRide.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-500" />
                <span>{t.from}: {activeRide.pickup_location}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-500" />
                <span>{t.to}: {activeRide.dropoff_location}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                {activeRide.ride_type && (
                  <div className="flex items-center gap-1">
                    <Car className="h-4 w-4" />
                    <span>{t.rideTypes[activeRide.ride_type as keyof typeof t.rideTypes]}</span>
                  </div>
                )}
                {activeRide.payment_method && (
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    <span>{t.paymentMethods[activeRide.payment_method as keyof typeof t.paymentMethods]}</span>
                  </div>
                )}
              </div>
              {activeRide.is_scheduled && activeRide.scheduled_time && (
                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                  <Calendar className="h-4 w-4" />
                  <span>{t.scheduled}: {new Date(activeRide.scheduled_time).toLocaleString()}</span>
                </div>
              )}
              {activeRide.customer_notes && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <strong>{t.notes}:</strong> {activeRide.customer_notes}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {activeRide.status === 'accepted' && (
                <Button onClick={() => updateRideStatus('driver_en_route')} className="flex-1">
                  <Navigation className="h-4 w-4 mr-2" />
                  {t.enRoute}
                </Button>
              )}
              {activeRide.status === 'driver_en_route' && (
                <Button onClick={() => updateRideStatus('driver_arrived')} className="flex-1">
                  {t.arrived}
                </Button>
              )}
              {activeRide.status === 'driver_arrived' && (
                <Button onClick={() => updateRideStatus('in_progress')} className="flex-1">
                  {t.startRide}
                </Button>
              )}
              {activeRide.status === 'in_progress' && (
                <Button onClick={() => updateRideStatus('completed')} className="flex-1">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t.complete}
                </Button>
              )}
              {/* Cancel button - available before ride starts */}
              {['accepted', 'driver_en_route', 'driver_arrived'].includes(activeRide.status) && (
                <Button onClick={cancelRide} variant="destructive">
                  <XCircle className="h-4 w-4 mr-2" />
                  {t.cancelRide}
                </Button>
              )}
            </div>
            {/* Modern Chat UI */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Chat with Customer</h3>
              <RideChat rideId={activeRide.id} userRole="driver" />
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-4">{t.pending}</h2>

        {!isOnline && !activeRide ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="font-medium">{t.offlineTitle}</p>
              <p className="text-sm text-muted-foreground mt-1">{t.offlineSubtitle}</p>
            </CardContent>
          </Card>
        ) : pendingRides.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              {t.noRides}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingRides.map((ride) => (
              <Card key={ride.id} className={ride.driver_id === user.id ? 'border-primary border-2' : ''}>
                <CardContent className="pt-6 space-y-4">
                  {ride.driver_id === user.id && (
                    <Badge className="mb-2">🎯 Assigned to You</Badge>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-500" />
                      <span>{t.from}: {ride.pickup_location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-red-500" />
                      <span>{t.to}: {ride.dropoff_location}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                      {ride.ride_type && (
                        <div className="flex items-center gap-1">
                          <Car className="h-4 w-4" />
                          <span>{t.rideTypes[ride.ride_type as keyof typeof t.rideTypes]}</span>
                        </div>
                      )}
                      {ride.payment_method && (
                        <div className="flex items-center gap-1">
                          <CreditCard className="h-4 w-4" />
                          <span>{t.paymentMethods[ride.payment_method as keyof typeof t.paymentMethods]}</span>
                        </div>
                      )}
                      {ride.distance_km && (
                        <div className="flex items-center gap-1">
                          <Navigation className="h-4 w-4" />
                          <span>{ride.distance_km.toFixed(1)} km</span>
                        </div>
                      )}
                      {ride.estimated_price && (
                        <div className="flex items-center gap-1 font-semibold text-primary">
                          💰 {ride.estimated_price} TND
                        </div>
                      )}
                    </div>
                    {ride.is_scheduled && ride.scheduled_time && (
                      <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                        <Calendar className="h-4 w-4" />
                        <span>{t.scheduled}: {new Date(ride.scheduled_time).toLocaleString()}</span>
                      </div>
                    )}
                    {ride.customer_notes && (
                      <div className="p-3 bg-muted rounded-lg text-sm">
                        <strong>{t.notes}:</strong> {ride.customer_notes}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => acceptRide(ride.id)} 
                      className="flex-1"
                      variant={ride.driver_id === user.id ? 'default' : 'outline'}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t.accept}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">{t.rideHistory}</h2>
        {completedRides.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              {t.noCompletedRides}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {completedRides.map((ride) => (
              <Card key={ride.id}>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-500" />
                      <span>{t.from}: {ride.pickup_location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-red-500" />
                      <span>{t.to}: {ride.dropoff_location}</span>
                    </div>
                  </div>
                  {ride.ride_ratings && ride.ride_ratings.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Rating value={ride.ride_ratings[0].rating} isReadOnly={true} onChange={() => {}} />
                        <p>{ride.ride_ratings[0].comment}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverRideManagement;
