import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import DriverRideManagement from './DriverRideManagement';
import DriverRegistration from './DriverRegistration';
import DriverMapView from './DriverMapView';
import { NotificationBell } from './NotificationBell';
import { Profile } from '@/lib/types';
import { Navigation2, DollarSign, Star, Clock, CheckCircle, Activity } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface Location {
  lat: number;
  lng: number;
}

interface DriverStats {
  totalRides: number;
  todayRides: number;
  totalEarnings: number;
  avgRating: number;
}

export default function DriverDashboard() {
  const { user, profile: initialProfile, language } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [availabilityUpdating, setAvailabilityUpdating] = useState(false);
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DriverStats>({
    totalRides: 0,
    todayRides: 0,
    totalEarnings: 0,
    avgRating: 0
  });

  // Translations
  const t = {
    ar: {
      title: 'لوحة تحكم السائق',
      availability: 'أنا متاح للعمل',
      notRegistered: 'أنت غير مسجل كسائق بعد.',
      registrationPending: 'تسجيلك قيد المراجعة.',
      register: 'التسجيل الآن',
      updateLocation: 'تحديث الموقع',
      locationUpdated: 'تم تحديث الموقع',
      locationError: 'خطأ في تحديث الموقع',
      dashboard: 'لوحة التحكم',
      totalRides: 'إجمالي الرحلات',
      todayRides: 'رحلات اليوم',
      earnings: 'الأرباح',
      rating: 'التقييم',
      online: 'متصل',
      offline: 'غير متصل',
      nearbyRequests: 'الطلبات القريبة',
      verified: 'موثق',
      allTime: 'كل الوقت',
      today: 'اليوم'
    },
    en: {
      title: 'Driver Dashboard',
      availability: 'I am available',
      notRegistered: 'You are not registered as a driver yet.',
      registrationPending: 'Your registration is pending review.',
      register: 'Register Now',
      updateLocation: 'Update Location',
      locationUpdated: 'Location Updated',
      locationError: 'Error updating location',
      dashboard: 'Dashboard',
      totalRides: 'Total Rides',
      todayRides: 'Today\'s Rides',
      earnings: 'Earnings',
      rating: 'Rating',
      online: 'Online',
      offline: 'Offline',
      nearbyRequests: 'Nearby Requests',
      verified: 'Verified',
      allTime: 'All time',
      today: 'Today'
    },
    fr: {
      title: 'Tableau de bord Chauffeur',
      availability: 'Je suis disponible',
      notRegistered: 'Vous n\'êtes pas encore enregistré en tant que chauffeur.',
      registrationPending: 'Votre inscription est en attente de validation.',
      register: 'S\'inscrire maintenant',
      updateLocation: 'Mettre à jour la position',
      locationUpdated: 'Position mise à jour',
      locationError: 'Erreur de mise à jour de la position',
      dashboard: 'Tableau de bord',
      totalRides: 'Total de courses',
      todayRides: 'Courses d\'aujourd\'hui',
      earnings: 'Revenus',
      rating: 'Note',
      online: 'En ligne',
      offline: 'Hors ligne',
      nearbyRequests: 'Demandes à proximité',
      verified: 'Vérifié',
      allTime: 'Total',
      today: 'Aujourd\'hui'
    }
  }[language];

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        setLoading(true);
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (profileError) throw profileError;
          
          if (profileData) {
            setProfile(profileData as Profile);
            
            const { data: driverData, error: driverError } = await supabase
              .from('driver_profiles')
              .select('*')
              .eq('driver_id', user.id)
              .single();

            if (driverError && driverError.code !== 'PGRST116') {
              console.error('Error fetching driver profile:', driverError);
            }

            // Only consider registered if all required fields are present
            const requiredFields = [
              'vehicle_model',
              'vehicle_color',
              'license_plate_number',
              'id_document_front_url',
              'id_document_back_url',
              'license_document_url',
              'vehicle_registration_document_url'
            ];
            const hasAllFields = driverData && requiredFields.every(f => driverData[f]);

            if (hasAllFields) {
              setIsRegistered(true);
              setIsVerified(driverData.is_verified || false);
              // If not verified, force offline
              setIsAvailable(driverData.is_verified ? (driverData.is_available || false) : false);
              await fetchDriverStats();
            } else {
              setIsRegistered(false);
            }
          }
        } catch (err: any) {
          setError(err.message || 'Failed to fetch driver profile');
        } finally {
          setLoading(false);
        }
      };

      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchDriverStats = async () => {
    if (!user) return;
    
    try {
      // Get total rides and earnings
      const { data: completedRides } = await supabase
        .from('rides')
        .select('final_price')
        .eq('driver_id', user.id)
        .eq('status', 'completed');
      
      const totalRides = completedRides?.length || 0;
      const totalEarnings = completedRides?.reduce((sum, ride) => sum + (Number(ride.final_price) || 0), 0) || 0;
      
      // Get today's rides
      const today = new Date().toISOString().split('T')[0];
      const { data: todayRidesData } = await supabase
        .from('rides')
        .select('id')
        .eq('driver_id', user.id)
        .gte('created_at', today)
        .eq('status', 'completed');
      
      const todayRides = todayRidesData?.length || 0;
      
      // Get average rating
      const { data: ratings } = await supabase
        .from('ride_ratings')
        .select('rating')
        .eq('driver_id', user.id);
      
      const avgRating = ratings && ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;
      
      setStats({
        totalRides,
        todayRides,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        avgRating: Math.round(avgRating * 10) / 10
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Get driver's current location
  useEffect(() => {
    if (isAvailable && isVerified) {
      if (navigator.geolocation) {
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setLocation({ lat: latitude, lng: longitude });
            
            // Auto-update location in database every 30 seconds
            updateLocationInDb(latitude, longitude);
          },
          (err) => {
            console.error("Error getting location:", err);
            toast.error('Could not get your location');
          },
          {
            enableHighAccuracy: true,
            maximumAge: 30000,
            timeout: 27000
          }
        );

        return () => navigator.geolocation.clearWatch(watchId);
      }
    }
  }, [isAvailable, isVerified]);

  const handleAvailabilityChange = async (available: boolean) => {
    if (!user || !profile) return;
    if (availabilityUpdating) return;

    const prev = isAvailable;
    setAvailabilityUpdating(true);

    console.log('🔄 Changing availability:', { userId: user.id, available });

    try {
      // If going offline, release any active ride back to pending FIRST (so list + map stay consistent)
      if (!available) {
        const { data: activeRides, error: fetchError } = await supabase
          .from('rides')
          .select('id')
          .eq('driver_id', user.id)
          .in('status', ['accepted', 'driver_en_route', 'driver_arrived', 'in_progress']);

        if (!fetchError && activeRides && activeRides.length > 0) {
          const { error: releaseError } = await supabase
            .from('rides')
            .update({
              status: 'pending',
              driver_id: null,
              accepted_at: null,
            })
            .eq('driver_id', user.id)
            .in('status', ['accepted', 'driver_en_route', 'driver_arrived', 'in_progress']);

          if (!releaseError) {
            console.log('✅ Active rides released back to pending');
            toast.info(
              language === 'ar'
                ? 'تم تحرير الرحلات للسائقين الآخرين'
                : language === 'fr'
                  ? "Courses libérées pour d'autres chauffeurs"
                  : 'Rides released for other drivers'
            );
          } else {
            console.error('❌ Failed to release active rides:', releaseError);
          }
        }
      }

      // Update BOTH driver_profiles AND driver_locations
      const [profileResult, locationResult] = await Promise.all([
        supabase
          .from('driver_profiles')
          .update({ is_available: available })
          .eq('driver_id', user.id),
        supabase
          .from('driver_locations')
          .upsert(
            {
              driver_id: user.id,
              latitude: location?.lat || 36.8065,
              longitude: location?.lng || 10.1815,
              is_available: available,
              last_updated: new Date().toISOString(),
            },
            { onConflict: 'driver_id' }
          ),
      ]);

      if (profileResult.error || locationResult.error) {
        console.error('❌ Error updating availability:', profileResult.error || locationResult.error);
        toast.error('Failed to update availability');
        setIsAvailable(prev);
        return;
      }

      setIsAvailable(available);
      console.log('✅ Availability updated in both tables');
      toast.success(`You are now ${available ? 'online' : 'offline'}`);

      // If going online, immediately refresh + seed location once
      if (available && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setLocation({ lat: latitude, lng: longitude });
            updateLocationInDb(latitude, longitude);
          },
          (err) => console.error('Location error:', err)
        );
      }
    } finally {
      setAvailabilityUpdating(false);
    }
  };

  const updateLocationInDb = async (lat: number, lng: number) => {
    if (!user) return;

    console.log('📍 Dashboard updating driver location:', { userId: user.id, lat, lng, isAvailable });
    const { error } = await supabase
      .from('driver_locations')
      .upsert({
        driver_id: user.id,
        latitude: lat,
        longitude: lng,
        is_available: isAvailable,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'driver_id'
      });
    
    if (error) {
      console.error('❌ Error updating driver location:', error);
    } else {
      console.log('✅ Driver location updated in dashboard');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-center">
          <Activity className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="text-red-500 mb-4">Error: {error}</div>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isRegistered) {
    return <DriverRegistration onRegistrationComplete={() => {
      setIsRegistered(true);
      setIsVerified(true); // Auto-verified after registration
    }} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header with Status */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">{t.title}</h1>
            <div className="flex items-center gap-2">
              <Badge variant={isAvailable ? "default" : "secondary"} className="text-sm">
                {isAvailable ? (
                  <><div className="h-2 w-2 rounded-full bg-green-500 animate-pulse mr-2" /> {t.online}</>
                ) : (
                  <><div className="h-2 w-2 rounded-full bg-gray-400 mr-2" /> {t.offline}</>
                )}
              </Badge>
              {isVerified && (
                <Badge variant="outline" className="text-sm">
                  <CheckCircle className="h-3 w-3 mr-1" /> {t?.verified}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2 items-center">
            {user && <NotificationBell userId={user.id} />}
            <Card className="w-full md:w-auto">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Switch
                    id="availability-switch"
                    checked={isAvailable}
                    onCheckedChange={handleAvailabilityChange}
                    disabled={availabilityUpdating || !isVerified}
                  />
                  <Label htmlFor="availability-switch" className="cursor-pointer font-medium">
                    {t.availability}
                  </Label>
                </div>
                {!isVerified && (
                  <div className="text-xs mt-2 p-2 bg-destructive/10 rounded border border-destructive/20">
                    <p className="text-destructive font-medium">⚠️ {language === 'ar' ? 'الحساب موقوف' : language === 'fr' ? 'Compte suspendu' : 'Account Suspended'}</p>
                    <p className="text-muted-foreground mt-1">{language === 'ar' ? 'حسابك غير موثق حاليًا. تواصل مع الدعم.' : language === 'fr' ? 'Votre compte n\'est pas vérifié. Contactez le support.' : 'Your account is not verified. Contact support.'}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.totalRides}
                </CardTitle>
                <Navigation2 className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalRides}</div>
              <p className="text-xs text-muted-foreground mt-1">{t?.allTime}</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t?.todayRides}
                </CardTitle>
                <Clock className="h-5 w-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.todayRides}</div>
              <p className="text-xs text-muted-foreground mt-1">{t?.today}</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.earnings}
                </CardTitle>
                <DollarSign className="h-5 w-5 text-yellow-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalEarnings} TND</div>
              <p className="text-xs text-muted-foreground mt-1">Total earned</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.rating}
                </CardTitle>
                <Star className="h-5 w-5 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-1">
                {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '--'}
                {stats.avgRating > 0 && <Star className="h-5 w-5 fill-orange-500 text-orange-500" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Average rating</p>
            </CardContent>
          </Card>
        </div>


        <Separator />

        {/* Live Map with Nearby Requests */}
        <div>
          <h2 className="text-2xl font-bold mb-4">{t.nearbyRequests}</h2>
          <DriverMapView isOnline={isAvailable} driverId={user?.id || ''} />
        </div>

        <Separator />

        {/* Ride Management */}
        <DriverRideManagement language={language} isOnline={isAvailable} />
      </div>
    </div>
  );
}
