# Functionality Assessment Report

This document outlines the features of the **PROTECT THE STREAMS** application that are currently mock-up, incomplete, or rely on client-side simulation rather than full backend/blockchain integration.

## 🛑 Critical Functionality Gaps

### 1. NFT Minting is Simulated
*   **Current Behavior:** When a user "Mints" a streamer, they pay a transaction fee (SOL transfer) to the Treasury Wallet. A `Memo` instruction is added to the blockchain transaction to log the action. The application then saves the "Unlocked" status to the browser's **Local Storage**.
*   **The Issue:** **No actual NFT or Token is minted.**
    *   The user does not receive an SPL Token or Metaplex NFT in their wallet.
    *   The asset will not appear in Phantom/Solflare or on marketplaces like Tensor/Magic Eden.
    *   **Data Loss Risk:** If the user clears their browser cache or switches devices, their "Collection" is completely lost, even though they paid SOL.

### 2. Player Progress is Local-Only
*   **Current Behavior:** All game progress (Campaign Mode, Leveling Up, Inventory, XP) is stored in the browser's `localStorage` via the `pts_storage` key.
*   **The Issue:** There is no cloud sync. A user cannot play on their phone and then resume on their desktop. Progress is tied to the specific browser instance, not the user's Wallet Address or a user account.

### 3. Leaderboards use Mock Data
*   **Current Behavior:** The `Leaderboard.tsx` component attempts to fetch data from a Supabase table named `profiles`. If this fails or returns no data, it displays a hardcoded list of fake players ("NEO_V1", "GHOST_SHELL").
*   **The Issue:** Unless the `profiles` table is actively being populated by a backend process that tracks wins/losses (which is currently not fully implemented), real players will never appear on the leaderboard.

### 4. PvP Battles are Client-Authoritative
*   **Current Behavior:** Damage calculations and game state are handled on the user's device and broadcast to the opponent via Supabase Realtime.
*   **The Issue:** There is no server-side validation.
    *   **Cheat Risk:** A tech-savvy user could manipulate the JavaScript code to deal 9999 damage or have infinite health.
    *   **Desync:** Network lag can cause two players to see different game states (e.g., one sees a KO, the other sees they are still alive).

### 5. Faction War Persistence
*   **Current Behavior:** The "Global Faction War" map relies on a Supabase RPC function `contribute_to_faction_war` and a `sector_control` table.
*   **The Issue:** If these database components are not deployed or if the RPC permission isn't set, the map will revert to a default state or fail to update, making the "Global War" feature purely cosmetic.

## ⚠️ Recommendation for "Go-Live"

To move from a "Demo/Prototype" to a fully functioning Web3 Game, the following steps are required:

1.  **Implement Real Minting:** Update the backend to listen for the Payment Transaction and then mint a **Compressed NFT (cNFT)** on Solana to the user's wallet.
2.  **Cloud Sync:** Sync the `useCollectionStore` state to a Supabase `users` table keyed by the Wallet Public Key.
3.  **Server-Side PvP:** Move the battle logic (damage calc, win/loss) to a Supabase Edge Function to prevent cheating.
