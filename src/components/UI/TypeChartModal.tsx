"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { typeChart, MoveType } from '@/data/typeChart';

interface TypeChartModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TYPES: MoveType[] = ['CHAOS', 'INTEL', 'DISRUPT', 'CHARISMA', 'REBELLION'];

const TYPE_COLORS: Record<MoveType, string> = {
    CHAOS: 'text-red-400',
    INTEL: 'text-cyan-400',
    DISRUPT: 'text-yellow-400',
    CHARISMA: 'text-pink-400',
    REBELLION: 'text-green-400',
};

const TYPE_BG: Record<MoveType, string> = {
    CHAOS: 'bg-red-500/20 border-red-500/40',
    INTEL: 'bg-cyan-500/20 border-cyan-500/40',
    DISRUPT: 'bg-yellow-500/20 border-yellow-500/40',
    CHARISMA: 'bg-pink-500/20 border-pink-500/40',
    REBELLION: 'bg-green-500/20 border-green-500/40',
};

const CYCLE_DESC: { attacker: MoveType; defender: MoveType; flavor: string }[] = [
    { attacker: 'CHAOS', defender: 'INTEL', flavor: 'Chaos overwhelms logic' },
    { attacker: 'INTEL', defender: 'DISRUPT', flavor: 'Intel outsmarts disruption' },
    { attacker: 'DISRUPT', defender: 'CHARISMA', flavor: 'Disruption breaks charm' },
    { attacker: 'CHARISMA', defender: 'REBELLION', flavor: 'Charisma inspires rebellion' },
    { attacker: 'REBELLION', defender: 'CHAOS', flavor: 'Rebellion creates chaos' },
];

function CellValue({ value }: { value: number }) {
    if (value === 1.5) return <span className="text-neon-green font-black text-[11px]">1.5x</span>;
    if (value === 0.5) return <span className="text-resistance-accent font-black text-[11px]">0.5x</span>;
    return <span className="text-white/50 text-[10px]">1x</span>;
}

export const TypeChartModal: React.FC<TypeChartModalProps> = ({ isOpen, onClose }) => {
    const focusTrapRef = useFocusTrap(isOpen, onClose);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="typechart-title"
                    onClick={onClose}
                >
                    <motion.div
                        ref={focusTrapRef as React.RefObject<HTMLDivElement>}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-lg bg-[#0a0a0f] border border-white/10 rounded-lg p-6 space-y-6 max-h-[90vh] overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 id="typechart-title" className="text-lg font-black tracking-widest text-neon-blue uppercase">TYPE_EFFECTIVENESS</h2>
                                <p className="text-[9px] font-mono text-white/40 tracking-widest mt-1">SIGNAL_FREQUENCY_MATCHUP_CHART</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-colors text-sm"
                                aria-label="Close type chart"
                            >
                                X
                            </button>
                        </div>

                        {/* Cycle Visual */}
                        <div className="space-y-2">
                            <div className="text-[9px] font-mono text-white/50 tracking-widest uppercase">Cycle: Each type beats the next</div>
                            <div className="flex items-center justify-center gap-1 flex-wrap py-2">
                                {TYPES.map((t, i) => (
                                    <React.Fragment key={t}>
                                        <span className={`text-[11px] font-black tracking-wider ${TYPE_COLORS[t]}`}>{t}</span>
                                        {i < TYPES.length - 1 && <span className="text-white/50 text-[10px]">→</span>}
                                    </React.Fragment>
                                ))}
                                <span className="text-white/50 text-[10px]">→</span>
                                <span className={`text-[11px] font-black tracking-wider ${TYPE_COLORS.CHAOS}`}>CHAOS</span>
                            </div>
                        </div>

                        {/* Grid Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-center">
                                <thead>
                                    <tr>
                                        <th className="p-2 text-[8px] font-mono text-white/50 uppercase">ATK ↓ / DEF →</th>
                                        {TYPES.map(t => (
                                            <th key={t} className={`p-2 text-[9px] font-black tracking-wider ${TYPE_COLORS[t]}`}>{t.slice(0, 4)}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {TYPES.map(atk => (
                                        <tr key={atk} className="border-t border-white/5">
                                            <td className={`p-2 text-[9px] font-black tracking-wider text-left ${TYPE_COLORS[atk]}`}>{atk}</td>
                                            {TYPES.map(def => (
                                                <td key={def} className={`p-2 ${typeChart[atk][def] === 1.5 ? 'bg-neon-green/5' : typeChart[atk][def] === 0.5 ? 'bg-resistance-accent/5' : ''}`}>
                                                    <CellValue value={typeChart[atk][def]} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Matchup Explanations */}
                        <div className="space-y-2">
                            <div className="text-[9px] font-mono text-white/50 tracking-widest uppercase">Super effective matchups</div>
                            {CYCLE_DESC.map(({ attacker, defender, flavor }) => (
                                <div key={`${attacker}-${defender}`} className={`flex items-center gap-3 px-3 py-2 border rounded-sm ${TYPE_BG[attacker]}`}>
                                    <span className={`text-[10px] font-black ${TYPE_COLORS[attacker]}`}>{attacker}</span>
                                    <span className="text-neon-green text-[10px] font-mono">→ 1.5x →</span>
                                    <span className={`text-[10px] font-black ${TYPE_COLORS[defender]}`}>{defender}</span>
                                    <span className="text-[8px] text-white/50 font-mono ml-auto italic">{flavor}</span>
                                </div>
                            ))}
                        </div>

                        {/* Legend */}
                        <div className="flex gap-6 pt-2 border-t border-white/5">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-neon-green/30 border border-neon-green/50 rounded-sm" />
                                <span className="text-[9px] text-white/50 font-mono">1.5x SUPER EFFECTIVE</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-resistance-accent/30 border border-resistance-accent/50 rounded-sm" />
                                <span className="text-[9px] text-white/50 font-mono">0.5x NOT EFFECTIVE</span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
