const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = '/Users/freeemall/Desktop/PROTECT THE STREAMS APP/.env.local';
const envFile = fs.readFileSync(envPath, 'utf8');

let url = '';
let key = '';

envFile.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
});

async function main() {
    console.log("Fetching OpenAPI spec...");
    const res = await fetch(`${url}/rest/v1/?apikey=${key}`);
    const json = await res.json();
    if (json.definitions && json.definitions.pvp_matches) {
        console.log("Columns in pvp_matches:");
        console.log(Object.keys(json.definitions.pvp_matches.properties));
    } else {
        console.log("pvp_matches not found in OpenAPI spec");
    }
}

main();
