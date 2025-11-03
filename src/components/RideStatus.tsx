import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Ride } from '@/lib/types';
import RideMap from './RideMap';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Rating } from './Rating';
import RideChat from './RideChat';
import { Phone, X } from 'lucide-react';
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

export default function RideStatus({ rideId, onRideComplete }: RideStatusProps) {
  const { user, profile } = useAuth();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const prevStatusRef = useRef<string | null>(null);

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
          .select('vehicle_model, vehicle_color, license_plate_number')
          .eq('driver_id', rideData.driver_id)
          .single();

        if (!dpErr && dp) {
          rideData.driver = {
            ...(rideData.driver || {}),
            vehicle_model: dp.vehicle_model,
            vehicle_color: dp.vehicle_color,
            license_plate_number: dp.license_plate_number,
          };
        }
      }

      setRide(rideData as unknown as Ride);

      // Check for status change and notify
      if (rideData.status && prevStatusRef.current !== rideData.status) {
          if(prevStatusRef.current !== null) { // Don't notify on first load
            showNotification("Ride Status Updated", { body: `Your ride is now ${rideData.status}.` });
          }
          prevStatusRef.current = rideData.status;
      }

    } catch (err: any) {
      setError(err.message || 'Failed to fetch ride details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRide();

    // Subscribe to real-time ride updates
    const subscription = supabase
      .channel(`ride-${rideId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` },
        () => fetchRide()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
     // eslint-disable-next-line 
  }, [rideId]);

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
        toast.error('Unable to verify ride ownership before canceling.');
        setLoading(false);
        return;
      }

      if (!rideCheck) {
        toast.error('Ride not found');
        setLoading(false);
        return;
      }

      if (rideCheck.customer_id !== user!.id) {
        toast.error('You are not authorized to cancel this ride (ownership mismatch).');
        setLoading(false);
        return;
      }

      if (rideCheck.status !== 'pending') {
        toast.error('Only pending rides can be canceled.');
        setLoading(false);
        return;
      }

    } catch (err) {
      console.error('Pre-cancel check failed:', err);
      toast.error('Pre-cancel verification failed');
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
      .eq('customer_id', user!.id)
      .eq('status', 'pending');
    
    if (error) {
      console.error('Cancel error:', error);
      const message = error.message || 'Failed to cancel ride.';
      toast.error(`${message}${error.details ? ` - ${error.details}` : ''}`);
    } else {
      toast.success("Ride has been canceled.");
      onRideComplete();
    }
    setLoading(false);
  };

  const handleCallDriver = () => {
    if (ride?.driver && 'phone' in ride.driver && ride.driver.phone) {
      window.location.href = `tel:${ride.driver.phone}`;
    } else {
      toast.error("Driver phone number not available");
    }
  };

  const handleRateRide = async () => {
    if (rating === 0) {
        toast.error("Please select a rating before submitting.");
        return;
    }
    const { error } = await supabase
      .from('ride_ratings')
      .insert({
        ride_id: rideId,
        user_id: user!.id,
        driver_id: ride!.driver_id!,
        rating,
        comment,
      });

    if (error) {
      toast.error("Failed to submit rating.");
    } else {
      toast.success("Thank you for your feedback!");
      // Update ride status to 'rated'
      await supabase.from('rides').update({ status: 'rated' }).eq('id', rideId);
      onRideComplete();
    }
  };

  if (loading) return <div>Loading ride status...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!ride) return <div>Ride not found.</div>;

  const canCancel = ride.status === 'pending' || ride.status === 'accepted';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Ride Status</span>
            <div className="flex gap-2 items-center">
              <Badge variant={ride.status === 'completed' ? 'default' : 'secondary'}>
                {ride.status.replace('_', ' ').toUpperCase()}
              </Badge>
              {ride.driver && ride.status !== 'completed' && ride.status !== 'cancelled' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCallDriver}
                  className="gap-2"
                >
                  <Phone className="h-4 w-4" />
                  Call Driver
                </Button>
              )}
              {canCancel && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-2">
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Ride?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to cancel this ride? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>No, keep ride</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancelRide}>
                        Yes, cancel ride
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RideMap ride={ride} />
          {ride.driver && (
            <Alert className="mt-4">
              <AlertTitle>Driver on the way!</AlertTitle>
              <AlertDescription>
                {ride.driver.full_name} is coming to pick you up.
                <p>Vehicle: {ride.driver?.vehicle_model ?? 'Unknown'} ({ride.driver?.vehicle_color ?? 'N/A'})</p>
                <p>License Plate: {ride.driver?.license_plate_number ?? 'N/A'}</p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Ride Chat only if driver is assigned */}
      {ride.driver_id && <RideChat rideId={rideId} userRole="customer" />}

      {ride.status === 'completed' && (
          <Card>
              <CardHeader>
                  <CardTitle>Rate Your Ride</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  <Rating value={rating} onChange={setRating} />
                  <textarea 
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Leave a comment (optional)"
                      className="w-full p-2 border rounded"
                  />
                  <Button onClick={handleRateRide}>Submit Rating</Button>
              </CardContent>
          </Card>
      )}

  {(ride.status === 'completed' || ride.status === 'rated' || ride.status === 'cancelled') && (
          <Button onClick={onRideComplete} className="w-full">
              Book Another Ride
          </Button>
      )}
    </div>
  );
}
