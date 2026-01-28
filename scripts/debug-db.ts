import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable(tableName: string) {
    console.log(`\n🔍 Inspecting table: ${tableName}`);
    const { data, error } = await supabase.from(tableName).select('*').limit(1);

    if (error) {
        console.error(`❌ Error querying ${tableName}:`, error.message);
        if (error.hint) console.log(`   Hint: ${error.hint}`);
        if (error.details) console.log(`   Details: ${error.details}`);
    } else {
        console.log(`✅ Table ${tableName} is accessible.`);
        if (data && data.length > 0) {
            console.log(`   Columns found: ${Object.keys(data[0]).join(', ')}`);
        } else {
            console.log(`   Table is empty. Testing individual columns...`);
            // This is tedious but helps when * fails or cache is weird
        }
    }
}

async function main() {
    await inspectTable('sector_control');
    await inspectTable('users');
    await inspectTable('profiles');
}

main();
