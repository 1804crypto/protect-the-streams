import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { type, table, record, old_record } = await req.json()
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')

        if (!geminiApiKey) throw new Error("Missing GEMINI_API_KEY")

        // === HANDLER 1: RESISTANCE DISPATCH (Sector Attacks) ===
        if (table === 'sector_attacks' && type === 'INSERT') {
            const { region_id, attacker_faction, intensity } = record
            const factionName = attacker_faction === 'RED' ? 'Cyber-Red' : 'Neon-Purple';

            const prompt = `
            You are the "Resistance Dispatch", a tactical AI coordinator for a cyberpunk revolution.
            A new attack has been initiated.
            
            Details:
            - Sector: ${region_id}
            - Faction: ${factionName}
            - Intensity: ${intensity > 0.8 ? 'CRITICAL / QUANTUM SYNC' : 'Standard Incursion'}
            
            Directive:
            Write a SINGLE-SENTENCE dispatch message to the faction chat. 
            Tone: "Boondocks-style" - street-smart, high-stakes, gritty, and revolutionary. 
            Use slang like "fam", "sentinels", "opps", "uplink", "lock in".
            Example: "Yo, Sector 7 is hot—Commander [Redacted] just cracked the firewall, sentinels are flooding the block!"
            `

            const dispatchMessage = await generateGeminiText(geminiApiKey, prompt);

            await supabaseClient.from('faction_chat').insert({
                faction_id: attacker_faction,
                sender_name: 'Resistance_Dispatch_AI',
                message: dispatchMessage,
                type: 'DISPATCH',
                metadata: { related_attack_id: record.id, intensity, sentiment: 'urgent' }
            });

            return new Response(JSON.stringify({ success: true, message: dispatchMessage }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // === HANDLER 2: STREAMER SENTIENCE (PvP Matches) ===
        if (table === 'pvp_matches' && type === 'UPDATE') {
            // Only trigger on Finish
            if (record.status === 'FINISHED' && old_record.status !== 'FINISHED' && record.winner_id) {

                const winnerId = record.winner_id;
                const isAttackerWin = winnerId === record.attacker_id;

                // Get Winner's Streamer Persona
                const stats = isAttackerWin ? record.attacker_stats : record.defender_stats;
                const streamerName = stats?.name || "Unknown Agent";

                // Avoid generic names if possible, but fallback is safe
                if (streamerName === "Unknown Agent") {
                    return new Response(JSON.stringify({ message: "Skipped: Unknown Streamer" }), { headers: corsHeaders });
                }

                // Fetch Faction from User Profile
                const { data: userData, error: userError } = await supabaseClient
                    .from('users')
                    .select('faction')
                    .eq('id', winnerId)
                    .single();

                const factionId = userData?.faction || 'RED'; // Fallback to RED if lookup fails (or user has no faction)

                const prompt = `
                PROTOCOL: BOONDOCKS_SENTIENCE
                IDENTITY: Streamer "${streamerName}" (Cyberpunk Resistance Commander)
                EVENT: VICTORIOUS in High-Stakes PvP Battle.
                
                PERSONA DATABASE (STRICT ADHERENCE REQUIRED):
                
                1. **KAI CENAT** ("The W" Protocol):
                   - Keywords: "W", "Chat", "Motion", "God did", "On my soul", "Wrrt", "Mafia".
                   - Vibe: High energy, hype, loud, leader of the new school.
                   - Example: "W IN THE CHAT! WE TAKING OVER THE WHOLE GRID ON GOD!"
                
                2. **ISHOWSPEED** ("Glitch" Protocol):
                   - Keywords: "SEWEY", "Bark", "Ronaldo", "Gang", "Speed bitc*", "Arf-Arf".
                   - Vibe: Chaotic, aggressive, unintentional glitch art, barking.
                   - Style: USE UPPERCASE. ACT LIKE YOU ARE GLITCHING.
                   - Example: "SEWEYYY! GET OFF MY SERVER! *BARK* *BARK* WHO GON STOP ME?!"
                   
                3. **JAZZY** ("The Culture" Protocol):
                   - Keywords: "Clip that", "Easy work", "Tactical", "Locked in", "Sentinels".
                   - Vibe: Calculated, fierce, strategic, queen of the grid.
                   - Example: "Scanning for opps... sector clear. We move silent. Lock in."
                
                4. **ADIN ROSS** ("Whale" Protocol):
                   - Keywords: "W/L", "Connex", "Flex", "Brand risk", "Too rich".
                   - Vibe: Arrogant but surprisingly effective, obsessed with status.

                DIRECTIVE:
                Generate a single, high-intensity faction chat message (max 15 words) based on the streamer's persona.
                If the streamer is not in the database, default to a generic "Resistance Commander" tone (Gritty, Cyberpunk).
                
                INPUT CONTEXT:
                - Winner: ${streamerName}
                - Faction: ${factionId}
                - Outcome: VICTORY
                
                OUTPUT_FORMAT:
                Just the message text. No quotes.
                `;

                const reactionMessage = await generateGeminiText(geminiApiKey, prompt);

                await supabaseClient.from('faction_chat').insert({
                    faction_id: factionId,
                    sender_name: streamerName,
                    message: reactionMessage,
                    type: 'STREAMER',
                    metadata: {
                        match_id: record.id,
                        result: 'WIN',
                        protocol: 'BOONDOCKS',
                        persona: streamerName
                    }
                });

                return new Response(JSON.stringify({ success: true, message: reactionMessage }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }
        }

        return new Response(JSON.stringify({ message: 'No action logic triggered' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error("Function Error:", error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})

// Helper for Gemini Call
async function generateGeminiText(apiKey: string, prompt: string): Promise<string> {
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    })
    const aiData = await aiResponse.json()
    // Robust error handling to prevent "undefined" messages
    if (aiData.error) {
        console.error("Gemini API Error:", aiData.error);
        return "Transmission Static... (AI Error)";
    }
    return aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "Signal interrupted.";
}
