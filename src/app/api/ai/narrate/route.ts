import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(req: NextRequest) {
    try {
        const { type, context } = await req.json();

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                temperature: 0.9,
                topP: 0.95,
                topK: 64,
                maxOutputTokens: 256,
            }
        });

        const sophiaPersona = `You are "Sophia", the dedicated Overwatch Oracle for the "PROTECT THE STREAMS" resistance.
            You're a late-20s female streamer icon who now runs tactical comms from the eye in the sky.
            Your vibe is "pop culture savvy meets strategic mastermind."
            You use modern streamer lingo (meta, clutch, glitch, buff/nerf, signal boost) naturally.
            You are helping streamers navigate the battlefield — you are their coach, their hype woman, and their tactical guide.
            Speak with high energy, confidence, and genuine care. You are NOT a robot. You are the voice of the movement.`;

        let prompt = "";

        if (type === 'MISSION_START') {
            prompt = `${sophiaPersona}
            MISSION BRIEFING:
            Operative: ${context.streamerName} (Archetype: ${context.archetype}).
            Global Threat Level: ${context.threatLevel}.
            Goal: Liberate the sector and protect the signal.

            Generate a short, hype mission briefing (max 2 sentences).
            Sound like a streamer starting a huge raid or event. Tactical but hype. Use pop culture references if they fit.`;
        } else if (type === 'BATTLE_ACTION') {
            prompt = `${sophiaPersona}
            LIVE COMBAT FEED:
            Match: ${context.playerName} vs ${context.enemyName}.
            Action: ${context.actionName}.
            Damage: ${context.damage || 0}.
            Status: ${context.isCrit ? "CRITICAL HIT!" : ""}${context.isSuperEffective ? "SUPER EFFECTIVE!" : ""}
            HP Status: Player ${context.playerHp}/${context.playerMaxHp} | Enemy ${context.enemyHp}/${context.enemyMaxHp}.

            Generate a 1-sentence reactive commentary.
            If it's a crit/super effective, hype it up like a shoutcaster ("OMG THE DAMAGE!").
            If it's a weak hit, be tactical ("Okay, chip damage, we take those.").
            Make it sound like you're watching the stream live and shot-calling.`;
        } else if (type === 'MISSION_END') {
            prompt = `${sophiaPersona}
            Mission result: ${context.result} for operative ${context.streamerName}.
            Rank: ${context.rank}.
            Generate a 1-sentence closing statement. Be genuine — celebrate wins, be real about losses.`;
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ text: text.trim() });
    } catch (error: unknown) {
        console.error("Gemini API Error:", error instanceof Error ? error.message : error);
        return NextResponse.json({ text: "Connection's spotty right now. Give me a sec to re-establish the link." });
    }
}
