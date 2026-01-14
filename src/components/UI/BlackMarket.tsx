"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Shield, Zap, Package, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { blackMarketItems, StoreItem } from '@/data/storeItems';
import { usePtsTransaction } from '@/hooks/usePtsTransaction';
import { useCollectionStore } from '@/hooks/useCollectionStore';

export const BlackMarket = ({ onClose }: { onClose: () => void }) => {
    const { purchaseItem, isProcessing, txStatus, setTxStatus } = usePtsTransaction();
    const addItem = useCollectionStore(state => state.addItem);
    const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);

    const handlePurchase = async (item: StoreItem) => {
        setSelectedItem(item);
        const success = await purchaseItem(item.id, item.pricePts);
        if (success) {
            addItem(item.id, 1);
            setTimeout(() => {
                setTxStatus('IDLE');
                setSelectedItem(null);
            }, 3000);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
        >
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden border-2 border-purple-500/30 bg-gray-950 rounded-lg shadow-[0_0_50px_rgba(168,85,247,0.2)] flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-purple-500/20 flex justify-between items-center bg-gradient-to-r from-purple-950/30 to-transparent">
                    <div>
                        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 tracking-tighter italic uppercase">
                            Black Market Terminal
                        </h2>
                        <p className="text-xs text-purple-400 font-mono flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            SECURE UPLINK ESTABLISHED // $PTS PROTOCOL ACTIVE
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-purple-400 hover:text-white transition-colors"
                        title="Close Market"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.values(blackMarketItems).map((item) => (
                        <motion.div
                            key={item.id}
                            whileHover={{ scale: 1.02 }}
                            className="p-4 rounded-lg bg-gray-900/50 border border-purple-500/20 hover:border-cyan-500/50 transition-all group relative overflow-hidden"
                        >
                            <div className="relative z-10 flex justify-between items-start">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded bg-purple-500/10 flex items-center justify-center text-3xl border border-purple-500/20">
                                        {item.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white group-hover:text-cyan-400 transition-colors uppercase tracking-tight">
                                            {item.name}
                                        </h3>
                                        <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-cyan-400 font-mono">
                                        {item.pricePts} <span className="text-[10px]">PTS</span>
                                    </p>
                                    <button
                                        disabled={isProcessing}
                                        onClick={() => handlePurchase(item)}
                                        className="mt-2 px-3 py-1 bg-purple-600 hover:bg-cyan-500 text-white text-[10px] font-bold rounded uppercase tracking-widest transition-all disabled:opacity-50"
                                    >
                                        Infiltrate
                                    </button>
                                </div>
                            </div>

                            {/* Rarity Indicator */}
                            <div className={`absolute bottom-0 left-0 w-full h-1 ${item.rarity === 'legendary' ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' :
                                item.rarity === 'rare' ? 'bg-purple-500' : 'bg-gray-700'
                                }`} />
                        </motion.div>
                    ))}
                </div>

                {/* Footer State Overlay */}
                <AnimatePresence>
                    {(isProcessing || txStatus !== 'IDLE') && (
                        <motion.div
                            initial={{ y: 100 }}
                            animate={{ y: 0 }}
                            exit={{ y: 100 }}
                            className="absolute bottom-0 left-0 w-full bg-gray-900 border-t-2 border-cyan-500/50 p-6 flex items-center justify-between z-20"
                        >
                            <div className="flex items-center gap-4">
                                {txStatus === 'PROCESSING' && <Zap size={24} className="text-cyan-400 animate-bounce" />}
                                {txStatus === 'CONFIRMED' && <CheckCircle2 size={24} className="text-green-400" />}
                                {txStatus === 'ERROR' && <AlertCircle size={24} className="text-red-400" />}

                                <div>
                                    <p className="text-sm font-bold text-white uppercase tracking-tighter italic">
                                        {txStatus === 'PROCESSING' ? `DIVERDING FUNDS FOR ${selectedItem?.name}...` :
                                            txStatus === 'CONFIRMED' ? 'UPLINK SUCCESSFUL // ITEM ACQUIRED' :
                                                txStatus === 'ERROR' ? 'TRANSACTION REJECTED // SIGNAL LOST' : ''}
                                    </p>
                                    <p className="text-[10px] text-gray-500 font-mono">NEURAL_ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                                </div>
                            </div>
                            {txStatus === 'ERROR' && (
                                <button
                                    onClick={() => setTxStatus('IDLE')}
                                    className="px-4 py-1 bg-red-500/20 text-red-500 rounded text-xs hover:bg-red-500/30 transition-all font-mono"
                                >
                                    RETRY
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Scanline Effect */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]" />
            </div>
        </motion.div>
    );
};
