import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Ride {
  id: string;
  pickup_location: string;
  dropoff_location: string;
  status: string;
  final_price: number;
  estimated_price: number;
  created_at: string;
  ride_type: string;
  customer_id: string;
  driver_id: string;
}

export function AdminRides() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRides();
  }, []);

  const fetchRides = async () => {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setRides(data);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      completed: 'default',
      in_progress: 'secondary',
      canceled: 'destructive',
      pending: 'secondary',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Rides</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rides.map((ride) => (
              <TableRow key={ride.id}>
                <TableCell>{format(new Date(ride.created_at), 'MMM dd, HH:mm')}</TableCell>
                <TableCell className="max-w-[150px] truncate">{ride.pickup_location}</TableCell>
                <TableCell className="max-w-[150px] truncate">{ride.dropoff_location}</TableCell>
                <TableCell>{ride.ride_type}</TableCell>
                <TableCell>{getStatusBadge(ride.status)}</TableCell>
                <TableCell>{ride.final_price || ride.estimated_price} TND</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
