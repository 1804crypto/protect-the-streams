import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, X, CreditCard, CheckCircle2, Loader2, Wallet } from 'lucide-react';
import { useCollectionStore } from '@/hooks/useCollectionStore';
import { useAudioSystem } from '@/hooks/useAudioSystem';

interface FactionSelectionProps {
    isOpen: boolean;
    onClose: () => void;
}

const FACTION_DATA = {
    RED: {
        id: 'RED',
        name: 'THE_SANGUINE_CELL',
        description: 'Focus on raw power and brute offensive synchronization. The Sanguine Cell believes in overwhelming the corporate servers with aggressive data packets.',
        stats: ['Offensive', 'Chaos_Protocol'],
        motto: 'STRENGTH_IN_SIGNALS',
        color: 'text-resistance-accent',
        bg: 'bg-resistance-accent/10',
        border: 'border-resistance-accent',
        icon: Shield
    },
    PURPLE: {
        id: 'PURPLE',
        name: 'THE_VIOLET_VORTEX',
        description: 'Masters of stealth and tactical efficiency. The Violet Vortex utilizes advanced encryption and precision strikes to dismantle authority from within.',
        stats: ['Tactical', 'Ghost_Signal'],
        motto: 'PRECISION_IN_VOID',
        color: 'text-neon-purple',
        bg: 'bg-neon-purple/10',
        border: 'border-neon-purple',
        icon: Zap
    }
};

