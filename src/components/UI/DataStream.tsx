"use client";

import React from 'react';
import { motion } from 'framer-motion';

export const DataStream: React.FC = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
            <div className="absolute inset-0 flex justify-around">
                {[...Array(10)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ y: '-100%' }}
                        animate={{ y: '100%' }}
                        transition={{
                            duration: Math.random() * 10 + 10,
                            repeat: Infinity,
                            ease: 'linear',
                            delay: Math.random() * 10
                        }}
                        className="w-px h-full bg-gradient-to-b from-transparent via-neon-blue to-transparent"
                        style={{ opacity: Math.random() * 0.5 + 0.1 }}
                    />
                ))}
            </div>

            {/* Hex Floating Icons */}
            {[...Array(5)].map((_, i) => (
                <motion.div
                    key={`hex-${i}`}
                    initial={{
                        x: `${Math.random() * 100}%`,
                        y: `${Math.random() * 100}%`,
                        opacity: 0
                    }}
                    animate={{
                        y: [null, `${Math.random() * 100}%`],
                        opacity: [0, 0.2, 0]
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: 'linear'
                    }}
                    className="text-neon-blue text-[8px] font-mono"
                >
                    {Math.random() > 0.5 ? '0x' : '1x'}{Math.floor(Math.random() * 1000).toString(16)}
                </motion.div>
            ))}
        </div>
    );
};
