import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { NotificationBell } from './NotificationBell';
import RideStatus from './RideStatus';
import { History, Sun, Moon, Globe, Navigation, Wallet, Menu, X, MapPin, MapPinned } from 'lucide-react';
import { useAuth, Language } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Ride } from '@/lib/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import RideHistory from './RideHistory';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CustomerMapView from './CustomerMapView';

interface CustomerDashboardProps {
  onBack: () => void;
}

const translations = {
  en: {
    loading: 'Loading...',
    error: 'Could not load ride status. Please try again later.',
    history: 'Ride History',
    pickup: 'Pickup',
    dropoff: 'Dropoff',
    confirmRide: 'Confirm Ride',
    estimatedFare: 'Estimated',
    findingDriver: 'Finding driver...',
    rideBooked: 'Taxi booked successfully!',
    driverNotified: 'Driver notified!',
    ridePending: 'Your ride is pending. Drivers will be notified!',
    selectLocations: 'Tap map to select locations',
    paymentMethod: 'Payment',
    cash: 'Cash',
    konnect: 'Konnect',
    edinar: 'E-Dinar',
    card: 'Card',
  },
  fr: {
    loading: 'Chargement...',
    error: 'Impossible de charger le statut. Veuillez réessayer.',
    history: 'Historique',
    pickup: 'Départ',
    dropoff: 'Arrivée',
    confirmRide: 'Confirmer',
    estimatedFare: 'Estimé',
    findingDriver: 'Recherche de chauffeur...',
    rideBooked: 'Taxi réservé avec succès!',
    driverNotified: 'Chauffeur notifié!',
    ridePending: 'Votre course est en attente.',
    selectLocations: 'Touchez la carte pour sélectionner',
    paymentMethod: 'Paiement',
    cash: 'Espèces',
    konnect: 'Konnect',
    edinar: 'E-Dinar',
    card: 'Carte',
  },
  ar: {
    loading: 'جار التحميل...',
    error: 'تعذر تحميل الحالة. يرجى المحاولة لاحقاً.',
    history: 'السجل',
    pickup: 'الانطلاق',
    dropoff: 'الوصول',
    confirmRide: 'تأكيد الرحلة',
    estimatedFare: 'التقدير',
    findingDriver: 'جاري البحث عن سائق...',
    rideBooked: 'تم حجز التاكسي بنجاح!',
    driverNotified: 'تم إعلام السائق!',
    ridePending: 'رحلتك قيد الانتظار.',
    selectLocations: 'اضغط على الخريطة للتحديد',
    paymentMethod: 'الدفع',
    cash: 'نقدا',
    konnect: 'كونيكت',
    edinar: 'إي دينار',
    card: 'بطاقة',
  }
};

