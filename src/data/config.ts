export const CONFIG = {
    NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet', // Toggle to 'mainnet-beta' for production
    MINT_PRICE: 0.05, // SOL
    TREASURY_WALLET: process.env.NEXT_PUBLIC_TREASURY_WALLET || 'GvN9p6Z2rR9D6U6Z9G6G6G6G6G6G6G6G6G6G6G6G', // Resistance Treasury
    FEES: {
        PRIORITY: 0.00001 // SOL
    },
    THEME: {
        PRIMARY: '#00f3ff',
        ACCENT: '#ff003c',
        GLITCH_INTENSITY: 0.4
    }
};
