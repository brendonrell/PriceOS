/*
 * lib/drops/draw.ts — THE FAIR DRAW ENGINE (the provably-fair core).
 *
 * When a drop oversubscribes, this decides who wins — so it is built to be
 * checked by strangers, not trusted. Pure and deterministic: the same
 * transcript always reproduces the same result, on anyone's machine.
 *
 * THE FAIRNESS CONTRACT (content/docs/fair-draw — the published policy):
 *   · Entries are prioritized in BANDS (band 0 first). Banding is computed
 *     from standing snapshotted BEFORE the drop; this engine only consumes
 *     the band it is handed and never weights inside one.
 *   · Within a band the draw is a pure coin flip — equal odds, no further
 *     weighting. Enforced here by an unbiased seeded shuffle.
 *   · The result is one full PERMUTATION of every entry, not just winners:
 *     the head takes the seats, and the tail IS the cascade — when a
 *     winner's held order can't execute (or is voided as a bot), the seat
 *     passes to the next name in the same drawn order. No second draw, no
 *     discretion at settlement time.
 *
 * HOW IT STAYS HONEST:
 *   · The SEED is keccak(entriesRoot ‖ beacon blockhash). The beacon is an
 *     Ethereum block AFTER entries closed — unknowable while anyone could
 *     still enter, public forever after. Nobody (PD included) can pick a
 *     seed, and nobody can grind entries against a seed they can't know.
 *   · The COMMITMENT anchored on-chain (PDProject.closeWindowContested's
 *     drawCommit) is keccak over the canonical transcript inputs — entries,
 *     bands, beacon, supply, algorithm version. The published transcript
 *     must hash to the on-chain value AND replay to the on-chain seats, or
 *     it is provably not the draw that settled.
 *   · Randomness is keccak counter-mode with REJECTION SAMPLING — no modulo
 *     bias, so "equal odds" is exact, not approximate.
 *
 * The engine knows nothing about wallets' funds, orders, or the chain — the
 * settlement service (see docs/briefs/fair-draw-settlement.md) feeds it and
 * carries out its result.
 */

import { keccak256, encodePacked, type Hex } from 'viem';

/** The algorithm identity baked into every commitment. Bump ONLY with a new
 *  engine version — an old transcript must verify against the code that ran
 *  it, forever. */
export const DRAW_ALGO = 'pd-draw-v1';

/** One entered order. One entry per wallet per drop — the service enforces
 *  it upstream; the engine refuses duplicates outright. */
export interface DrawEntry {
    /** The entrant, lowercase 0x address. */
    wallet: `0x${string}`;
    /** Priority band, 0 = highest. From the pre-drop standing snapshot. */
    band: number;
    /** Seats this order takes if it wins (mint quantity). ≥ 1. */
    seats: number;
}

/** Everything needed to re-run and verify a draw, published in full. */
export interface DrawTranscript {
    algo: string;
    /** The drop's project address, lowercase. */
    project: `0x${string}`;
    /** Seats available to the draw (the drop's remaining supply). */
    supply: number;
    /** Block number whose hash seeds the draw — mined AFTER entries closed. */
    beaconBlock: number;
    /** That block's hash, from any Ethereum node. */
    beaconHash: `0x${string}`;
    /** Every entry, exactly as drawn. */
    entries: DrawEntry[];
}

export interface DrawResult {
    /** Every wallet in drawn order — head wins, tail is the cascade. */
    order: `0x${string}`[];
    /** The wallets holding the initial seats, with seat counts — what
     *  closeWindowContested credits on-chain. */
    winners: { wallet: `0x${string}`; seats: number }[];
    /** keccak of the canonical transcript — the on-chain drawCommit. */
    commitment: Hex;
    /** The derived seed, for the transcript's readers. */
    seed: Hex;
}

/* ── canonical hashing ──────────────────────────────────────────────────── */

function assertCanonical(entries: DrawEntry[]): void {
    const seen = new Set<string>();
    for (const e of entries) {
        const w = e.wallet;
        if (w !== w.toLowerCase()) throw new Error(`draw: wallet not lowercase: ${w}`);
        if (!/^0x[0-9a-f]{40}$/.test(w)) throw new Error(`draw: bad wallet: ${w}`);
        if (seen.has(w)) throw new Error(`draw: duplicate wallet: ${w}`);
        seen.add(w);
        if (!Number.isInteger(e.band) || e.band < 0) throw new Error('draw: bad band');
        if (!Number.isInteger(e.seats) || e.seats < 1) throw new Error('draw: bad seats');
    }
}

/** Root over the entry set. Order-independent input is NOT wanted — the
 *  transcript's entry order is part of what is committed, so a reordered
 *  transcript is a different (and non-verifying) document. */
export function entriesRoot(entries: DrawEntry[]): Hex {
    let acc: Hex = keccak256(encodePacked(['string'], [DRAW_ALGO]));
    for (const e of entries) {
        acc = keccak256(
            encodePacked(['bytes32', 'address', 'uint32', 'uint32'], [acc, e.wallet, e.band, e.seats]),
    );
    }
    return acc;
}

