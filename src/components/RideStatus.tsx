import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Ride, Language } from '@/lib/types';
import Map, { MapLocation } from './Map';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { toast } from 'sonner';
import RideChat from './RideChat';
import { RatingFeedbackDialog } from './RatingFeedbackDialog';
import { Phone, X, Car, User, MapPin, Star } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface RideStatusProps {
  rideId: string;
  onRideComplete: () => void;
}

const translations = {
  en: {
    rideStatus: 'Ride Status',
    callDriver: 'Call Driver',
    cancel: 'Cancel',
    cancelRide: 'Cancel Ride?',
    cancelDescription: 'Are you sure you want to cancel this ride? This action cannot be undone.',
    noKeepRide: 'No, keep ride',
    yesCancelRide: 'Yes, cancel ride',
    driverOnTheWay: 'Driver on the way!',
    comingToPickYou: 'is coming to pick you up.',
    vehicle: 'Vehicle',
    licensePlate: 'License Plate',
    unknown: 'Unknown',
    na: 'N/A',
    rateYourRide: 'Rate Your Ride',
    leaveComment: 'Leave a comment (optional)',
    submitRating: 'Submit Rating',
    bookAnotherRide: 'Book Another Ride',
    loading: 'Loading ride status...',
    error: 'Error',
    rideNotFound: 'Ride not found.',
    rideCanceled: 'Ride has been canceled.',
    failedToCancel: 'Failed to cancel ride.',
    driverPhoneNotAvailable: 'Driver phone number not available',
    selectRating: 'Please select a rating before submitting.',
    failedToSubmitRating: 'Failed to submit rating.',
    thankYouFeedback: 'Thank you for your feedback!',
    rideStatusUpdated: 'Ride Status Updated',
    yourRideIsNow: 'Your ride is now',
    rideAccepted: 'Ride Accepted!',
    driverAccepted: 'Your driver has accepted the ride and is on the way.',
    pending: 'PENDING',
    accepted: 'ACCEPTED',
    driver_en_route: 'DRIVER EN ROUTE',
    driver_arrived: 'DRIVER ARRIVED',
    in_progress: 'IN PROGRESS',
    completed: 'COMPLETED',
    cancelled: 'CANCELLED',
    waitingForDriver: 'Waiting for a driver to accept your ride...',
  },
  fr: {
    rideStatus: 'Statut de la course',
    callDriver: 'Appeler',
    cancel: 'Annuler',
    cancelRide: 'Annuler la course ?',
    cancelDescription: 'Êtes-vous sûr de vouloir annuler cette course ? Cette action est irréversible.',
    noKeepRide: 'Non, garder',
    yesCancelRide: 'Oui, annuler',
    driverOnTheWay: 'Chauffeur en route !',
    comingToPickYou: 'vient vous chercher.',
    vehicle: 'Véhicule',
    licensePlate: 'Plaque',
    unknown: 'Inconnu',
    na: 'N/A',
    rateYourRide: 'Évaluez votre course',
    leaveComment: 'Laissez un commentaire (optionnel)',
    submitRating: 'Envoyer',
    bookAnotherRide: 'Réserver une autre course',
    loading: 'Chargement...',
    error: 'Erreur',
    rideNotFound: 'Course non trouvée.',
    rideCanceled: 'Course annulée.',
    failedToCancel: 'Échec de l\'annulation.',
    driverPhoneNotAvailable: 'Numéro du chauffeur non disponible',
    selectRating: 'Veuillez sélectionner une note.',
    failedToSubmitRating: 'Échec de l\'envoi de la note.',
    thankYouFeedback: 'Merci pour votre retour !',
    rideStatusUpdated: 'Statut mis à jour',
    yourRideIsNow: 'Votre course est maintenant',
    rideAccepted: 'Course acceptée !',
    driverAccepted: 'Votre chauffeur a accepté la course et est en route.',
    pending: 'EN ATTENTE',
    accepted: 'ACCEPTÉE',
    driver_en_route: 'EN ROUTE',
    driver_arrived: 'ARRIVÉ',
    in_progress: 'EN COURS',
    completed: 'TERMINÉE',
    cancelled: 'ANNULÉE',
    waitingForDriver: 'En attente d\'un chauffeur...',
  },
  ar: {
    rideStatus: 'حالة الرحلة',
    callDriver: 'اتصل',
    cancel: 'إلغاء',
    cancelRide: 'إلغاء الرحلة؟',
    cancelDescription: 'هل أنت متأكد أنك تريد إلغاء هذه الرحلة؟ لا يمكن التراجع عن هذا الإجراء.',
    noKeepRide: 'لا، احتفظ',
    yesCancelRide: 'نعم، ألغِ',
    driverOnTheWay: 'السائق في الطريق!',
    comingToPickYou: 'قادم لاصطحابك.',
    vehicle: 'السيارة',
    licensePlate: 'اللوحة',
    unknown: 'غير معروف',
    na: 'غير متوفر',
    rateYourRide: 'قيّم رحلتك',
    leaveComment: 'اترك تعليقًا (اختياري)',
    submitRating: 'إرسال',
    bookAnotherRide: 'احجز رحلة أخرى',
    loading: 'جار التحميل...',
    error: 'خطأ',
    rideNotFound: 'الرحلة غير موجودة.',
    rideCanceled: 'تم إلغاء الرحلة.',
    failedToCancel: 'فشل في الإلغاء.',
    driverPhoneNotAvailable: 'رقم السائق غير متوفر',
    selectRating: 'يرجى اختيار تقييم.',
    failedToSubmitRating: 'فشل في إرسال التقييم.',
    thankYouFeedback: 'شكرًا على ملاحظاتك!',
    rideStatusUpdated: 'تحديث الحالة',
    yourRideIsNow: 'رحلتك الآن',
    rideAccepted: 'تم قبول الرحلة!',
    driverAccepted: 'قبل السائق رحلتك وهو في الطريق.',
    pending: 'قيد الانتظار',
    accepted: 'مقبولة',
    driver_en_route: 'في الطريق',
    driver_arrived: 'وصل',
    in_progress: 'جارية',
    completed: 'مكتملة',
    cancelled: 'ملغاة',
    waitingForDriver: 'في انتظار سائق...',
  }
};

