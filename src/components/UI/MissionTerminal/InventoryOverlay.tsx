"use client";

import React, { useMemo } from 'react';
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

    // Filter to only show usable items (consumables + augments, not equipment)
    // Equipment provides passive bonuses — it's not "usable" in battle
    const usableItems = useMemo(() =>
        Object.values(items).filter(item =>
            item.category !== 'equipment' && (inventory[item.id] || 0) > 0
        ),
        [items, inventory]
    );

    // Also show consumables the player has zero of (grayed out) for awareness
    const emptyItems = useMemo(() =>
        Object.values(items).filter(item =>
            item.category !== 'equipment' && (inventory[item.id] || 0) <= 0
        ),
        [items, inventory]
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-x-6 bottom-32 z-50 bg-[#080808] border-2 border-neon-yellow shadow-[0_0_50px_rgba(243,255,0,0.15)] p-4 rounded-lg"
        >
            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
                {usableItems.map((item) => {
                    const count = inventory[item.id] || 0;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            disabled={count <= 0 || !isTurn || isComplete}
                            onClick={() => onUseItem(item.id, item)}
                            className="p-3 text-left transition-all border rounded border-white/10 hover:border-neon-yellow bg-white/[0.02] hover:bg-neon-yellow/10"
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[11px] font-black">{item.icon} {item.name}</span>
                                <span className="text-[10px] font-mono text-neon-yellow">x{count}</span>
                            </div>
                            <p className="text-[8px] text-white/40 leading-tight uppercase font-mono">{item.description}</p>
                        </button>
                    );
                })}
                {emptyItems.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        disabled
                        className="p-3 text-left transition-all border rounded opacity-20 grayscale border-white/5"
                    >
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] font-black">{item.icon} {item.name}</span>
                            <span className="text-[10px] font-mono text-neon-yellow">x0</span>
                        </div>
                        <p className="text-[8px] text-white/40 leading-tight uppercase font-mono">{item.description}</p>
                    </button>
                ))}
            </div>
        </motion.div>
    );
};
