# 🛡️ PROTECT THE STREAMS | RESISTANCE OS v4.1

> **Signal Status:** LIVE & OPERATIONAL  
> **Threat Level:** OMEGA  
> **Codebase:** HARDENED (v2026.02.11)

## 📌 Mission Overview
**Protect The Streams (PTS)** is a high-fidelity, cyberpunk-themed Web3 application built on Solana. It gamifies the support of content creators ("Streamers") against a fictional corporate entity ("Sentinel INC").

Players mint Streamer Cards (NFTs), deploy them on missions, and engage in real-time PvP battles to earn **$PTS** and **GLR** (Global Liberation Rating).

---

## ⚡ Tech Stack

### Frontend Core
- **Framework:** Next.js 16.1 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4, Framer Motion (Animations)
- **3D Graphics:** React Three Fiber / Drei

### Web3 Integration
- **Blockchain:** Solana (Mainnet/Devnet)
- **SDKs:** 
  - UMI (Metaplex) for advanced NFT interactions
  - Solana Wallet Adapter
- **Features:** 
  - Zero-cost "NoopSigner" minting flow
  - Wallet-based authentication (SIWS)

### Backend & Realtime
- **Database:** Supabase (PostgreSQL)
- **Realtime:** Supabase Realtime (PvP Signals)
- **AI:** Google Gemini 2.5 Flash (Dynamic Narration/Commentary)
- **Logging:** Custom isomorphic `Logger` utility

### Audio
- **Engine:** Web Audio API (Spatial 3D Audio)
- **TTS:** Web Speech API (Sophia - "Streamer Oracle" Personality)
- **Music:** Audius Integration

---

## 🎮 Key Features

### 1. The Resistance Hub
A fully immersive dashboard ("OS") featuring:
- **Streamer Roster:** Live status of 20+ top streamers.
- **Global Map:** Sector control visualization.
- **Leaderboards:** Real-time ranking of top operatives.

### 2. PvP Battle Arena
- **Real-time Combat:** Turn-based battles synchronized via WebSockets.
- **Move Validation:** Server-authoritative RPCs preventing cheat moves.
- **Wager System:** $PTS betting mechanics.
- **Effectiveness System:** Type interactions (Chaos, Influence, Rebellion, Charisma).

### 3. AI Operator "Sophia"
- **Context-Aware:** Reacts to battle events, mission outcomes, and player stats.
- **Persona:** "Late-20s Streamer Oracle" — uses slang (meta, clutch, yeet) and tactical advice.
- **Powered by:** Gemini 2.5 Flash + Web Speech API (Pitch/Rate tuned).

### 4. Mission Terminal
- **Deploy:** Send streamers on time-based missions.
- **Rewards:** Earn XP and items based on success rates.
- **Anti-Cheat:** Server-side validation of duration and rank.

---

## 🛠️ Setup & Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-repo/protect-the-streams.git
   cd protect-the-streams
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   GOOGLE_GENERATIVE_AI_API_KEY=...
   NEXT_PUBLIC_COLLECTION_ADDRESS=...
   JWT_SECRET=...
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

---

## 🛡️ Recent Updates (v4.1 - "Ironclad")

- **Global Refactor:** Implemented centralized `Logger` to catch and trace all errors.
- **Crash Prevention:** Hardened `usePvPBattle` hook with `try/catch` blocks around socket listeners.
- **API Standardization:** All API routes now return structured JSON errors.
- **Voice Upgrade:** Sophia now sounds clearer, faster, and more energetic (`speakHype` preset).

---

## 📜 License
(C) 2026 THE_RESISTANCE. All Rights Reserved.
