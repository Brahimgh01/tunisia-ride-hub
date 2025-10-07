import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { MapLocation } from './Map';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, MapPin, Phone, User, Navigation } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/hooks/useAuth';
import Map from '@/components/Map';

interface BookDeliveryProps {
  language: Language;
  userId: string;
}

const translations = {
  en: {
    title: 'Book a Delivery',
    description: 'Send packages across Tunisia',
    pickup: 'Pickup Location',
    dropoff: 'Dropoff Location',
    recipientName: 'Recipient Name',
    recipientPhone: 'Recipient Phone',
    packageDesc: 'Package Description',
    packageSize: 'Package Size',
    small: 'Small (< 5kg)',
    medium: 'Medium (5-15kg)',
    large: 'Large (15-30kg)',
    notes: 'Additional Notes',
    estimatedPrice: 'Estimated Price',
    bookDelivery: 'Book Delivery',
    booking: 'Booking...',
    success: 'Delivery Booked!',
    successMsg: 'Your delivery request has been submitted.',
    error: 'Error',
    errorMsg: 'Failed to book delivery. Please try again.',
  },
  fr: {
    title: 'Réserver une Livraison',
    description: 'Envoyez des colis à travers la Tunisie',
    pickup: 'Lieu de collecte',
    dropoff: 'Lieu de dépôt',
    recipientName: 'Nom du destinataire',
    recipientPhone: 'Téléphone du destinataire',
    packageDesc: 'Description du colis',
    packageSize: 'Taille du colis',
    small: 'Petit (< 5kg)',
    medium: 'Moyen (5-15kg)',
    large: 'Grand (15-30kg)',
    notes: 'Notes supplémentaires',
    estimatedPrice: 'Prix estimé',
    bookDelivery: 'Réserver la livraison',
    booking: 'Réservation...',
    success: 'Livraison réservée!',
    successMsg: 'Votre demande de livraison a été soumise.',
    error: 'Erreur',
    errorMsg: 'Échec de la réservation. Veuillez réessayer.',
  },
  ar: {
    title: 'حجز توصيل',
    description: 'أرسل الطرود عبر تونس',
    pickup: 'موقع الاستلام',
    dropoff: 'موقع التسليم',
    recipientName: 'اسم المستلم',
    recipientPhone: 'هاتف المستلم',
    packageDesc: 'وصف الطرد',
    packageSize: 'حجم الطرد',
    small: 'صغير (< 5كجم)',
    medium: 'متوسط (5-15كجم)',
    large: 'كبير (15-30كجم)',
    notes: 'ملاحظات إضافية',
    estimatedPrice: 'السعر المقدر',
    bookDelivery: 'احجز التوصيل',
    booking: 'جاري الحجز...',
    success: 'تم حجز التوصيل!',
    successMsg: 'تم إرسال طلب التوصيل الخاص بك.',
    error: 'خطأ',
    errorMsg: 'فشل حجز التوصيل. يرجى المحاولة مرة أخرى.',
  }
};

