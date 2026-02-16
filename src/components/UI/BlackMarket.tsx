"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CheckCircle2, Zap, Minus, Plus, ShieldAlert } from 'lucide-react';
import { blackMarketItems, StoreItem } from '@/data/storeItems';
import { useShopPurchase } from '@/hooks/useShopPurchase';
import { useCollectionStore } from '@/hooks/useCollectionStore';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import type { ItemCategory } from '@/data/items';

type CategoryFilter = 'all' | ItemCategory;

// Static class lookups for Tailwind purge safety
const rarityBorder: Record<string, string> = {
    common: 'border-gray-600/30 hover:border-gray-400/50',
    rare: 'border-purple-500/30 hover:border-purple-400/60',
    legendary: 'border-orange-500/30 hover:border-orange-400/60',
};

const rarityGlow: Record<string, string> = {
    common: '',
    rare: 'shadow-[0_0_15px_rgba(168,85,247,0.15)]',
    legendary: 'shadow-[0_0_20px_rgba(249,115,22,0.2)]',
};

const rarityBar: Record<string, string> = {
    common: 'bg-gray-700',
    rare: 'bg-purple-500',
    legendary: 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]',
};

const categoryColors: Record<string, string> = {
    consumable: 'text-green-400',
    equipment: 'text-cyan-400',
    augment: 'text-yellow-400',
};

const categoryLabels: Record<CategoryFilter, string> = {
    all: 'ALL',
    consumable: 'CONSUMABLES',
    equipment: 'EQUIPMENT',
    augment: 'AUGMENTS',
};

interface ConfirmState {
    item: StoreItem;
    quantity: number;
    currency: 'PTS' | 'SOL';
}

