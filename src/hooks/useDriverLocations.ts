import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export type DriverLocation = {
  id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  is_available: boolean;
  last_updated: string;
};

export function useDriverLocations() {
  const [driverLocations, setDriverLocations] = useState<DriverLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDriverLocations = useCallback(async () => {
    const { data, error } = await supabase
      .from('driver_locations_safe')
      .select('*');

    if (error) {
      console.error('Error fetching driver locations:', error);
      setDriverLocations([]);
    } else {
      setDriverLocations(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchDriverLocations();

    // Subscribe to real-time updates on driver_locations table
    const channel: RealtimeChannel = supabase
      .channel('driver-locations-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_locations' },
        () => {
           fetchDriverLocations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDriverLocations]);

  return { driverLocations, loading };
}
