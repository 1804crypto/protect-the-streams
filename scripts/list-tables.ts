import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    console.log('🔍 Listing all tables in public schema...');

    // We can use a trick to list tables via a query to pg_catalog if we have permissions, 
    // or just try to query known potential tables.

    // Since it's a service role key, we might be able to use an RPC or just trial and error.
    // Better way: query a system table if allowed via RPC or just try many.

    const tables = ['streamers', 'moves', 'items', 'profiles', 'users', 'sector_control', 'missions'];
    for (const table of tables) {
        const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
        if (error) {
            console.log(`❌ Table ${table}: ${error.message}`);
        } else {
            console.log(`✅ Table ${table}: EXISTS`);
        }
    }
}

listTables();
