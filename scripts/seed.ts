import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { streamers } from '../src/data/streamers';
import { items } from '../src/data/items';

// Load env vars
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedStreamers() {
    console.log('🌱 Seeding Streamers...');

    for (const s of streamers) {
        // Insert Streamer
        const { error: streamerError } = await supabase
            .from('streamers')
            .upsert({
                id: s.id,
                name: s.name,
                archetype: s.archetype,
                stats: s.stats,
                trait: s.trait,
                visual_prompt: s.visualPrompt,
                image: s.image,
                lore: s.lore
            });

        if (streamerError) {
            console.error(`Error inserting streamer ${s.name}:`, streamerError);
            continue;
        }

        // Insert Moves (Regular)
        const movesData = s.moves.map(m => ({
            streamer_id: s.id,
            name: m.name,
            type: m.type,
            power: m.power,
            pp: m.pp,
            description: m.description,
            is_ultimate: false
        }));

        // Insert Ultimate
        movesData.push({
            streamer_id: s.id,
            name: s.ultimateMove.name,
            type: s.ultimateMove.type,
            power: s.ultimateMove.power,
            pp: s.ultimateMove.pp,
            description: s.ultimateMove.description,
            is_ultimate: true
        });

        // Delete existing moves for this streamer to avoid duplicates if re-seeding
        await supabase.from('moves').delete().eq('streamer_id', s.id);

        const { error: movesError } = await supabase.from('moves').insert(movesData);

        if (movesError) {
            console.error(`Error inserting moves for ${s.name}:`, movesError);
        } else {
            console.log(`✅ Synced ${s.name}`);
        }
    }
}

async function seedItems() {
    console.log('🌱 Seeding Items...');

    const itemsList = Object.values(items).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        effect: item.effect,
        value: item.value,
        rarity: item.rarity,
        icon: item.icon
    }));

    const { error } = await supabase.from('items').upsert(itemsList);

    if (error) {
        console.error('Error seeding items:', error);
    } else {
        console.log(`✅ Synced ${itemsList.length} items`);
    }
}

async function seedSectorControl() {
    console.log('🌱 Seeding Sector Control...');

    const sectorControlList = streamers.map(s => ({
        streamer_id: s.id,
        controlling_faction: 'NONE',
        red_influence: 0,
        purple_influence: 0
    }));

    const { error } = await supabase.from('sector_control').upsert(sectorControlList);

    if (error) {
        console.error('Error seeding sector control:', error);
    } else {
        console.log(`✅ Synced ${sectorControlList.length} sectors`);
    }
}

async function main() {
    await seedStreamers();
    await seedItems();
    await seedSectorControl();
    console.log('🚀 Database Seed Complete');
}

main();
