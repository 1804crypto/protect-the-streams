import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createSignerFromKeypair, signerIdentity, publicKey, transactionBuilder, signTransaction } from '@metaplex-foundation/umi';
import { create, fetchCollection } from '@metaplex-foundation/mpl-core';

const BACKEND_PRIVATE_KEY = new Uint8Array([177,135,42,247,138,103,161,124,33,166,34,204,173,126,212,77,30,215,114,25,179,236,46,212,75,247,91,161,102,168,168,134,225,9,168,156,217,49,161,125,136,193,48,202,179,198,167,227,7,246,60,141,24,50,42,134,16,25,185,146,216,232,103,43]);
const COLLECTION_ADDRESS = 'HbcP2D49USoVxAjxHpNeeoMBGqA1pkAdBBb6SxT2nf7U';
const TREASURY_WALLET = '5E1cfq49jjMYTKdKhjfF9CSH3STCMUGR7VbzJYny2Zhq';
const HELIUS_RPC = 'https://devnet.helius-rpc.com/?api-key=c8bbad2f-8cb6-4dfa-99d2-8fe83fc920d5';

async function simulateMint() {
    const umi = createUmi(HELIUS_RPC);
    const keypair = umi.eddsa.createKeypairFromSecretKey(BACKEND_PRIVATE_KEY);
    const backendSigner = createSignerFromKeypair(umi, keypair);
    umi.use(signerIdentity(backendSigner));

    const collectionAddress = publicKey(COLLECTION_ADDRESS);
    const collection = await fetchCollection(umi, collectionAddress);
    
    const assetSigner = umi.eddsa.generateKeypair();
    const asset = createSignerFromKeypair(umi, assetSigner);
    
    const user = backendSigner.publicKey;
    const uri = `https://protectthestreamers.xyz/api/metadata/tylil`;

    let builder = transactionBuilder()
        .add({
            instruction: {
                keys: [
                    { pubkey: user, isSigner: true, isWritable: true },
                    { pubkey: publicKey(TREASURY_WALLET), isSigner: false, isWritable: true },
                ],
                programId: publicKey('11111111111111111111111111111111'),
                data: (() => {
                    const data = new Uint8Array(12);
                    data.set([2, 0, 0, 0]);
                    const view = new DataView(data.buffer);
                    view.setBigUint64(4, 10000000n, true); 
                    return data;
                })()
            },
            bytesCreatedOnChain: 0,
            signers: [],
        })
        .add(create(umi, {
            asset,
            collection: collection,
            name: `PTS Agent: tylil`,
            uri: uri,
            owner: user,
            // authority is implied as the current umi identity if not explicitly passed, 
            // but we explicitly pass it. Let's try passing the collection authority?
        }));

    const blockhash = await umi.rpc.getLatestBlockhash();
    const transaction = await builder.setFeePayer(backendSigner).setBlockhash(blockhash).build(umi);
    const signedTx = await signTransaction(transaction, [backendSigner, asset]);

    try {
        console.log("Simulating transaction...");
        await umi.rpc.sendTransaction(signedTx, { skipPreflight: false });
        console.log("Tx succeeded in simulation!");
    } catch (e: any) {
        console.error("Simulation failed:", e.message);
        if (e.cause && e.cause.logs) {
            console.error("Logs:", e.cause.logs);
        }
    }
}

simulateMint().catch(console.error);
