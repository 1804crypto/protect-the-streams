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
                const loserId = winnerId === record.attacker_id ? record.defender_id : record.attacker_id;
                const isAttackerWin = winnerId === record.attacker_id;

                // Get Winner's Streamer Persona
                const winnerStats = isAttackerWin ? record.attacker_stats : record.defender_stats;
                const loserStats = isAttackerWin ? record.defender_stats : record.attacker_stats;
                const winnerName = winnerStats?.name || "Unknown Agent";
                const loserName = loserStats?.name || "Unknown Agent";

                // Fetch Faction from Winner's User Profile
                const { data: winnerData } = await supabaseClient
                    .from('users')
                    .select('faction')
                    .eq('id', winnerId)
                    .single();

                const winnerFaction = winnerData?.faction || 'RED';

                // Fetch Faction from Loser's User Profile
                const { data: loserData } = await supabaseClient
                    .from('users')
                    .select('faction')
                    .eq('id', loserId)
                    .single();

                const loserFaction = loserData?.faction || 'PURPLE';

                // === BOONDOCKS PROTOCOL v3.5 ===
                const buildPrompt = (streamerName: string, outcome: 'WIN' | 'LOSS') => `
PROTOCOL: BOONDOCKS_SENTIENCE_v3.5
IDENTITY: Streamer "${streamerName}" (Cyberpunk Resistance Commander)
EVENT: ${outcome === 'WIN' ? 'VICTORIOUS' : 'DEFEATED'} in High-Stakes PvP Battle.

PERSONA DATABASE (STRICT ADHERENCE REQUIRED):

1. **KAI CENAT** (Nature: Rebellious - "The W" Protocol):
   - WIN Keywords: "W", "Chat", "Motion", "God did", "On my soul", "Wrrt", "Mafia", "W Uplink"
   - WIN Example: "W IN THE CHAT! WE TAKING OVER THE WHOLE GRID ON GOD! W UPLINK SECURED!"
   - LOSS Keywords: "L", "crashed", "next signal", "run it back", "they caught us slipping"
   - LOSS Example: "NAH CHAT WE GOT CAUGHT SLIPPING... CRASHING THE NEXT SIGNAL FR FR"
   - Vibe: High energy, hyper-focused on "The W", uses Chat lingo

2. **ISHOWSPEED** (Nature: Aggressive - "Glitch" Protocol):
   - WIN Keywords: "SEWEY", "*BARK*", "Ronaldo", "WHO GON STOP ME", "*ARF ARF*"
   - WIN Example: "SEWEYYY! *BARK* *BARK* GET OFF MY SERVER! WHO GON STOP SPEED?!"
   - LOSS Keywords: "*GLITCH*", "NOOOO", "*BARK BARK*", "THIS IS RIGGED", "*STATIC*"
   - LOSS Example: "*GLITCH* NOOOO HOW DID I LOSE?! *BARK* *ARF* *STATIC* RIGGED SERVER!!!"
   - Vibe: Chaotic, aggressive, digital riot energy. USE UPPERCASE. Include glitch-text markers.
   - STYLE: Always CAPS. Add *BARK*, *ARF*, *GLITCH*, *STATIC* markers for chaos.

3. **JAZZY** (Nature: Cunning - "The Culture" Protocol):
   - WIN Keywords: "Easy work", "Clip that", "Locked in", "Sentinels on point", "Intel secured"
   - WIN Example: "Easy work. Clip that for the archives. Sentinels, lock in for the next sector."
   - LOSS Keywords: "Recalculating", "Intel compromised", "Fall back", "Regroup", "Next time"
   - LOSS Example: "Intel compromised... Fall back, Sentinels. Recalculating. We move smarter next time."
   - Vibe: Tactical, smooth, focused on "The Culture" and long-term strategy

4. **ADIN ROSS** (Nature: Status-Driven - "Whale" Protocol):
   - WIN Keywords: "W/L", "Connex", "Flex", "Too rich for this"
   - LOSS Keywords: "Brand risk", "This is bad for the brand", "Next contract"

DIRECTIVE:
Generate a single, high-intensity faction chat message (max 15 words) based on the streamer's persona and ${outcome} outcome.
If the streamer is not in the database, default to a generic "Resistance Commander" tone.

OUTPUT_FORMAT:
Just the message text. No quotes. No explanations.
`;

                const messages = [];

                // Generate Winner Reaction
                if (winnerName !== "Unknown Agent") {
                    const winPrompt = buildPrompt(winnerName, 'WIN');
                    const winMessage = await generateGeminiText(geminiApiKey, winPrompt);

                    await supabaseClient.from('faction_chat').insert({
                        faction_id: winnerFaction,
                        sender_name: winnerName,
                        message: winMessage,
                        type: 'STREAMER',
                        metadata: {
                            match_id: record.id,
                            result: 'WIN',
                            protocol: 'BOONDOCKS_v3.5',
                            persona: winnerName
                        }
                    });
                    messages.push({ role: 'WINNER', name: winnerName, message: winMessage });
                }

                // Generate Loser Reaction
                if (loserName !== "Unknown Agent") {
                    const lossPrompt = buildPrompt(loserName, 'LOSS');
                    const lossMessage = await generateGeminiText(geminiApiKey, lossPrompt);

                    await supabaseClient.from('faction_chat').insert({
                        faction_id: loserFaction,
                        sender_name: loserName,
                        message: lossMessage,
                        type: 'STREAMER',
                        metadata: {
                            match_id: record.id,
                            result: 'LOSS',
                            protocol: 'BOONDOCKS_v3.5',
                            persona: loserName
                        }
                    });
                    messages.push({ role: 'LOSER', name: loserName, message: lossMessage });
                }

                return new Response(JSON.stringify({ success: true, messages }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
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
