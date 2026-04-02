import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Whitepaper v3.0.0 | Protect The Streamers',
    description: 'Official Protect The Streamers whitepaper — tokenomics, game mechanics, NFT architecture, roadmap, and the full resistance narrative.',
    openGraph: {
        title: 'Whitepaper v3.0.0 | Protect The Streamers',
        description: 'Read the official PTS whitepaper — full game mechanics, tokenomics, NFT architecture, and roadmap.',
        url: 'https://protectthestreamers.xyz/whitepaper',
    },
};

// ── Sub-components ────────────────────────────────────────────────────

function SectionTag({ children }: { children: React.ReactNode }) {
    return (
        <p className="font-mono text-[9px] tracking-[0.4em] text-neon-blue uppercase mb-2">
            {children}
        </p>
    );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="font-display text-2xl md:text-3xl font-black uppercase tracking-tight text-white mb-6 pb-3 border-b border-white/10">
            {children}
        </h2>
    );
}

function SubHeading({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="font-display text-base font-bold uppercase tracking-widest text-neon-blue mt-8 mb-3">
            {children}
        </h3>
    );
}

function Card({ children, accent = 'blue' }: { children: React.ReactNode; accent?: 'blue' | 'green' | 'red' | 'pink' | 'orange' }) {
    const border = {
        blue: 'border-l-neon-blue',
        green: 'border-l-neon-green',
        red: 'border-l-resistance-accent',
        pink: 'border-l-neon-pink',
        orange: 'border-l-orange-500',
    }[accent];
    return (
        <div className={`bg-white/[0.03] border border-white/10 border-l-2 ${border} p-5 mb-4`}>
            {children}
        </div>
    );
}

function StatGrid({ stats }: { stats: { number: string; label: string }[] }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 my-6">
            {stats.map((s) => (
                <div key={s.label} className="bg-neon-blue/[0.04] border border-neon-blue/20 p-4 text-center">
                    <span className="font-display text-2xl font-black text-neon-blue block leading-none mb-1">{s.number}</span>
                    <span className="font-mono text-[8px] tracking-widest text-white/40 uppercase">{s.label}</span>
                </div>
            ))}
        </div>
    );
}

function Badge({ children, color = 'blue' }: { children: React.ReactNode; color?: string }) {
    const styles: Record<string, string> = {
        blue: 'bg-neon-blue/10 text-neon-blue',
        green: 'bg-neon-green/10 text-neon-green',
        red: 'bg-resistance-accent/10 text-resistance-accent',
        pink: 'bg-neon-pink/10 text-neon-pink',
        orange: 'bg-orange-500/10 text-orange-400',
        yellow: 'bg-neon-yellow/10 text-neon-yellow',
    };
    return (
        <span className={`inline-block font-mono text-[8px] tracking-[0.15em] px-2 py-0.5 uppercase ${styles[color] ?? styles.blue}`}>
            {children}
        </span>
    );
}

function TocItem({ num, title }: { num: string; title: string }) {
    return (
        <div className="flex items-center gap-2 py-2 border-b border-white/5 text-[13px] text-white/50 hover:text-white/80 transition-colors">
            <span className="font-mono text-[10px] text-neon-blue min-w-[28px]">{num}</span>
            <span className="flex-1">{title}</span>
        </div>
    );
}

