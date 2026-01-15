"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCollectionStore } from '@/hooks/useCollectionStore';
import { streamers } from '@/data/streamers';
import { MapEventOverlay, MapEventType } from './MapEventOverlay';
import { DataStream } from './DataStream';
import { useAudioSystem } from '@/hooks/useAudioSystem';
import { BlackMarket } from './BlackMarket';
import { ShoppingCart } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export const ResistanceMap: React.FC<{ onSectorClick?: (streamer: any) => void }> = ({ onSectorClick }) => {
    const completedMissions = useCollectionStore(state => state.completedMissions);
    const addItem = useCollectionStore(state => state.addItem);
    const updateDifficulty = useCollectionStore(state => state.updateDifficulty);
    const { playEvent, playMapAmbient } = useAudioSystem();
    const [activeEvent, setActiveEvent] = useState<{ type: MapEventType, title: string, message: string, reward?: string } | null>(null);
    const [revealedBosses, setRevealedBosses] = useState<string[]>([]);
    const [isMarketOpen, setIsMarketOpen] = useState(false);

    // Global Faction War State
    const [sectorControl, setSectorControl] = useState<Record<string, 'RED' | 'PURPLE' | 'NONE'>>({});

    // 1. Initialization Effect: Load Bosses (Run ONCE)
    useEffect(() => {
        const saved = localStorage.getItem('pts_revealed_bosses');
        if (saved) {
            try {
                setRevealedBosses(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse revealed bosses", e);
            }
        }
    }, []);

    // 2. Network Subscription Effect: Sector Control (Run ONCE)
    useEffect(() => {
        const fetchControl = async () => {
            const { data } = await supabase.from('sector_control').select('*');
            if (data) {
                const map: Record<string, any> = {};
                data.forEach(row => map[row.streamer_id] = row.controlling_faction);
                setSectorControl(map);
            }
        };
        fetchControl();

        const channel = supabase
            .channel('global_faction_war')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sector_control' }, (payload) => {
                const updated = payload.new as any;
                setSectorControl(prev => ({
                    ...prev,
                    [updated.streamer_id]: updated.controlling_faction
                }));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // 3. Random Event Effect (Run ONCE on mount)
    // Depends on getting data, but we want it to happen shortly after load
    useEffect(() => {
        const roll = Math.random();
        if (roll < 0.2) {
            const events: { type: MapEventType, title: string, message: string, reward?: string }[] = [
                {
                    type: 'SIGNAL_FLARE',
                    title: 'SIGNAL_FLARE_DETECTED',
                    message: 'Encryption cache intercepted in Sector 7. Neural assets recovered.',
                    reward: '1x STIM_PACK'
                },
                {
                    type: 'DATA_MOSS',
                    title: 'SECURE_DATA_LEAK',
                    message: 'Fragmented corporate logs recovered. Deep-scan active on locked nodes.',
                    reward: 'BOSS_INTEL_REVEALED'
                },
                {
                    type: 'AUTHORITY_SWEEP',
                    title: 'SWEEP_PROTOCOL_ACTIVE',
                    message: 'Authority drones are scanning the grid. Tactical resistance is advised.',
                    reward: 'THREAT_LEVEL_INCREASED'
                }
            ];

            const selected = events[Math.floor(Math.random() * events.length)];

            setTimeout(() => {
                setActiveEvent(selected);
                playEvent();

                if (selected.type === 'SIGNAL_FLARE') {
                    addItem('stim_pack', 1);
                } else if (selected.type === 'DATA_MOSS') {
                    // We need latest state here, but to avoid deps loop, we can use functional updates or specific logic
                    // For simplicity in this event, we'll read from localStorage directly to double check
                    // or just reveal a random one that isn't commonly revealed
                    const saved = localStorage.getItem('pts_revealed_bosses');
                    const currentRevealed = saved ? JSON.parse(saved) : [];

                    const locked = streamers.filter(s => !currentRevealed.includes(s.id));

                    if (locked.length > 0) {
                        const reveal = locked[Math.floor(Math.random() * locked.length)].id;
                        const updated = [...currentRevealed, reveal];
                        setRevealedBosses(updated);
                        localStorage.setItem('pts_revealed_bosses', JSON.stringify(updated));
                    }
                } else if (selected.type === 'AUTHORITY_SWEEP') {
                    updateDifficulty(1.1);
                }
            }, 1000);
        }
    }, [addItem, playEvent, updateDifficulty]); // These deps are stable from stores

    // 4. Ambient Audio Effect (Run ONCE)
    useEffect(() => {
        const ambientInterval = setInterval(() => {
            if (Math.random() > 0.7) playMapAmbient();
        }, 10000);

        return () => clearInterval(ambientInterval);
    }, [playMapAmbient]);

    // Hand-curated coordinates for a more "strategic" look
    const sectorCoords: Record<string, { x: number, y: number }> = {
        // AMP Sector (Top Left)
        'kaicenat': { x: 28, y: 25 },
        'dukedennis': { x: 20, y: 32 },
        'fanum': { x: 32, y: 38 },
        'agent00': { x: 38, y: 28 },

        // W/L Community & Chaos (Bottom Left)
        'adinross': { x: 15, y: 65 },
        'ishowspeed': { x: 25, y: 78 },
        'druski': { x: 42, y: 35 },

        // Content Creator Sector (Top Right)
        'zoey': { x: 72, y: 25 },
        'rakai': { x: 82, y: 35 },
        'reggie': { x: 72, y: 38 },
        'plaqueboymax': { x: 88, y: 22 },
        'sneako': { x: 92, y: 32 },
        'hasanabi': { x: 62, y: 22 },

        // Featured Streamers (Bottom Right)
        'ddg': { x: 75, y: 75 },
        'rayasianboy': { x: 78, y: 65 },
        'extraemily': { x: 88, y: 72 },
        'jazzygunz': { x: 85, y: 80 },

        // Wildcards (Strategic Positions)
        'xqc': { x: 50, y: 18 },       // Top Center (The React Core)
        'tylil': { x: 50, y: 82 },     // Bottom Center (Lane Defense)
        'bendadonnn': { x: 58, y: 55 },    // Mid (Oddball)
    };

    const sectors = streamers.map((s, index) => {
        const curated = sectorCoords[s.id];
        const control = sectorControl[s.id] || 'NONE';
        if (curated) return {
            ...s,
            cleared: completedMissions.some(m => m.id === s.id),
            ...curated,
            control
        };

        // Fallback: Deterministic placement around the edges if not curated
        const angle = (index * (360 / streamers.length)) * (Math.PI / 180);
        const radius = 35 + (index % 3) * 5;
        const x = 50 + Math.cos(angle) * radius;
        const y = 50 + Math.sin(angle) * radius;

        return {
            ...s,
            cleared: completedMissions.some(m => m.id === s.id),
            x,
            y,
            control
        };
    });

    const isHQUnlocked = completedMissions.length >= streamers.length;
    const ceoStreamer = {
        id: 'ceo',
        name: 'V.A.L.U.E.',
        archetype: 'UPLINK_COMMANDER',
        stats: { influence: 100, chaos: 100, charisma: 100, rebellion: 100 },
        moves: [
            { name: "CORE_STRIKE", type: "REBELLION", power: 100, pp: 5, description: "A direct assault on the mainframe." },
            { name: "DATA_SHIELD", type: "INTEL", power: 0, pp: 10, description: "Reinforces neural integrity." },
            { name: "VIRAL_INJECTION", type: "CHAOS", power: 80, pp: 8, description: "Corrupts corporate assets." }
        ],
        visualPrompt: "Corporate Overlord",
        ultimateMove: { name: "THE_FINAL_CLEANSE", type: "CHAOS", power: 500, pp: 1, description: "Complete system reset." }
    };
    return (
        <div className="relative w-full aspect-square md:aspect-video bg-black/60 border-2 border-white/5 overflow-hidden group no-select rounded-lg shadow-2xl">
            {/* Background Texture */}
            <div className="absolute inset-0 bg-[url('/grid_pattern.png')] opacity-20" />

            <DataStream />

            {/* Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,243,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

            {/* Radar Scan Circle */}
            <motion.div
                animate={{ scale: [1, 2], opacity: [0.3, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeOut" }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] aspect-square border border-neon-blue/30 rounded-full pointer-events-none"
            />

            {/* Global Signal Strength */}
            <div className="absolute top-4 right-4 text-right flex flex-col items-end gap-1 pointer-events-none z-10">
                <div className="text-[7px] font-black text-neon-blue tracking-widest uppercase">Global_Resistance_Uplink</div>
                <div className="flex gap-0.5">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-1 h-3 ${i < (completedMissions.length / streamers.length * 20) ? 'bg-neon-green shadow-[0_0_5px_#39ff14]' : 'bg-white/5'}`}
                        />
                    ))}
                </div>
            </div>

            <svg className="absolute inset-0 w-full h-full opacity-40 pointer-events-none">
                {/* Connection Lines to HQ */}
                {sectors.map((s, i) => (
                    <motion.line
                        key={`hq-line-${i}`}
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        x1={`${s.x}%`} y1={`${s.y}%`}
                        x2="50%" y2="50%"
                        stroke={s.cleared ? "#39ff14" : "#ff003c"}
                        strokeWidth={s.cleared ? "1.5" : "0.5"}
                        strokeDasharray={s.cleared ? "none" : "2,4"}
                        className={s.cleared ? "animate-pulse" : ""}
                    />
                ))}
            </svg>

            {/* Sector Nodes */}
            {sectors.map((sector) => (
                <motion.div
                    key={sector.id}
                    style={{ left: `${sector.x}%`, top: `${sector.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer z-20 group/node"
                    animate={{
                        y: [sector.y + "%", (parseFloat(sector.y.toString()) + 0.5) + "%", sector.y + "%"],
                    }}
                    transition={{
                        duration: 3 + Math.random() * 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    whileHover={{ scale: 1.2 }}
                    onClick={() => onSectorClick?.(sector)}
                >
                    {/* Invisible Hit Area for better touch targets */}
                    <div className="absolute inset-0 -m-4 md:-m-2 z-[-1] rounded-full" />

                    <div className={`w-4 h-4 md:w-5 md:h-5 border-2 rotate-45 transition-all duration-500 relative ${sector.control === 'RED' ? 'bg-red-600 border-red-400 shadow-[0_0_15px_#ff003c]' :
                        sector.control === 'PURPLE' ? 'bg-purple-600 border-purple-400 shadow-[0_0_15px_#a855f7]' :
                            sector.cleared ? 'bg-neon-green border-neon-green shadow-[0_0_15px_#39ff14]' :
                                'bg-black border-red-500/40 hover:border-red-500 shadow-[0_0_5px_rgba(255,0,60,0.2)]'
                        }`}>
                        {!sector.cleared && sector.control === 'NONE' && (
                            <motion.div
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 bg-red-500/20"
                            />
                        )}
                    </div>

                    <div className="mt-2 text-[6px] md:text-[7px] font-mono font-black tracking-widest bg-black/95 px-2 py-1 border border-white/10 group-hover/node:border-neon-blue transition-colors rounded-sm shadow-xl flex flex-col items-center min-w-[60px]">
                        <span className={
                            sector.control === 'RED' ? 'text-red-400' :
                                sector.control === 'PURPLE' ? 'text-purple-400' :
                                    sector.cleared ? 'text-neon-green' :
                                        'text-red-500/60 group-hover/node:text-red-500'
                        }>
                            {sector.name.toUpperCase()}
                        </span>
                        {sector.control !== 'NONE' && (
                            <span className={`text-[4px] font-bold mt-0.5 ${sector.control === 'RED' ? 'text-red-500' : 'text-purple-500'}`}>
                                [CONTROL: {sector.control}]
                            </span>
                        )}
                        {!sector.cleared && sector.control === 'NONE' && (
                            <span className="text-[4px] text-red-500/30 font-bold mt-0.5 group-hover/node:text-red-500/80 animate-pulse">
                                {revealedBosses.includes(sector.id) ? `BOSS: ${sector.archetype.split('_')[0]} UNKNOWN` : 'THREAT_DETECTED'}
                            </span>
                        )}
                        {revealedBosses.includes(sector.id) && !sector.cleared && (
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-neon-blue text-black px-1 py-0.5 text-[5px] font-bold rounded-sm animate-bounce">
                                INTEL_REVEALED
                            </div>
                        )}
                    </div>
                </motion.div>
            ))}

            {/* Central HQ Node */}
            <motion.div
                style={{ left: '50%', top: '50%' }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-30"
                animate={isHQUnlocked ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
            >
                <motion.div
                    onClick={() => isHQUnlocked && onSectorClick?.(ceoStreamer)}
                    className={`w-16 h-16 border-4 rotate-45 flex items-center justify-center transition-all duration-700 relative ${isHQUnlocked
                        ? 'bg-resistance-accent/20 border-resistance-accent shadow-[0_0_40px_#ff003c] cursor-pointer hover:scale-110'
                        : 'bg-neon-blue/5 border-neon-blue/20 shadow-[0_0_20px_rgba(0,243,255,0.1)] opacity-80'
                        }`}
                >
                    <div className={`w-6 h-6 rotate-45 animate-pulse ${isHQUnlocked ? 'bg-resistance-accent shadow-[0_0_20px_#ff003c]' : 'bg-neon-blue/20 shadow-[0_0_10px_rgba(0,243,255,0.3)]'}`} />

                    {/* Decorative Rings */}
                    <div className="absolute inset-0 border border-white/5 animate-spin-slow pointer-events-none" />
                </motion.div>
                <div className="mt-6 text-[8px] md:text-[9px] font-black tracking-[0.5em] bg-black/95 px-4 py-2 border border-resistance-accent/50 text-center shadow-2xl">
                    <span className={isHQUnlocked ? 'text-resistance-accent animate-pulse' : 'text-white/20'}>
                        [ SECTOR_00: CORPORATE_HQ ]
                    </span>
                    <br />
                    <span className={`text-[6px] md:text-[7px] mt-1 block font-mono font-bold ${isHQUnlocked ? 'text-resistance-accent/80' : 'text-white/10'}`}>
                        {isHQUnlocked ? '>>> THREAT_VECTORS_OPEN <<<' : 'SIGNAL_ENCRYPTED_LOCKED'}
                    </span>
                </div>
            </motion.div>

            {/* Corner Decorative Elements */}
            <div className="absolute top-4 left-4 font-mono text-[7px] text-white/40 space-y-1 pointer-events-none">
                <div>GEO_SYNC: ACTIVE</div>
                <div>SIGNAL_DENSITY: {Math.floor(Math.random() * 100)}%</div>
                <div className="text-neon-blue">ENCRYPTION: LEVEL_99</div>
            </div>

            {/* Black Market Trigger */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
                <motion.button
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(168, 85, 247, 0.4)' }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsMarketOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500 text-purple-400 font-black tracking-widest text-[10px] uppercase rounded-full shadow-[0_0_20px_rgba(168,85,247,0.3)] backdrop-blur-sm"
                >
                    <ShoppingCart size={14} className="animate-pulse" />
                    Black Market Uplink
                </motion.button>
            </div>

            {/* Status Legend & Global Progress */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none">
                <div className="font-mono text-[8px] space-y-2 bg-black/90 p-3 border border-white/10 rounded-sm pointer-events-auto shadow-2xl backdrop-blur-md">
                    <div className="text-[7px] text-white/40 mb-2 font-black tracking-widest border-b border-white/5 pb-1 uppercase">Tactical_Grid_Legend</div>
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-red-600 border border-red-400 rotate-45 shadow-[0_0:5px_#ff003c]" />
                        <span className="text-red-400 font-black">RED DOMINATED</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-purple-600 border border-purple-400 rotate-45 shadow-[0_0:5px_#a855f7]" />
                        <span className="text-purple-400 font-black">PURPLE DOMINATED</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-neon-green border border-neon-green rotate-45 shadow-[0_0:5px_#39ff14]" />
                        <span className="text-neon-green font-black">STRIKE TEAM SECURED</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-black border border-red-500/50 rotate-45" />
                        <span className="text-white/40 font-black tracking-tighter">CORPORATE_HEGEMONY</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-resistance-accent border border-resistance-accent rotate-45 shadow-[0_0:5px_#ff003c]" />
                        <span className="text-resistance-accent font-black tracking-tighter">CORPORATE_HQ</span>
                    </div>
                </div>

                <div className="bg-black/90 p-4 border border-white/10 rounded-sm pointer-events-auto shadow-2xl backdrop-blur-md min-w-[180px]">
                    <div className="flex justify-between items-end mb-2">
                        <div className="text-[7px] text-white/40 font-black tracking-widest uppercase">Global_Liberation_Rating</div>
                        <div className="text-xl font-black text-neon-green italic leading-none">
                            {Math.round((completedMissions.length / streamers.length) * 100)}%
                        </div>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(completedMissions.length / streamers.length) * 100}%` }}
                            transition={{ duration: 1.5, ease: "circOut" }}
                            className="h-full bg-gradient-to-r from-neon-blue to-neon-green shadow-[0_0:15px_rgba(57,255,20,0.4)]"
                        />
                    </div>
                    <div className="text-[6px] text-white/20 mt-2 font-mono uppercase tracking-tighter text-right">
                        {completedMissions.length} of {streamers.length} Nodes Secured
                    </div>
                </div>
            </div>

            {/* UI SCAN OVERLAY */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_0%,rgba(0,243,255,0.02)_50%,transparent_100%)] bg-[size:100%_4px] animate-scan" />

            {/* Black Market Modal */}
            {isMarketOpen && (
                <BlackMarket onClose={() => setIsMarketOpen(false)} />
            )}

            {/* Map Event Overlay */}
            <MapEventOverlay
                event={activeEvent}
                onClose={() => setActiveEvent(null)}
            />
        </div>
    );
};
