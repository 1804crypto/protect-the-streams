"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useGameDataStore } from '@/hooks/useGameDataStore';

interface InventoryOverlayProps {
    inventory: Record<string, number>;
    isTurn: boolean;
    isComplete: boolean;
    onUseItem: (_itemId: string, _itemConfig: { effect: string; value: number }) => void;
}

export const InventoryOverlay: React.FC<InventoryOverlayProps> = ({
    inventory,
    isTurn,
    isComplete,
    onUseItem
}) => {
    const { items } = useGameDataStore();

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-x-6 bottom-32 z-50 bg-[#080808] border-2 border-neon-yellow shadow-[0_0_50px_rgba(243,255,0,0.15)] p-4 rounded-lg"
        >
            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
                {Object.values(items).map((item) => {
                    const count = inventory[item.id] || 0;
                    return (
                        <button
                            key={item.id}
                            disabled={count <= 0 || !isTurn || isComplete}
                            onClick={() => onUseItem(item.id, item)}
                            className={`p-3 text-left transition-all border rounded ${count > 0 ? 'border-white/10 hover:border-neon-yellow bg-white/[0.02] hover:bg-neon-yellow/10' : 'opacity-20 grayscale border-white/5'}`}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[11px] font-black">{item.icon} {item.name}</span>
                                <span className="text-[10px] font-mono text-neon-yellow">x{count}</span>
                            </div>
                            <p className="text-[8px] text-white/40 leading-tight uppercase font-mono">{item.description}</p>
                        </button>
                    );
                })}
            </div>
        </motion.div>
    );
};
