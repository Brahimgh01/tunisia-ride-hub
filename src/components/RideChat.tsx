import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  const [sending, setSending] = useState(false);
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
    if (!input.trim() || !user || sending) return;
    setSending(true);
    await supabase.from('ride_chat_messages').insert({
      ride_id: rideId,
      sender_id: user.id,
      sender_role: userRole,
      message: input.trim(),
    });
    setInput('');
    setSending(false);
  };

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden bg-background/95 backdrop-blur-xl border border-border/50 shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border/50">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <MessageCircle className="h-4 w-4 text-primary" />
        </div>
        <span className="font-medium text-sm">Chat with {userRole === 'customer' ? 'Driver' : 'Customer'}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 h-56 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-muted/20 to-background">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground">Loading messages...</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                  msg.sender_id === user?.id
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                }`}
              >
                <p className="break-words">{msg.message}</p>
                <div className={`text-[10px] mt-1 ${msg.sender_id === user?.id ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-3 border-t border-border/50 bg-background">
        <Input
          className="flex-1 rounded-xl border-border/50 bg-muted/50 focus-visible:ring-primary/30"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Type a message..."
        />
        <Button
          size="icon"
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          className="h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 transition-all hover:scale-105 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
