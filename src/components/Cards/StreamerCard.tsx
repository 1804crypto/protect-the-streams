"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Streamer } from '@/data/streamers';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useCollectionStore } from '@/hooks/useCollectionStore';

interface StreamerCardProps {
    streamer: Streamer;
    imageUrl?: string;
    onHover?: () => void;
}

export const StreamerCard: React.FC<StreamerCardProps> = ({ streamer, imageUrl, onHover }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const secured = useCollectionStore(state => state.securedIds.includes(streamer.id));
    const isArchived = streamer.archetype.includes("Archived");
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    useEffect(() => {
        setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    }, []);

    // Mouse hover tilt effect
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x);
    const mouseYSpring = useSpring(y);

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const xPct = (mouseX / width) - 0.5;
        const yPct = (mouseY / height) - 0.5;

        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            ref={cardRef}
            onMouseMove={isTouchDevice ? undefined : handleMouseMove}
            onMouseLeave={isTouchDevice ? undefined : handleMouseLeave}
            onMouseEnter={onHover}
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
            }}
            className="relative w-[280px] md:w-[320px] h-[420px] md:h-[460px] cursor-pointer group card-mobile-active"
        >
            {/* Outer Glow */}
            <div className={`absolute -inset-2 blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-[2rem] 
                ${isArchived ? 'bg-resistance-accent/40 shadow-[0_0_30px_#ff003c]' :
                    secured ? 'bg-neon-green/40 opacity-40 shadow-[0_0_30px_rgba(0,255,159,0.3)]' : 'bg-neon-blue/20'}`} />

            {/* Card Body */}
            <div className={`relative w-full h-full glass-card overflow-hidden border flex flex-col transition-colors duration-500 ${secured ? 'border-neon-green/40 shadow-[inset_0_0_20px_rgba(0,255,159,0.1)]' : 'border-white/20'}`}>

                {/* Holographic Foil Overlay */}
                <div className={`absolute inset-0 z-10 pointer-events-none opacity-0 group-hover:opacity-30 transition-opacity duration-500 bg-[linear-gradient(105deg,transparent_20%,rgba(0,243,255,0.4)_25%,rgba(255,0,255,0.4)_35%,transparent_40%,transparent_50%,rgba(0,243,255,0.4)_55%,rgba(0,255,159,0.4)_65%,transparent_80%)] bg-[length:200%_200%] animate-[shimmer_3s_linear_infinite] ${secured ? 'opacity-20' : ''}`} />

                {/* Character Image Section */}
                <div className="relative h-[280px] w-full bg-resistance-dark overflow-hidden flex items-center justify-center">
                    {(imageUrl || streamer.image) ? (
                        <img
                            src={imageUrl || streamer.image}
                            alt={streamer.name}
                            className={`w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500 scale-110 group-hover:scale-100 
                                ${secured ? 'grayscale-0' : ''} 
                                ${isArchived ? 'animate-glitch-slow opacity-80' : ''}`}
                        />
                    ) : (
                        <div className="text-center p-8">
                            <div className="w-16 h-16 border-2 border-neon-blue/30 border-t-neon-blue rounded-full animate-spin mx-auto mb-4" />
                            <p className="font-mono text-[10px] text-neon-blue animate-pulse tracking-widest uppercase">
                // Securing Asset Intel...
                            </p>
                        </div>
                    )}

                    {/* Rank/Tier Badge */}
                    <div className={`absolute top-4 left-4 z-20 flex flex-col items-start gap-1`}>
                        <div className={`px-3 py-1 text-[10px] font-black italic skew-x-[-12deg] ${isArchived ? 'bg-purple-600 text-white animate-pulse' : 'bg-resistance-accent text-white'}`}>
                            {isArchived ? 'ARCHIVED_DATA' : `RESISTANCE ID: ${streamer.id.substring(0, 4).toUpperCase()}`}
                        </div>
                        {streamer.narrative && (
                            <div className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider skew-x-[-12deg] 
                                ${streamer.narrative.role === 'LEADER' ? 'bg-yellow-500 text-black' :
                                    streamer.narrative.role === 'DOUBLE_AGENT' ? 'bg-red-600 text-white' :
                                        'bg-blue-600 text-white'}`}>
                                {streamer.narrative.role.replace('_', ' ')}
                            </div>
                        )}
                    </div>

                    {/* Secured Notification */}
                    {secured && (
                        <div className="absolute top-4 right-4 z-20 bg-neon-green text-black px-2 py-1 text-[9px] font-black uppercase tracking-tighter">
                            SECURED
                        </div>
                    )}

                    {/* Scanline Effect */}
                    <div className="absolute inset-0 pointer-events-none opacity-10 bg-[repeating-linear-gradient(transparent,transparent_2px,rgba(0,0,0,0.5)_2px,rgba(0,0,0,0.5)_4px)]" />
                </div>

                {/* Content Section */}
                <div className="flex-1 p-5 flex flex-col justify-between bg-gradient-to-b from-transparent to-black/80">
                    <div>
                        <h3 className="text-2xl font-black neon-text-blue mb-0 group-hover:animate-glitch transition-all uppercase">
                            {streamer.name}
                        </h3>
                        <p className={`text-[10px] font-bold tracking-[0.2em] mb-4 ${secured ? 'text-neon-green' : 'text-neon-blue/60'}`}>
                            {streamer.archetype}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        {Object.entries(streamer.stats).map(([label, value]) => (
                            <div key={label} className="flex flex-col">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-[9px] text-white/40 font-mono uppercase tracking-tighter">{label}</span>
                                    <span className="text-[10px] text-white font-mono font-bold">{value}%</span>
                                </div>
                                <div className="h-1 w-full bg-white/5 overflow-hidden">
                                    <motion.div
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: value / 100 }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        className={`h-full origin-left shadow-[0_0_8px_rgba(0,243,255,0.8)] ${secured ? 'bg-neon-green' : 'bg-neon-blue'}`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
                        <span className="text-[8px] text-white/20 font-mono italic uppercase">
                            {secured ? 'SIGNAL_LOCKED' : 'ENCRYPTION: VERIFIED'}
                        </span>
                        <div className="flex gap-1">
                            <div className={`w-1 h-1 rounded-full animate-ping ${secured ? 'bg-neon-green' : 'bg-neon-blue'}`} />
                            <div className={`w-1 h-1 rounded-full ${secured ? 'bg-neon-green' : 'bg-neon-blue'}`} />
                        </div>
                    </div>
                </div>

                {/* Neon Corners */}
                <div className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 opacity-30 ${secured ? 'border-neon-green' : 'border-neon-blue'}`} />
                <div className={`absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 opacity-30 ${secured ? 'border-neon-green' : 'border-neon-blue'}`} />
            </div>
        </motion.div>
    );
};
