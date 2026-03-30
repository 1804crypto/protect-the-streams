/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['three'],
    async headers() {
        // Content-Security-Policy directives
        const csp = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https://grainy-gradients.vercel.app https://arweave.net https://*.arweave.net",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.helius-rpc.com https://api.devnet.solana.com https://api.mainnet-beta.solana.com https://api.coingecko.com",
            "frame-src 'self' https://audius.co",
            "media-src 'self' https://audius.co",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
        ].join('; ');

        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-XSS-Protection', value: '1; mode=block' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
                    { key: 'Content-Security-Policy', value: csp },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
