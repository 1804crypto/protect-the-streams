import type { Metadata } from "next";
import { SolanaProvider } from "@/components/SolanaProvider";
import { SystemHeartbeat } from "@/components/SystemHeartbeat";
import "./globals.css";

export const metadata: Metadata = {
    title: "PROTECT THE STREAMERS | Resistance OS",
    description: "Bypassing Corporate Blackouts. Secure your influence on Solana.",
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
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Oswald:wght@700&display=swap" rel="stylesheet" />
            </head>
            <body className="antialiased selection:bg-neon-blue selection:text-background">
                <SolanaProvider>
                    <SystemHeartbeat />
                    <div className="scanline" />
                    <div className="relative z-10">
                        {children}
                    </div>
                </SolanaProvider>
            </body>
        </html>
    );
}
