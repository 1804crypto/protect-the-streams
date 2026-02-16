"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Sword, Shield, Gem, ChevronRight } from 'lucide-react';
import { useCollectionStore, type EquipmentSlots } from '@/hooks/useCollectionStore';
import { useGameDataStore } from '@/hooks/useGameDataStore';
import { blackMarketItems } from '@/data/storeItems';
import type { BattleItem, ItemCategory } from '@/data/items';

type TabFilter = 'all' | 'consumable' | 'equipment';

const tabLabels: Record<TabFilter, string> = {
    all: 'ALL ITEMS',
    consumable: 'CONSUMABLES',
    equipment: 'EQUIPMENT',
};

const slotIcons: Record<keyof EquipmentSlots, React.ReactNode> = {
    weapon: <Sword size={14} />,
    armor: <Shield size={14} />,
    accessory: <Gem size={14} />,
};

const slotLabels: Record<keyof EquipmentSlots, string> = {
    weapon: 'WEAPON',
    armor: 'ARMOR',
    accessory: 'ACCESSORY',
};

const rarityColor: Record<string, string> = {
    common: 'text-gray-400',
    rare: 'text-purple-400',
    legendary: 'text-orange-400',
};

export const InventoryPanel = ({ onClose }: { onClose: () => void }) => {
    const inventory = useCollectionStore(state => state.inventory);
    const equipmentSlots = useCollectionStore(state => state.equipmentSlots);
    const equipItem = useCollectionStore(state => state.equipItem);
    const unequipItem = useCollectionStore(state => state.unequipItem);
    const { items: gameItems } = useGameDataStore();

    const [activeTab, setActiveTab] = useState<TabFilter>('all');
    const [selectedItem, setSelectedItem] = useState<BattleItem | null>(null);

    // Merge all item definitions
    const allItemDefs = useMemo(() => ({ ...gameItems, ...blackMarketItems }), [gameItems]);

    // Get items the player owns (qty > 0)
    const ownedItems = useMemo(() => {
        const result: { item: BattleItem; count: number }[] = [];
        for (const [itemId, qty] of Object.entries(inventory)) {
            if (qty <= 0) continue;
            const def = allItemDefs[itemId];
            if (!def) continue;
            if (activeTab !== 'all' && def.category !== activeTab) continue;
            result.push({ item: def, count: qty });
        }
        // Sort: equipment first, then by rarity (legendary > rare > common)
        const rarityOrder: Record<string, number> = { legendary: 0, rare: 1, common: 2 };
        const catOrder: Record<string, number> = { equipment: 0, augment: 1, consumable: 2 };
        result.sort((a, b) =>
            (catOrder[a.item.category] ?? 3) - (catOrder[b.item.category] ?? 3) ||
            (rarityOrder[a.item.rarity] ?? 3) - (rarityOrder[b.item.rarity] ?? 3)
        );
        return result;
    }, [inventory, allItemDefs, activeTab]);

    const getEquippedItem = (slot: keyof EquipmentSlots): BattleItem | null => {
        const itemId = equipmentSlots[slot];
        if (!itemId) return null;
        return allItemDefs[itemId] || null;
    };

    const handleEquip = (item: BattleItem) => {
        if (item.category !== 'equipment' || !item.slot) return;
        equipItem(item.id, item.slot as keyof EquipmentSlots);
        setSelectedItem(null);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
        >
            <div className="relative w-full max-w-3xl max-h-[85vh] overflow-hidden border-2 border-cyan-500/30 bg-gray-950 rounded-lg shadow-[0_0_50px_rgba(0,243,255,0.15)] flex flex-col">

                {/* Header */}
                <div className="p-4 md:p-5 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/20 to-transparent flex justify-between items-center">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 tracking-tighter italic uppercase flex items-center gap-2">
                            <Package size={22} /> Inventory
                        </h2>
                        <p className="text-[10px] text-cyan-400/60 font-mono mt-1">
                            {Object.values(inventory).reduce((sum, v) => sum + v, 0)} items in storage
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-cyan-400 hover:text-white transition-colors"
                        title="Close Inventory"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Equipment Slots */}
                    <div className="p-4 md:px-5 border-b border-gray-800/50">
                        <h3 className="text-[10px] font-bold text-cyan-400/60 uppercase tracking-widest mb-3">
                            EQUIPPED LOADOUT
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                            {(Object.keys(slotLabels) as (keyof EquipmentSlots)[]).map(slot => {
                                const equipped = getEquippedItem(slot);
                                return (
                                    <div
                                        key={slot}
                                        className={`p-3 rounded border transition-all ${
                                            equipped
                                                ? 'border-cyan-500/40 bg-cyan-500/5'
                                                : 'border-gray-700/30 bg-gray-900/30'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <span className="text-cyan-400/60">{slotIcons[slot]}</span>
                                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                                                {slotLabels[slot]}
                                            </span>
                                        </div>
                                        {equipped ? (
                                            <div>
                                                <p className="text-xs font-bold text-white truncate">
                                                    {equipped.icon} {equipped.name}
                                                </p>
                                                <p className="text-[9px] text-gray-400 mt-0.5 leading-tight truncate">
                                                    {equipped.description}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => unequipItem(slot)}
                                                    className="mt-1.5 text-[9px] text-red-400/70 hover:text-red-400 uppercase font-mono transition-colors"
                                                >
                                                    UNEQUIP
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="text-[10px] text-gray-600 italic">Empty</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tab Filters */}
                    <div className="flex gap-2 px-4 md:px-5 pt-3">
                        {(Object.keys(tabLabels) as TabFilter[]).map(tab => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded whitespace-nowrap transition-all ${
                                    activeTab === tab
                                        ? 'bg-cyan-600/40 text-white border border-cyan-400/50'
                                        : 'bg-gray-900/50 text-gray-500 border border-gray-700/30 hover:text-gray-300'
                                }`}
                            >
                                {tabLabels[tab]}
                            </button>
                        ))}
                    </div>

                    {/* Item List */}
                    <div className="p-4 md:px-5 space-y-1.5">
                        {ownedItems.length === 0 ? (
                            <div className="text-center py-12 text-gray-600 text-sm font-mono">
                                No items in this category.
                            </div>
                        ) : (
                            ownedItems.map(({ item, count }) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setSelectedItem(item)}
                                    className="w-full text-left p-3 rounded bg-gray-900/40 border border-gray-700/20 hover:border-cyan-500/30 hover:bg-gray-900/60 transition-all flex items-center gap-3 group"
                                >
                                    <span className="text-xl shrink-0">{item.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-white group-hover:text-cyan-400 truncate transition-colors">
                                                {item.name}
                                            </span>
                                            <span className={`text-[9px] font-mono uppercase ${rarityColor[item.rarity]}`}>
                                                {item.rarity}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 truncate">{item.description}</p>
                                    </div>
                                    <span className="text-xs font-mono text-cyan-400 shrink-0">x{count}</span>
                                    <ChevronRight size={14} className="text-gray-600 group-hover:text-cyan-400 transition-colors shrink-0" />
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Item Detail Modal */}
                <AnimatePresence>
                    {selectedItem && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                className="bg-gray-900 border-2 border-cyan-500/30 rounded-lg p-5 max-w-sm w-full"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-4xl">{selectedItem.icon}</span>
                                    <div>
                                        <h3 className="font-black text-white uppercase tracking-tight">
                                            {selectedItem.name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`text-[10px] font-mono uppercase ${rarityColor[selectedItem.rarity]}`}>
                                                {selectedItem.rarity}
                                            </span>
                                            <span className="text-[10px] font-mono text-gray-500 uppercase">
                                                {selectedItem.category}
                                                {selectedItem.slot ? ` / ${selectedItem.slot}` : ''}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-xs text-gray-300 mb-3 leading-relaxed">
                                    {selectedItem.description}
                                </p>

                                {selectedItem.lore && (
                                    <p className="text-[10px] text-purple-400/70 italic mb-3 border-l-2 border-purple-500/30 pl-2">
                                        {selectedItem.lore}
                                    </p>
                                )}

                                {selectedItem.statBonus && (
                                    <div className="mb-3 p-2 bg-gray-800/50 rounded">
                                        <p className="text-[9px] text-cyan-400/60 uppercase tracking-widest mb-1 font-bold">Stat Bonuses</p>
                                        <div className="flex gap-3">
                                            {Object.entries(selectedItem.statBonus).map(([stat, val]) => (
                                                <span key={stat} className="text-[10px] font-mono text-green-400">
                                                    +{val} {stat}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <p className="text-xs font-mono text-cyan-400 mb-4">
                                    Owned: x{inventory[selectedItem.id] || 0}
                                </p>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedItem(null)}
                                        className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded text-xs font-bold uppercase hover:bg-gray-700 transition-all"
                                    >
                                        Close
                                    </button>
                                    {selectedItem.category === 'equipment' && selectedItem.slot && (inventory[selectedItem.id] || 0) > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => handleEquip(selectedItem)}
                                            className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold uppercase tracking-wider transition-all"
                                        >
                                            Equip to {selectedItem.slot}
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Scanline */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]" />
            </div>
        </motion.div>
    );
};