/** The one number nobody could choose: entries pinned first, beacon after. */
export function drawSeed(root: Hex, beaconHash: `0x${string}`): Hex {
    return keccak256(encodePacked(['bytes32', 'bytes32'], [root, beaconHash]));
}

/** The on-chain anchor. Everything a checker needs is under this hash. */
export function drawCommitment(t: DrawTranscript): Hex {
    return keccak256(
        encodePacked(
            ['string', 'address', 'uint32', 'uint64', 'bytes32', 'bytes32'],
            [t.algo, t.project, t.supply, BigInt(t.beaconBlock), t.beaconHash, entriesRoot(t.entries)],
        ),
    );
}

/* ── unbiased seeded randomness (keccak counter mode) ───────────────────── */

class Rng {
    private counter = 0n;
    private buf: Uint8Array = new Uint8Array(0);
    private pos = 0;
    constructor(private readonly seed: Hex) {}

    private refill(): void {
        const block = keccak256(encodePacked(['bytes32', 'uint256'], [this.seed, this.counter]));
        this.counter += 1n;
        this.buf = Uint8Array.from(Buffer.from(block.slice(2), 'hex'));
        this.pos = 0;
    }

    private nextUint32(): number {
        if (this.pos + 4 > this.buf.length) this.refill();
        const v =
            (this.buf[this.pos]! << 24) | (this.buf[this.pos + 1]! << 16)
            | (this.buf[this.pos + 2]! << 8) | this.buf[this.pos + 3]!;
        this.pos += 4;
        return v >>> 0;
    }

    /** Uniform integer in [0, n) — rejection sampling, zero modulo bias. */
    nextBelow(n: number): number {
        if (n <= 0 || !Number.isInteger(n)) throw new Error('rng: bad bound');
        if (n === 1) return 0;
        const limit = Math.floor(0x1_0000_0000 / n) * n;
        for (;;) {
            const x = this.nextUint32();
            if (x < limit) return x % n;
        }
    }
}

/* ── the draw ───────────────────────────────────────────────────────────── */

/** Run the draw a transcript describes. Pure — same transcript, same result,
 *  on any machine, forever. */
export function runDraw(t: DrawTranscript): DrawResult {
    assertCanonical(t.entries);
    if (!Number.isInteger(t.supply) || t.supply < 1) throw new Error('draw: bad supply');
    const seed = drawSeed(entriesRoot(t.entries), t.beaconHash);
    const rng = new Rng(seed);

    // Bands ascending; the entry list's order within a band carries NO weight
    // (the shuffle owns it entirely) — but it is still committed, so the
    // published document can't be silently rearranged.
    const bands = [...new Set(t.entries.map((e) => e.band))].sort((a, b) => a - b);
    const order: `0x${string}`[] = [];
    const seatsOf = new Map<string, number>();
    for (const b of bands) {
        const pool = t.entries.filter((e) => e.band === b);
        // Fisher–Yates with the unbiased rng: every in-band permutation is
        // exactly equally likely — the published "pure coin flip".
        for (let i = pool.length - 1; i > 0; --i) {
            const j = rng.nextBelow(i + 1);
            [pool[i], pool[j]] = [pool[j]!, pool[i]!];
        }
        for (const e of pool) {
            order.push(e.wallet);
            seatsOf.set(e.wallet, e.seats);
        }
    }

    // Head of the permutation takes the seats; the tail is the cascade.
    const winners: { wallet: `0x${string}`; seats: number }[] = [];
    let filled = 0;
    for (const wallet of order) {
        if (filled >= t.supply) break;
        const take = Math.min(seatsOf.get(wallet)!, t.supply - filled);
        winners.push({ wallet, seats: take });
        filled += take;
    }

    return { order, winners, commitment: drawCommitment(t), seed };
}

/** Anyone's check: does this published transcript really produce the seats
 *  the chain recorded, under the commitment the chain anchored? */
export function verifyDraw(
    t: DrawTranscript,
    onchainCommit: Hex,
    onchainWinners: { wallet: `0x${string}`; seats: number }[],
): { ok: boolean; reason?: string } {
    let result: DrawResult;
    try {
        result = runDraw(t);
    } catch (err) {
        return { ok: false, reason: `transcript invalid: ${(err as Error).message}` };
    }
    if (result.commitment !== onchainCommit) {
        return { ok: false, reason: 'commitment mismatch — not the committed transcript' };
    }
    if (result.winners.length !== onchainWinners.length) {
        return { ok: false, reason: 'winner count mismatch' };
    }
    for (let i = 0; i < result.winners.length; ++i) {
        const a = result.winners[i]!;
        const b = onchainWinners[i]!;
        if (a.wallet !== b.wallet.toLowerCase() || a.seats !== b.seats) {
            return { ok: false, reason: `winner ${i} mismatch` };
        }
    }
    return { ok: true };
}
