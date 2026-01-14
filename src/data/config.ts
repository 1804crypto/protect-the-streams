export const CONFIG = {
    NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet', // Toggle to 'mainnet-beta' for production
    MINT_PRICE: 0.05, // SOL
    TREASURY_WALLET: '5E1cfq49jjMYTKdKhjfF9CSH3STCMUGR7VbzJYny2Zhq', // Resistance Treasury
    FEES: {
        PRIORITY: 0.00001 // SOL
    },
    THEME: {
        PRIMARY: '#00f3ff',
        ACCENT: '#ff003c',
        GLITCH_INTENSITY: 0.4
    }
};
