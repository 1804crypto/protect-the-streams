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

    // Construct Metadata (Metaplex Core Standard / JSON Standard)
    const metadata = {
        name: `PTS Agent: ${streamer.name}`,
        symbol: "PTS",
        description: `Official Resistance Asset for ${streamer.name}. Protect The Streams Global Conflict.`,
        image: `https://protect-the-streams.vercel.app${streamer.image}`, // Ensure absolute URL
        external_url: "https://protect-the-streams.vercel.app",
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
                trait_type: "Affiliation",
                value: "Resistance"
            },
            {
                trait_type: "Generation",
                value: "Gen 1"
            }
        ],
        properties: {
            files: [
                {
                    uri: `https://protect-the-streams.vercel.app${streamer.image}`,
                    type: "image/png"
                }
            ],
            category: "image"
        }
    };

    return NextResponse.json(metadata);
}
