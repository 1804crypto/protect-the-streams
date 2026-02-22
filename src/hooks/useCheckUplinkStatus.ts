"use client";

import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { publicKey } from '@metaplex-foundation/umi';
import { fetchAssetsByOwner } from '@metaplex-foundation/mpl-core';

interface UplinkStatus {
    hasNFT: boolean;
    loading: boolean;
    assets: string[];
    ownedStreamerIds: string[];
    error: string | null;
}

/**
 * useCheckUplinkStatus - "The Signal Lock"
 * 
 * Scans the connected Solana wallet for PTS Streamer NFTs (Metaplex Core).
 * Returns the uplink status for gating Strategic_Map and PVP_Arena.
 */
export const useCheckUplinkStatus = (): UplinkStatus => {
    const { connection } = useConnection();
    const { publicKey: walletPubkey, connected } = useWallet();
    const [status, setStatus] = useState<UplinkStatus>({
        hasNFT: false,
        loading: true,
        assets: [],
        ownedStreamerIds: [], // NEW: Track specific owned IDs
        error: null
    });

    const collectionAddress = process.env.NEXT_PUBLIC_COLLECTION_ADDRESS;

    const scanWallet = useCallback(async () => {
        if (!connected || !walletPubkey) {
            setStatus({ hasNFT: false, loading: false, assets: [], ownedStreamerIds: [], error: null });
            return;
        }

        if (!collectionAddress) {
            setStatus({
                hasNFT: false,
                loading: false,
                assets: [],
                ownedStreamerIds: [],
                error: "GVA_INTERFERENCE: Collection address not configured"
            });
            return;
        }

        setStatus(prev => ({ ...prev, loading: true, error: null }));

        try {
            const umi = createUmi(connection);
            const ownerPubKey = publicKey(walletPubkey.toBase58());
            const collectionPubKey = publicKey(collectionAddress);

            // Fetch all assets owned by wallet
            const assets = await fetchAssetsByOwner(umi, ownerPubKey);

            // Filter for assets belonging to our collection AND extract streamer ID
            const ownedIds: string[] = [];
            const ptsAssets = assets.filter(asset => {
                // Check if asset belongs to our collection
                let isCollectionMatch = false;
                if (asset.updateAuthority.type === 'Collection' && asset.updateAuthority.address) {
                    isCollectionMatch = asset.updateAuthority.address.toString() === collectionPubKey.toString();
                }

                if (isCollectionMatch) {
                    // Parse Name: "PTS Agent: {streamerId}"
                    // We need to be careful about the name format.
                    // Metaplex Core AssetV1 has a 'name' field.
                    if (asset.name.startsWith("PTS Agent: ")) {
                        const id = asset.name.replace("PTS Agent: ", "").trim();
                        ownedIds.push(id);
                    }
                    return true;
                }
                return false;
            });

            const assetIds = ptsAssets.map(a => a.publicKey.toString());

            setStatus({
                hasNFT: ptsAssets.length > 0,
                loading: false,
                assets: assetIds,
                ownedStreamerIds: ownedIds,
                error: null
            });

        } catch (err: unknown) {
            console.error("Uplink Scan Failed:", err);

            // GVA Interference Report (Solana RPC failure handling)
            const errMsg = err instanceof Error ? err.message : '';
            const isRpcError = errMsg.includes('fetch') ||
                errMsg.includes('timeout') ||
                errMsg.includes('429');

            setStatus({
                hasNFT: false,
                loading: false,
                assets: [],
                ownedStreamerIds: [],
                error: isRpcError
                    ? "GVA_INTERFERENCE: RPC node congested. Try switching to Helius/Quicknode RPC."
                    : `SCAN_FAILURE: ${errMsg}`
            });
        }
    }, [connected, walletPubkey, collectionAddress, connection]);

    // BUG 22 FIX: Single effect handles both initial scan and wallet changes
    useEffect(() => {
        scanWallet();
    }, [scanWallet]);

    return status;
};
