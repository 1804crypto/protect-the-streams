import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMintAttempts() {
    console.log("Checking mint_attempts...");
    const { data, error } = await supabase.from('mint_attempts').select('*').limit(10);
    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

async function checkErrorLogs() {
    console.log("Checking error_logs...");
    const { data, error } = await supabase.from('error_logs').select('*').order('created_at', { ascending: false }).limit(20);
    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

async function main() {
    await checkMintAttempts();
    await checkErrorLogs();
}

main();
