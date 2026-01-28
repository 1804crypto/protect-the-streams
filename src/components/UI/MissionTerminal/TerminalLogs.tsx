"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface TerminalLogsProps {
    logs: string[];
}

export const TerminalLogs: React.FC<TerminalLogsProps> = ({ logs }) => {
    return (
        <div className="flex-1 bg-black/60 border border-white/5 p-4 mb-6 font-mono text-[10px] leading-relaxed shadow-inner overflow-y-auto lg:h-[200px] rounded-sm">
            <div className="space-y-1">
                {logs.map((log, i) => (
                    <motion.div
                        key={log + i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1 - (i * 0.15), x: 0 }}
                        className={`flex items-start gap-2 ${i === 0 ? 'text-neon-blue font-bold' : 'text-white/30'}`}
                    >
                        <span className="opacity-40">{`[${i.toString().padStart(4, '0')}]`}</span>
                        <span className="flex-1">{log}</span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
