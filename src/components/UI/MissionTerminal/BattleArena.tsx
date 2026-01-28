"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Streamer, natures, NatureType } from '@/data/streamers';
import { EntityState } from '@/hooks/useResistanceMission';
import { ParticleEffect, FloatingVFX, DamageNumber } from './VFX';

interface BattleArenaProps {
    isShaking: boolean;
    isAttacking: boolean;
    isBoss: boolean;
    isEnemyTakingDamage: boolean;
    isTakingDamage: boolean;
    isTurn: boolean;
    enemy: EntityState;
    player: EntityState;
    stage: number;
    turns: number;
    streamer: Streamer;
    streamerNature: NatureType | null;
    attackBoost: { turnsLeft: number, multiplier: number };
    defenseBoost: { turnsLeft: number, multiplier: number };
    particles: { id: number, x: number, y: number, color: string }[];
    effectivenessFlash: 'super' | 'weak' | null;
    damagePopups: { id: number, amount: number, target: 'player' | 'enemy' }[];
    impactFlash: string | null;
    screenFlash: string | null;
    showPhaseBanner: boolean;
    currentBossPhase: number;
    itemEffects: { id: number, type: 'heal' | 'boost_atk' | 'boost_def' }[];
    onItemEffectComplete: (_id: number) => void;
    onDamagePopupComplete: (_id: number) => void;
    statsKey: number;
}

