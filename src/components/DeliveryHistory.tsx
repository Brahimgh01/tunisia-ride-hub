import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, MapPin, Phone, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/hooks/useAuth';

interface DeliveryHistoryProps {
  language: Language;
  userId: string;
}

interface Delivery {
  id: string;
  pickup_location: string;
  dropoff_location: string;
  recipient_name: string;
  recipient_phone: string;
  package_description: string;
  package_size: string;
  status: string;
  estimated_price: number;
  final_price: number;
  created_at: string;
  delivered_at: string;
}

const translations = {
  en: {
    title: 'Delivery History',
    noDeliveries: 'No deliveries yet',
    status: {
      pending: 'Pending',
      accepted: 'Accepted',
      picked_up: 'Picked Up',
      in_transit: 'In Transit',
      delivered: 'Delivered',
      canceled: 'Canceled',
    },
    pickup: 'Pickup',
    dropoff: 'Dropoff',
    recipient: 'Recipient',
    package: 'Package',
    price: 'Price',
  },
  fr: {
    title: 'Historique des livraisons',
    noDeliveries: 'Aucune livraison pour le moment',
    status: {
      pending: 'En attente',
      accepted: 'Acceptée',
      picked_up: 'Récupérée',
      in_transit: 'En transit',
      delivered: 'Livrée',
      canceled: 'Annulée',
    },
    pickup: 'Collecte',
    dropoff: 'Dépôt',
    recipient: 'Destinataire',
    package: 'Colis',
    price: 'Prix',
  },
  ar: {
    title: 'سجل التوصيلات',
    noDeliveries: 'لا توجد توصيلات بعد',
    status: {
      pending: 'قيد الانتظار',
      accepted: 'مقبولة',
      picked_up: 'تم الاستلام',
      in_transit: 'قيد النقل',
      delivered: 'تم التوصيل',
      canceled: 'ملغاة',
    },
    pickup: 'الاستلام',
    dropoff: 'التسليم',
    recipient: 'المستلم',
    package: 'الطرد',
    price: 'السعر',
  }
};

export function DeliveryHistory({ language, userId }: DeliveryHistoryProps) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const t = translations[language];

  useEffect(() => {
    fetchDeliveries();

    const channel = supabase
      .channel('deliveries-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries', filter: `customer_id=eq.${userId}` }, () => {
        fetchDeliveries();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchDeliveries = async () => {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDeliveries(data);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      accepted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      picked_up: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      in_transit: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      delivered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      canceled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[status] || colors.pending;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          {t.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {deliveries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t.noDeliveries}</p>
          ) : (
            deliveries.map((delivery) => (
              <Card key={delivery.id} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <Badge className={getStatusColor(delivery.status)}>
                      {t.status[delivery.status as keyof typeof t.status]}
                    </Badge>
                    <span className="text-sm font-semibold text-primary">
                      {delivery.final_price || delivery.estimated_price} TND
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">{t.pickup}:</span> {delivery.pickup_location}
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">{t.dropoff}:</span> {delivery.dropoff_location}
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">{t.recipient}:</span> {delivery.recipient_name}
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>{delivery.recipient_phone}</div>
                    </div>

                    {delivery.package_description && (
                      <div className="flex items-start gap-2">
                        <Package className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium">{t.package}:</span> {delivery.package_description}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
