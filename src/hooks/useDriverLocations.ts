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
    // Only fetch available drivers
    const { data, error } = await supabase
      .from('driver_locations_safe')
      .select('*')
      .eq('is_available', true);

    if (error) {
      console.error('Error fetching driver locations:', error);
      setDriverLocations([]);
    } else {
      console.log('📍 Available drivers:', data?.length || 0);
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
        { event: 'INSERT', schema: 'public', table: 'driver_locations' },
        (payload) => {
          console.log('📍 Driver location INSERT:', payload);
          fetchDriverLocations();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'driver_locations' },
        (payload) => {
          console.log('📍 Driver location UPDATE:', payload);
          // Immediately update if availability changed
          fetchDriverLocations();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'driver_locations' },
        (payload) => {
          console.log('📍 Driver location DELETE:', payload);
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
