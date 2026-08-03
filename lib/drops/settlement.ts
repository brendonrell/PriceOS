/*
 * lib/drops/settlement.ts — the settlement service (the off-chain half).
 *
 * Choreographs a windowed drop around the finished pieces: PDProject's entry
 * window on-chain, and the draw engine (lib/drops/draw.ts — the fairness
 * core, consumed, never reimplemented). The service holds signed mint
 * orders, never funds; its key has no power beyond this choreography, and
 * the contract's ≤4h fail-open means a dead service can never strand a drop
 * — nothing here may ever be load-bearing for the mint existing.
 *
 * THE TIMING (Brendon, 2026-08-03): the window is the opening minute
 * (WINDOW_SECONDS_DEFAULT = 60). The seal scales with the fight — seconds
 * for a typical contested close, hard-capped at 15 minutes for a drop with
 * thousands battled over. Never an hour, never a day.
 *
 * ENTRY ORDER NEVER LEAKS: entries are canonicalized (band, then wallet)
 * before anything is committed or drawn. Arrival time exists only as a row
 * timestamp the public never sees.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
    createPublicClient,
    createWalletClient,
    http,
    type Hex,
    type PublicClient,
    type WalletClient,
    type Account,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet, sepolia } from 'viem/chains';
import { CHAIN_ID } from '@/lib/market/chain';
import {
    runDraw,
    type DrawEntry,
    type DrawResult,
    type DrawTranscript,
} from './draw';
import { assignBands, snapshotStanding, type Standing } from './banding';

/** The opening minute (Brendon, 2026-08-03). Per-drop override at creation. */
export const WINDOW_SECONDS_DEFAULT = 60;

/** Seal ceiling: 15 minutes, his hard cap. The contract's own MAX_SEAL is
 *  wider; policy is tighter and lives here. */
export const SEAL_SECONDS_MAX = 900;

/** Seconds for a typical contested close, before scaling. */
export const SEAL_SECONDS_BASE = 60;

/** The seal scales with the fight: a minute of adjudication room plus one
 *  second per contested seat beyond supply, capped at 15 minutes — only a
 *  thousands-deep battle ever nears the cap. */
export function sealSecondsFor(totalSeats: number, supply: number): number {
    const over = Math.max(0, totalSeats - supply);
    return Math.min(SEAL_SECONDS_MAX, SEAL_SECONDS_BASE + over);
}

/* ── the on-chain arm ───────────────────────────────────────────────────── */

const WINDOW_ABI = [
    {
        type: 'function', name: 'closeWindow', inputs: [], outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function', name: 'closeWindowContested', stateMutability: 'nonpayable',
        inputs: [
            { name: 'winners', type: 'address[]' },
            { name: 'seats', type: 'uint256[]' },
            { name: 'sealSeconds', type: 'uint64' },
            { name: 'drawCommit', type: 'bytes32' },
        ],
        outputs: [],
    },
    {
        type: 'function', name: 'addWinnerSeats', stateMutability: 'nonpayable',
        inputs: [
            { name: 'winners', type: 'address[]' },
            { name: 'seats', type: 'uint256[]' },
        ],
        outputs: [],
    },
    {
        type: 'function', name: 'revokeWinnerSeats', stateMutability: 'nonpayable',
        inputs: [{ name: 'winners', type: 'address[]' }],
        outputs: [],
    },
    {
        type: 'function', name: 'finishSettlement', inputs: [], outputs: [],
        stateMutability: 'nonpayable',
    },
] as const;