export default function RideStatus({ rideId, onRideComplete }: RideStatusProps) {
  const { user, language } = useAuth();
  const t = translations[language];
  const [ride, setRide] = useState<Ride | null>(null);
  const [driverLocation, setDriverLocation] = useState<MapLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [driverRatingInfo, setDriverRatingInfo] = useState<{ average: number; count: number } | null>(null);
  const prevStatusRef = useRef<string | null>(null);
  const ratingShownRef = useRef(false);

  // Helper to show browser notification
  function showNotification(title: string, options?: NotificationOptions) {
    if (window.Notification && Notification.permission === 'granted') {
      new Notification(title, options);
    } else if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  const fetchRide = async () => {
    try {
      console.log('Fetching ride:', rideId);
      const { data, error } = await supabase
        .from('rides')
        .select(`*, driver:profiles!rides_driver_id_fkey ( full_name, phone )`)
        .eq('id', rideId)
        .single();

      if (error) throw error;

      // Attach vehicle info from driver_profiles (these live in a separate table)
      const rideData = data as any;
      if (rideData?.driver_id) {
        const { data: dp, error: dpErr } = await supabase
          .from('driver_profiles')
          .select('vehicle_model, vehicle_color, license_plate_number, vehicle_photo_url')
          .eq('driver_id', rideData.driver_id)
          .single();

        if (!dpErr && dp) {
          rideData.driver = {
            ...(rideData.driver || {}),
            vehicle_model: dp.vehicle_model,
            vehicle_color: dp.vehicle_color,
            license_plate_number: dp.license_plate_number,
            vehicle_photo_url: dp.vehicle_photo_url,
          };
        }

        // Fetch driver's average rating
        const { data: ratings } = await supabase
          .from('ride_ratings')
          .select('rating')
          .eq('driver_id', rideData.driver_id);

        if (ratings && ratings.length > 0) {
          const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
          setDriverRatingInfo({ average: avg, count: ratings.length });
        } else {
          setDriverRatingInfo({ average: 0, count: 0 });
        }
      }

      setRide(rideData as unknown as Ride);

      // Auto-show rating dialog when ride is completed (on initial load OR status change)
      if (rideData.status === 'completed' && !ratingShownRef.current) {
        ratingShownRef.current = true;
        // Small delay to ensure UI is ready
        setTimeout(() => {
          toast.success('🎉 Ride completed!', { duration: 3000 });
          setShowRatingDialog(true);
        }, 500);
      }

      // Check for status change and notify (only when status actually changes)
      if (rideData.status && prevStatusRef.current !== null && prevStatusRef.current !== rideData.status) {
        // Notify on status change
        const statusText = t[rideData.status as keyof typeof t] || rideData.status;
        showNotification(t.rideStatusUpdated, { body: `${t.yourRideIsNow} ${statusText}.` });
        
        // Special toast for when ride is accepted
        if (rideData.status === 'accepted' && prevStatusRef.current === 'pending') {
          toast.success(t.rideAccepted, {
            description: t.driverAccepted,
            duration: 5000,
          });
        }
        
        // Toast for driver en route
        if (rideData.status === 'driver_en_route') {
          toast.info('🚗 Driver is on the way to pick you up!', { duration: 4000 });
        }
        
        // Toast for driver arrived
        if (rideData.status === 'driver_arrived') {
          toast.success('📍 Your driver has arrived!', { duration: 5000 });
        }
        
        // Toast for ride started
        if (rideData.status === 'in_progress') {
          toast.info('🚀 Your ride has started!', { duration: 4000 });
        }
      }
      
      // Always update the previous status ref
      if (rideData.status) {
        prevStatusRef.current = rideData.status;
      }

    } catch (err: any) {
      console.error('Error fetching ride:', err);
      setError(err.message || 'Failed to fetch ride details');
    } finally {
      setLoading(false);
    }
  };

  // Fetch driver location
  const fetchDriverLocation = async (driverId: string) => {
    try {
      const { data, error } = await supabase
        .from('driver_locations')
        .select('latitude, longitude')
        .eq('driver_id', driverId)
        .single();

      if (!error && data) {
        setDriverLocation({ lat: data.latitude, lng: data.longitude });
      }
    } catch (err) {
      console.error('Error fetching driver location:', err);
    }
  };

  useEffect(() => {
    // Request notification permission
    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    fetchRide();

    // Subscribe to real-time ride updates
    console.log('Setting up ride subscription for:', rideId);
    const rideSubscription = supabase
      .channel(`ride-status-${rideId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` },
        (payload) => {
          console.log('Ride update received:', payload);
          fetchRide();
        }
      )
      .subscribe((status) => {
        console.log('Ride subscription status:', status);
      });

    return () => {
      supabase.removeChannel(rideSubscription);
    };
  }, [rideId]);

  // Subscribe to driver location updates when driver is assigned
  useEffect(() => {
    if (!ride?.driver_id) return;

    // Initial fetch
    fetchDriverLocation(ride.driver_id);

    // Subscribe to driver location updates
    console.log('Setting up driver location subscription for:', ride.driver_id);
    const locationSubscription = supabase
      .channel(`driver-location-${ride.driver_id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_locations', filter: `driver_id=eq.${ride.driver_id}` },
        (payload) => {
          console.log('Driver location update:', payload);
          if (payload.new && 'latitude' in payload.new && 'longitude' in payload.new) {
            setDriverLocation({
              lat: payload.new.latitude as number,
              lng: payload.new.longitude as number
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Driver location subscription status:', status);
      });

    return () => {
      supabase.removeChannel(locationSubscription);
    };
  }, [ride?.driver_id]);

  const handleCancelRide = async () => {
    setLoading(true);
    // Double-check ownership to avoid RLS rejects
    try {
      const { data: rideCheck, error: checkErr } = await supabase
        .from('rides')
        .select('customer_id, status')
        .eq('id', rideId)
        .single();

      if (checkErr) {
        console.error('Ride check error before cancel:', checkErr);
        toast.error(t.failedToCancel);
        setLoading(false);
        return;
      }

      if (!rideCheck) {
        toast.error(t.rideNotFound);
        setLoading(false);
        return;
      }

      if (rideCheck.customer_id !== user!.id) {
        toast.error(t.failedToCancel);
        setLoading(false);
        return;
      }

      const cancellableStatuses = ['pending', 'accepted', 'driver_en_route', 'driver_arrived'];
      if (!cancellableStatuses.includes(rideCheck.status)) {
        toast.error(t.failedToCancel);
        setLoading(false);
        return;
      }

    } catch (err) {
      console.error('Pre-cancel check failed:', err);
      toast.error(t.failedToCancel);
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('rides')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: 'customer'
      })
      .eq('id', rideId)
      .eq('customer_id', user!.id);
    
    if (error) {
      console.error('Cancel error:', error);
      toast.error(t.failedToCancel);
    } else {
      toast.success(t.rideCanceled);
      onRideComplete();
    }
    setLoading(false);
  };

  const handleCallDriver = () => {
    if (ride?.driver && 'phone' in ride.driver && ride.driver.phone) {
      window.location.href = `tel:${ride.driver.phone}`;
    } else {
      toast.error(t.driverPhoneNotAvailable);
    }
  };

  const getStatusDisplay = (status: string) => {
    const statusKey = status as keyof typeof t;
    return t[statusKey] || status.replace('_', ' ').toUpperCase();
  };

  if (loading) return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/30 border-t-primary mx-auto"></div>
        <p className="text-sm text-muted-foreground">{t.loading}</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="p-4">
      <Alert variant="destructive">
        <AlertTitle>{t.error}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    </div>
  );
  
  if (!ride) return <div className="p-4 text-center text-muted-foreground">{t.rideNotFound}</div>;

  const canCancel = ['pending', 'accepted', 'driver_en_route', 'driver_arrived'].includes(ride.status);
  const pickupLocation: MapLocation = { lat: ride.pickup_lat, lng: ride.pickup_lng };
  const dropoffLocation: MapLocation = { lat: ride.dropoff_lat, lng: ride.dropoff_lng };

  return (
    <div className={`space-y-4 p-4 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <span className="text-lg">{t.rideStatus}</span>
            <div className="flex flex-wrap gap-2 items-center">
              <Badge 
                variant={ride.status === 'completed' ? 'default' : ride.status === 'cancelled' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {getStatusDisplay(ride.status)}
              </Badge>
              {ride.driver && ride.status !== 'completed' && ride.status !== 'cancelled' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCallDriver}
                  className="gap-2"
                >
                  <Phone className="h-4 w-4" />
                  {t.callDriver}
                </Button>
              )}
              {canCancel && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-2">
                      <X className="h-4 w-4" />
                      {t.cancel}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t.cancelRide}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t.cancelDescription}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t.noKeepRide}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancelRide}>
                        {t.yesCancelRide}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Map with driver tracking */}
          <Map
            pickupLocation={pickupLocation}
            dropoffLocation={dropoffLocation}
            driverLocation={driverLocation}
            height="h-64 sm:h-80"
            showCurrentLocation={false}
            interactive={false}
          />
          
          {/* Waiting message when no driver yet */}
          {ride.status === 'pending' && !ride.driver && (
            <Alert>
              <MapPin className="h-4 w-4" />
              <AlertTitle>{t.waitingForDriver}</AlertTitle>
            </Alert>
          )}

          {/* Driver info when assigned AND ride has been accepted */}
          {ride.driver && ride.status !== 'pending' && (
            <Alert className="border-primary/20 bg-primary/5">
              <Car className="h-4 w-4 text-primary" />
              <AlertTitle className="text-primary">{t.driverOnTheWay}</AlertTitle>
              <AlertDescription className="space-y-3 mt-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{ride.driver.full_name}</span>
                  <span className="text-muted-foreground">{t.comingToPickYou}</span>
                </div>
                
                {/* Driver Rating */}
                {driverRatingInfo && driverRatingInfo.count > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{driverRatingInfo.average.toFixed(1)}</span>
                    <span className="text-muted-foreground">({driverRatingInfo.count} {driverRatingInfo.count === 1 ? 'review' : 'reviews'})</span>
                  </div>
                )}
                {driverRatingInfo && driverRatingInfo.count === 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star className="h-4 w-4" />
                    <span>New driver</span>
                  </div>
                )}

                {/* Car Photo */}
                {ride.driver?.vehicle_photo_url && (
                  <div className="rounded-lg overflow-hidden border border-border">
                    <img 
                      src={ride.driver.vehicle_photo_url} 
                      alt="Driver's vehicle"
                      className="w-full h-32 object-cover"
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t.vehicle}: </span>
                    <span className="font-medium">
                      {ride.driver?.vehicle_model ?? t.unknown} ({ride.driver?.vehicle_color ?? t.na})
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.licensePlate}: </span>
                    <span className="font-medium">{ride.driver?.license_plate_number ?? t.na}</span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Ride Chat only if driver is assigned */}
      {ride.driver_id && <RideChat rideId={rideId} userRole="customer" />}

      {ride.status === 'completed' && !showRatingDialog && (
        <Card>
          <CardHeader>
            <CardTitle>{t.rateYourRide}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowRatingDialog(true)} className="w-full">
              {t.rateYourRide}
            </Button>
          </CardContent>
        </Card>
      )}

      <RatingFeedbackDialog
        open={showRatingDialog}
        onOpenChange={setShowRatingDialog}
        rideId={rideId}
        language={language}
      />

      {(ride.status === 'completed' || ride.status === 'rated' || ride.status === 'cancelled') && (
        <Button onClick={onRideComplete} className="w-full">
          {t.bookAnotherRide}
        </Button>
      )}
    </div>
  );
}