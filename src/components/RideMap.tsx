import Map, { MapLocation } from './Map';
import { Ride } from '@/lib/types';

interface RideMapProps {
  ride: Ride;
}

export default function RideMap({ ride }: RideMapProps) {
  const pickupLocation: MapLocation = {
    lat: ride.pickup_lat,
    lng: ride.pickup_lng
  };

  const dropoffLocation: MapLocation = {
    lat: ride.dropoff_lat,
    lng: ride.dropoff_lng
  };

  return (
    <Map
      pickupLocation={pickupLocation}
      dropoffLocation={dropoffLocation}
      height="h-96"
      showCurrentLocation={false}
      interactive={false}
    />
  );
}
