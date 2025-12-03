
export type Language = 'en' | 'fr' | 'ar';
export type UserRole = 'customer' | 'driver' | 'admin';

export interface Profile {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  city?: string;
  is_admin?: boolean;
  referral_code?: string;
  created_at?: string;
  updated_at?: string;
  
  // Driver-specific fields (from driver_profiles join)
  vehicle_type?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  license_plate_number?: string;
  license_document_url?: string;
  vehicle_registration_document_url?: string;
  vehicle_photo_url?: string;
  is_verified?: boolean;
  is_available?: boolean;
  last_location?: { lat: number, lng: number };
  rating?: number;
}

export interface RideRating {
  id: number;
  ride_id: string;
  user_id: string;
  driver_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface Ride {
  id: string;
  created_at: string;
  customer_id: string;
  driver_id: string | null;
  pickup_location: string;
  dropoff_location: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  // Note: DB uses 'cancelled' spelling
  status: 'pending' | 'accepted' | 'driver_en_route' | 'driver_arrived' | 'in_progress' | 'completed' | 'cancelled' | 'rated';
  final_price?: number;
  estimated_price?: number;
  distance_km?: number;
  ride_type?: 'taxi' | 'premium' | 'carpooling' | 'motorcycle';
  payment_method?: 'cash' | 'konnect' | 'edinar' | 'card';
  scheduled_time?: string;
  is_scheduled?: boolean;
  customer_notes?: string;
  customer_rating?: number;
  driver_rating?: number;
  
  // Relations
  ride_ratings: RideRating[];
  driver?: Profile; // from joins
}
