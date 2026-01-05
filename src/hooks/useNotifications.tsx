import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  ride_id: string | null;
  is_read: boolean;
  created_at: string;
}

export const useNotifications = (userId: string | undefined) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  
  // Use refs to prevent duplicate toasts across re-renders and hot reloads
  const shownNotificationIds = useRef(new Set<string>());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isInitialized = useRef(false);

  // Memoize toast to avoid re-subscriptions
  const showToast = useCallback((title: string, description: string, id: string) => {
    // Additional check to prevent duplicates
    if (shownNotificationIds.current.has(`toast-${id}`)) return;
    shownNotificationIds.current.add(`toast-${id}`);
    
    toast({
      title,
      description,
    });
  }, [toast]);

  useEffect(() => {
    if (!userId) return;

    // Prevent duplicate subscriptions on hot reload
    if (isInitialized.current && channelRef.current) {
      return;
    }

    // Cleanup any existing channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    let isSubscribed = true;
    isInitialized.current = true;

    // Fetch existing notifications
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data && !error && isSubscribed) {
        // Track existing notification IDs to prevent duplicate toasts
        data.forEach(n => shownNotificationIds.current.add(n.id));
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    };

    fetchNotifications();

    // Subscribe to real-time notifications with stable channel name
    const channelName = `notifications-user-${userId}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!isSubscribed) return;
          
          const newNotification = payload.new as Notification;
          
          // Prevent duplicates using ref
          if (shownNotificationIds.current.has(newNotification.id)) return;
          shownNotificationIds.current.add(newNotification.id);
          
          setNotifications(prev => {
            if (prev.some(n => n.id === newNotification.id)) return prev;
            return [newNotification, ...prev];
          });
          setUnreadCount(prev => prev + 1);
          
          // Show toast notification with unique ID check
          showToast(newNotification.title, newNotification.message, newNotification.id);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      isSubscribed = false;
      isInitialized.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, showToast]);

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
};
