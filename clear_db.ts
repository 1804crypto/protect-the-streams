import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearData() {
  console.log('Clearing test data from Supabase...');

  const tablesWithUuid = ['pvp_matches', 'error_logs', 'mint_attempts', 'users'];
  for (const table of tablesWithUuid) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) console.error(`Error deleting from ${table}:`, error.message);
    else console.log(`Cleared table: ${table}`);
  }

  // sector_control might use streamer_id
  const { error: scError } = await supabase.from('sector_control').delete().neq('streamer_id', 'unknown');
  if (scError) console.error(`Error deleting from sector_control:`, scError.message);
  else console.log(`Cleared table: sector_control`);

  console.log('Done.');
}

clearData();
