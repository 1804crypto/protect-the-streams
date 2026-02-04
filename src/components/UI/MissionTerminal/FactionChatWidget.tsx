"use client";

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFactionChat } from '@/hooks/useFactionChat';

interface FactionChatWidgetProps {
    factionId: string; // 'RED' | 'PURPLE'
    senderName: string; // User's display name
}

export const FactionChatWidget: React.FC<FactionChatWidgetProps> = ({ factionId, senderName }) => {
    const { messages, sendMessage } = useFactionChat(factionId);
    const [inputText, setInputText] = React.useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim()) {
            sendMessage(inputText, senderName);
            setInputText('');
        }
    };

    return (
        <div className="flex flex-col h-full bg-black/80 border border-white/10 rounded-sm overflow-hidden font-mono text-[10px]">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10">
                <span className="text-neon-blue font-bold tracking-widest uppercase">
                    FACTION_UPLINK: {factionId}
                </span>
                <span className="animate-pulse text-neon-green">● LIVE</span>
            </div>

            {/* Message Feed */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-3 space-y-2 relative"
            >
                <div className="absolute inset-0 pointer-events-none bg-[url('/grid.png')] opacity-5" />

                {messages.length === 0 && (
                    <div className="text-white/20 text-center mt-10">Waiting for signal...</div>
                )}

                <AnimatePresence>
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex flex-col gap-0.5 ${msg.type === 'DISPATCH' ? 'border-l-2 border-neon-pink pl-2 bg-neon-pink/5 p-1' :
                                    msg.type === 'STREAMER' ? 'border-l-2 border-neon-yellow pl-2 bg-neon-yellow/5 p-1' :
                                        ''
                                }`}
                        >
                            <div className="flex items-center gap-2 text-[8px] opacity-60">
                                <span className={
                                    msg.type === 'DISPATCH' ? 'text-neon-pink font-bold' :
                                        msg.type === 'STREAMER' ? 'text-neon-yellow font-bold' :
                                            'text-neon-blue'
                                }>
                                    {msg.sender_name}
                                </span>
                                <span className="text-white/20">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className={`text-white/90 leading-relaxed break-words ${msg.type === 'DISPATCH' ? 'italic' : ''
                                }`}>
                                {msg.message}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-2 border-t border-white/10 bg-black">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="TRANSMIT MESSAGE..."
                        className="flex-1 bg-white/5 border border-white/10 text-white px-2 py-1 text-[10px] focus:outline-none focus:border-neon-blue transition-colors placeholder:text-white/20"
                    />
                    <button
                        type="submit"
                        className="bg-white/10 text-neon-blue border border-white/10 px-3 hover:bg-neon-blue/10 hover:border-neon-blue transition-all"
                    >
                        SEND
                    </button>
                </div>
            </form>
        </div>
    );
};
