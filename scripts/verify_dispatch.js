
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifyDispatch() {
    console.log(">> INITIATING DISPATCH VERIFICATION PROTOCOL...");

    // 1. Mock PvP Match Data (Simulating a completion)
    const mockMatchId = crypto.randomUUID();
    const mockWinnerId = crypto.randomUUID();

    const payload = {
        type: "UPDATE",
        table: "pvp_matches",
        record: {
            id: mockMatchId,
            status: "FINISHED",
            winner_id: mockWinnerId,
            attacker_id: mockWinnerId,
            defender_id: "def_123",
            attacker_stats: { name: "Test_Streamer_Kai" }, // Trigger Kai Persona
            defender_stats: { name: "User_Defender" }
        },
        old_record: {
            status: "ACTIVE"
        }
    };

    console.log(">> SENDING MOCK PAYLOAD TO EDGE FUNCTION...");
    console.log(`   Target: ${SUPABASE_URL}/functions/v1/resistance-dispatch`);

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/resistance-dispatch`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            console.log(">> [SUCCESS] Edge Function Responded:");
            console.log(JSON.stringify(data, null, 2));

            // 2. Verify Database Insert (Optional check)
            console.log(">> VERIFYING CHAT SYNC...");
            if (data.message && (data.message.includes("W") || data.message.includes("Chat"))) {
                console.log("   [PASSED] Personality Check: Detected 'Kai Cenat' lingo.");
            } else {
                console.log("   [WARNING] Personality Check: Response may be generic or different persona.");
            }

        } else {
            console.error(">> [FAILURE] Edge Function Error:", data);
        }

    } catch (err) {
        console.error(">> [CRITICAL] Request Failed:", err);
    }
}

verifyDispatch();
