import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import BookRide from './BookRide';
import RideHistory from './RideHistory';
import RideStatus from './RideStatus';
import { BookDelivery } from './BookDelivery';
import { DeliveryHistory } from './DeliveryHistory';
import { FavoriteLocations } from './FavoriteLocations';
import { LoyaltyDisplay } from './LoyaltyDisplay';
import { ThemeToggle } from './ThemeToggle';
import { ReferralCard } from './ReferralCard';
import { NotificationBell } from './NotificationBell';
import { ArrowLeft, Car, Package, History } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Ride } from '@/lib/types';

interface CustomerDashboardProps {
  onBack: () => void;
}

const translations = {
  en: {
    dashboard: 'Customer Dashboard',
    bookRide: 'Book Ride',
    bookDelivery: 'Book Delivery',
    history: 'History',
    rides: 'Rides',
    deliveries: 'Deliveries',
    back: 'Back',
    loading: 'Loading...',
    error: 'Could not load ride status. Please try again later.',
  },
  fr: {
    dashboard: 'Tableau de bord Client',
    bookRide: 'Réserver Course',
    bookDelivery: 'Réserver Livraison',
    history: 'Historique',
    rides: 'Courses',
    deliveries: 'Livraisons',
    back: 'Retour',
    loading: 'Chargement...',
    error: 'Impossible de charger le statut de la course. Veuillez réessayer plus tard.',
  },
  ar: {
    dashboard: 'لوحة تحكم العميل',
    bookRide: 'احجز رحلة',
    bookDelivery: 'احجز توصيل',
    history: 'السجل',
    rides: 'رحلات',
    deliveries: 'توصيلات',
    back: 'رجوع',
    loading: 'جار التحميل...',
    error: 'تعذر تحميل حالة الرحلة. يرجى المحاولة مرة أخرى في وقت لاحق.',
  }
};

export function CustomerDashboard({ onBack }: CustomerDashboardProps) {
  const [serviceMode, setServiceMode] = useState<'ride' | 'delivery'>('ride');
  const [historyMode, setHistoryMode] = useState<'ride' | 'delivery'>('ride');
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [loadingRide, setLoadingRide] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, language } = useAuth(); // Get language from useAuth
  const t = translations[language];

  useEffect(() => {
    if (!user) {
        setLoadingRide(false);
        return;
    };

    const getActiveRide = async () => {
        try {
            const { data, error: fetchError } = await supabase
                .from('rides')
                .select('id, status')
                .eq('customer_id', user.id)
                .in('status', ['pending', 'accepted', 'started'])
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError;
            }
            return data;
        } catch (error) {
            console.error("Error fetching active ride:", error);
            setError(t.error);
            return null;
        }
    };

    // Initial fetch with loading state
    const initialFetch = async () => {
        setLoadingRide(true);
        const ride = await getActiveRide();
        setActiveRide(ride as Ride | null);
        setLoadingRide(false);
    };

    initialFetch();

    // Set up subscription for background updates
    const rideSubscription = supabase
      .channel(`customer-ride-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `customer_id=eq.${user.id}`
        },
        async (payload) => {
            console.log('Ride change detected, refreshing in background...');
            const ride = await getActiveRide(); // Re-fetch without setting loading state
            setActiveRide(ride as Ride | null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rideSubscription);
    };
  }, [user, language, t.error]);


  if (!user) return null;

  const handleRideComplete = () => {
    setActiveRide(null);
  };

  return (
    <div className={`min-h-screen bg-gradient-warm p-6 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t.back}
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-tunisian bg-clip-text text-transparent">
            {t.dashboard}
          </h1>
          <div className="flex gap-2 items-center">
            {user && <NotificationBell userId={user.id} />}
            <ThemeToggle />
          </div>
        </div>

        {loadingRide ? (
            <div className="text-center p-8">{t.loading}</div>
        ) : error ? (
            <div className="text-center p-8 text-red-500">{error}</div>
        ) : activeRide ? (
            <RideStatus rideId={activeRide.id} onRideComplete={handleRideComplete} />
        ) : (
            <>
                 {/* Loyalty Points Display */}
                <LoyaltyDisplay language={language} />

                {/* Referral Program */}
                <ReferralCard language={language} />

                <Card className="shadow-tunisian border-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    {serviceMode === 'ride' ? (
                        <>
                        <Car className="h-5 w-5" />
                        {t.bookRide}
                        </>
                    ) : (
                        <>
                        <Package className="h-5 w-5" />
                        {t.bookDelivery}
                        </>
                    )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs value={serviceMode} onValueChange={(v) => setServiceMode(v as 'ride' | 'delivery')} className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="ride" className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        {t.bookRide}
                        </TabsTrigger>
                        <TabsTrigger value="delivery" className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {t.bookDelivery}
                        </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="ride">
                        <BookRide language={language} />
                    </TabsContent>
                    
                    <TabsContent value="delivery">
                        <BookDelivery language={language} userId={user.id} />
                    </TabsContent>
                    </Tabs>
                </CardContent>
                </Card>

                <Card className="shadow-tunisian border-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    {t.history}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs value={historyMode} onValueChange={(v) => setHistoryMode(v as 'ride' | 'delivery')} className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="ride">{t.rides}</TabsTrigger>
                        <TabsTrigger value="delivery">{t.deliveries}</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="ride">
                        <RideHistory language={language} />
                    </TabsContent>
                    
                    <TabsContent value="delivery">
                        <DeliveryHistory language={language} userId={user.id} />
                    </TabsContent>
                    </Tabs>
                </CardContent>
                </Card>

                {/* Favorite Locations Management */}
                <FavoriteLocations language={language} />
            </>
        )}

       
      </div>
    </div>
  );
}
