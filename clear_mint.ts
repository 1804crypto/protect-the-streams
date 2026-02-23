import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearData() {
    const { error } = await supabase.from('mint_attempts').delete().neq('wallet_address', 'unknown');
    if (error) console.error(`Error deleting from mint_attempts:`, error.message);
    else console.log(`Cleared table: mint_attempts`);
}

clearData();