export const BlackMarket = ({ onClose }: { onClose: () => void }) => {
    const { purchaseWithPts, purchaseWithSol, isProcessing, txStatus, setTxStatus } = useShopPurchase();
    const inventory = useCollectionStore(state => state.inventory);
    const ptsBalance = useCollectionStore(state => state.ptsBalance);
    const isAuthenticated = useCollectionStore(state => state.isAuthenticated);

    const { publicKey } = useWallet();
    const { connection } = useConnection();

    const [currency, setCurrency] = useState<'PTS' | 'SOL'>('PTS');
    const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [confirmModal, setConfirmModal] = useState<ConfirmState | null>(null);
    const [solBalance, setSolBalance] = useState<number | null>(null);

    // Fetch SOL balance when wallet is connected
    React.useEffect(() => {
        if (publicKey && connection) {
            connection.getBalance(publicKey).then(bal => {
                setSolBalance(bal / LAMPORTS_PER_SOL);
            }).catch(() => setSolBalance(null));
        }
    }, [publicKey, connection]);

    const filteredItems = useMemo(() =>
        Object.values(blackMarketItems).filter(
            item => activeCategory === 'all' || item.category === activeCategory
        ),
        [activeCategory]
    );

    const getQty = (itemId: string) => quantities[itemId] || 1;
    const setQty = (itemId: string, val: number) => {
        setQuantities(prev => ({ ...prev, [itemId]: Math.max(1, Math.min(10, val)) }));
    };

    const handleConfirmPurchase = async () => {
        if (!confirmModal) return;
        const { item, quantity, currency: cur } = confirmModal;

        let success = false;
        if (cur === 'PTS') {
            success = await purchaseWithPts(item.id, quantity);
        } else {
            success = await purchaseWithSol(item.id, quantity, item.priceSol);
        }

        if (success) {
            setConfirmModal(null);
            setTimeout(() => setTxStatus('IDLE'), 3000);
        }
    };

    const getPrice = (item: StoreItem, qty: number) => {
        if (currency === 'PTS') return `${(item.pricePts * qty).toLocaleString()} PTS`;
        return `${(item.priceSol * qty).toFixed(4)} SOL`;
    };

    const canAfford = (item: StoreItem, qty: number) => {
        if (currency === 'PTS') return ptsBalance >= item.pricePts * qty;
        if (solBalance === null) return true; // Unknown — let wallet handle
        return solBalance >= item.priceSol * qty;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
        >
            <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden border-2 border-purple-500/30 bg-gray-950 rounded-lg shadow-[0_0_50px_rgba(168,85,247,0.2)] flex flex-col">

                {/* Header */}
                <div className="p-4 md:p-6 border-b border-purple-500/20 bg-gradient-to-r from-purple-950/30 to-transparent">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 tracking-tighter italic uppercase">
                                Black Market Terminal
                            </h2>
                            <p className="text-[10px] text-purple-400 font-mono flex items-center gap-2 mt-1">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                SECURE UPLINK // $PTS PROTOCOL ACTIVE
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-purple-400 hover:text-white transition-colors shrink-0"
                            title="Close Market"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Balances + Currency Toggle */}
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                        {/* Currency Toggle */}
                        <div className="flex rounded-md overflow-hidden border border-purple-500/30">
                            <button
                                onClick={() => setCurrency('PTS')}
                                className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${
                                    currency === 'PTS'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-900 text-gray-400 hover:text-white'
                                }`}
                            >
                                PTS
                            </button>
                            <button
                                onClick={() => setCurrency('SOL')}
                                className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${
                                    currency === 'SOL'
                                        ? 'bg-cyan-600 text-white'
                                        : 'bg-gray-900 text-gray-400 hover:text-white'
                                }`}
                            >
                                SOL
                            </button>
                        </div>

                        {/* Balances */}
                        <div className="flex items-center gap-4 text-xs font-mono">
                            <span className="text-purple-300">
                                PTS: <span className="text-cyan-400 font-bold">{ptsBalance.toLocaleString()}</span>
                            </span>
                            {publicKey && solBalance !== null && (
                                <span className="text-purple-300">
                                    SOL: <span className="text-cyan-400 font-bold">{solBalance.toFixed(4)}</span>
                                </span>
                            )}
                        </div>

                        {!isAuthenticated && (
                            <div className="flex items-center gap-1 text-[10px] text-yellow-400 font-mono">
                                <ShieldAlert size={12} />
                                GUEST MODE — purchases require login
                            </div>
                        )}
                    </div>

                    {/* Category Tabs */}
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                        {(Object.keys(categoryLabels) as CategoryFilter[]).map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded whitespace-nowrap transition-all ${
                                    activeCategory === cat
                                        ? 'bg-purple-600/50 text-white border border-purple-400/50'
                                        : 'bg-gray-900/50 text-gray-500 border border-gray-700/30 hover:text-gray-300'
                                }`}
                            >
                                {categoryLabels[cat]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Item Grid */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredItems.map(item => {
                        const qty = getQty(item.id);
                        const owned = inventory[item.id] || 0;
                        const affordable = canAfford(item, qty);

                        return (
                            <motion.div
                                key={item.id}
                                whileHover={{ scale: 1.01 }}
                                className={`p-4 rounded-lg bg-gray-900/50 border transition-all group relative overflow-hidden ${rarityBorder[item.rarity]} ${rarityGlow[item.rarity]}`}
                            >
                                <div className="relative z-10">
                                    {/* Top Row: Icon + Info + Owned Badge */}
                                    <div className="flex gap-3 items-start">
                                        <div className="w-11 h-11 rounded bg-purple-500/10 flex items-center justify-center text-2xl border border-purple-500/20 shrink-0">
                                            {item.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-white group-hover:text-cyan-400 transition-colors uppercase tracking-tight text-sm truncate">
                                                    {item.name}
                                                </h3>
                                                {owned > 0 && (
                                                    <span className="text-[9px] font-mono bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded shrink-0">
                                                        x{owned}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">
                                                {item.description}
                                            </p>
                                            <span className={`text-[9px] font-mono uppercase tracking-widest ${categoryColors[item.category] || 'text-gray-500'}`}>
                                                {item.category}
                                                {item.slot ? ` / ${item.slot}` : ''}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Bottom Row: Quantity + Price + Buy */}
                                    <div className="flex items-center justify-between mt-3 gap-2">
                                        {/* Quantity Selector */}
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setQty(item.id, qty - 1)}
                                                disabled={qty <= 1}
                                                title="Decrease quantity"
                                                className="w-6 h-6 flex items-center justify-center rounded bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 transition-all"
                                            >
                                                <Minus size={12} />
                                            </button>
                                            <span className="text-xs font-mono text-white w-5 text-center">{qty}</span>
                                            <button
                                                type="button"
                                                onClick={() => setQty(item.id, qty + 1)}
                                                disabled={qty >= 10}
                                                title="Increase quantity"
                                                className="w-6 h-6 flex items-center justify-center rounded bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 transition-all"
                                            >
                                                <Plus size={12} />
                                            </button>
                                        </div>

                                        {/* Price */}
                                        <p className={`text-sm font-black font-mono ${affordable ? 'text-cyan-400' : 'text-red-400'}`}>
                                            {getPrice(item, qty)}
                                        </p>

                                        {/* Buy Button */}
                                        <button
                                            disabled={isProcessing || !affordable || (!isAuthenticated && currency === 'PTS')}
                                            onClick={() => setConfirmModal({ item, quantity: qty, currency })}
                                            className="px-3 py-1.5 bg-purple-600 hover:bg-cyan-500 text-white text-[10px] font-bold rounded uppercase tracking-widest transition-all disabled:opacity-40 disabled:hover:bg-purple-600"
                                        >
                                            {currency === 'SOL' && !publicKey ? 'CONNECT' : 'ACQUIRE'}
                                        </button>
                                    </div>
                                </div>

                                {/* Rarity Indicator Bar */}
                                <div className={`absolute bottom-0 left-0 w-full h-0.5 ${rarityBar[item.rarity]}`} />

                                {/* Equipment glow accent */}
                                {item.category === 'equipment' && (
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-bl-full" />
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                {/* Confirmation Modal */}
                <AnimatePresence>
                    {confirmModal && (
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
                                className="bg-gray-900 border-2 border-cyan-500/40 rounded-lg p-6 max-w-sm w-full shadow-[0_0_40px_rgba(0,243,255,0.15)]"
                            >
                                <h3 className="text-lg font-black uppercase text-cyan-400 tracking-tight mb-4">
                                    Confirm Acquisition
                                </h3>

                                <div className="flex items-center gap-3 mb-4 p-3 bg-gray-800/50 rounded">
                                    <span className="text-3xl">{confirmModal.item.icon}</span>
                                    <div>
                                        <p className="font-bold text-white text-sm">{confirmModal.item.name}</p>
                                        <p className="text-[10px] text-gray-400">Qty: {confirmModal.quantity}</p>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mb-6 text-sm">
                                    <span className="text-gray-400 uppercase text-[11px] tracking-wider">Total Cost</span>
                                    <span className="font-black text-cyan-400 text-lg font-mono">
                                        {getPrice(confirmModal.item, confirmModal.quantity)}
                                    </span>
                                </div>

                                {confirmModal.currency === 'SOL' && (
                                    <p className="text-[10px] text-yellow-400/80 font-mono mb-4">
                                        Your wallet will prompt you to sign the transaction.
                                    </p>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setConfirmModal(null); setTxStatus('IDLE'); }}
                                        disabled={isProcessing}
                                        className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded text-xs font-bold uppercase hover:bg-gray-700 transition-all disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirmPurchase}
                                        disabled={isProcessing}
                                        className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Zap size={14} className="animate-bounce" />
                                                Processing...
                                            </>
                                        ) : (
                                            'Confirm'
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Transaction Status Toast */}
                <AnimatePresence>
                    {!confirmModal && txStatus !== 'IDLE' && (
                        <motion.div
                            initial={{ y: 100 }}
                            animate={{ y: 0 }}
                            exit={{ y: 100 }}
                            className="absolute bottom-0 left-0 w-full bg-gray-900 border-t-2 border-cyan-500/50 p-4 flex items-center justify-between z-20"
                        >
                            <div className="flex items-center gap-3">
                                {txStatus === 'CONFIRMED' && <CheckCircle2 size={20} className="text-green-400" />}
                                {txStatus === 'ERROR' && <AlertCircle size={20} className="text-red-400" />}
                                <p className="text-xs font-bold text-white uppercase tracking-tight">
                                    {txStatus === 'CONFIRMED' ? 'UPLINK SUCCESSFUL // ITEM ACQUIRED' :
                                        txStatus === 'ERROR' ? 'TRANSACTION REJECTED // SIGNAL LOST' : ''}
                                </p>
                            </div>
                            <button
                                onClick={() => setTxStatus('IDLE')}
                                className="px-3 py-1 bg-gray-800 text-gray-400 rounded text-[10px] hover:text-white transition-all font-mono"
                            >
                                DISMISS
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Scanline Effect */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]" />
            </div>
        </motion.div>
    );
};
