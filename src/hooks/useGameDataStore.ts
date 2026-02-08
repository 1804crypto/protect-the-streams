import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';
import { Streamer, Move, streamers as localStreamers } from '@/data/streamers';
import { BattleItem, items as localItems } from '@/data/items';

interface GameDataState {
    streamers: Streamer[];
    items: Record<string, BattleItem>;
    isLoading: boolean;
    error: string | null;
    isInitialized: boolean;

    // Actions
    fetchGameData: () => Promise<void>;
}

export const useGameDataStore = create<GameDataState>((set) => ({
    streamers: localStreamers,
    items: localItems,
    isLoading: false,
    error: null,
    isInitialized: false,

    fetchGameData: async () => {
        set({ isLoading: true, error: null });
        try {
            // Fetch Streamers
            const { data: streamersData, error: streamersError } = await supabase
                .from('streamers')
                .select('*');

            if (streamersError) throw streamersError;

            // Fetch Moves for each streamer
            const { data: movesData, error: movesError } = await supabase
                .from('moves')
                .select('*');

            if (movesError) throw movesError;

            // Fetch Items
            const { data: itemsData, error: itemsError } = await supabase
                .from('items')
                .select('*');

            if (itemsError) throw itemsError;

            // Process Data: Link moves to streamers and ensure uniqueness
            const uniqueMap = new Map<string, Streamer>();
            const seenNames = new Set<string>();

            streamersData.forEach(s => {
                // Deduplicate by ID and Name to fix roster duplication bug
                if (uniqueMap.has(s.id) || seenNames.has(s.name.trim().toLowerCase())) return;

                const streamerMoves = movesData.filter(m => m.streamer_id === s.id && !m.is_ultimate);
                const ultimateMove = movesData.find(m => m.streamer_id === s.id && m.is_ultimate);

                uniqueMap.set(s.id, {
                    // OVERRIDE: Prioritize local image assets (to fix DB mismatch)
                    image: localStreamers.find(ls => ls.id === s.id)?.image || s.image,
                    id: s.id,
                    name: s.name,
                    archetype: s.archetype,
                    stats: s.stats,
                    trait: s.trait,
                    visualPrompt: s.visual_prompt,
                    image: s.image,
                    lore: s.lore,
                    moves: streamerMoves.map(m => ({
                        name: m.name,
                        type: m.type as any,
                        power: m.power,
                        pp: m.pp,
                        description: m.description
                    })),
                    ultimateMove: ultimateMove ? {
                        name: ultimateMove.name,
                        type: ultimateMove.type as any,
                        power: ultimateMove.power,
                        pp: ultimateMove.pp,
                        description: ultimateMove.description
                    } : {
                        name: "GENERIC_BLAST",
                        type: "CHAOS",
                        power: 100,
                        pp: 1,
                        description: "Fallback ultimate."
                    } as Move,
                    narrative: s.narrative || {
                        role: 'UNKNOWN',
                        codename: 'UNKNOWN',
                        originStory: 'Bio-Digital data corrupted during transfer.',
                        mission: 'Awaiting directive.',
                        connection: 'Signal lost.'
                    }
                });
                seenNames.add(s.name.trim().toLowerCase());
            });

            const processedStreamers = Array.from(uniqueMap.values());

            // Process Items
            const processedItems: Record<string, BattleItem> = {};
            if (itemsData && itemsData.length > 0) {
                itemsData.forEach(i => {
                    processedItems[i.id] = {
                        id: i.id,
                        name: i.name,
                        description: i.description,
                        effect: i.effect as any,
                        value: Number(i.value),
                        rarity: i.rarity as any,
                        icon: i.icon
                    };
                });
            }

            set({
                streamers: processedStreamers.length > 0 ? processedStreamers : localStreamers.filter((s, i, a) => a.findIndex(t => t.id === s.id) === i),
                items: Object.keys(processedItems).length > 0 ? processedItems : localItems,
                isLoading: false,
                isInitialized: true
            });

        } catch (err: any) {
            console.error("Failed to fetch game data:", err);
            set({ error: err.message, isLoading: false, isInitialized: true }); // Set initialized even on error to stop spinner
        }
    }
}));
