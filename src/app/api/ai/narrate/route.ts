import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(req: NextRequest) {
    try {
        const { type, context } = await req.json();

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                temperature: 0.9,
                topP: 0.95,
                topK: 64,
                maxOutputTokens: 128,
            }
        });

        let prompt = "";

        if (type === 'MISSION_START') {
            prompt = `You are the "Neural Narrator" for the resistance movement "PROTECT THE STREAMS". 
            A mission is starting for operative ${context.streamerName} (Archetype: ${context.archetype}).
            Current Global Threat Level: ${context.threatLevel}.
            The goal is to liberate the sector.
            Generate a short, cyberpunk-style mission briefing (max 2 sentences).
            Use high-stakes, glitch-noir aesthetic.`;
        } else if (type === 'BATTLE_ACTION') {
            prompt = `You are the "Neural Narrator" for "PROTECT THE STREAMS". 
            In a battle between ${context.playerName} and ${context.enemyName}.
            Action: ${context.actionName} was performed.
            Result: ${context.damage ? `${context.damage} damage dealt.` : 'Effect applied.'}
            ${context.isCrit ? "It was a CRITICAL hit!" : ""}
            ${context.isSuperEffective ? "It was SUPER EFFECTIVE!" : ""}
            Operative HP: ${context.playerHp}/${context.playerMaxHp}.
            Enemy HP: ${context.enemyHp}/${context.enemyMaxHp}.
            Generate a 1-sentence reactive commentary in a cyberpunk, hacker-style tone. 
            Keep it short and punchy.`;
        } else if (type === 'MISSION_END') {
            prompt = `You are the "Neural Narrator" for "PROTECT THE STREAMS". 
            Mission result: ${context.result} for operative ${context.streamerName}.
            Rank: ${context.rank}.
            Generate a 1-sentence closing statement in a cyberpunk aesthetic.`;
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ text: text.trim() });
    } catch (error) {
        console.error("Gemini API Error:", error);
        return NextResponse.json({ error: 'Signal Interrupted' }, { status: 500 });
    }
}