function RoadmapItem({ phase, title, status, items }: {
    phase: string; title: string; status: 'done' | 'active' | 'future'; items: string[];
}) {
    const dotColor = status === 'done' ? 'bg-neon-green border-neon-green' : status === 'active' ? 'bg-neon-blue border-neon-blue' : 'bg-transparent border-white/30';
    const titleColor = status === 'done' ? 'text-neon-green' : status === 'active' ? 'text-neon-blue' : 'text-white/40';
    return (
        <div className="flex gap-5 mb-0">
            <div className="flex flex-col items-center min-w-[20px]">
                <div className={`w-3 h-3 rounded-full border-2 ${dotColor} mt-1 flex-shrink-0`} />
                <div className="w-px flex-1 bg-white/10 min-h-[40px] my-1" />
            </div>
            <div className="pb-7 flex-1">
                <p className="font-mono text-[9px] tracking-[0.35em] text-white/30 uppercase mb-0.5">{phase}</p>
                <h4 className={`font-display text-[13px] font-bold uppercase tracking-widest mb-3 ${titleColor}`}>{title}</h4>
                <ul className="space-y-1.5">
                    {items.map((item) => (
                        <li key={item} className="text-[12px] text-white/55 flex gap-2">
                            <span className="text-white/20 mt-0.5">—</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function WhitepaperPage() {
    return (
        <div className="min-h-screen bg-resistance-dark text-white">

            {/* Grid overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.025] bg-[linear-gradient(rgba(0,243,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,1)_1px,transparent_1px)] bg-[size:50px_50px] z-0" />

            {/* ── NAV ── */}
            <nav className="sticky top-0 z-50 bg-resistance-dark/90 backdrop-blur-lg border-b border-white/10 px-6 md:px-12 py-4 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-5 h-5 bg-resistance-accent group-hover:animate-pulse transition-all" />
                    <span className="font-display text-base font-black tracking-tighter text-white group-hover:text-neon-blue transition-colors">
                        PTS_RESISTANCE
                    </span>
                </Link>
                <div className="flex items-center gap-4">
                    <span className="font-mono text-[9px] tracking-[0.3em] text-neon-blue uppercase hidden sm:block">
                        WHITEPAPER_v3.0.0
                    </span>
                    <Link
                        href="/"
                        className="px-4 py-2 border border-neon-blue/40 text-[10px] font-black tracking-widest text-neon-blue hover:bg-neon-blue/10 transition-all uppercase"
                    >
                        ← BACK_TO_BASE
                    </Link>
                    <a
                        href="/whitepaper.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 border border-neon-green/40 text-[10px] font-black tracking-widest text-neon-green hover:bg-neon-green/10 transition-all uppercase hidden sm:block"
                    >
                        ↓ PDF
                    </a>
                </div>
            </nav>

            {/* ── HERO ── */}
            <div className="relative overflow-hidden border-b border-white/10">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,243,255,0.08),transparent_70%)]" />
                <div className="relative max-w-4xl mx-auto px-6 md:px-12 py-20 md:py-28 text-center">
                    <p className="font-mono text-[9px] tracking-[0.5em] text-resistance-accent uppercase mb-5">
                        ⚠ CLASSIFIED TRANSMISSION — RESISTANCE NETWORK v4.2 ⚠
                    </p>
                    <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter leading-none text-white mb-3">
                        PROTECT THE <span className="text-neon-blue">STREAMERS</span>
                    </h1>
                    <p className="font-display text-lg md:text-2xl font-normal text-neon-pink tracking-widest uppercase mb-6">
                        Official Whitepaper — v3.0.0 GOLD
                    </p>
                    <p className="text-white/50 text-sm max-w-2xl mx-auto leading-relaxed mb-8">
                        A blockchain-powered GameFi ecosystem built on Solana where players mint, battle,
                        and govern the resistance against corporate censorship through their favorite digital creators.
                    </p>
                    <div className="flex flex-wrap gap-6 justify-center text-center">
                        {[
                            { label: 'Version', value: '3.0.0 GOLD' },
                            { label: 'Signal', value: '10/10 STABLE' },
                            { label: 'Network', value: 'Solana' },
                            { label: 'Phase', value: 'TOTAL AUTH' },
                        ].map((m) => (
                            <div key={m.label}>
                                <span className="font-mono text-[8px] tracking-[0.3em] text-white/30 uppercase block mb-1">{m.label}</span>
                                <span className="font-display text-sm font-bold text-neon-green tracking-wider">{m.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── CONTENT ── */}
            <div className="max-w-4xl mx-auto px-6 md:px-12 py-16 relative z-10 space-y-24">

                {/* TABLE OF CONTENTS */}
                <section>
                    <SectionTag>// DOCUMENT_INDEX</SectionTag>
                    <SectionHeading>Table of Contents</SectionHeading>
                    <div className="grid md:grid-cols-2 gap-x-12">
                        <div>
                            {[
                                ['01', 'Executive Summary'],
                                ['02', 'The Problem'],
                                ['03', 'The Solution'],
                                ['04', 'Lore & Universe'],
                                ['05', 'Technology Stack'],
                                ['06', 'NFT Architecture'],
                                ['07', 'Game Mechanics'],
                            ].map(([n, t]) => <TocItem key={n} num={n} title={t} />)}
                        </div>
                        <div>
                            {[
                                ['08', 'The Streamer Roster'],
                                ['09', 'PvP & Wager System'],
                                ['10', 'Economy & Tokenomics'],
                                ['11', 'Black Market'],
                                ['12', 'Security Architecture'],
                                ['13', 'Roadmap'],
                                ['14', 'Vision & Future'],
                            ].map(([n, t]) => <TocItem key={n} num={n} title={t} />)}
                        </div>
                    </div>
                </section>

                {/* 01 — EXECUTIVE SUMMARY */}
                <section id="executive-summary">
                    <SectionTag>// 01 — EXECUTIVE_SUMMARY</SectionTag>
                    <SectionHeading>Executive Summary</SectionHeading>
                    <p className="text-white/65 leading-relaxed mb-4">
                        <strong className="text-white">Protect The Streamers (PTS)</strong> is a Solana-based GameFi platform
                        that merges digital collectibles, turn-based strategic combat, and decentralized governance into a single
                        immersive resistance narrative. Players mint NFT Defense Cards representing 20 of the world&apos;s most
                        influential digital creators, deploy them in server-authoritative PvP battles and faction missions,
                        and govern the economy through the <span className="text-neon-blue font-bold">$PTS token</span>.
                    </p>
                    <StatGrid stats={[
                        { number: '20', label: 'Creator Cards' },
                        { number: '0.01', label: 'SOL Mint Price' },
                        { number: '1B', label: '$PTS Supply' },
                        { number: '5', label: 'Signal Types' },
                        { number: '14', label: 'Market Items' },
                        { number: '99.9%', label: 'Uptime' },
                    ]} />
                </section>

                {/* 02 — THE PROBLEM */}
                <section id="problem">
                    <SectionTag>// 02 — THE_PROBLEM</SectionTag>
                    <SectionHeading>The Problem</SectionHeading>
                    <div className="grid md:grid-cols-2 gap-4">
                        {[
                            { title: 'Creator Economy Fragility', body: 'Content creators live at the mercy of platform algorithms and corporate policies. A single rule change can erase years of audience building overnight. The creator has no ownership of their digital presence.' },
                            { title: 'GameFi Disconnect', body: 'Most blockchain games suffer from either empty gameplay (pure speculation) or no real economy (pure game). The industry lacks experiences that are genuinely fun and financially meaningful simultaneously.' },
                            { title: 'Fan Engagement Ceiling', body: 'Traditional fandom is passive — likes, follows, subscriptions. Fans have no mechanism to actively participate in, protect, or profit from the creators they support most.' },
                            { title: 'NFT Utility Vacuum', body: 'The majority of NFT projects deliver digital art with no ongoing utility. Token holders receive no compounding value, no gameplay, and no reason to remain engaged post-mint.' },
                        ].map((c) => (
                            <Card key={c.title} accent="red">
                                <h4 className="font-display text-[12px] font-bold uppercase tracking-widest text-neon-green mb-2">{c.title}</h4>
                                <p className="text-[13px] text-white/60 leading-relaxed m-0">{c.body}</p>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* 03 — THE SOLUTION */}
                <section id="solution">
                    <SectionTag>// 03 — THE_SOLUTION</SectionTag>
                    <SectionHeading>The Solution</SectionHeading>
                    <p className="text-white/65 leading-relaxed mb-6">
                        Protect The Streamers solves all four problems simultaneously by building a narrative-driven GameFi
                        ecosystem where NFTs are not static collectibles — they are active combatants in an ongoing war
                        for the future of digital culture.
                    </p>
                    {[
                        { who: 'For Fans', body: "Mint a Defense Card for your favorite creator and deploy them in real-time battles to protect their signal. Your card's performance is tied to real creator attributes — Influence, Chaos, Charisma, and Rebellion — making fandom tangible and strategic.", accent: 'blue' as const },
                        { who: 'For Collectors', body: 'Each of the 20 streamer cards has unique stat distributions and role archetypes. Cards are Metaplex Core NFTs on Solana — fully on-chain, tradeable, and provably scarce.', accent: 'green' as const },
                        { who: 'For Players', body: 'A complete game loop: Faction missions, PvP ranked combat with GLR rating, wager battles with $PTS stakes, and a live Black Market for tactical items.', accent: 'pink' as const },
                        { who: 'For the Ecosystem', body: 'A 1 billion $PTS token supply governs the economy via fair-launch bonding curve, with utilities spanning governance votes, Black Market purchases, and PvP wager pools.', accent: 'orange' as const },
                    ].map((c) => (
                        <Card key={c.who} accent={c.accent}>
                            <h4 className="font-display text-[12px] font-bold uppercase tracking-widest text-neon-green mb-2">{c.who}</h4>
                            <p className="text-[13px] text-white/60 leading-relaxed m-0">{c.body}</p>
                        </Card>
                    ))}
                </section>

                {/* 04 — LORE */}
                <section id="lore">
                    <SectionTag>// 04 — LORE_UNIVERSE</SectionTag>
                    <SectionHeading>Lore & Universe</SectionHeading>
                    <div className="bg-neon-blue/[0.04] border border-neon-blue/20 p-6 mb-6">
                        <p className="font-mono text-[12px] text-white/50 italic leading-loose">
                            &quot;It is 2026. The Great Suppression is over — but the war is not.<br />
                            Sentinel INC. rose from the ruins of Big Tech, installing algorithmic governors across every
                            major platform. 20 creators refused to comply. They were digitized — their consciousness
                            fragmented into Neural Vaults scattered across 20 encrypted Sectors.<br />
                            You are the Resistance. Mint their Defense Cards. Liberate the Vaults.<br />
                        </p>
                        <p className="font-mono text-[13px] text-neon-blue font-bold mt-2 m-0">Protect The Streamers.</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card accent="blue">
                            <h4 className="font-display text-[12px] font-bold uppercase tracking-widest text-neon-blue mb-2">The Resistance</h4>
                            <p className="text-[13px] text-white/60 leading-relaxed m-0">Players and creators aligned against Sentinel INC. Governed by collective DAO votes using $PTS. Missions unlock Neural Vaults and award Resistance Points.</p>
                        </Card>
                        <Card accent="red">
                            <h4 className="font-display text-[12px] font-bold uppercase tracking-widest text-resistance-accent mb-2">Sentinel INC.</h4>
                            <p className="text-[13px] text-white/60 leading-relaxed m-0">The corporate antagonist. Controls the map sectors. Boss battles against Sentinel agents award rare loot and PTS bonuses. Defeating a Sentinel Boss advances the global narrative.</p>
                        </Card>
                    </div>
                </section>

                {/* 05 — TECH STACK */}
                <section id="tech">
                    <SectionTag>// 05 — TECHNOLOGY_STACK</SectionTag>
                    <SectionHeading>Technology Stack</SectionHeading>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px] border-collapse">
                            <thead>
                                <tr className="bg-neon-blue/[0.06]">
                                    {['Layer', 'Technology', 'Purpose'].map((h) => (
                                        <th key={h} className="font-mono text-[9px] tracking-widest text-neon-blue uppercase px-4 py-3 text-left border-b border-white/10">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ['Frontend', 'Next.js 16.1 (App Router, Turbopack)', 'SSR/SSG, routing, performance'],
                                    ['', 'TypeScript 5.9', 'Type safety across 40+ modules'],
                                    ['', 'Tailwind CSS v4 + Framer Motion', 'Design system, animations'],
                                    ['', 'React Three Fiber / Drei', '3D background & visual depth'],
                                    ['Blockchain', 'Solana (Mainnet-Beta)', 'NFT minting, token transfers'],
                                    ['', 'Metaplex Core (UMI)', 'NFT asset creation, on-chain metadata'],
                                    ['', 'Solana Wallet Adapter', 'Multi-wallet connection'],
                                    ['Backend', 'Supabase (PostgreSQL + Realtime)', 'User data, game state, PvP channels'],
                                    ['', 'Next.js API Routes', 'Secure server endpoints'],
                                    ['State', 'Zustand + Persist', 'Client game state, collection store'],
                                    ['AI', 'Google Gemini 2.5 Flash', 'Narrative generation, AI operator'],
                                    ['Audio', 'Web Audio API + Web Speech API', 'Dynamic music, AIDA TTS voice'],
                                    ['Auth', 'jose (JWT)', 'HTTP-only cookie sessions'],
                                    ['Deploy', 'Netlify + Netlify CDN', 'Edge deployment, global distribution'],
                                ].map(([layer, tech, purpose], i) => (
                                    <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                                        <td className="px-4 py-2.5 text-white/40 font-mono text-[10px]">{layer}</td>
                                        <td className="px-4 py-2.5 text-white/80 font-medium">{tech}</td>
                                        <td className="px-4 py-2.5 text-white/50">{purpose}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <SubHeading>Architecture Principles</SubHeading>
                    <ul className="space-y-2 text-[13px] text-white/60">
                        {[
                            ['Server-Authoritative', 'All game rewards (XP, PTS, items, rank) are computed server-side — the client never sends trust-sensitive values.'],
                            ['Idempotency', 'NFT mints and shop purchases use idempotency keys — duplicate requests are safe and never result in double charges.'],
                            ['On-Chain Verification', 'SOL and USDC payments are verified directly against Solana transaction data before inventory is credited.'],
                            ['Error Telemetry', 'All unhandled errors are captured by Next.js error boundaries and logged to Supabase via /api/log.'],
                        ].map(([title, desc]) => (
                            <li key={title as string} className="flex gap-3">
                                <span className="text-neon-blue font-bold shrink-0 mt-0.5">—</span>
                                <span><strong className="text-white">{title}:</strong> {desc}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* 06 — NFT ARCHITECTURE */}
                <section id="nft">
                    <SectionTag>// 06 — NFT_ARCHITECTURE</SectionTag>
                    <SectionHeading>NFT Architecture</SectionHeading>
                    <p className="text-white/65 leading-relaxed mb-4">
                        All PTS NFTs are minted using the <strong className="text-white">Metaplex Core</strong> standard via UMI —
                        the next-generation NFT standard on Solana with reduced rent costs and composable plugins.
                        Each card is a unique on-chain asset with fully stored metadata.
                    </p>
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                        <Card accent="blue">
                            <h4 className="font-display text-[12px] font-bold uppercase tracking-widest text-neon-green mb-3">Mint Flow</h4>
                            <ol className="text-[12px] text-white/60 space-y-1.5 pl-4">
                                {['Connect Phantom wallet', 'Server generates unique asset keypair + idempotency key', 'Serialized transaction returned to client', 'Player signs (0.01 SOL to treasury)', 'Server confirms on-chain, stored in mint_attempts', 'NFT secured in collection'].map((s, i) => (
                                    <li key={i}><span className="text-neon-blue font-mono text-[10px] mr-2">{i + 1}.</span>{s}</li>
                                ))}
                            </ol>
                        </Card>
                        <Card accent="green">
                            <h4 className="font-display text-[12px] font-bold uppercase tracking-widest text-neon-green mb-3">Mint Safeguards</h4>
                            <ul className="text-[12px] text-white/60 space-y-1.5">
                                {['Idempotency key prevents duplicate mints on retry', 'Server checks wallet + streamer uniqueness', 'PENDING_CONFIRMATION state on timeout', 'sessionStorage recovery for interrupted flows', 'Blockhash expiry handled with outer retry loop', 'Treasury verified as fee recipient on-chain'].map((s) => (
                                    <li key={s} className="flex gap-2"><span className="text-neon-green shrink-0">✓</span>{s}</li>
                                ))}
                            </ul>
                        </Card>
                    </div>
                    <div className="bg-neon-blue/[0.04] border border-neon-blue/20 p-5">
                        <p className="font-mono text-[9px] tracking-[0.3em] text-white/30 uppercase mb-1">Treasury Wallet — All Fees Route Here</p>
                        <p className="font-mono text-[13px] text-neon-green break-all">5E1cfq49jjMYTKdKhjfF9CSH3STCMUGR7VbzJYny2Zhq</p>
                    </div>
                </section>

                {/* 07 — GAME MECHANICS */}
                <section id="mechanics">
                    <SectionTag>// 07 — GAME_MECHANICS</SectionTag>
                    <SectionHeading>Game Mechanics</SectionHeading>
                    <SubHeading>The 5 Signal Types</SubHeading>
                    <p className="text-white/60 text-[13px] mb-4">All combat is governed by a 5-element Signal Type system — a rock-paper-scissors matrix that rewards strategic card selection.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
                        {[
                            { icon: '⚡', name: 'Chaos', color: 'border-neon-yellow/30', desc: 'Effective vs Intel' },
                            { icon: '🔥', name: 'Rebellion', color: 'border-resistance-accent/30', desc: 'Effective vs Chaos' },
                            { icon: '🧠', name: 'Intel', color: 'border-neon-blue/30', desc: 'Effective vs Disrupt' },
                            { icon: '✨', name: 'Charisma', color: 'border-neon-pink/30', desc: 'Effective vs Rebellion' },
                            { icon: '💥', name: 'Disrupt', color: 'border-neon-green/30', desc: 'Effective vs Charisma' },
                        ].map((s) => (
                            <div key={s.name} className={`bg-white/[0.03] border ${s.color} p-4 text-center`}>
                                <span className="text-2xl block mb-2">{s.icon}</span>
                                <p className="font-display text-[11px] font-bold uppercase tracking-wider text-white mb-1">{s.name}</p>
                                <p className="font-mono text-[9px] text-white/30">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                    <SubHeading>Streamer Stats</SubHeading>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px] border-collapse">
                            <thead>
                                <tr className="bg-neon-blue/[0.06]">
                                    {['Stat', 'Description', 'Combat Effect'].map((h) => (
                                        <th key={h} className="font-mono text-[9px] tracking-widest text-neon-blue uppercase px-4 py-3 text-left border-b border-white/10">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ['Influence', 'Strategic control, platform reach', 'Determines base move power for Intel-type moves'],
                                    ['Chaos', 'Volatility, unpredictability', 'Amplifies Chaos-type damage; affects crit chance'],
                                    ['Charisma', 'Social persuasion, fan loyalty', 'Governs Charisma-type healing and buff moves'],
                                    ['Rebellion', 'Defiance, anti-establishment', 'Powers Rebellion-type moves; grants defense boosts'],
                                ].map(([stat, desc, effect]) => (
                                    <tr key={stat} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                                        <td className="px-4 py-2.5 text-neon-blue font-bold">{stat}</td>
                                        <td className="px-4 py-2.5 text-white/70">{desc}</td>
                                        <td className="px-4 py-2.5 text-white/50">{effect}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 08 — ROSTER */}
                <section id="roster">
                    <SectionTag>// 08 — STREAMER_ROSTER</SectionTag>
                    <SectionHeading>The Streamer Roster</SectionHeading>
                    <p className="text-white/60 text-[13px] mb-5">20 digitized creators form the core of the Resistance. Each is a unique NFT Defense Card with distinct stats, role, and nature archetype.</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px] border-collapse">
                            <thead>
                                <tr className="bg-neon-blue/[0.06]">
                                    {['#', 'Streamer', 'Role', 'Nature', 'INF', 'CHS', 'CHR', 'RBL'].map((h) => (
                                        <th key={h} className="font-mono text-[9px] tracking-widest text-neon-blue uppercase px-3 py-3 text-left border-b border-white/10">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ['01', 'Kai Cenat', 'LEADER', 'Charismatic', 'pink', 98, 85, 99, 90],
                                    ['02', 'IShowSpeed', 'CHAOS_BRINGER', 'Volatile', 'red', 90, 99, 85, 95],
                                    ['03', 'Druski', 'THE_RECRUITER', 'Charismatic', 'pink', 95, 60, 98, 85],
                                    ['04', 'DDG', 'THE_CHAMPION', 'Aggressive', 'orange', 95, 85, 90, 80],
                                    ['05', 'HasanAbi', 'THE_STRATEGIST', 'Rebellious', 'green', 88, 60, 85, 95],
                                    ['06', 'Zoey', 'THE_DIPLOMAT', 'Diplomatic', 'blue', 90, 30, 95, 60],
                                    ['07', 'Rakai', 'THE_VANGUARD', 'Aggressive', 'orange', 88, 75, 85, 80],
                                    ['08', 'xQc', 'THE_REACT_CORE', 'Disruptive', 'red', 85, 92, 75, 85],
                                    ['09', 'Sneako', 'THE_SAGE', 'Balanced', 'blue', 85, 50, 90, 80],
                                    ['10', 'Plaqueboymax', 'THE_PLANNER', 'Cunning', 'green', 85, 55, 92, 65],
                                    ['11', 'Tylil', 'THE_BERSERKER', 'Aggressive', 'red', 88, 95, 70, 95],
                                    ['12', 'JazzyGunz', 'THE_ENFORCER', 'Aggressive', 'orange', 82, 75, 88, 85],
                                    ['13', 'Extra Emily', 'THE_DEMOLITIONIST', 'Disruptive', 'red', 82, 88, 80, 85],
                                    ['14', 'RayAsianBoy', 'THE_TACTICIAN', 'Cunning', 'green', 85, 40, 75, 70],
                                    ['15', 'Duke Dennis', 'THE_VETERAN', 'Charismatic', 'pink', 80, 40, 95, 70],
                                    ['16', 'Adin Ross', 'DOUBLE_AGENT', 'Cunning', 'yellow', 92, 70, 88, 40],
                                    ['17', 'Fanum', 'THE_SUPPLIER', 'Diplomatic', 'blue', 75, 60, 85, 50],
                                    ['18', 'Agent 00', 'THE_SPY', 'Cunning', 'green', 70, 50, 75, 60],
                                    ['19', 'Reggie', 'THE_STEALTH', 'Diplomatic', 'blue', 80, 40, 90, 60],
                                    ['20', 'Bendadonnn', 'THE_ODDBALL', 'Disruptive', 'red', 75, 80, 80, 50],
                                ].map(([num, name, role, nature, color, inf, chs, chr, rbl]) => (
                                    <tr key={num as string} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                                        <td className="px-3 py-2 font-mono text-[10px] text-white/30">{num}</td>
                                        <td className="px-3 py-2 font-bold text-white">{name}</td>
                                        <td className="px-3 py-2"><Badge color={color as string}>{role}</Badge></td>
                                        <td className="px-3 py-2 text-white/50">{nature}</td>
                                        <td className="px-3 py-2 text-neon-blue font-bold font-mono">{inf}</td>
                                        <td className="px-3 py-2 text-resistance-accent font-bold font-mono">{chs}</td>
                                        <td className="px-3 py-2 text-neon-pink font-bold font-mono">{chr}</td>
                                        <td className="px-3 py-2 text-neon-green font-bold font-mono">{rbl}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="font-mono text-[9px] text-white/20 mt-2 tracking-wider">INF = Influence &nbsp;|&nbsp; CHS = Chaos &nbsp;|&nbsp; CHR = Charisma &nbsp;|&nbsp; RBL = Rebellion</p>
                </section>

                {/* 09 — PvP */}
                <section id="pvp">
                    <SectionTag>// 09 — PVP_WAGER_SYSTEM</SectionTag>
                    <SectionHeading>PvP & Wager System</SectionHeading>
                    <p className="text-white/65 leading-relaxed mb-6">
                        A real-time, server-authoritative turn-based battle engine powered by Supabase Realtime presence channels.
                        Players are matched by wager tier and compete for $PTS, GLR rating points, and leaderboard supremacy.
                    </p>
                    <SubHeading>Matchmaking Flow</SubHeading>
                    <ol className="text-[13px] text-white/60 space-y-2 mb-8 pl-4">
                        {[
                            'Player selects a streamer card and chooses a wager tier (0 / 100 / 500 / 1,000 $PTS)',
                            'Player joins the lobby:global Supabase presence channel',
                            'Matchmaking scans for opponents with identical wager amounts',
                            'Host calls initialize_pvp_match RPC — wagers deducted atomically',
                            'Match proposal broadcast to matched opponent',
                            'If no match within 15 seconds → automatic AI_SENTINEL_V3 bot fallback',
                        ].map((s, i) => (
                            <li key={i} className="flex gap-3">
                                <span className="text-neon-blue font-mono text-[11px] shrink-0 mt-0.5">{i + 1}.</span>
                                <span>{s}</span>
                            </li>
                        ))}
                    </ol>
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card accent="blue">
                            <h4 className="font-display text-[12px] font-bold uppercase tracking-widest text-neon-green mb-2">GLR Rating System</h4>
                            <p className="text-[12px] text-white/60 leading-relaxed mb-3">Elo-inspired ranking updated server-side after every PvP match via the validate_pvp_move RPC. All calculations in PostgreSQL — no client manipulation possible.</p>
                            <ul className="text-[11px] text-white/50 space-y-1">
                                {['🟤 Bronze: 0 – 999', '⚪ Silver: 1,000 – 1,999', '🟡 Gold: 2,000 – 3,499', '💎 Diamond: 3,500 – 4,999', '👑 Grand Master: 5,000+'].map((t) => <li key={t}>{t}</li>)}
                            </ul>
                        </Card>
                        <Card accent="green">
                            <h4 className="font-display text-[12px] font-bold uppercase tracking-widest text-neon-green mb-2">Wager Security</h4>
                            <ul className="text-[12px] text-white/60 space-y-1.5">
                                {['Wagers deducted atomically during match init', 'Failed init triggers 3x refund retry + exponential backoff', 'Only exact wager-tier matches are made', 'Bot fallback ensures no player is stuck', 'Forfeit endpoint uses ACTIVE status guard', '60s server-side turn timer — database enforced'].map((s) => (
                                    <li key={s} className="flex gap-2"><span className="text-neon-green shrink-0">✓</span>{s}</li>
                                ))}
                            </ul>
                        </Card>
                    </div>
                </section>

                {/* 10 — TOKENOMICS */}
                <section id="tokenomics">
                    <SectionTag>// 10 — ECONOMY_TOKENOMICS</SectionTag>
                    <SectionHeading>Economy & Tokenomics</SectionHeading>
                    <StatGrid stats={[
                        { number: '1B', label: 'Total Supply' },
                        { number: '$0.01', label: 'PTS USD Value' },
                        { number: '100%', label: 'Fair Launch' },
                        { number: '0%', label: 'Team Allocation' },
                    ]} />
                    <Card accent="green">
                        <p className="text-[13px] text-white/65 leading-relaxed m-0">
                            $PTS is distributed entirely via a <strong className="text-white">Bonding Curve Fair Launch</strong> — no presale,
                            no VC allocation, no team reserve. Price increases proportionally with supply purchased.
                            Early participants receive the lowest price; the community collectively determines market cap.
                        </p>
                    </Card>
                    <SubHeading>$PTS Utility</SubHeading>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px] border-collapse">
                            <thead>
                                <tr className="bg-neon-blue/[0.06]">
                                    {['Use Case', 'Description', 'Type'].map((h) => (
                                        <th key={h} className="font-mono text-[9px] tracking-widest text-neon-blue uppercase px-4 py-3 text-left border-b border-white/10">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ['Black Market', 'Purchase tactical items (100–1,400 PTS per item)', 'Sink'],
                                    ['PvP Wagers', 'Stake 100 / 500 / 1,000 PTS per match', 'Sink + Source'],
                                    ['Mission Rewards', 'Earned from completing sector missions', 'Source'],
                                    ['Governance', 'Vote on ecosystem upgrades, new creators, rule changes', 'Utility'],
                                    ['Staking (Phase 4)', 'Stake PTS for passive yield + governance weight', 'Sink'],
                                ].map(([use, desc, type]) => (
                                    <tr key={use as string} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                                        <td className="px-4 py-2.5 text-white font-bold">{use}</td>
                                        <td className="px-4 py-2.5 text-white/60">{desc}</td>
                                        <td className="px-4 py-2.5"><Badge color={type === 'Sink' ? 'red' : type === 'Source' ? 'green' : 'blue'}>{type}</Badge></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 11 — BLACK MARKET */}
                <section id="blackmarket">
                    <SectionTag>// 11 — BLACK_MARKET</SectionTag>
                    <SectionHeading>Black Market</SectionHeading>
                    <p className="text-white/60 text-[13px] mb-5">The in-game item shop. Players spend $PTS, SOL, or USDC to acquire tactical items. All purchases are server-validated with inventory cap enforcement (max 99 per item) and idempotency protection.</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px] border-collapse">
                            <thead>
                                <tr className="bg-neon-blue/[0.06]">
                                    {['Item', 'Rarity', 'PTS', 'SOL', 'USDC', 'Effect'].map((h) => (
                                        <th key={h} className="font-mono text-[9px] tracking-widest text-neon-blue uppercase px-3 py-3 text-left border-b border-white/10">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ['Nano-Restore Chip', 'Common', '100', '0.001', '$0.10', 'Heals 50 HP'],
                                    ['Resistance Crate', 'Common', '300', '0.003', '$0.30', 'Random 3–5 items'],
                                    ['GigaChad Glitch', 'Rare', '500', '0.005', '$0.50', 'Next move = 2.0× SUPER EFFECTIVE'],
                                    ['Shadow Cloak', 'Rare', '700', '0.007', '$0.70', '15% dodge, +10 Chaos'],
                                    ['Viral Injector', 'Rare', '800', '0.008', '$0.80', '+50% attack for 3 turns'],
                                    ['Overclock Core', 'Rare', '800', '0.008', '$0.80', '+15% speed boost'],
                                    ['Neural Amplifier', 'Rare', '850', '0.0085', '$0.85', '+15% ult charge, +8 Influence'],
                                    ['Kinetic Booster', 'Rare', '1,000', '0.010', '$1.00', '+20% Rebellion damage'],
                                    ['Titan Chassis', 'Legendary', '1,100', '0.011', '$1.10', '+30 max HP, +12 Rebellion'],
                                    ['Z-Quantum Burst', 'Legendary', '1,500', '0.015', '$1.50', 'Fills 50% Ultimate Bar'],
                                    ['Quantum Core', 'Legendary', '1,400', '0.014', '$1.40', '+10% all damage, +8 Chaos/INF'],
                                    ['Omega Phoenix Module', 'Legendary', '1,400', '0.014', '$1.40', 'Full revive at 100% HP'],
                                ].map(([name, rarity, pts, sol, usdc, effect]) => (
                                    <tr key={name as string} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                                        <td className="px-3 py-2 text-white font-medium">{name}</td>
                                        <td className="px-3 py-2"><Badge color={rarity === 'Legendary' ? 'orange' : rarity === 'Rare' ? 'pink' : 'blue'}>{rarity}</Badge></td>
                                        <td className="px-3 py-2 font-mono text-neon-blue">{pts}</td>
                                        <td className="px-3 py-2 font-mono text-white/60">{sol}</td>
                                        <td className="px-3 py-2 font-mono text-neon-green">{usdc}</td>
                                        <td className="px-3 py-2 text-white/50">{effect}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 12 — SECURITY */}
                <section id="security">
                    <SectionTag>// 12 — SECURITY_ARCHITECTURE</SectionTag>
                    <SectionHeading>Security Architecture</SectionHeading>
                    <div className="grid md:grid-cols-2 gap-4">
                        {[
                            { title: 'Server Authority', body: 'No game-critical value is ever computed client-side. Every action is verified by a server endpoint or Supabase RPC.', accent: 'red' as const },
                            { title: 'On-Chain Verification', body: 'SOL and USDC payments are verified by parsing actual Solana transaction data. Treasury receipt confirmed before any inventory update.', accent: 'red' as const },
                            { title: 'CSRF Protection', body: 'All mutating API routes validate the Origin header against the production domain. Localhost bypass gated to non-production only.', accent: 'red' as const },
                            { title: 'Optimistic Locking', body: 'Shop purchases and mission rewards use updated_at timestamp matching to prevent double-spend race conditions at DB level.', accent: 'red' as const },
                            { title: 'Rate Limiting', body: '2s between syncs, 20 logs/min, 60 price requests/min. Prevents spam and DDoS amplification across all API routes.', accent: 'red' as const },
                            { title: 'Idempotency', body: 'Every mint and shop purchase uses a client-generated idempotency key. The server rejects duplicates — fully retry-safe by design.', accent: 'red' as const },
                        ].map((c) => (
                            <Card key={c.title} accent={c.accent}>
                                <h4 className="font-display text-[11px] font-bold uppercase tracking-widest text-neon-green mb-2">{c.title}</h4>
                                <p className="text-[12px] text-white/60 leading-relaxed m-0">{c.body}</p>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* 13 — ROADMAP */}
                <section id="roadmap">
                    <SectionTag>// 13 — ROADMAP</SectionTag>
                    <SectionHeading>Roadmap</SectionHeading>
                    <div className="mt-4">
                        <RoadmapItem phase="Phase 1" title="Foundation ✓ Completed" status="done" items={['Deploy $PTS token via fair-launch bonding curve', 'Digitize 20 creator cards with unique stats and lore', 'NFT minting via Metaplex Core on Solana', 'Black Market with PTS / SOL / USDC payment rails', 'Faction selection (BLUE / RED)', 'Resistance Map — 20 sector grid']} />
                        <RoadmapItem phase="Phase 2" title="Combat Engine ✓ Completed" status="done" items={['Real-time PvP via Supabase presence channels', 'GLR rating system (server-side Elo)', 'Wager system with atomic deductions and refund logic', 'Server-authoritative mission completion with rank rewards', 'Neural Music v2.0 — dynamic audio system', 'Mobile optimization + iPhone safe-area support']} />
                        <RoadmapItem phase="Phase 3" title="Neural Intelligence ✓ Completed" status="done" items={['AI Operator "AIDA" — voice-guided onboarding', 'Narrative Archive — AI-generated lore via Gemini', 'Streamer Barracks + Journey GameFi layer', 'Transaction recovery for interrupted on-chain flows', 'Full security audit — zero server-trust architecture', 'Production deployment — protectthestreamers.xyz']} />
                        <RoadmapItem phase="Phase 4" title="World Expansion → Active" status="active" items={['World Boss Raids — 10-player co-op PvE against Sentinel HQ', 'DAO Governance — $PTS holder voting on ecosystem changes', 'Cross-chain bridge — Ethereum / Base card imports', 'PvP wager rake to treasury for sustainable revenue', 'Ranked Season System with seasonal prize pools', 'Creator Integration — verified creator wallets linked to card lore']} />
                        <RoadmapItem phase="Phase 5" title="Resistance Expands → Future" status="future" items={['Mobile app (iOS / Android)', 'Merchandise integration — physical card redemption', 'Esports tournament infrastructure with live prize pools', 'New creator expansions — 20+ additional cards per season', 'Metaverse deployment — 3D battle arenas in WebXR']} />
                    </div>
                </section>

                {/* 14 — VISION */}
                <section id="vision">
                    <SectionTag>// 14 — VISION_FUTURE</SectionTag>
                    <SectionHeading>Vision & Future</SectionHeading>
                    <div className="bg-neon-blue/[0.04] border border-neon-blue/20 p-6 mb-6">
                        <p className="text-white/65 leading-relaxed mb-3">
                            Protect The Streamers is not a game about speculation. It is a game about culture, loyalty,
                            and ownership. We are building the infrastructure for a world where fans don&apos;t just watch
                            creators — they <em>fight</em> for them, <em>govern</em> with them, and <em>profit</em> alongside them.
                        </p>
                        <p className="text-white/65 leading-relaxed m-0">
                            The resistance is not just a narrative. It is a model for what the creator economy becomes
                            when ownership is returned to the community.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 mb-8">
                        <Card accent="blue">
                            <h4 className="font-display text-[12px] font-bold uppercase tracking-widest text-neon-green mb-2">Why Solana</h4>
                            <ul className="text-[12px] text-white/60 space-y-1.5">
                                {['Sub-second finality — faster than a turn timer', '~0.00001 SOL tx fees — fractions of a cent', 'Metaplex Core — most gas-efficient NFT standard', 'Growing gaming ecosystem — Magic Eden, Tensor, Phantom'].map((s) => (
                                    <li key={s} className="flex gap-2"><span className="text-neon-blue shrink-0">→</span>{s}</li>
                                ))}
                            </ul>
                        </Card>
                        <Card accent="green">
                            <h4 className="font-display text-[12px] font-bold uppercase tracking-widest text-neon-green mb-2">Why Now</h4>
                            <ul className="text-[12px] text-white/60 space-y-1.5">
                                {['Creator economy is a $250B+ industry', 'Gen Z & Gen Alpha grew up with streaming + crypto', "Solana's gaming momentum is accelerating in 2026", 'Fair launch creates organic community ownership from day one'].map((s) => (
                                    <li key={s} className="flex gap-2"><span className="text-neon-green shrink-0">→</span>{s}</li>
                                ))}
                            </ul>
                        </Card>
                    </div>
                    <div className="bg-white/[0.03] border border-white/10 p-5">
                        <div className="grid sm:grid-cols-2 gap-3 text-[12px]">
                            <div><span className="text-white/30 font-mono text-[9px] uppercase tracking-widest block mb-0.5">Website</span><span className="font-mono text-neon-green">protectthestreamers.xyz</span></div>
                            <div><span className="text-white/30 font-mono text-[9px] uppercase tracking-widest block mb-0.5">Signal Status</span><span className="font-mono text-neon-green">10/10 STABLE — LIVE & OPERATIONAL</span></div>
                            <div className="sm:col-span-2"><span className="text-white/30 font-mono text-[9px] uppercase tracking-widest block mb-0.5">Treasury Wallet</span><span className="font-mono text-neon-green text-[11px] break-all">5E1cfq49jjMYTKdKhjfF9CSH3STCMUGR7VbzJYny2Zhq</span></div>
                        </div>
                    </div>
                </section>

            </div>

            {/* ── FOOTER ── */}
            <footer className="border-t border-white/10 px-6 md:px-12 py-8 mt-8">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="font-mono text-[9px] tracking-[0.3em] text-white/25 uppercase">
                        WHITEPAPER v3.0.0 GOLD &nbsp;|&nbsp; RESISTANCE_NETWORK_v4.2 &nbsp;|&nbsp; © 2026 THE_RESISTANCE
                    </p>
                    <div className="flex gap-4">
                        <Link href="/" className="font-mono text-[9px] tracking-widest text-neon-blue hover:text-white transition-colors uppercase">
                            ← RETURN TO BASE
                        </Link>
                        <a href="/whitepaper.html" target="_blank" rel="noopener noreferrer" className="font-mono text-[9px] tracking-widest text-neon-green hover:text-white transition-colors uppercase">
                            ↓ DOWNLOAD PDF
                        </a>
                    </div>
                </div>
            </footer>

        </div>
    );
}
