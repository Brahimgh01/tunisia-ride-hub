-- Migration: Create ride_chat_messages table for in-app chat
CREATE TABLE IF NOT EXISTS public.ride_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'driver')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for ride_chat_messages
ALTER TABLE public.ride_chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Only ride participants can view messages
CREATE POLICY "Ride participants can view messages"
  ON public.ride_chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.rides r
    WHERE r.id = ride_chat_messages.ride_id
      AND (r.customer_id = auth.uid() OR r.driver_id = auth.uid())
  ));

-- Policy: Only ride participants can insert messages
CREATE POLICY "Ride participants can insert messages"
  ON public.ride_chat_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.rides r
    WHERE r.id = ride_chat_messages.ride_id
      AND (r.customer_id = auth.uid() OR r.driver_id = auth.uid())
  ));

CREATE INDEX IF NOT EXISTS idx_ride_chat_messages_ride_id ON public.ride_chat_messages(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_chat_messages_created_at ON public.ride_chat_messages(created_at);
