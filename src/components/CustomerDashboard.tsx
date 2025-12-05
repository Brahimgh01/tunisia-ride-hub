import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import BookRide from './BookRide';
import RideStatus from './RideStatus';
import { NotificationBell } from './NotificationBell';
import { ArrowLeft, History, Star, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Ride } from '@/lib/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import RideHistory from './RideHistory';

interface CustomerDashboardProps {
  onBack: () => void;
}

const translations = {
  en: {
    loading: 'Loading...',
    error: 'Could not load ride status. Please try again later.',
    history: 'Ride History',
    back: 'Back',
  },
  fr: {
    loading: 'Chargement...',
    error: 'Impossible de charger le statut de la course. Veuillez réessayer plus tard.',
    history: 'Historique',
    back: 'Retour',
  },
  ar: {
    loading: 'جار التحميل...',
    error: 'تعذر تحميل حالة الرحلة. يرجى المحاولة مرة أخرى في وقت لاحق.',
    history: 'السجل',
    back: 'رجوع',
  }
};

export function CustomerDashboard({ onBack }: CustomerDashboardProps) {
  // detect mobile to toggle the mobile-fullscreen booking layout
  // use hook so we only enable the mobile fullscreen UI on small screens
  // (previously BookRide was always forced into mobile fullscreen)
  // This prevents the map from taking the entire dashboard on desktop.
  const isMobile = useIsMobile();
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [loadingRide, setLoadingRide] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, language } = useAuth();
  const t = translations[language];

  useEffect(() => {
    if (!user) {
      setLoadingRide(false);
      return;
    }

    const getActiveRide = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('rides')
          .select('*')
          .eq('customer_id', user.id)
          .in('status', ['pending', 'accepted', 'driver_en_route', 'driver_arrived', 'in_progress', 'completed'])
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

    const initialFetch = async () => {
      setLoadingRide(true);
      const ride = await getActiveRide();
      setActiveRide(ride as any);
      setLoadingRide(false);
    };

    initialFetch();

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
        async () => {
          const ride = await getActiveRide();
          setActiveRide(ride as any);
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
    <div className={`min-h-screen flex flex-col bg-gradient-to-br from-background via-background/95 to-muted/30 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      {/* Modern Top Bar - sticky so page can scroll */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 max-w-6xl mx-auto">
          <Button 
            onClick={onBack} 
            variant="ghost" 
            size="sm" 
            className="gap-2 hover:bg-primary/10 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="font-medium">{t.back}</span>
          </Button>
          
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2 hover:bg-primary/10 transition-all"
                >
                  <History className="h-4 w-4" />
                  <span className="hidden sm:inline font-medium">{t.history}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2 text-xl">
                    <History className="h-5 w-5 text-primary" />
                    {t.history}
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 overflow-y-auto max-h-[calc(85vh-100px)]">
                  <RideHistory language={language} />
                </div>
              </SheetContent>
            </Sheet>
            
            {user && <NotificationBell userId={user.id} />}
          </div>
        </div>
      </div>

      {/* Main Content Area - scrollable */}
      <div className="flex-1 relative mt-6 overflow-auto">
        {loadingRide ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/30 border-t-primary mx-auto"></div>
                <MapPin className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary animate-pulse" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{t.loading}</p>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="text-center p-8 bg-destructive/10 rounded-2xl border border-destructive/20 max-w-md">
              <div className="text-destructive font-semibold text-lg mb-2">⚠️ Error</div>
              <div className="text-destructive/80">{error}</div>
            </div>
          </div>
        ) : activeRide ? (
          <RideStatus rideId={activeRide.id} onRideComplete={handleRideComplete} />
        ) : (
          <div className="max-w-6xl mx-auto px-4 pb-8">
            <BookRide language={language} isMobileFullScreen={isMobile} />
          </div>
        )}
      </div>
    </div>
  );
}
