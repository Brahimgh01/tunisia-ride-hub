import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Haversine formula to calculate distance between two lat/lng points
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      });
    }

    const { rideId } = await req.json();

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // 1. Get ride details
    const { data: rideData, error: rideError } = await supabaseAdmin
      .from('rides')
      .select('pickup_lat, pickup_lng, status')
      .eq('id', rideId)
      .single();

    if (rideError) throw new Error(`Ride fetch error: ${rideError.message}`);
    if (!rideData) throw new Error('Ride not found');
    if (rideData.status !== 'pending') throw new Error('Ride is not pending assignment');

    // 2. Get all available drivers with their locations from driver_locations table
    const { data: driverLocations, error: locationError } = await supabaseAdmin
      .from('driver_locations')
      .select('driver_id, latitude, longitude, is_available')
      .eq('is_available', true);

    if (locationError) {
      console.error('Driver location fetch error:', locationError);
      throw new Error(`Driver location fetch error: ${locationError.message}`);
    }

    if (!driverLocations || driverLocations.length === 0) {
      console.warn('No available driver locations found.');
      return new Response(JSON.stringify({ message: 'No available drivers found. Ride remains pending.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }

    // Get driver profiles for verification check
    const driverIds = driverLocations.map(loc => loc.driver_id);
    const { data: driverProfiles, error: profileError } = await supabaseAdmin
      .from('driver_profiles')
      .select('driver_id, is_verified, is_available')
      .in('driver_id', driverIds)
      .eq('is_verified', true)
      .eq('is_available', true);

    if (profileError) {
      console.error('Driver profile fetch error:', profileError);
      throw new Error(`Driver profile fetch error: ${profileError.message}`);
    }

    // Combine locations with verified profiles
    const verifiedDriverIds = new Set(driverProfiles?.map(p => p.driver_id) || []);
    const drivers = driverLocations.filter(loc => verifiedDriverIds.has(loc.driver_id));
    
    if (!drivers || drivers.length === 0) {
      // No drivers available, keep the ride as pending
      console.warn('No available drivers found.');
      return new Response(JSON.stringify({ message: 'No available drivers found. Ride remains pending.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }

    console.log(`Found ${drivers.length} available verified drivers`);

    // 3. Find the closest driver
    let closestDriver = null;
    let minDistance = Infinity;

    for (const driver of drivers) {
      const distance = haversineDistance(
        rideData.pickup_lat, 
        rideData.pickup_lng, 
        driver.latitude, 
        driver.longitude
      );
      
      console.log(`Driver ${driver.driver_id} is ${distance.toFixed(2)}km away`);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestDriver = driver;
      }
    }

    if (!closestDriver) {
      console.warn('No available drivers with valid locations found.');
      return new Response(JSON.stringify({ message: 'No available drivers with valid locations found. Ride remains pending.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }


    // 4. Assign the ride to the closest driver (but don't auto-accept)
    // Keep status as 'pending' so driver can accept/reject
    const { error: updateError } = await supabaseAdmin
      .from('rides')
      .update({ 
        driver_id: closestDriver.driver_id
        // Status remains 'pending' so driver must manually accept
      })
      .eq('id', rideId);

    if (updateError) throw new Error(`Ride assignment error: ${updateError.message}`);
    
    console.log(`Ride ${rideId} assigned to driver ${closestDriver.driver_id} at ${minDistance.toFixed(2)}km away`);
    
    // NOTE: Notification will be created by the database trigger (notify_ride_status_change)
    // when the ride status changes or when driver accepts
    // No need to create duplicate notification here

    return new Response(JSON.stringify({ 
      message: 'Ride assigned successfully', 
      driverId: closestDriver.driver_id, 
      distance: minDistance 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e) {
    const error = e as Error;
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});