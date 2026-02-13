import { NextRequest, NextResponse } from 'next/server';
import { streamers } from '@/data/streamers';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Next.js 15+ params are promises? Or standard. Safe to treat as object in Next 14.
) {
    const p = await params;
    const { id } = p;

    // Find Streamer
    const streamer = streamers.find(s => s.id === id);

    if (!streamer) {
        return NextResponse.json({ error: 'Streamer not found' }, { status: 404 });
    }

    const hostHeader = request.headers.get('host');
    const host = process.env.NEXT_PUBLIC_HOST_URL || (hostHeader ? `https://${hostHeader}` : 'https://protectthestreamers.xyz');

    // Construct Metadata (Metaplex Core Standard / JSON Standard)
    const metadata = {
        name: `PTS Agent: ${streamer.name}`,
        symbol: "PTS",
        description: `Official Resistance Asset for ${streamer.name}. Protect The Streams Global Conflict. Archive ID: ${streamer.id.toUpperCase()}`,
        image: `${host}${streamer.image}`, // Ensure absolute URL
        external_url: host,
        attributes: [
            {
                trait_type: "Class",
                value: "Streamer"
            },
            {
                trait_type: "Role",
                value: streamer.narrative.role || "Operator"
            },
            {
                trait_type: "Archetype",
                value: streamer.archetype.replace(/_/g, ' ')
            },
            {
                trait_type: "Affiliation",
                value: "Resistance"
            },
            {
                trait_type: "Trait",
                value: streamer.trait
            },
            // Numerical Stats as Attributes (Standard for gaming NFTs)
            {
                display_type: "number",
                trait_type: "Influence",
                value: streamer.stats.influence
            },
            {
                display_type: "number",
                trait_type: "Chaos",
                value: streamer.stats.chaos
            },
            {
                display_type: "number",
                trait_type: "Charisma",
                value: streamer.stats.charisma
            },
            {
                display_type: "number",
                trait_type: "Rebellion",
                value: streamer.stats.rebellion
            },
            {
                trait_type: "Generation",
                value: "Gen 1"
            }
        ],
        properties: {
            files: [
                {
                    uri: `${host}${streamer.image}`,
                    type: "image/png"
                }
            ],
            category: "image",
            streamer_id: streamer.id,
            narrative_role: streamer.narrative.role,
            codename: streamer.narrative.codename
        }
    };

    return NextResponse.json(metadata);
}
