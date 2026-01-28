"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export const DataStream: React.FC = () => {
    const [streams, setStreams] = useState<{ duration: number; delay: number; opacity: number }[]>([]);
    const [hexIcons, setHexIcons] = useState<{ x: string; y: string; nextY: string; textPrefix: string; textValue: string }[]>([]);

    useEffect(() => {
        // Generate random values on mount to satisfy purity rules
        setStreams([...Array(10)].map(() => ({
            duration: Math.random() * 10 + 10,
            delay: Math.random() * 10,
            opacity: Math.random() * 0.5 + 0.1
        })));

        setHexIcons([...Array(5)].map(() => ({
            x: `${Math.random() * 100}%`,
            y: `${Math.random() * 100}%`,
            nextY: `${Math.random() * 100}%`,
            textPrefix: Math.random() > 0.5 ? '0x' : '1x',
            textValue: Math.floor(Math.random() * 1000).toString(16)
        })));
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
            <div className="absolute inset-0 flex justify-around">
                {streams.map((s, i) => (
                    <motion.div
                        key={i}
                        initial={{ y: '-100%' }}
                        animate={{ y: '100%' }}
                        transition={{
                            duration: s.duration,
                            repeat: Infinity,
                            ease: 'linear',
                            delay: s.delay
                        }}
                        className="w-px h-full bg-gradient-to-b from-transparent via-neon-blue to-transparent"
                        style={{ opacity: s.opacity }}
                    />
                ))}
            </div>

            {/* Hex Floating Icons */}
            {hexIcons.map((hex, i) => (
                <motion.div
                    key={`hex-${i}`}
                    initial={{
                        x: hex.x,
                        y: hex.y,
                        opacity: 0
                    }}
                    animate={{
                        y: [null, hex.nextY],
                        opacity: [0, 0.2, 0]
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: 'linear'
                    }}
                    className="text-neon-blue text-[8px] font-mono absolute"
                >
                    {hex.textPrefix}{hex.textValue}
                </motion.div>
            ))}
        </div>
    );
};