export interface SettlementChain {
    /** First block at or after the given instant — the draw's beacon. */
    beaconAfter(instant: Date): Promise<{ block: number; hash: `0x${string}` }>;
    /** Broadcast one held signed mint order; resolves to its tx hash or
     *  throws (balance gone, nonce burned — the cascade's cue). */
    broadcastOrder(signedOrder: `0x${string}`): Promise<`0x${string}`>;
    closeWindow(project: `0x${string}`): Promise<void>;
    closeWindowContested(
        project: `0x${string}`,
        winners: { wallet: `0x${string}`; seats: number }[],
        sealSeconds: number,
        drawCommit: Hex,
    ): Promise<void>;
    addWinnerSeats(project: `0x${string}`, wallet: `0x${string}`, seats: number): Promise<void>;
    revokeWinnerSeats(project: `0x${string}`, wallet: `0x${string}`): Promise<void>;
    finishSettlement(project: `0x${string}`): Promise<void>;
}

/** The real arm: the worker-secret settlement key + the app's RPC. */
export function liveSettlementChain(): SettlementChain {
    const rpc = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL;
    const keyHex = process.env.SETTLEMENT_KEY;
    if (!rpc) throw new Error('settlement: NEXT_PUBLIC_ALCHEMY_RPC_URL unset');
    if (!keyHex) throw new Error('settlement: SETTLEMENT_KEY unset');
    const chain = CHAIN_ID === 11155111 ? sepolia : mainnet;
    const account: Account = privateKeyToAccount(keyHex as Hex);
    const pub: PublicClient = createPublicClient({ chain, transport: http(rpc) });
    const wallet: WalletClient = createWalletClient({ chain, account, transport: http(rpc) });

    async function write(
        project: `0x${string}`,
        functionName: 'closeWindow' | 'closeWindowContested' | 'addWinnerSeats'
            | 'revokeWinnerSeats' | 'finishSettlement',
        args: unknown[],
    ): Promise<void> {
        const { request } = await pub.simulateContract({
            address: project, abi: WINDOW_ABI, functionName: functionName as never,
            args: args as never, account,
        });
        const hash = await wallet.writeContract(request);
        await pub.waitForTransactionReceipt({ hash });
    }

    return {
        async beaconAfter(instant) {
            // Walk forward from the head until a block at/after the instant
            // exists — the first block MINED AFTER close, unknowable earlier.
            const target = BigInt(Math.floor(instant.getTime() / 1000));
            let block = await pub.getBlock();
            while (block.timestamp < target) {
                await new Promise((r) => setTimeout(r, 3_000));
                block = await pub.getBlock();
            }
            // Head is at/after target; find the EARLIEST such block.
            let n = block.number;
            for (;;) {
                const prev = await pub.getBlock({ blockNumber: n - 1n });
                if (prev.timestamp < target) break;
                n -= 1n;
                block = prev;
            }
            const exact = await pub.getBlock({ blockNumber: n });
            return { block: Number(n), hash: exact.hash as `0x${string}` };
        },
        async broadcastOrder(signedOrder) {
            const hash = await pub.sendRawTransaction({ serializedTransaction: signedOrder });
            await pub.waitForTransactionReceipt({ hash });
            return hash;
        },
        closeWindow: (p) => write(p, 'closeWindow', []),
        closeWindowContested: (p, winners, sealSeconds, drawCommit) =>
            write(p, 'closeWindowContested', [
                winners.map((w) => w.wallet),
                winners.map((w) => BigInt(w.seats)),
                BigInt(sealSeconds),
                drawCommit,
            ]),
        addWinnerSeats: (p, wallet, seats) =>
            write(p, 'addWinnerSeats', [[wallet], [BigInt(seats)]]),
        revokeWinnerSeats: (p, wallet) => write(p, 'revokeWinnerSeats', [[wallet]]),
        finishSettlement: (p) => write(p, 'finishSettlement', []),
    };
}

/* ── canonical form ─────────────────────────────────────────────────────── */

interface EntryRow {
    wallet: `0x${string}`;
    seats: number;
    band: number;
}

/** The transcript's entry order: band ascending, wallet ascending. Fully
 *  determined by content — a re-run over the same entrants commits the same
 *  document, and arrival order is structurally absent. */
