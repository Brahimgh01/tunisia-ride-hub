import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionStatus {
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
  loading: boolean;
}

export const useSubscription = () => {
  const { user, session } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    product_id: null,
    subscription_end: null,
    loading: true,
  });

  const checkSubscription = async () => {
    if (!user || !session) {
      setSubscriptionStatus({
        subscribed: false,
        product_id: null,
        subscription_end: null,
        loading: false,
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setSubscriptionStatus({
        subscribed: data.subscribed || false,
        product_id: data.product_id || null,
        subscription_end: data.subscription_end || null,
        loading: false,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscriptionStatus({
        subscribed: false,
        product_id: null,
        subscription_end: null,
        loading: false,
      });
    }
  };

  useEffect(() => {
    checkSubscription();

    const interval = setInterval(() => {
      checkSubscription();
    }, 60000);

    return () => clearInterval(interval);
  }, [user, session]);

  return {
    ...subscriptionStatus,
    refreshSubscription: checkSubscription,
  };
};