export function BookDelivery({ language, userId }: BookDeliveryProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [packageSize, setPackageSize] = useState('small');
  const [pickupCoords, setPickupCoords] = useState<MapLocation>({ lat: 0, lng: 0 });
  const [dropoffCoords, setDropoffCoords] = useState<MapLocation>({ lat: 0, lng: 0 });
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [distance, setDistance] = useState<number>(0);
  const [estimatedPrice, setEstimatedPrice] = useState<number>(0);
  const { toast } = useToast();
  const t = translations[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.target as HTMLFormElement);
    const pickupLocation = formData.get('pickupLocation') as string;
    const dropoffLocation = formData.get('dropoffLocation') as string;
    const recipientName = formData.get('recipientName') as string;
    const recipientPhone = formData.get('recipientPhone') as string;
    const packageDescription = formData.get('packageDescription') as string;
    const customerNotes = formData.get('customerNotes') as string;

    // Use actual coordinates from state
    if (pickupCoords.lat === 0 || dropoffCoords.lat === 0) {
      toast({
        title: t.error,
        description: 'Please set pickup and dropoff locations on the map',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.from('deliveries').insert({
        customer_id: userId,
        pickup_location: pickupLocation,
        pickup_lat: pickupCoords.lat,
        pickup_lng: pickupCoords.lng,
        dropoff_location: dropoffLocation,
        dropoff_lat: dropoffCoords.lat,
        dropoff_lng: dropoffCoords.lng,
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        package_description: packageDescription,
        package_size: packageSize,
        customer_notes: customerNotes,
        estimated_price: estimatedPrice,
        distance_km: distance,
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: t.success,
        description: t.successMsg,
      });

      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error('Error booking delivery:', error);
      toast({
        title: t.error,
        description: t.errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDistanceCalculated = (calculatedDistance: number) => {
    setDistance(calculatedDistance);
    // Calculate price: base price + 0.45 TND per km
    const basePrice = packageSize === 'small' ? 4 : packageSize === 'medium' ? 8 : 12;
    const pricePerKm = 0.45; // Fixed rate per km
    const price = basePrice + (calculatedDistance * pricePerKm);
    setEstimatedPrice(Math.round(price * 100) / 100);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setPickupCoords(location);
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast({
            title: t.error,
            description: 'Unable to get current location. Please set it on the map.',
            variant: 'destructive',
          });
        }
      );
    }
  };

  // When map marker changes, update both coords and text field
  const handlePickupMapChange = (location: MapLocation) => {
    setPickupCoords(location);
    setPickupLocation(`${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`);
  };

  const handleDropoffMapChange = (location: MapLocation) => {
    setDropoffCoords(location);
    setDropoffLocation(`${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`);
  };

  // When text field changes, update both text and coords (if possible)
  const handlePickupChange = (value: string) => {
    setPickupLocation(value);
    // Try to parse as lat,lng
    const match = value.match(/^\s*(-?\d+\.?\d*),\s*(-?\d+\.?\d*)\s*$/);
    if (match) {
      setPickupCoords({ lat: parseFloat(match[1]), lng: parseFloat(match[2]) });
    }
  };

  const handleDropoffChange = (value: string) => {
    setDropoffLocation(value);
    const match = value.match(/^\s*(-?\d+\.?\d*),\s*(-?\d+\.?\d*)\s*$/);
    if (match) {
      setDropoffCoords({ lat: parseFloat(match[1]), lng: parseFloat(match[2]) });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          {t.title}
        </CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pickupLocation">{t.pickup}</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Navigation className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pickupLocation"
                  name="pickupLocation"
                  placeholder="123 Main St, Tunis"
                  className="pl-10"
                  value={pickupLocation}
                  onChange={(e) => handlePickupChange(e.target.value)}
                  required
                />
              </div>
              <Button type="button" onClick={getCurrentLocation} variant="outline" size="icon">
                <Navigation className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dropoffLocation">{t.dropoff}</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="dropoffLocation"
                name="dropoffLocation"
                placeholder="456 Oak Ave, Sousse"
                className="pl-10"
                value={dropoffLocation}
                onChange={(e) => handleDropoffChange(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Map Display */}
          <Map
            pickupLocation={pickupCoords.lat !== 0 ? pickupCoords : null}
            dropoffLocation={dropoffCoords.lat !== 0 ? dropoffCoords : null}
            onPickupChange={handlePickupMapChange}
            onDropoffChange={handleDropoffMapChange}
            onDistanceCalculated={handleDistanceCalculated}
            height="h-80"
            interactive={true}
          />

          {estimatedPrice > 0 && (
            <div className="bg-gradient-tunisian text-white p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">{t.estimatedPrice}</span>
                <span className="text-xl font-bold">{estimatedPrice} TND</span>
              </div>
              <div className="text-sm opacity-90 mt-1">
                Distance: {distance.toFixed(2)} km
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recipientName">{t.recipientName}</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="recipientName"
                  name="recipientName"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientPhone">{t.recipientPhone}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="recipientPhone"
                  name="recipientPhone"
                  type="tel"
                  placeholder="+216 XX XXX XXX"
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="packageDescription">{t.packageDesc}</Label>
            <Textarea
              id="packageDescription"
              name="packageDescription"
              placeholder="Documents, electronics, etc."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="packageSize">{t.packageSize}</Label>
            <Select
              name="packageSize"
              value={packageSize}
              onValueChange={setPackageSize}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">{t.small}</SelectItem>
                <SelectItem value="medium">{t.medium}</SelectItem>
                <SelectItem value="large">{t.large}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerNotes">{t.notes}</Label>
            <Textarea
              id="customerNotes"
              name="customerNotes"
              placeholder="Handle with care, etc."
              rows={2}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-tunisian"
            disabled={isLoading}
          >
            <Package className="mr-2 h-4 w-4" />
            {isLoading ? t.booking : t.bookDelivery}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
