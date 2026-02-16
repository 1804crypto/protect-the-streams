import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySession } from '@/lib/auth';
import { blackMarketItems } from '@/data/storeItems';
import { VALID_ITEM_IDS, MAX_ITEM_QUANTITY } from '@/lib/sanitizeInventory';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getRpcUrl } from '@/lib/rpc';
import { CONFIG } from '@/data/config';
import { items as baseItems } from '@/data/items';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const MIN_PURCHASE_INTERVAL_MS = 2000;
const MAX_QUANTITY = 10;
const TREASURY = new PublicKey(CONFIG.TREASURY_WALLET);

// Crate contents for RESISTANCE_CRATE
const CRATE_ITEM_POOL = ['RESTORE_CHIP', 'PP_RECHARGE', 'ATTACK_MATRIX', 'DEFENSE_MATRIX', 'stim_pack', 'RESTORE_CHIP_V2'];

function openCrate(): Record<string, number> {
    const numItems = 3 + Math.floor(Math.random() * 3); // 3-5 items
    const result: Record<string, number> = {};
    for (let i = 0; i < numItems; i++) {
        const itemId = CRATE_ITEM_POOL[Math.floor(Math.random() * CRATE_ITEM_POOL.length)];
        result[itemId] = (result[itemId] || 0) + 1;
    }
    return result;
}

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Session
        const token = req.cookies.get('pts_session')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const session = await verifySession(token);
        if (!session || !session.userId) {
            return NextResponse.json({ error: 'Invalid Session' }, { status: 401 });
        }

        const userId = session.userId as string;

        // 2. Parse & Validate Body
        const { itemId, quantity, currency, purchaseId, txSignature } = await req.json();

        if (!itemId || typeof itemId !== 'string') {
            return NextResponse.json({ error: 'Missing itemId' }, { status: 400 });
        }
        if (!purchaseId || typeof purchaseId !== 'string') {
            return NextResponse.json({ error: 'Missing purchaseId' }, { status: 400 });
        }
        if (!currency || !['PTS', 'SOL'].includes(currency)) {
            return NextResponse.json({ error: 'Invalid currency' }, { status: 400 });
        }

        const qty = typeof quantity === 'number' ? Math.floor(quantity) : 1;
        if (qty < 1 || qty > MAX_QUANTITY) {
            return NextResponse.json({ error: `Quantity must be 1-${MAX_QUANTITY}` }, { status: 400 });
        }

        // 3. Validate item exists in shop
        const storeItem = blackMarketItems[itemId];
        if (!storeItem) {
            return NextResponse.json({ error: 'Item not available in shop' }, { status: 400 });
        }
        if (!VALID_ITEM_IDS.has(itemId)) {
            return NextResponse.json({ error: 'Item not in valid registry' }, { status: 400 });
        }

        // 4. Idempotency check
        const { data: existingPurchase } = await supabase
            .from('shop_purchases')
            .select('id, status')
            .eq('purchase_id', purchaseId)
            .single();

        if (existingPurchase) {
            if (existingPurchase.status === 'COMPLETED') {
                return NextResponse.json({ error: 'Purchase already completed', purchaseId }, { status: 409 });
            }
        }

        // 5. Fetch current user state
        const { data: userData, error: fetchError } = await supabase
            .from('users')
            .select('pts_balance, inventory, updated_at')
            .eq('id', userId)
            .single();

        if (fetchError || !userData) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const user = userData as {
            pts_balance: number;
            inventory: Record<string, number> | null;
            updated_at: string | null;
        };

        // Rate limit: minimum 2s between purchases
        if (user.updated_at) {
            const lastUpdate = new Date(user.updated_at).getTime();
            if (Date.now() - lastUpdate < MIN_PURCHASE_INTERVAL_MS) {
                return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
            }
        }

        // 6. Currency-specific validation
        let amountPts = 0;
        let amountSol = 0;
        let newPtsBalance = user.pts_balance;

        if (currency === 'PTS') {
            amountPts = storeItem.pricePts * qty;
            if (user.pts_balance < amountPts) {
                return NextResponse.json({
                    error: 'Insufficient PTS balance',
                    required: amountPts,
                    current: user.pts_balance
                }, { status: 400 });
            }
            newPtsBalance = user.pts_balance - amountPts;
        } else if (currency === 'SOL') {
            if (!txSignature || typeof txSignature !== 'string') {
                return NextResponse.json({ error: 'Missing transaction signature for SOL purchase' }, { status: 400 });
            }

            amountSol = storeItem.priceSol * qty;

            // Verify on-chain transaction
            try {
                const connection = new Connection(getRpcUrl());

                // Retry up to 3 times with 2s delay for transaction propagation
                let txInfo = null;
                for (let attempt = 0; attempt < 3; attempt++) {
                    txInfo = await connection.getTransaction(txSignature, {
                        commitment: 'confirmed',
                        maxSupportedTransactionVersion: 0,
                    });
                    if (txInfo) break;
                    if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
                }

                if (!txInfo) {
                    return NextResponse.json({ error: 'Transaction not found on-chain' }, { status: 400 });
                }
                if (txInfo.meta?.err) {
                    return NextResponse.json({ error: 'Transaction failed on-chain' }, { status: 400 });
                }

                // Verify transfer amount and recipient
                const expectedLamports = Math.round(amountSol * LAMPORTS_PER_SOL);
                const accountKeys = txInfo.transaction.message.getAccountKeys();
                const preBalances = txInfo.meta?.preBalances || [];
                const postBalances = txInfo.meta?.postBalances || [];

                // Find treasury account index
                let treasuryIndex = -1;
                for (let i = 0; i < accountKeys.length; i++) {
                    if (accountKeys.get(i)?.equals(TREASURY)) {
                        treasuryIndex = i;
                        break;
                    }
                }

                if (treasuryIndex === -1) {
                    return NextResponse.json({ error: 'Treasury not found in transaction' }, { status: 400 });
                }

                const treasuryReceived = postBalances[treasuryIndex] - preBalances[treasuryIndex];
                // Allow 1% tolerance for rounding
                if (treasuryReceived < expectedLamports * 0.99) {
                    return NextResponse.json({
                        error: 'Insufficient payment amount',
                        expected: expectedLamports,
                        received: treasuryReceived
                    }, { status: 400 });
                }
            } catch (err) {
                console.error('SOL verification error:', err);
                return NextResponse.json({ error: 'Failed to verify transaction' }, { status: 500 });
            }
        }

        // 7. Compute new inventory
        const currentInventory = (user.inventory || {}) as Record<string, number>;
        const newInventory = { ...currentInventory };

        if (itemId === 'RESISTANCE_CRATE') {
            // Open crate: add random items for each crate purchased
            for (let c = 0; c < qty; c++) {
                const crateContents = openCrate();
                for (const [crateItemId, crateQty] of Object.entries(crateContents)) {
                    if (VALID_ITEM_IDS.has(crateItemId)) {
                        newInventory[crateItemId] = Math.min(
                            (newInventory[crateItemId] || 0) + crateQty,
                            MAX_ITEM_QUANTITY
                        );
                    }
                }
            }
        } else {
            newInventory[itemId] = Math.min(
                (newInventory[itemId] || 0) + qty,
                MAX_ITEM_QUANTITY
            );
        }

        // 8. Write to DB (user update + purchase record)
        const userUpdates: Record<string, unknown> = {
            inventory: newInventory,
            updated_at: new Date().toISOString(),
        };
        if (currency === 'PTS') {
            userUpdates.pts_balance = newPtsBalance;
        }

        const { error: updateError } = await supabase
            .from('users')
            .update(userUpdates)
            .eq('id', userId);

        if (updateError) {
            console.error('Shop purchase DB update failed:', updateError);
            return NextResponse.json({ error: 'Failed to save purchase' }, { status: 500 });
        }

        // Record purchase for audit trail
        await supabase.from('shop_purchases').upsert({
            purchase_id: purchaseId,
            user_id: userId,
            item_id: itemId,
            quantity: qty,
            currency,
            amount_pts: amountPts,
            amount_sol: amountSol,
            tx_signature: txSignature || null,
            status: 'COMPLETED',
        }, { onConflict: 'purchase_id' });

        return NextResponse.json({
            success: true,
            newInventory,
            newPtsBalance,
            purchaseId,
        });

    } catch (error) {
        console.error('Shop purchase error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
