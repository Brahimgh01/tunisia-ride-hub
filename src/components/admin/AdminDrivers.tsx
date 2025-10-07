import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Driver {
  id: string;
  full_name: string;
  phone: string;
  city: string;
  vehicle_type?: string;
  vehicle_model?: string;
  status?: string;
}

export function AdminDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    // Get users with driver role from user_roles table
    const { data: driverRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'driver');

    if (!driverRoles || driverRoles.length === 0) {
      setDrivers([]);
      return;
    }

    const driverUserIds = driverRoles.map(r => r.user_id);

    // Get profiles for these users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, phone, city')
      .in('user_id', driverUserIds);

    if (profiles) {
      const driversWithSubs = await Promise.all(
        profiles.map(async (profile) => {
          const { data: sub } = await supabase
            .from('driver_subscriptions')
            .select('vehicle_type, vehicle_model, status')
            .eq('driver_id', profile.user_id)
            .maybeSingle();

          return { ...profile, ...sub };
        })
      );
      setDrivers(driversWithSubs);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Drivers</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map((driver) => (
              <TableRow key={driver.id}>
                <TableCell>{driver.full_name}</TableCell>
                <TableCell>{driver.phone}</TableCell>
                <TableCell>{driver.city}</TableCell>
                <TableCell>{driver.vehicle_type} {driver.vehicle_model}</TableCell>
                <TableCell>
                  <Badge variant={driver.status === 'active' ? 'default' : 'secondary'}>
                    {driver.status || 'pending'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
