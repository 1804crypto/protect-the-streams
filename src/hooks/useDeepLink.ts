"use client";

import { useEffect, useRef } from 'react';
import { useModalStore } from './useModalStore';
import { useGameDataStore } from './useGameDataStore';

/**
 * Deep linking hook — syncs modal/panel state with URL hash.
 *
 * Supported hash routes:
 *   #tutorial, #faction, #leaderboard, #archive, #barracks, #hub, #glossary
 *   #mission/{streamerId}
 *   #pvp/{streamerId}
 *   #journey/{streamerId}
 *   #roster  (scroll-only, no modal)
 *
 * - On mount: reads hash → opens corresponding modal/panel
 * - On state change: updates hash to reflect current state
 * - On popstate (back/forward): restores state from hash
 */

const MODAL_IDS = new Set(['tutorial', 'faction', 'leaderboard', 'archive', 'barracks', 'hub', 'glossary']);
const STREAMER_PANELS = new Set(['mission', 'pvp', 'journey']);

/** Parse a hash string into a route descriptor */
function parseHash(hash: string): { type: 'modal'; id: string } | { type: 'streamer'; panel: string; streamerId: string } | null {
    const raw = hash.replace(/^#\/?/, '').toLowerCase();
    if (!raw) return null;

    // Check simple modal IDs
    if (MODAL_IDS.has(raw)) {
        return { type: 'modal', id: raw };
    }

    // Check streamer panel routes: mission/id, pvp/id, journey/id
    const slashIdx = raw.indexOf('/');
    if (slashIdx > 0) {
        const panel = raw.substring(0, slashIdx);
        const streamerId = raw.substring(slashIdx + 1);
        if (STREAMER_PANELS.has(panel) && streamerId) {
            return { type: 'streamer', panel, streamerId };
        }
    }

    return null;
}

/** Build hash string from current modal state */
function buildHash(state: {
    activeModal: string | null;
    activeMissionStreamer: { id: string } | null;
    activePvPStreamer: { id: string } | null;
    activeJourneyStreamer: { id: string } | null;
}): string {
    if (state.activeModal) return `#${state.activeModal}`;
    if (state.activeMissionStreamer) return `#mission/${state.activeMissionStreamer.id}`;
    if (state.activePvPStreamer) return `#pvp/${state.activePvPStreamer.id}`;
    if (state.activeJourneyStreamer) return `#journey/${state.activeJourneyStreamer.id}`;
    return '';
}

export function useDeepLink() {
    // Prevent the hash→state effect from re-triggering when we programmatically set the hash
    const suppressHashChange = useRef(false);
    const initialized = useRef(false);

    const streamers = useGameDataStore(state => state.streamers);

    // Use individual selectors to avoid object-reference churn in dependency arrays
    const activeModal = useModalStore(state => state.activeModal);
    const activeMissionStreamer = useModalStore(state => state.activeMissionStreamer);
    const activePvPStreamer = useModalStore(state => state.activePvPStreamer);
    const activeJourneyStreamer = useModalStore(state => state.activeJourneyStreamer);

    // --- State → Hash: update URL when modal state changes ---
    useEffect(() => {
        const hash = buildHash({
            activeModal,
            activeMissionStreamer,
            activePvPStreamer,
            activeJourneyStreamer,
        });

        const currentHash = window.location.hash;
        if (hash === currentHash || (!hash && !currentHash)) return;

        suppressHashChange.current = true;
        if (hash) {
            window.history.replaceState(null, '', hash);
        } else {
            // Clear hash without scrolling to top
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        queueMicrotask(() => { suppressHashChange.current = false; });
    }, [activeModal, activeMissionStreamer, activePvPStreamer, activeJourneyStreamer]);

    // --- Hash → State: on mount and on popstate (back/forward navigation) ---
    useEffect(() => {
        function applyHash() {
            if (suppressHashChange.current) return;

            const parsed = parseHash(window.location.hash);
            const modal = useModalStore.getState();

            if (!parsed) {
                // No hash or unrecognized → close everything
                if (modal.activeModal || modal.activeMissionStreamer || modal.activePvPStreamer || modal.activeJourneyStreamer) {
                    modal.closeAll();
                }
                return;
            }

            if (parsed.type === 'modal') {
                modal.openModal(parsed.id as Parameters<typeof modal.openModal>[0]);
                return;
            }

            // Streamer panel — need to look up streamer object
            const currentStreamers = useGameDataStore.getState().streamers;
            const streamer = currentStreamers.find(s => s.id === parsed.streamerId);
            if (!streamer) return; // Streamer data not loaded yet or invalid ID

            switch (parsed.panel) {
                case 'mission': modal.setMissionStreamer(streamer); break;
                case 'pvp': modal.setPvPStreamer(streamer); break;
                case 'journey': modal.setJourneyStreamer(streamer); break;
            }
        }

        // Apply hash on first mount (after streamers are loaded)
        if (!initialized.current && streamers.length > 0) {
            initialized.current = true;
            applyHash();
        }

        // Listen for back/forward navigation
        window.addEventListener('popstate', applyHash);
        return () => window.removeEventListener('popstate', applyHash);
    }, [streamers]);
}
