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
        .select(`
          *,
          driver:driver_id (*)
        `)
        .eq('id', rideId)
        .single();

      if (error) throw error;
      setRide(data as unknown as Ride);
      
      // Check for status change and notify
      if (data.status && prevStatusRef.current !== data.status) {
          if(prevStatusRef.current !== null) { // Don't notify on first load
            showNotification("Ride Status Updated", { body: `Your ride is now ${data.status}.` });
          }
          prevStatusRef.current = data.status;
      }

    } catch (err: any) {
      setError(err.message || 'Failed to fetch ride details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRide();

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
    const { error } = await supabase
      .from('rides')
      .update({ 
        status: 'canceled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: 'customer'
      })
      .eq('id', rideId)
      .eq('customer_id', user!.id);
    
    if (error) {
      console.error('Cancel error:', error);
      toast.error("Failed to cancel ride.");
    } else {
      toast.success("Ride has been canceled.");
      onRideComplete();
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
            <Badge variant={ride.status === 'completed' ? 'default' : 'secondary'}>{ride.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RideMap ride={ride} />
          {ride.driver && (
            <Alert className="mt-4">
              <AlertTitle>Driver on the way!</AlertTitle>
              <AlertDescription>
                {ride.driver.full_name} is coming to pick you up.
                <p>Vehicle: {ride.driver.vehicle_model} ({ride.driver.vehicle_color})</p>
                <p>License Plate: {ride.driver.license_plate_number}</p>
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

      {canCancel && (
        <Button variant="destructive" onClick={handleCancelRide} className="w-full">
          Cancel Ride
        </Button>
      )}

      {(ride.status === 'completed' || ride.status === 'rated' || ride.status === 'canceled') && (
          <Button onClick={onRideComplete} className="w-full">
              Book Another Ride
          </Button>
      )}
    </div>
  );
}