export const FactionSelection: React.FC<FactionSelectionProps> = ({ isOpen, onClose }) => {
    const userFaction = useCollectionStore(state => state.userFaction);
    const isFactionMinted = useCollectionStore(state => state.isFactionMinted);
    const setFaction = useCollectionStore(state => state.setFaction);
    const mintFactionCard = useCollectionStore(state => state.mintFactionCard);
    const { playClick, playSuccess, playHover } = useAudioSystem();
    const [step, setStep] = useState<'SELECT' | 'CONFIRM' | 'MINTING' | 'SUCCESS'>(
        isFactionMinted ? 'SUCCESS' : 'SELECT'
    );
    const [tempFaction, setTempFaction] = useState<'RED' | 'PURPLE' | null>(
        userFaction !== 'NONE' ? userFaction : null
    );

    const handleSelectFaction = (faction: 'RED' | 'PURPLE') => {
        playClick();
        setTempFaction(faction);
        setFaction(faction);
        setStep('CONFIRM');
    };

    const handleMint = async () => {
        playClick();
        setStep('MINTING');
        // Simulate USDC Transaction ($0.44 fee)
        await new Promise(resolve => setTimeout(resolve, 2000));
        mintFactionCard();
        playSuccess();
        setStep('SUCCESS');
    };

    if (!isOpen) return null;

    const currentFaction = tempFaction ? FACTION_DATA[tempFaction] : null;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl"
            >
                <div className="max-w-4xl w-full relative">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute -top-12 right-0 text-white/40 hover:text-white transition-all p-2 group"
                    >
                        <X size={24} className="group-hover:rotate-90 transition-transform" />
                    </button>

                    {step === 'SELECT' && (
                        <motion.div
                            key="select"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <div className="text-center mb-12">
                                <h2 className="text-5xl font-black italic tracking-tighter text-white mb-4 uppercase">CHOOSE_YOUR_ALLEGIANCE</h2>
                                <p className="text-white/40 font-mono text-xs tracking-[0.3em] uppercase underline underline-offset-8 decoration-neon-blue/30">
                                    The_Resistance_is_fractured._Which_signal_will_you_amplify?
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {(['RED', 'PURPLE'] as const).map(fKey => {
                                    const faction = FACTION_DATA[fKey];
                                    const Icon = faction.icon;
                                    return (
                                        <motion.button
                                            key={fKey}
                                            whileHover={{ scale: 1.02, y: -5 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleSelectFaction(fKey)}
                                            onMouseEnter={playHover}
                                            className={`p-8 rounded-2xl border-2 transition-all text-left relative overflow-hidden group h-full ${userFaction === fKey ? `${faction.border} ${faction.bg}` : 'border-white/10 bg-white/5 hover:border-white/30'
                                                }`}
                                        >
                                            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${faction.color}`}>
                                                <Icon size={120} />
                                            </div>
                                            <h3 className={`text-3xl font-black mb-2 italic ${faction.color}`}>{faction.name}</h3>
                                            <p className="text-white text-xs leading-relaxed opacity-60 mb-6">
                                                {faction.description}
                                            </p>
                                            <div className="flex gap-4">
                                                {faction.stats.map(s => (
                                                    <span key={s} className={`px-3 py-1 bg-white/5 text-[10px] font-bold uppercase tracking-widest border border-white/10`}>
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>

                            <div className="mt-12 text-center">
                                <button
                                    onClick={onClose}
                                    className="text-white/20 hover:text-white transition-colors text-[10px] uppercase font-mono tracking-widest"
                                >
                                    [ REMAIN_NEUTRAL_FOR_NOW ]
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 'CONFIRM' && currentFaction && (
                        <motion.div
                            key="confirm"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, x: -100 }}
                            className="glass-card p-12 border-white/10 flex flex-col md:flex-row gap-12 items-center"
                        >
                            <div className="flex-1 space-y-6">
                                <div>
                                    <h4 className="text-neon-blue font-mono text-xs mb-2 tracking-widest">// IDENTITY_PROTOCOL_LOADED</h4>
                                    <h2 className={`text-6xl font-black italic tracking-tighter ${currentFaction.color}`}>{currentFaction.name}</h2>
                                    <p className="text-white font-mono text-[10px] tracking-[0.4em] mt-2 opacity-50 underline decoration-neon-blue/20">{currentFaction.motto}</p>
                                </div>
                                <p className="text-white/70 leading-relaxed text-sm font-cyber border-l-2 border-neon-blue/30 pl-6 italic">
                                    "You are about to synchronize your biological signature with the {currentFaction.id} protocol. Once established, this link becomes a permanent node in the resistance network."
                                </p>
                                <div className="space-y-4 pt-6 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                                    <div className="flex justify-between border-b border-white/5 pb-2">
                                        <span>INITIATION_FEE</span>
                                        <span className="text-white">0.44 USDC</span>
                                    </div>
                                    <div className="flex justify-between border-b border-white/5 pb-2">
                                        <span>SIGNATURE_STATUS</span>
                                        <span className="text-neon-green">READY_TO_MINT</span>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                    <button
                                        onClick={handleMint}
                                        className="flex-1 py-4 bg-neon-blue text-black font-black uppercase italic tracking-[0.2em] hover:bg-white transition-all flex items-center justify-center gap-3 group shadow-[0_0_20px_rgba(0,243,255,0.3)]"
                                    >
                                        <CreditCard size={18} />
                                        MINT_IDENTITY_CARD
                                    </button>
                                    <button
                                        onClick={() => { playClick(); setStep('SELECT'); }}
                                        className="px-6 py-4 border border-white/10 text-white/40 font-black uppercase text-[10px] tracking-widest hover:text-white hover:border-white/30 transition-all"
                                    >
                                        RECALIBRATE
                                    </button>
                                </div>
                            </div>
                            <div className="w-80 h-[480px] bg-gradient-to-br from-white/10 to-transparent border border-white/20 rounded-3xl p-6 relative overflow-hidden group shrink-0">
                                <div className={`absolute inset-0 opacity-10 animate-pulse ${currentFaction.bg}`}></div>
                                <div className="h-full border border-white/5 flex flex-col justify-between items-center py-10 relative z-10">
                                    <currentFaction.icon size={120} className={`${currentFaction.color} drop-shadow-[0_0_15px_currentColor]`} />
                                    <div className="text-center">
                                        <p className="text-[10px] font-mono opacity-30 mb-1">MEMBER_ID</p>
                                        <p className="text-xs font-black tracking-widest italic">#RES-09{Math.floor(Math.random() * 999)}</p>
                                    </div>
                                    <div className="w-full h-px bg-white/10"></div>
                                    <div className="flex flex-col items-center gap-2">
                                        <Shield size={32} className="opacity-20" />
                                        <p className={`text-[10px] font-black tracking-[0.3em] ${currentFaction.color}`}>UNMINTED_ASSET</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 'MINTING' && (
                        <motion.div
                            key="minting"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center py-20"
                        >
                            <Loader2 size={64} className="text-neon-blue animate-spin mb-8" />
                            <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter mb-4">BROADCASTING_PROOF_OF_STAKE...</h2>
                            <div className="w-64 h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: '100%' }}
                                    transition={{ duration: 2 }}
                                    className="h-full bg-neon-blue shadow-[0_0_15px_#00f3ff]"
                                />
                            </div>
                            <p className="mt-8 text-white/40 font-mono text-[10px] tracking-widest uppercase animate-pulse">Confirming 0.44 USDC on Solana L1...</p>
                        </motion.div>
                    )}

                    {step === 'SUCCESS' && currentFaction && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-10"
                        >
                            <div className="mb-8 flex justify-center">
                                <div className="p-6 rounded-full bg-neon-green/10 border-4 border-neon-green relative">
                                    <CheckCircle2 size={80} className="text-neon-green" />
                                    <div className="absolute inset-0 bg-neon-green/20 rounded-full animate-ping"></div>
                                </div>
                            </div>
                            <h2 className="text-5xl font-black italic text-white uppercase tracking-tighter mb-4">INITIATION_COMPLETE</h2>
                            <p className="text-neon-green font-mono text-xs tracking-[0.4em] uppercase mb-12">IDENTITY_MINTED_IN_SECTOR_7</p>

                            <div className="flex flex-col md:flex-row gap-6 justify-center">
                                <div className={`glass-card p-6 border-white/10 min-w-[300px]`}>
                                    <div className="flex items-center gap-4 mb-4">
                                        <currentFaction.icon size={40} className={currentFaction.color} />
                                        <div className="text-left">
                                            <p className="text-white/40 text-[8px] font-mono">ASSET_OWNERSHIP</p>
                                            <p className="text-sm font-black italic text-white">{currentFaction.id}_IDENTITY_CARD_#0912</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="w-full py-3 border border-white/20 text-white font-black text-[10px] tracking-widest hover:bg-white/5 transition-all"
                                    >
                                        RETURN_TO_COMMAND
                                    </button>
                                </div>
                                <div className="glass-card p-6 border-white/10 min-w-[300px] flex flex-col justify-center gap-4">
                                    <div className="flex justify-between items-center text-[10px] font-mono">
                                        <span className="text-white/40">FACTION_BONUS</span>
                                        <span className="text-neon-green">+15%_SYNC_RATE</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-mono">
                                        <span className="text-white/40">COMMUNITY_ACCESS</span>
                                        <span className="text-white">UNLOCKED</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
