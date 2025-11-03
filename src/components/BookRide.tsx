
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Navigation, Car, Crown, Users, Bike, Calendar, Heart, Music, Wind, User, Wallet } from 'lucide-react';
import Map from '@/components/Map';
import { Database } from '@/integrations/supabase/types';
import { useDriverLocations, DriverLocation } from '@/hooks/useDriverLocations';

type FavoriteLocation = Database['public']['Tables']['favorite_locations']['Row'];

interface BookRideProps {
  language: string;
  isMobileFullScreen?: boolean;
}

const BookRide = ({ language, isMobileFullScreen = false }: BookRideProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [rideType, setRideType] = useState('taxi');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [driverPreferences, setDriverPreferences] = useState({
    femaleDriver: false,
    acRequired: false,
    musicPreference: 'any',
  });
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [distance, setDistance] = useState<number>(0);
  const { driverLocations } = useDriverLocations();

  const translations = {
    en: {
      title: 'Book a Ride',
      pickup: 'Pickup Location',
      dropoff: 'Drop-off Location',
      getCurrentLocation: 'Use Current Location',
      bookRide: 'Book Ride',
      rideType: 'Ride Type',
      taxi: 'Taxi',
      premium: 'Premium',
      carpooling: 'Carpooling',
      motorcycle: 'Motorcycle',
      paymentMethod: 'Payment Method',
      cash: 'Cash',
      konnect: 'Konnect',
      edinar: 'E-Dinar Jeune',
      card: 'Card',
      scheduleRide: 'Schedule for Later',
      driverPreferences: 'Driver Preferences',
      femaleDriver: 'Female Driver',
      acRequired: 'AC Required',
      musicPreference: 'Music Preference',
      any: 'Any',
      quiet: 'Quiet',
      music: 'Music',
      estimatedFare: 'Estimated Fare',
      success: 'Ride booked successfully!',
      error: 'Failed to book ride',
      favorites: 'Favorite Locations',
    },
    fr: {
      title: 'Réserver une course',
      pickup: 'Lieu de prise en charge',
      dropoff: 'Lieu de dépôt',
      getCurrentLocation: 'Utiliser la position actuelle',
      bookRide: 'Réserver',
      rideType: 'Type de course',
      taxi: 'Taxi',
      premium: 'Premium',
      carpooling: 'Covoiturage',
      motorcycle: 'Moto',
      paymentMethod: 'Méthode de paiement',
      cash: 'Espèces',
      konnect: 'Konnect',
      edinar: 'E-Dinar Jeune',
      card: 'Carte',
      scheduleRide: 'Programmer pour plus tard',
      driverPreferences: 'Préférences chauffeur',
      femaleDriver: 'Chauffeur femme',
      acRequired: 'Climatisation requise',
      musicPreference: 'Préférence musicale',
      any: 'Aucune',
      quiet: 'Silencieux',
      music: 'Musique',
      estimatedFare: 'Tarif estimé',
      success: 'Course réservée avec succès!',
      error: 'Échec de la réservation',
      favorites: 'Lieux favoris',
    },
    ar: {
      title: 'احجز رحلة',
      pickup: 'موقع الانطلاق',
      dropoff: 'موقع الوصول',
      getCurrentLocation: 'استخدم الموقع الحالي',
      bookRide: 'احجز الرحلة',
      rideType: 'نوع الرحلة',
      taxi: 'تاكسي',
      premium: 'بريميوم',
      carpooling: 'مشاركة',
      motorcycle: 'دراجة نارية',
      paymentMethod: 'طريقة الدفع',
      cash: 'نقدا',
      konnect: 'كونيكت',
      edinar: 'إي دينار',
      card: 'بطاقة',
      scheduleRide: 'جدولة لاحقا',
      driverPreferences: 'تفضيلات السائق',
      femaleDriver: 'سائقة أنثى',
      acRequired: 'مكيف مطلوب',
      musicPreference: 'تفضيل الموسيقى',
      any: 'أي',
      quiet: 'هادئ',
      music: 'موسيقى',
      estimatedFare: 'السعر المقدر',
      success: 'تم حجز الرحلة بنجاح!',
      error: 'فشل حجز الرحلة',
      favorites: 'الأماكن المفضلة',
    }
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  const loadFavorites = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('favorite_locations')
      .select('*')
      .eq('user_id', user.id)
      .limit(3);
    if (data) setFavorites(data as FavoriteLocation[]);
  }, [user]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const calculateEstimatedPrice = useCallback(() => {
    if (!distance || distance === 0) return;
    const basePrice = { taxi: 3, premium: 10, carpooling: 2, motorcycle: 2.5 }[rideType] || 3;
    const pricePerKm = 0.45;
    const price = basePrice + (distance * pricePerKm);
    setEstimatedPrice(Math.round(price * 100) / 100);
  }, [distance, rideType]);

  useEffect(() => {
    calculateEstimatedPrice();
  }, [calculateEstimatedPrice]);

  const handleDistanceCalculated = (calculatedDistance: number) => {
    setDistance(calculatedDistance);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = { lat: position.coords.latitude, lng: position.coords.longitude };
          setPickupCoords(location);
          setPickupLocation('Current Location');
          toast.success('Using current location');
        },
        () => toast.error('Unable to get current location.')
      );
    }
  };

  const handleSelectFavorite = (favorite: FavoriteLocation, isPickup: boolean) => {
    const coords = { lat: favorite.latitude, lng: favorite.longitude };
    if (isPickup) {
      setPickupLocation(favorite.address);
      setPickupCoords(coords);
    } else {
      setDropoffLocation(favorite.address);
      setDropoffCoords(coords);
    }
  };

  const handleBookRide = async () => {
    if (!user) {
      toast.error('Please log in first');
      return;
    }

    if (!pickupLocation || !dropoffLocation) {
      toast.error('Please enter both pickup and drop-off locations');
      return;
    }

    if (!pickupCoords || !dropoffCoords) {
      toast.error('Please select locations on the map');
      return;
    }
    
    setLoading(true);
    try {
      const { data: rideData, error } = await supabase.from('rides').insert({
        customer_id: user.id,
        pickup_location: pickupLocation,
        pickup_lat: pickupCoords.lat,
        pickup_lng: pickupCoords.lng,
        dropoff_location: dropoffLocation,
        dropoff_lat: dropoffCoords.lat,
        dropoff_lng: dropoffCoords.lng,
        ride_type: rideType,
        payment_method: paymentMethod,
        scheduled_time: isScheduled ? scheduledTime : null,
        is_scheduled: isScheduled,
        driver_preferences: driverPreferences,
        estimated_price: estimatedPrice,
        distance_km: distance,
        status: 'pending'
      }).select().single();

      if (error) {
        console.error('Ride creation error:', error);
        throw error;
      }

      toast.success(t.success);

      if (rideData && !isScheduled) {
        toast.loading('Finding closest driver...');
        const { error: assignError } = await supabase.functions.invoke('assign-ride', {
          body: { rideId: rideData.id }
        });
        toast.dismiss();
        if (assignError) {
          console.error('Assign error:', assignError);
          toast.info('Your ride is pending. Drivers will be notified!');
        } else {
          toast.success('Driver notified!');
        }
      }
      
      setPickupLocation('');
      setDropoffLocation('');
      setPickupCoords(null);
      setDropoffCoords(null);
    } catch (error: any) {
      console.error('Book ride error:', error);
      toast.error(error.message || t.error);
    } finally {
      setLoading(false);
    }
  };

  const rideTypeIcons = {
    taxi: <Car className="h-5 w-5" />,
    premium: <Crown className="h-5 w-5" />,
    carpooling: <Users className="h-5 w-5" />,
    motorcycle: <Bike className="h-5 w-5" />
  };

  if (isMobileFullScreen) {
    return (
      <div className="absolute inset-0 flex flex-col">
        {/* Full Screen Map */}
        <div className="flex-1">
          <Map
            pickupLocation={pickupCoords}
            dropoffLocation={dropoffCoords}
            onPickupChange={setPickupCoords}
            onDropoffChange={setDropoffCoords}
            onDistanceCalculated={handleDistanceCalculated}
            height="h-full"
            interactive={true}
            driverLocations={driverLocations as DriverLocation[]}
          />
        </div>

        {/* Bottom Booking Card - Slides up on mobile */}
        <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl rounded-t-3xl shadow-2xl border-t max-h-[75vh] overflow-y-auto">
          <div className="w-12 h-1 bg-muted rounded-full mx-auto mt-3 mb-4"></div>
          
          <div className="px-4 pb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t.title}</h2>
              {estimatedPrice > 0 && (
                <div className="text-2xl font-bold text-primary">{estimatedPrice} TND</div>
              )}
            </div>

            {/* Ride Type Selection - Horizontal Scroll */}
            <div className="space-y-2">
              <Label className="text-sm">{t.rideType}</Label>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                {(Object.keys(rideTypeIcons) as (keyof typeof rideTypeIcons)[]).map((type) => (
                  <Button 
                    key={type} 
                    variant={rideType === type ? 'default' : 'outline'} 
                    onClick={() => setRideType(type)} 
                    className="flex-shrink-0 flex items-center gap-2"
                  >
                    {rideTypeIcons[type]} 
                    <span className="text-xs">{t[type as keyof typeof t]}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Location Inputs */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="pickup" className="text-sm">{t.pickup}</Label>
                <div className="flex gap-2">
                  <Input 
                    id="pickup" 
                    value={pickupLocation} 
                    onChange={(e) => setPickupLocation(e.target.value)} 
                    placeholder="Enter pickup" 
                    className="flex-1"
                  />
                  <Button onClick={getCurrentLocation} variant="outline" size="icon">
                    <Navigation className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dropoff" className="text-sm">{t.dropoff}</Label>
                <Input 
                  id="dropoff" 
                  value={dropoffLocation} 
                  onChange={(e) => setDropoffLocation(e.target.value)} 
                  placeholder="Enter dropoff" 
                />
              </div>
            </div>

            {/* Favorites */}
            {favorites.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Heart className="h-3 w-3" />{t.favorites}
                </Label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {favorites.map((fav) => (
                    <Button 
                      key={fav.id} 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleSelectFavorite(fav, true)}
                      className="flex-shrink-0"
                    >
                      {fav.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Wallet className="h-3 w-3" />{t.paymentMethod}
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t.cash}</SelectItem>
                  <SelectItem value="konnect">{t.konnect}</SelectItem>
                  <SelectItem value="edinar">{t.edinar}</SelectItem>
                  <SelectItem value="card">{t.card}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Schedule Option */}
            <div className="flex items-center gap-2">
              <Checkbox 
                id="schedule" 
                checked={isScheduled} 
                onCheckedChange={(checked) => setIsScheduled(checked as boolean)} 
              />
              <Label htmlFor="schedule" className="cursor-pointer text-sm">
                <Calendar className="inline h-3 w-3 mr-1" />
                {t.scheduleRide}
              </Label>
            </div>
            {isScheduled && (
              <Input 
                type="datetime-local" 
                value={scheduledTime} 
                onChange={(e) => setScheduledTime(e.target.value)} 
              />
            )}

            {/* Driver Preferences - Collapsible */}
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium flex items-center gap-2">
                <User className="h-3 w-3" />
                {t.driverPreferences}
              </summary>
              <div className="mt-3 space-y-3 pl-5">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="femaleDriver" 
                    checked={driverPreferences.femaleDriver} 
                    onCheckedChange={(checked) => setDriverPreferences({ ...driverPreferences, femaleDriver: checked as boolean })} 
                  />
                  <Label htmlFor="femaleDriver" className="cursor-pointer text-sm">{t.femaleDriver}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="acRequired" 
                    checked={driverPreferences.acRequired} 
                    onCheckedChange={(checked) => setDriverPreferences({ ...driverPreferences, acRequired: checked as boolean })} 
                  />
                  <Label htmlFor="acRequired" className="cursor-pointer text-sm flex items-center gap-1">
                    <Wind className="h-3 w-3" />
                    {t.acRequired}
                  </Label>
                </div>
                <Select 
                  value={driverPreferences.musicPreference} 
                  onValueChange={(value) => setDriverPreferences({ ...driverPreferences, musicPreference: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Music Preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">{t.any}</SelectItem>
                    <SelectItem value="quiet">{t.quiet}</SelectItem>
                    <SelectItem value="music">
                      <Music className="inline h-3 w-3 mr-1" />
                      {t.music}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </details>

            {/* Book Button */}
            <Button 
              onClick={handleBookRide} 
              disabled={loading || !pickupCoords || !dropoffCoords} 
              className="w-full bg-gradient-tunisian text-white h-12 text-lg font-semibold"
              size="lg"
            >
              {loading ? 'Booking...' : t.bookRide}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop/Tablet View (Original)
  return (
    <div className="space-y-6 p-6 bg-card rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold">{t.title}</h2>

      {favorites.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Heart className="h-4 w-4" />{t.favorites}</Label>
          <div className="flex gap-2 flex-wrap">
            {favorites.map((fav) => (
              <Button key={fav.id} variant="outline" size="sm" onClick={() => handleSelectFavorite(fav, true)}>{fav.name}</Button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>{t.rideType}</Label>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {(Object.keys(rideTypeIcons) as (keyof typeof rideTypeIcons)[]).map((type) => (
            <Button key={type} variant={rideType === type ? 'default' : 'outline'} onClick={() => setRideType(type)} className="flex items-center gap-2">
              {rideTypeIcons[type]} {t[type as keyof typeof t]}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pickup">{t.pickup}</Label>
        <div className="flex gap-2">
          <Input id="pickup" value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} placeholder="Enter pickup location" />
          <Button onClick={getCurrentLocation} variant="outline" size="icon"><Navigation className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dropoff">{t.dropoff}</Label>
        <Input id="dropoff" value={dropoffLocation} onChange={(e) => setDropoffLocation(e.target.value)} placeholder="Enter drop-off location" />
      </div>

      <Map
        pickupLocation={pickupCoords}
        dropoffLocation={dropoffCoords}
        onPickupChange={setPickupCoords}
        onDropoffChange={setDropoffCoords}
        onDistanceCalculated={handleDistanceCalculated}
        height="h-80"
        interactive={true}
        driverLocations={driverLocations as DriverLocation[]}
      />

      <div className="space-y-2">
        <Label className="flex items-center gap-2"><Wallet className="h-4 w-4" />{t.paymentMethod}</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">{t.cash}</SelectItem>
            <SelectItem value="konnect">{t.konnect}</SelectItem>
            <SelectItem value="edinar">{t.edinar}</SelectItem>
            <SelectItem value="card">{t.card}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="schedule" checked={isScheduled} onCheckedChange={(checked) => setIsScheduled(checked as boolean)} />
        <Label htmlFor="schedule" className="cursor-pointer">{t.scheduleRide}</Label>
      </div>
      {isScheduled && <Input type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />}

      <Separator />

      <div className="space-y-3">
        <Label className="flex items-center gap-2"><User className="h-4 w-4" />{t.driverPreferences}</Label>
        <div className="flex items-center gap-2">
          <Checkbox id="femaleDriver" checked={driverPreferences.femaleDriver} onCheckedChange={(checked) => setDriverPreferences({ ...driverPreferences, femaleDriver: checked as boolean })} />
          <Label htmlFor="femaleDriver" className="cursor-pointer">{t.femaleDriver}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="acRequired" checked={driverPreferences.acRequired} onCheckedChange={(checked) => setDriverPreferences({ ...driverPreferences, acRequired: checked as boolean })} />
          <Label htmlFor="acRequired" className="cursor-pointer">{t.acRequired}</Label>
        </div>
        <Select value={driverPreferences.musicPreference} onValueChange={(value) => setDriverPreferences({ ...driverPreferences, musicPreference: value })}>
          <SelectTrigger><SelectValue placeholder="Music Preference" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t.any}</SelectItem>
            <SelectItem value="quiet">{t.quiet}</SelectItem>
            <SelectItem value="music">{t.music}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {estimatedPrice > 0 && (
        <Card className="bg-gradient-tunisian"><CardContent className="p-4 flex justify-between items-center"><span className="text-white font-medium">{t.estimatedFare}</span><span className="text-2xl font-bold text-white">{estimatedPrice} TND</span></CardContent></Card>
      )}

      <Button onClick={handleBookRide} disabled={loading} className="w-full bg-gradient-tunisian text-white">{loading ? '...' : t.bookRide}</Button>
    </div>
  );
};

export default BookRide;