export function CustomerDashboard({ onBack }: CustomerDashboardProps) {
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [loadingRide, setLoadingRide] = useState(true);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, language, setLanguage } = useAuth();
  const t = translations[language];

  // Booking state
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [selectingLocation, setSelectingLocation] = useState<'pickup' | 'dropoff' | null>(null);
  const mapRef = useRef<{ startSelectingLocation: (type: 'pickup' | 'dropoff') => void; useCurrentAsPickup: () => void } | null>(null);

  const estimatedPrice = distance > 0 ? Math.round((3 + distance * 0.45) * 100) / 100 : 0;

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle('dark', newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const getActiveRide = useCallback(async () => {
    if (!user) return null;
    try {
      const { data: activeData, error: activeError } = await supabase
        .from('rides')
        .select('*')
        .eq('customer_id', user.id)
        .in('status', ['pending', 'accepted', 'driver_en_route', 'driver_arrived', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeError && activeError.code !== 'PGRST116') throw activeError;
      if (activeData) return activeData;
      
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: completedData, error: completedError } = await supabase
        .from('rides')
        .select('*')
        .eq('customer_id', user.id)
        .eq('status', 'completed')
        .is('driver_rating', null)
        .gte('completed_at', fiveMinutesAgo)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (completedError && completedError.code !== 'PGRST116') throw completedError;
      return completedData;
    } catch (error) {
      console.error("Error fetching active ride:", error);
      return null;
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoadingRide(false);
      return;
    }

    const initialFetch = async () => {
      setLoadingRide(true);
      const ride = await getActiveRide();
      setActiveRide(ride as any);
      setLoadingRide(false);
    };

    initialFetch();

    const rideSubscription = supabase
      .channel(`customer-ride-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rides',
        filter: `customer_id=eq.${user.id}`
      }, async () => {
        const ride = await getActiveRide();
        setActiveRide(ride as any);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(rideSubscription);
    };
  }, [user, getActiveRide]);

  const handleBookRide = async () => {
    if (!user) {
      toast.error('Please log in first');
      return;
    }
    if (!pickupCoords || !dropoffCoords) {
      toast.error('Please select pickup and dropoff locations');
      return;
    }
    
    setLoading(true);
    try {
      const { data: rideData, error } = await supabase.from('rides').insert({
        customer_id: user.id,
        pickup_location: `${pickupCoords.lat.toFixed(5)}, ${pickupCoords.lng.toFixed(5)}`,
        pickup_lat: pickupCoords.lat,
        pickup_lng: pickupCoords.lng,
        dropoff_location: `${dropoffCoords.lat.toFixed(5)}, ${dropoffCoords.lng.toFixed(5)}`,
        dropoff_lat: dropoffCoords.lat,
        dropoff_lng: dropoffCoords.lng,
        ride_type: 'taxi',
        payment_method: paymentMethod,
        estimated_price: estimatedPrice,
        distance_km: distance,
        status: 'pending'
      }).select().single();

      if (error) {
        toast.error(error.message || 'Failed to create ride');
        throw error;
      }

      toast.success(t.rideBooked);

      if (rideData) {
        toast.loading(t.findingDriver);
        const { data: assignData, error: assignError } = await supabase.functions.invoke('assign-ride', {
          body: { rideId: rideData.id }
        });
        toast.dismiss();
        
        if (assignError) {
          toast.info(t.ridePending);
        } else if (assignData?.assigned) {
          toast.success(t.driverNotified);
        } else {
          toast.info(t.ridePending);
        }
      }
      
      setPickupCoords(null);
      setDropoffCoords(null);
      setDistance(0);
    } catch (error: any) {
      console.error('Book ride error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const handleRideComplete = () => {
    setActiveRide(null);
  };

  // If there's an active ride, show the ride status
  if (activeRide) {
    return (
      <div className={`min-h-screen bg-background ${language === 'ar' ? 'rtl' : 'ltr'}`}>
        <RideStatus rideId={activeRide.id} onRideComplete={handleRideComplete} />
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-background ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      {/* Full Screen Map */}
      <CustomerMapView
        ref={mapRef}
        pickupLocation={pickupCoords}
        dropoffLocation={dropoffCoords}
        onPickupChange={(loc) => {
          setPickupCoords(loc);
          setSelectingLocation(null);
        }}
        onDropoffChange={(loc) => {
          setDropoffCoords(loc);
          setSelectingLocation(null);
        }}
        onDistanceCalculated={setDistance}
        selectingLocation={selectingLocation}
        onSelectionModeChange={setSelectingLocation}
      />

      {/* Floating Top Controls */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Menu Button */}
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setMenuOpen(!menuOpen)}
          className="pointer-events-auto h-12 w-12 rounded-2xl bg-background/95 backdrop-blur-xl shadow-lg border-0 hover:scale-105 transition-transform"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Right Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {user && <NotificationBell userId={user.id} />}
          
          {/* Theme Toggle */}
          <Button
            variant="secondary"
            size="icon"
            onClick={toggleTheme}
            className="h-12 w-12 rounded-2xl bg-background/95 backdrop-blur-xl shadow-lg border-0 hover:scale-105 transition-transform"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Slide-out Menu */}
      {menuOpen && (
        <div className="absolute top-20 left-4 z-20 bg-background/95 backdrop-blur-xl rounded-3xl shadow-2xl p-4 space-y-3 min-w-[200px] animate-fade-in">
          {/* Language Selector */}
          <div className="flex items-center gap-3 p-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
              <SelectTrigger className="flex-1 border-0 bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="ar">العربية</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* History */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 h-12">
                <History className="h-5 w-5" />
                {t.history}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  {t.history}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 overflow-y-auto max-h-[calc(100vh-100px)]">
                <RideHistory language={language} />
              </div>
            </SheetContent>
          </Sheet>

          {/* Logout */}
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onBack}
          >
            <X className="h-5 w-5" />
            Logout
          </Button>
        </div>
      )}

      {/* Bottom Booking Panel */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="bg-background/95 backdrop-blur-xl rounded-t-[2rem] shadow-2xl border-t border-border/50 p-6 pb-8 space-y-4">
          {/* Location Indicators */}
          <div className="flex items-center gap-4">
            {/* Pickup/Dropoff Visual */}
            <div className="flex flex-col items-center gap-1">
              <div className={`w-4 h-4 rounded-full ${pickupCoords ? 'bg-emerald-500' : 'bg-muted-foreground/30'} shadow-lg`} />
              <div className="w-0.5 h-8 bg-gradient-to-b from-emerald-500 to-primary rounded-full" />
              <div className={`w-4 h-4 rounded-full ${dropoffCoords ? 'bg-primary' : 'bg-muted-foreground/30'} shadow-lg`} />
            </div>

            {/* Location Labels */}
            <div className="flex-1 space-y-3">
              {/* Pickup Rectangle */}
              <div 
                onClick={() => {
                  setSelectingLocation('pickup');
                  mapRef.current?.startSelectingLocation('pickup');
                }}
                className={`p-3 rounded-2xl transition-all cursor-pointer active:scale-[0.98] ${
                  selectingLocation === 'pickup'
                    ? 'bg-emerald-500/20 border-2 border-emerald-500 ring-2 ring-emerald-500/30'
                    : pickupCoords 
                      ? 'bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20' 
                      : 'bg-muted/50 border border-dashed border-muted-foreground/30 hover:border-emerald-500/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className={`h-4 w-4 ${selectingLocation === 'pickup' || pickupCoords ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-medium ${selectingLocation === 'pickup' || pickupCoords ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                      {selectingLocation === 'pickup' ? 'Tap on map...' : t.pickup}
                    </span>
                  </div>
                  {/* Current Location Button */}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      mapRef.current?.useCurrentAsPickup();
                      setSelectingLocation(null);
                    }}
                    className="h-8 px-2 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                  >
                    <Navigation className="h-4 w-4 mr-1" />
                    GPS
                  </Button>
                </div>
                {pickupCoords && !selectingLocation && (
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    {pickupCoords.lat.toFixed(4)}, {pickupCoords.lng.toFixed(4)}
                  </p>
                )}
              </div>

              {/* Dropoff Rectangle */}
              <div 
                onClick={() => {
                  setSelectingLocation('dropoff');
                  mapRef.current?.startSelectingLocation('dropoff');
                }}
                className={`p-3 rounded-2xl transition-all cursor-pointer active:scale-[0.98] ${
                  selectingLocation === 'dropoff'
                    ? 'bg-red-500/20 border-2 border-red-500 ring-2 ring-red-500/30'
                    : dropoffCoords 
                      ? 'bg-primary/10 border border-primary/30 hover:bg-primary/20' 
                      : 'bg-muted/50 border border-dashed border-muted-foreground/30 hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPinned className={`h-4 w-4 ${selectingLocation === 'dropoff' || dropoffCoords ? 'text-red-500' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${selectingLocation === 'dropoff' || dropoffCoords ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {selectingLocation === 'dropoff' ? 'Tap on map...' : t.dropoff}
                  </span>
                </div>
                {dropoffCoords && !selectingLocation && (
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    {dropoffCoords.lat.toFixed(4)}, {dropoffCoords.lng.toFixed(4)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Payment & Price Row */}
          <div className="flex items-center justify-between gap-4">
            {/* Payment Method */}
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="w-28 h-10 border-0 bg-muted/50 rounded-xl">
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

            {/* Estimated Fare */}
            {estimatedPrice > 0 && (
              <div className="text-right">
                <span className="text-xs text-muted-foreground">{t.estimatedFare}</span>
                <p className="text-2xl font-bold text-primary">{estimatedPrice} TND</p>
              </div>
            )}
          </div>

          {/* Book Button */}
          <Button
            onClick={handleBookRide}
            disabled={loading || !pickupCoords || !dropoffCoords}
            className="w-full h-14 rounded-2xl text-lg font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t.findingDriver}
              </div>
            ) : (
              t.confirmRide
            )}
          </Button>
        </div>
      </div>

      {/* Loading Overlay */}
      {loadingRide && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-muted-foreground">{t.loading}</p>
          </div>
        </div>
      )}
    </div>
  );
}
