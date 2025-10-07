import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface RideChatProps {
  rideId: string;
  userRole: 'customer' | 'driver';
}

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_role: 'customer' | 'driver';
  message: string;
  created_at: string;
}

export default function RideChat({ rideId, userRole }: RideChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let channel: any;
    async function fetchAndSubscribe() {
      setLoading(true);
      const { data, error } = await supabase
        .from('ride_chat_messages')
        .select('*')
        .eq('ride_id', rideId)
        .order('created_at', { ascending: true });
      if (!error && data) {
        setMessages(data.map(msg => ({
          ...msg,
          sender_role: (msg.sender_role === 'customer' || msg.sender_role === 'driver') ? msg.sender_role as ('customer' | 'driver') : 'customer'
        })));
      }
      setLoading(false);
      channel = supabase
        .channel('ride-chat-' + rideId)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ride_chat_messages', filter: `ride_id=eq.${rideId}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setMessages((prev) => [...prev, payload.new as ChatMessage]);
            }
          }
        )
        .subscribe();
    }
    fetchAndSubscribe();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [rideId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user) return;
    await supabase.from('ride_chat_messages').insert({
      ride_id: rideId,
      sender_id: user.id,
      sender_role: userRole,
      message: input.trim(),
    });
    setInput('');
  };

  return (
    <div className="flex flex-col h-64 border rounded-lg bg-white dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="text-center text-muted-foreground">Loading chat...</div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-xs px-3 py-2 rounded-lg text-sm shadow-sm ${
                msg.sender_id === user?.id
                  ? 'ml-auto bg-blue-500 text-white'
                  : 'mr-auto bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              }`}
            >
              <span>{msg.message}</span>
              <div className="text-xs opacity-60 mt-1 text-right">
                {new Date(msg.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2 p-2 border-t bg-gray-50 dark:bg-gray-800">
        <input
          className="flex-1 rounded px-2 py-1 border"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
        />
        <button
          className="px-4 py-1 rounded bg-blue-500 text-white font-semibold disabled:opacity-50"
          onClick={sendMessage}
          disabled={!input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
