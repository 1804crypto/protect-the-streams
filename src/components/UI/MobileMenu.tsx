"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MenuItem {
    label: string;
    icon: string;
    color: string;
    borderColor: string;
    action: () => void;
}

interface MobileMenuProps {
    items: MenuItem[];
    isHidden: boolean;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ items, isHidden }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen]);

    if (isHidden) return null;

    return (
        <div className="md:hidden fixed z-50">
            {/* Hamburger FAB */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed right-4 w-14 h-14 rounded-full flex items-center justify-center font-black text-xl z-[52] transition-all safe-bottom focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
                    isOpen
                        ? 'bg-white/20 border-2 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                        : 'bg-neon-blue shadow-[0_0_20px_rgba(0,243,255,0.5)] border-2 border-neon-blue/60'
                }`}
                aria-label={isOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isOpen}
            >
                <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {isOpen ? '✕' : '☰'}
                </motion.span>
            </button>

            {/* Drawer Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[51]"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Menu Panel */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed top-0 right-0 bottom-0 w-[min(18rem,85vw)] bg-[#0a0a0f]/95 backdrop-blur-xl border-l border-white/10 z-[52] flex flex-col"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-white/5">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-resistance-accent animate-pulse" />
                                    <span className="font-display text-lg font-black tracking-tighter">PTS_MENU</span>
                                </div>
                                <p className="text-[8px] font-mono text-white/50 tracking-widest mt-1 uppercase">OPERATIONS_PANEL</p>
                            </div>

                            {/* Menu Items */}
                            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
                                {items.map((item, i) => (
                                    <motion.button
                                        key={item.label}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        onClick={() => {
                                            item.action();
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 border rounded-sm transition-all hover:bg-white/5 text-left ${item.borderColor}`}
                                    >
                                        <span className="text-lg">{item.icon}</span>
                                        <span className={`text-[11px] font-black tracking-widest uppercase ${item.color}`}>
                                            {item.label}
                                        </span>
                                    </motion.button>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-white/5">
                                <p className="text-[8px] font-mono text-white/40 tracking-widest uppercase text-center">
                                    RESISTANCE_NETWORK_v4.2
                                </p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