export function canonicalEntries(rows: readonly EntryRow[]): DrawEntry[] {
    return [...rows]
        .map((r) => ({ wallet: r.wallet.toLowerCase() as `0x${string}`, band: r.band, seats: r.seats }))
        .sort((a, b) => (a.band !== b.band ? a.band - b.band : a.wallet < b.wallet ? -1 : 1));
}

/* ── the choreography ───────────────────────────────────────────────────── */

export interface CloseOutcome {
    contested: boolean;
    executed: `0x${string}`[];
    failed: `0x${string}`[];
    result?: DrawResult;
}

/** Close a drop's window: quiet if supply covers every seat (all orders
 *  broadcast, no draw ever visible), contested otherwise (snapshot → bands →
 *  beacon → draw → seats on-chain → winners broadcast). Cascade for failed
 *  winners runs inside the same call; leftovers go first-come after
 *  finishSettlement. */
export async function closeDrop(
    db: SupabaseClient,
    chain: SettlementChain,
    dropId: number,
): Promise<CloseOutcome> {
    const { data: drop, error } = await db.from('drops').select('*').eq('id', dropId).single();
    if (error || !drop) throw error ?? new Error('settlement: drop not found');
    if (drop.status !== 'WINDOW') throw new Error(`settlement: drop is ${drop.status}`);

    const { data: entries, error: entErr } = await db
        .from('drop_entries').select('id, wallet, seats, signed_order').eq('drop_id', dropId)
        .eq('status', 'HELD');
    if (entErr) throw entErr;
    const held = (entries ?? []) as { id: number; wallet: `0x${string}`; seats: number; signed_order: `0x${string}` }[];
    const project = drop.project_address as `0x${string}`;
    const totalSeats = held.reduce((n, e) => n + e.seats, 0);

    /* ── the quiet ending ── */
    if (totalSeats <= drop.supply) {
        await chain.closeWindow(project);
        const executed: `0x${string}`[] = [];
        const failed: `0x${string}`[] = [];
        for (const e of held) {
            try {
                const tx = await chain.broadcastOrder(e.signed_order);
                executed.push(e.wallet);
                await db.from('drop_entries').update({ status: 'EXECUTED', tx_hash: tx }).eq('id', e.id);
            } catch {
                failed.push(e.wallet);
                await db.from('drop_entries').update({ status: 'TORN_UP' }).eq('id', e.id);
            }
        }
        await db.from('drops').update({ status: 'QUIET_CLOSED' }).eq('id', dropId);
        return { contested: false, executed, failed };
    }

    /* ── the contested ending ── */
    // Standing as of window OPEN — you enter as whoever you already were.
    const standings = await snapshotStanding(
        db, held.map((e) => e.wallet), new Date(drop.window_open),
    );
    const bands = assignBands([...standings.values()] as Standing[]);
    for (const e of held) {
        await db.from('drop_entries')
            .update({ band: bands.get(e.wallet.toLowerCase()) ?? 0 }).eq('id', e.id);
    }

    // The beacon: the first Ethereum block mined AFTER the close instant.
    const beacon = await chain.beaconAfter(new Date(drop.window_close));

    const transcript: DrawTranscript = {
        algo: 'pd-draw-v1',
        project: project.toLowerCase() as `0x${string}`,
        supply: drop.supply,
        beaconBlock: beacon.block,
        beaconHash: beacon.hash,
        entries: canonicalEntries(held.map((e) => ({
            wallet: e.wallet, seats: e.seats,
            band: bands.get(e.wallet.toLowerCase()) ?? 0,
        }))),
    };
    const result = runDraw(transcript);
    const sealSeconds = sealSecondsFor(totalSeats, drop.supply);

    await chain.closeWindowContested(project, result.winners, sealSeconds, result.commitment);
    await db.from('drops').update({
        status: 'CONTESTED', seal_seconds: sealSeconds,
        beacon_block: beacon.block, beacon_hash: beacon.hash,
        commitment: result.commitment, transcript,
    }).eq('id', dropId);

    // Winners' held orders execute; a failure cascades inside this same pass.
    const byWallet = new Map(held.map((e) => [e.wallet.toLowerCase(), e]));
    const executed: `0x${string}`[] = [];
    const failed: `0x${string}`[] = [];
    const seated = new Set(result.winners.map((w) => w.wallet));
    for (const w of result.winners) {
        const ok = await executeSeat(db, chain, project, byWallet.get(w.wallet)!);
        (ok ? executed : failed).push(w.wallet);
        if (!ok) await cascadeSeat(db, chain, project, result, w.wallet, w.seats, seated, byWallet, executed);
    }
    await chain.finishSettlement(project);
    // Losing orders are torn up unexecuted; leftovers are first-come now.
    await db.from('drop_entries').update({ status: 'TORN_UP' })
        .eq('drop_id', dropId).eq('status', 'HELD');
    await db.from('drops').update({ status: 'SETTLED' }).eq('id', dropId);
    return { contested: true, executed, failed, result };
}

