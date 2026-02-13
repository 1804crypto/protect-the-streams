import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface ChatMessage {
    id: string;
    faction_id: string;
    sender_name: string;
    message: string;
    type: 'USER' | 'DISPATCH' | 'STREAMER';
    timestamp: string;
    metadata?: Record<string, string | number | boolean>;
}

export const useFactionChat = (factionId: string) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    useEffect(() => {
        // Fetch initial history (last 20 messages)
        const fetchHistory = async () => {
            const { data, error } = await supabase
                .from('faction_chat')
                .select('*')
                .eq('faction_id', factionId)
                .order('timestamp', { ascending: false })
                .limit(20);

            if (!error && data) {
                setMessages(data.reverse());
            }
        };

        fetchHistory();

        // Subscribe to real-time updates
        const channel = supabase
            .channel(`faction_chat:${factionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'faction_chat',
                    filter: `faction_id=eq.${factionId}`
                },
                (payload) => {
                    const newMsg = payload.new as ChatMessage;
                    setMessages((prev) => [...prev, newMsg]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [factionId]);

    const sendMessage = async (message: string, senderName: string) => {
        if (!message.trim()) return;

        await supabase.from('faction_chat').insert({
            faction_id: factionId,
            sender_name: senderName,
            message: message,
            type: 'USER'
        });
    };

    return { messages, sendMessage };
};
