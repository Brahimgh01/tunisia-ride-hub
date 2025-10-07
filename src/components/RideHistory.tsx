import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, DollarSign, Car, CreditCard, Calendar } from 'lucide-react';
import { Ride } from '@/lib/types';

interface RideHistoryProps {
  language: string;
}

const RideHistory = ({ language }: RideHistoryProps) => {
  const { user } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  const translations = {
    en: {
      title: 'Ride History',
      noRides: 'No rides yet',
      from: 'From',
      to: 'To',
      rideType: 'Type',
      paymentMethod: 'Payment',
      scheduled: 'Scheduled for',
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
      }
    },
    ar: {
      title: 'سجل الرحلات',
      noRides: 'لا توجد رحلات بعد',
      from: 'من',
      to: 'إلى',
      rideType: 'النوع',
      paymentMethod: 'الدفع',
      scheduled: 'مجدولة ل',
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
      }
    },
    fr: {
      title: 'Historique des courses',
      noRides: 'Aucune course',
      from: 'De',
      to: 'À',
      rideType: 'Type',
      paymentMethod: 'Paiement',
      scheduled: 'Prévu pour',
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
      }
    }
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  const fetchRides = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        ride_ratings ( rating )
      `)
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRides(data as unknown as Ride[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;

    fetchRides();

    const channel = supabase
      .channel('rides-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `customer_id=eq.${user.id}`
        },
        () => {
          fetchRides();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-4 p-6">
      <h2 className="text-2xl font-bold">{t.title}</h2>
      
      {rides.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            {t.noRides}
          </CardContent>
        </Card>
      ) : (
        rides.map((ride) => (
          <Card key={ride.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">
                  <Badge>{ride.status}</Badge>
                </CardTitle>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {new Date(ride.created_at).toLocaleDateString()}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-500" />
                <span className="text-sm">{t.from}: {ride.pickup_location}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-500" />
                <span className="text-sm">{t.to}: {ride.dropoff_location}</span>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                {ride.ride_type && (
                  <div className="flex items-center gap-1">
                    <Car className="h-3 w-3" />
                    <span>{t.rideTypes[ride.ride_type as keyof typeof t.rideTypes]}</span>
                  </div>
                )}
                {ride.payment_method && (
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    <span>{t.paymentMethods[ride.payment_method as keyof typeof t.paymentMethods]}</span>
                  </div>
                )}
              </div>

              {ride.is_scheduled && ride.scheduled_time && (
                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                  <Calendar className="h-4 w-4" />
                  <span>{t.scheduled}: {new Date(ride.scheduled_time).toLocaleString()}</span>
                </div>
              )}

              {ride.final_price && (
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <DollarSign className="h-4 w-4" />
                  {ride.final_price} TND
                </div>
              )}

              {ride.status === 'completed' && !ride.customer_rating && (
                <div className="mt-4 border-t pt-4 text-sm text-muted-foreground">
                    Rate this ride in the ride details
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default RideHistory;