async function executeSeat(
    db: SupabaseClient,
    chain: SettlementChain,
    project: `0x${string}`,
    entry: { id: number; wallet: `0x${string}`; signed_order: `0x${string}` },
): Promise<boolean> {
    try {
        const tx = await chain.broadcastOrder(entry.signed_order);
        await db.from('drop_entries').update({ status: 'EXECUTED', tx_hash: tx }).eq('id', entry.id);
        return true;
    } catch {
        await db.from('drop_entries').update({ status: 'TORN_UP' }).eq('id', entry.id);
        return false;
    }
}

/** The cascade: the drawn permutation IS the queue — the seat walks down
 *  `result.order` to the next name not yet seated. No second draw, no
 *  discretion, exactly the published policy. */
async function cascadeSeat(
    db: SupabaseClient,
    chain: SettlementChain,
    project: `0x${string}`,
    result: DrawResult,
    from: `0x${string}`,
    seats: number,
    seated: Set<string>,
    byWallet: Map<string, { id: number; wallet: `0x${string}`; signed_order: `0x${string}` }>,
    executed: `0x${string}`[],
): Promise<void> {
    await chain.revokeWinnerSeats(project, from);
    for (const next of result.order) {
        if (seated.has(next)) continue;
        seated.add(next);
        const entry = byWallet.get(next);
        if (!entry) continue;
        await chain.addWinnerSeats(project, next, seats);
        const ok = await executeSeat(db, chain, project, entry);
        if (ok) { executed.push(next); return; }
        await chain.revokeWinnerSeats(project, next);
    }
    // Queue exhausted — the seat rejoins leftover supply at finishSettlement.
}

/** Void a bot's entry during the seal (before the reveal) and pass its seat
 *  down the same drawn order. */
export async function voidEntry(
    db: SupabaseClient,
    chain: SettlementChain,
    dropId: number,
    wallet: `0x${string}`,
): Promise<void> {
    const { data: drop, error } = await db.from('drops').select('*').eq('id', dropId).single();
    if (error || !drop?.transcript) throw error ?? new Error('settlement: no contested drop');
    const result = runDraw(drop.transcript as DrawTranscript);
    const w = wallet.toLowerCase() as `0x${string}`;
    const winner = result.winners.find((x) => x.wallet === w);
    const { data: rows } = await db.from('drop_entries')
        .select('id, wallet, signed_order, status').eq('drop_id', dropId);
    const byWallet = new Map(
        (rows ?? []).map((e) => [String(e.wallet).toLowerCase(), e as never]),
    );
    await db.from('drop_entries').update({ status: 'VOIDED' })
        .eq('drop_id', dropId).eq('wallet', wallet);
    if (!winner) return; // a losing bot voids silently — nothing to pass down
    const seated = new Set<string>(
        (rows ?? []).filter((e) => e.status === 'EXECUTED' || e.status === 'VOIDED')
            .map((e) => String(e.wallet).toLowerCase()),
    );
    await cascadeSeat(
        db, chain, drop.project_address as `0x${string}`,
        result, w, winner.seats, seated, byWallet, [],
    );
}
