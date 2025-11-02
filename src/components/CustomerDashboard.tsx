import { useState, useEffect } from 'react';
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
          .in('status', ['pending', 'accepted', 'driver_en_route', 'driver_arrived', 'in_progress'])
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
    <div className={`fixed inset-0 flex flex-col bg-background ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      {/* Minimal Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-3 bg-background/80 backdrop-blur-lg border-b">
        <Button onClick={onBack} variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <History className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  {t.history}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 overflow-y-auto max-h-[calc(80vh-80px)]">
                <RideHistory language={language} />
              </div>
            </SheetContent>
          </Sheet>
          
          {user && <NotificationBell userId={user.id} />}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative">
        {loadingRide ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground">{t.loading}</p>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <div className="text-center p-8 text-destructive">{error}</div>
          </div>
        ) : activeRide ? (
          <RideStatus rideId={activeRide.id} onRideComplete={handleRideComplete} />
        ) : (
          <BookRide language={language} isMobileFullScreen={true} />
        )}
      </div>
    </div>
  );
}
