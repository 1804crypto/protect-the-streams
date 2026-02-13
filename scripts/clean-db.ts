import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanDynamicTables() {
    console.log('🧹 Cleaning dynamic tables...');

    const tables = ['pvp_matches', 'missions', 'sector_attacks', 'faction_war_contributions'];

    for (const table of tables) {
        console.log(`Clearing ${table}...`);
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) {
            console.error(`Error clearing ${table}:`, error.message);
        } else {
            console.log(`✅ ${table} cleared.`);
        }
    }
}

cleanDynamicTables();