export const BattleArena: React.FC<BattleArenaProps> = ({
    isShaking,
    isAttacking,
    isBoss,
    isEnemyTakingDamage,
    isTakingDamage,
    isTurn,
    enemy,
    player,
    stage,
    turns,
    streamer,
    streamerNature,
    attackBoost,
    defenseBoost,
    particles,
    effectivenessFlash,
    damagePopups,
    impactFlash,
    screenFlash,
    showPhaseBanner,
    currentBossPhase,
    itemEffects,
    onItemEffectComplete,
    onDamagePopupComplete,
    statsKey
}) => {
    return (
        <motion.div
            animate={isShaking || isAttacking ? {
                x: isShaking ? [-12, 12, -12, 12, -6, 6, 0] : [0, 100, 0],
                y: isShaking ? [-6, 6, -6, 6, -3, 3, 0] : [0, -50, 0],
                scale: isAttacking ? [1, 1.05, 1] : 1,
                filter: isShaking ? ["contrast(1.6) brightness(1.2) saturate(1.5)", "contrast(1) brightness(1) saturate(1)"] : "none"
            } : {}}
            transition={{ duration: isAttacking ? 0.2 : 0.35 }}
            className={`relative flex-[1.5] bg-[#020202] border-2 ${isBoss ? 'border-resistance-accent/40 shadow-[0_0_50px_rgba(255,0,60,0.2)]' : 'border-white/10'} overflow-hidden flex flex-col rounded-lg`}
        >
            {/* Digital Noise Grain */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-[60] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />

            {/* CRT Scanline Overlay */}
            <div className="absolute inset-0 z-[55] pointer-events-none opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none" />

            {/* Low Health Warning Overlay */}
            <AnimatePresence>
                {player.hp / player.maxHp < 0.2 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.2, 0] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="absolute inset-0 z-[50] bg-resistance-accent/40 pointer-events-none flex items-center justify-center"
                    >
                        <div className="text-[120px] font-black italic text-white/5 tracking-tighter uppercase select-none">
                            CRITICAL
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Arena Atmosphere */}
            <div className="absolute inset-0 z-0 opacity-40">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,243,255,0.15),transparent_70%)]" />
                <div className="absolute inset-0 bg-[url('/grid_pattern.png')] opacity-20" />
                <div className="absolute inset-0 battle-floor opacity-30 mt-[20%]" />
            </div>

            {/* HUD: Enemy Plate */}
            <div className="absolute top-6 left-6 right-6 z-40 flex justify-between items-start">
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{
                        x: isEnemyTakingDamage ? [-5, 5, -5, 5, 0] : 0,
                        opacity: 1
                    }}
                    transition={{ duration: 0.3 }}
                    className="hud-node min-w-[240px]"
                >
                    <div className="flex justify-between items-center mb-2">
                        <span className={`text-[11px] font-black tracking-[0.2em] ${isBoss ? 'text-resistance-accent animate-glitch' : 'text-white/80'}`}>
                            {isBoss ? `SYSTEM_THREAT: ${enemy.name.toUpperCase()}` : enemy.name.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono text-white/40">LVL.{(stage * 10) + 40}</span>
                    </div>
                    <div className="relative h-2 bg-white/5 border border-white/10 overflow-hidden">
                        <motion.div
                            animate={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}
                            className={`h-full transition-all duration-500 ${isBoss || (enemy.hp / enemy.maxHp) < 0.3 ? 'bg-resistance-accent' : 'bg-neon-green'}`}
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.1)_50%,transparent_100%)] bg-[size:200%_100%] animate-scan" />
                    </div>
                    <div className="flex justify-end mt-1">
                        <span className="text-[9px] font-mono text-white/40">{enemy.hp} / {enemy.maxHp} HP</span>
                    </div>
                </motion.div>

                <div className="text-right flex flex-col items-end">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-neon-blue tracking-widest bg-neon-blue/10 px-2 py-0.5 rounded-sm border border-neon-blue/30">TURN {turns}</span>
                        <span className="text-[9px] font-mono text-neon-blue/60 tracking-tighter uppercase mb-0.5">Uplink_Signal: STABLE</span>
                    </div>
                    <div className="flex gap-1 justify-end">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className={`w-1.5 h-3 ${i < 4 ? 'bg-neon-blue' : 'bg-white/10'}`} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Battle Arena Viewport */}
            <div className="flex-1 relative flex items-center justify-center pt-24 pb-32 overflow-hidden">
                {/* Enemy Sprite */}
                <motion.div
                    animate={!isTurn ? {
                        x: [0, -20, 20, -15, 15, 0],
                        scale: [1, 1.05, 0.98, 1.02, 1],
                        filter: isEnemyTakingDamage
                            ? ["brightness(4) contrast(2) hue-rotate(90deg)", "brightness(1) contrast(1) hue-rotate(0deg)"]
                            : "none",
                        skewX: isEnemyTakingDamage ? ["0deg", "10deg", "-10deg", "0deg"] : "0deg"
                    } : {
                        y: [0, -5, 0],
                        filter: isEnemyTakingDamage ? "brightness(3) sepia(1) hue-rotate(-50deg)" : "none"
                    }}
                    transition={{ duration: !isTurn ? 0.4 : 3, repeat: isTurn ? Infinity : 0 }}
                    className="relative z-20 w-[240px] h-[240px] lg:w-[380px] lg:h-[380px] group"
                >
                    {/* Enemy Card Background */}
                    <div className={`absolute inset-0 rounded-[20px] lg:rounded-[40px] border-4 lg:border-[12px] overflow-hidden transition-all duration-700
                        ${isBoss
                            ? 'border-resistance-accent shadow-[0_0_80px_rgba(255,0,60,0.6)]'
                            : 'border-white/20 shadow-[0_0_40px_rgba(255,255,255,0.1)]'
                        }`}
                    >
                        {/* Themed Background Image */}
                        <motion.div
                            initial={{ scale: 1.2, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="absolute inset-0 z-0"
                            style={{
                                backgroundImage: `url(${isBoss ? '/boss_card_bg.png' : '/sentinel_card_bg.png'})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                            }}
                        >
                            {/* Overlay Gradient for contrast */}
                            <div className={`absolute inset-0 ${isBoss ? 'bg-gradient-to-t from-black via-transparent to-black/40' : 'bg-gradient-to-t from-black/60 via-transparent to-black/20'}`} />
                        </motion.div>

                        {/* Static Overlay for enemy texture */}
                        <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none z-10" />
                    </div>

                    <img
                        src={enemy.image || "/authority_sentinel_cipher_unit_1766789046162.png"}
                        alt="Enemy Boss"
                        className={`absolute inset-0 w-full h-full object-contain p-4 lg:p-8 filter drop-shadow-[0_0_30px_rgba(255,0,60,0.3)] ${isBoss ? 'brightness-125' : ''}`}
                    />

                    {/* Reflection beneath */}
                    <div className="absolute top-full left-0 w-full h-1/2 opacity-10 blur-md grayscale -mt-8 pointer-events-none overflow-hidden">
                        <img
                            src={enemy.image || "/authority_sentinel_cipher_unit_1766789046162.png"}
                            alt="Reflection"
                            className="w-full h-full object-contain scale-y-[-0.6]"
                        />
                    </div>
                </motion.div>

                {/* Player Avatar */}
                <div className="absolute -bottom-12 -left-12 lg:-bottom-20 lg:-left-20 z-30 transform rotate-[15deg] opacity-90">
                    <motion.div
                        animate={isTurn ? {
                            rotate: [15, 13, 17, 15],
                            scale: [1, 1.02, 0.98, 1],
                            filter: isTakingDamage ? "brightness(3) sepia(1) hue-rotate(-50deg)" : "none",
                            skewX: isTakingDamage ? ["0deg", "5deg", "-5deg", "0deg"] : "0deg"
                        } : {
                            filter: isTakingDamage ? ["brightness(4) contrast(2) grayscale(1)", "brightness(1) contrast(1) grayscale(0)"] : "none"
                        }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="relative w-[220px] h-[220px] lg:w-[450px] lg:h-[450px]"
                    >
                        <img
                            src={streamer.image}
                            alt="Player Avatar"
                            className="w-full h-full object-cover rounded-[40px] border-8 border-neon-blue shadow-[0_0_60px_rgba(0,243,255,0.4)]"
                        />
                        {/* Reflection beneath */}
                        <img
                            src={streamer.image}
                            className="absolute top-full left-0 w-full h-1/2 object-cover scale-y-[-0.3] opacity-5 blur-sm grayscale -mt-4 rounded-b-[40px]"
                            alt="Player Reflection"
                        />

                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <AnimatePresence>
                                {itemEffects.map(effect => (
                                    <FloatingVFX
                                        key={effect.id}
                                        type={effect.type}
                                        onComplete={() => onItemEffectComplete(effect.id)}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>

                {/* Particles & VFX Layer */}
                <div className="absolute inset-0 z-40 pointer-events-none">
                    {particles.map(p => (
                        <ParticleEffect key={p.id} x={p.x} y={p.y} color={p.color} />
                    ))}
                    {effectivenessFlash && (
                        <motion.div
                            key={`eff-${effectivenessFlash}-${statsKey}`}
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 0 }}
                            className={`absolute inset-0 z-50 ${effectivenessFlash === 'super' ? 'bg-neon-green/20' : 'bg-red-500/20'}`}
                        />
                    )}

                    <AnimatePresence>
                        {damagePopups.map(popup => (
                            <DamageNumber
                                key={popup.id}
                                amount={popup.amount}
                                target={popup.target}
                                onComplete={() => onDamagePopupComplete(popup.id)}
                            />
                        ))}
                    </AnimatePresence>

                    <AnimatePresence mode="wait">
                        {impactFlash && (
                            <motion.div
                                key={`impact-${statsKey}`}
                                initial={{ opacity: 1 }}
                                animate={{ opacity: 0 }}
                                className={`absolute inset-0 z-[120] ${impactFlash} pointer-events-none`}
                            />
                        )}
                    </AnimatePresence>

                    <AnimatePresence mode="wait">
                        {screenFlash && (
                            <motion.div
                                key={`screen-${statsKey}`}
                                initial={{ opacity: 1 }}
                                animate={{ opacity: 0 }}
                                style={{ backgroundColor: screenFlash }}
                                className="absolute inset-0 z-[10] pointer-events-none"
                            />
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {showPhaseBanner && (
                            <motion.div
                                key={`phase-${currentBossPhase}`}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 1.2, opacity: 0 }}
                                className="absolute inset-0 flex items-center justify-center z-[60] pointer-events-none"
                            >
                                <div className="bg-resistance-accent/90 px-12 py-4 skew-x-[-12deg] border-y-4 border-white shadow-[0_0_50px_#ff003c]">
                                    <div className="text-white font-black text-2xl tracking-[0.5em] italic">PHASE_{currentBossPhase}_EVOLUTION</div>
                                    <div className="text-[10px] text-white/70 font-mono tracking-widest text-center mt-1">THREAT_LEVEL_CRITICAL</div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* HUD: Player Plate */}
            <div className="absolute bottom-6 right-6 z-40">
                <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{
                        x: isTakingDamage ? [-5, 5, -5, 5, 0] : 0,
                        opacity: 1
                    }}
                    transition={{ duration: 0.3 }}
                    className={`hud-node w-[300px] border-2 transition-colors ${player.hp / player.maxHp < 0.2 ? 'border-resistance-accent shadow-[0_0_20px_#ff003c]' : 'border-neon-blue/30'}`}
                >
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[12px] font-black tracking-widest ${player.hp / player.maxHp < 0.2 ? 'text-resistance-accent animate-pulse' : 'text-neon-blue'}`}>{player.name}</span>
                                {streamerNature && (
                                    <span className="text-[7px] px-1.5 py-0.5 bg-neon-pink/20 border border-neon-pink/40 text-neon-pink font-bold">
                                        {natures[streamerNature].displayName.toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className="text-[8px] font-mono text-white/30 uppercase mt-0.5 tracking-[0.2em]">{streamer.archetype}</div>
                        </div>
                        <div className="text-right">
                            <span className={`text-[8px] font-mono block ${player.hp / player.maxHp < 0.2 ? 'text-resistance-accent font-black animate-pulse' : 'text-white/30'}`}>
                                {player.hp / player.maxHp < 0.2 ? 'INTEGRITY_COMPROMISED' : 'INTEGRITY_SYNC'}
                            </span>
                            <span className={`text-[14px] font-mono font-black ${player.hp / player.maxHp < 0.2 ? 'text-resistance-accent' : 'text-white'}`}>{player.hp} / {player.maxHp}</span>
                        </div>
                    </div>
                    <div className="h-3 bg-black/60 border border-white/10 overflow-hidden rounded-sm relative">
                        <motion.div
                            animate={{ width: `${(player.hp / player.maxHp) * 100}%` }}
                            className={`h-full shadow-[0_0_20px] transition-colors duration-500 ${player.hp / player.maxHp < 0.2 ? 'bg-resistance-accent shadow-resistance-accent' : 'bg-neon-blue shadow-neon-blue'}`}
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_50%,transparent_50%)] bg-[size:100%_2px]" />
                    </div>

                    {/* Buff Indicators */}
                    <div className="flex gap-2 mt-2">
                        {attackBoost.turnsLeft > 0 && (
                            <div className="px-2 py-0.5 bg-neon-pink/10 border border-neon-pink/30 text-[7px] text-neon-pink font-bold rounded-sm animate-pulse">
                                ⚔️ OVERCLOCK_{Math.round((attackBoost.multiplier - 1) * 100)}%
                            </div>
                        )}
                        {defenseBoost.turnsLeft > 0 && (
                            <div className="px-2 py-0.5 bg-neon-blue/10 border border-neon-blue/30 text-[7px] text-neon-blue font-bold rounded-sm animate-pulse">
                                🛡️ SHIELD_NODE_ACTVE
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};
