/** Request body for /api/mint/transaction */
export interface MintTransactionRequest {
    streamerId: string;
    userPublicKey: string;
    currency: 'SOL' | 'USDC' | 'PTS';
    idempotencyKey?: string;
}

/** Response from /api/mint/transaction */
export interface MintTransactionResponse {
    transaction: string; // base64 encoded
    assetId: string;
    blockhash: string;
    lastValidBlockHeight: number;
}
