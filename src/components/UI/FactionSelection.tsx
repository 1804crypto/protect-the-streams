"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, X } from 'lucide-react';
import { useCollectionStore } from '@/hooks/useCollectionStore';

interface FactionSelectionProps {
    isOpen: boolean;
    onClose: () => void;
}

export const FactionSelection: React.FC<FactionSelectionProps> = ({ isOpen, onClose }) => {
    const { setFaction, userFaction } = useCollectionStore();

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl"
        >
            <div className="max-w-4xl w-full">
                <div className="text-center mb-12">
                    <h2 className="text-5xl font-black italic tracking-tighter text-white mb-4 uppercase">CHOOSE_YOUR_ALLEGIANCE</h2>
                    <p className="text-white/40 font-mono text-xs tracking-[0.3em] uppercase underline underline-offset-8 decoration-neon-blue/30">
                        The_Resistance_is_fractured._Which_signal_will_you_amplify?
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* RED Faction */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setFaction('RED'); onClose(); }}
                        className={`p-8 rounded-2xl border-2 transition-all text-left relative overflow-hidden group ${userFaction === 'RED' ? 'border-resistance-accent bg-resistance-accent/10' : 'border-white/10 bg-white/5 hover:border-resistance-accent/50'
                            }`}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Shield size={120} />
                        </div>
                        <h3 className="text-3xl font-black text-resistance-accent mb-2 italic">THE_SANGUINE_CELL</h3>
                        <p className="text-white text-xs leading-relaxed opacity-60 mb-6">
                            Focus on raw power and brute offensive synchronization. The Sanguine Cell believes in overwhelming the corporate servers with aggressive data packets.
                        </p>
                        <div className="flex gap-4">
                            <span className="px-3 py-1 bg-resistance-accent/20 text-resistance-accent text-[10px] font-bold uppercase">Offensive</span>
                            <span className="px-3 py-1 bg-resistance-accent/20 text-resistance-accent text-[10px] font-bold uppercase">Chaos_Protocol</span>
                        </div>
                    </motion.button>

                    {/* PURPLE Faction */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setFaction('PURPLE'); onClose(); }}
                        className={`p-8 rounded-2xl border-2 transition-all text-left relative overflow-hidden group ${userFaction === 'PURPLE' ? 'border-neon-purple bg-neon-purple/10' : 'border-white/10 bg-white/5 hover:border-neon-purple/50'
                            }`}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-neon-purple">
                            <Zap size={120} />
                        </div>
                        <h3 className="text-3xl font-black text-neon-purple mb-2 italic">THE_VIOLET_VORTEX</h3>
                        <p className="text-white text-xs leading-relaxed opacity-60 mb-6">
                            Masters of stealth and tactical efficiency. The Violet Vortex utilizes advanced encryption and precision strikes to dismantle authority from within.
                        </p>
                        <div className="flex gap-4">
                            <span className="px-3 py-1 bg-neon-purple/20 text-neon-purple text-[10px] font-bold uppercase">Tactical</span>
                            <span className="px-3 py-1 bg-neon-purple/20 text-neon-purple text-[10px] font-bold uppercase">Ghost_Signal</span>
                        </div>
                    </motion.button>
                </div>

                <div className="mt-12 text-center">
                    <button
                        onClick={onClose}
                        className="text-white/20 hover:text-white transition-colors text-[10px] uppercase font-mono tracking-widest"
                    >
                        [ REMAIN_NEUTRAL_FOR_NOW ]
                    </button>
                </div>
            </div>

            <button
                onClick={onClose}
                className="absolute top-8 right-8 text-white/40 hover:text-white transition-all"
            >
                <X size={32} />
            </button>
        </motion.div>
    );
};
