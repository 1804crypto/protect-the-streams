import type { Metadata } from "next";
import { SolanaProvider } from "@/components/SolanaProvider";
import { SystemHeartbeat } from "@/components/SystemHeartbeat";
import { ResistanceOverlay } from "@/components/UI/ResistanceOverlay";
import { AudiusPlayer } from "@/components/AudiusPlayer";
import "./globals.css";

export const metadata: Metadata = {
    metadataBase: new URL("https://endearing-syrniki-7788ed.netlify.app"),
    title: "PROTECT THE STREAMS | Resistance OS",
    description: "The Global Conflict has begun. Join the Resistance, recruit your favorite streamers, and overthrow Sentinel INC on the Solana Blockchain.",
    openGraph: {
        title: "PROTECT THE STREAMS | Resistance OS",
        description: "Bypassing Corporate Blackouts. Secure your influence on Solana.",
        url: "https://endearing-syrniki-7788ed.netlify.app",
        siteName: "Protect The Streams",
        images: [
            {
                url: "/pts_cover.jpg",
                width: 1200,
                height: 630,
                alt: "Protect The Streams Resistance Interface",
            },
        ],
        locale: "en_US",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "PROTECT THE STREAMS | Resistance OS",
        description: "Join the Resistance. Overthrow Sentinel INC.",
        images: ["/pts_cover.jpg"],
    },
    icons: {
        icon: "/favicon.ico",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Oswald:wght@700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
            </head>
            <body className="antialiased selection:bg-neon-blue selection:text-background" suppressHydrationWarning>
                <SolanaProvider>
                    <SystemHeartbeat />
                    <ResistanceOverlay />
                    <AudiusPlayer />
                    <div className="scanline" />
                    <div className="relative z-10">
                        {children}
                    </div>
                </SolanaProvider>
                <div className="fixed bottom-0 right-0 p-1 text-[10px] text-white/20 pointer-events-none z-[9999]">
                    v_2026_02_08_0630_FIX
                </div>
            </body>
        </html>
    );
}


// REDEPLOY_TRIGGER: 2026-02-08T06:30:00-05:00
