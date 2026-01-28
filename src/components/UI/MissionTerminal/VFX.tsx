"use client";

import React from 'react';
import { motion } from 'framer-motion';

export const ParticleEffect = ({ x, y, color }: { x: number, y: number, color: string }) => {
    const [offsets, setOffsets] = React.useState({ x: 0, y: 0, rotate: 0 });

    React.useEffect(() => {
        setOffsets({
            x: (Math.random() - 0.5) * 200,
            y: (Math.random() - 0.5) * 200,
            rotate: Math.random() * 720
        });
    }, []);

    return (
        <motion.div
            initial={{ x, y, opacity: 1, scale: 1 }}
            animate={{
                x: x + offsets.x,
                y: y + offsets.y,
                opacity: 0,
                scale: [1, 2, 0],
                rotate: offsets.rotate
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`absolute left-0 top-0 w-2 h-2 ${color} z-30 pointer-events-none rounded-sm blur-[0.5px] border border-white/20 shadow-[0_0_10px_currentColor]`}
        />
    );
};

export const FloatingVFX = ({ type, onComplete }: { type: 'heal' | 'boost_atk' | 'boost_def', onComplete: () => void }) => {
    const colors = {
        heal: 'text-neon-green shadow-green-500/50',
        boost_atk: 'text-neon-pink shadow-pink-500/50',
        boost_def: 'text-neon-blue shadow-blue-500/50'
    };
    const icons = { heal: '✙', boost_atk: '⚔', boost_def: '🛡' };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 0 }}
            animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1.2, 1, 0.8],
                y: -150,
                rotate: [0, -10, 10, 0]
            }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            onAnimationComplete={onComplete}
            className={`absolute z-[100] text-4xl font-black drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] ${colors[type]}`}
        >
            {icons[type]}
            <motion.div
                animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute inset-0 rounded-full border-2 border-current"
            />
        </motion.div>
    );
};

export const LoreOverlay = ({ text, onComplete }: { text: string, onComplete: () => void }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-[150] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
        >
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                className="h-1 bg-neon-blue mb-8 shadow-[0_0_15px_#00f3ff]"
            />
            <div className="space-y-6 max-w-2xl">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-neon-blue font-mono text-[10px] tracking-[0.3em] uppercase mb-2"
                >
                    Incoming_Neural_Archive_Signal...
                </motion.div>
                <motion.h4
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-white font-black text-2xl lg:text-4xl italic tracking-tighter leading-tight uppercase drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                >
                    "{text}"
                </motion.h4>
            </div>
            <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5 }}
                onClick={onComplete}
                className="mt-12 px-8 py-3 border border-neon-blue text-neon-blue font-black tracking-widest text-xs hover:bg-neon-blue hover:text-black transition-all uppercase"
            >
                Continue_Uplink
            </motion.button>
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 0.5 }}
                className="h-1 bg-neon-blue mt-8 shadow-[0_0_15px_#00f3ff]"
            />
        </motion.div>
    );
};

export const DamageNumber = ({ amount, target, onComplete }: { amount: number, target: 'player' | 'enemy', onComplete: () => void }) => {
    return (
        <motion.div
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -100, scale: 2 }}
            transition={{ duration: 0.8 }}
            onAnimationComplete={onComplete}
            className={`absolute z-[110] font-black text-3xl italic pointer-events-none drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] ${target === 'enemy' ? 'text-white' : 'text-resistance-accent'}`}
            style={{
                left: target === 'enemy' ? '50%' : '20%',
                top: target === 'enemy' ? '40%' : '70%'
            }}
        >
            -{amount}
        </motion.div>
    );
};
