/*
 * Hand — an Output's conviction read, from its REAL ownership ledger. The
 * diamond-hands lens of PD Rarity: original hands (minted it, never sold) →
 * never listed → longest unbroken hold. Flippers earn little; that's the point.
 *
 * Honest today: computed from the MINT / LIST / SALE events the sim already
 * records (app/api/output/[id] returns the full history). When real on-chain
 * sales land in the same ledger, this keeps working unchanged — no rebuild.
 */

export interface HandHistoryEvent {
    /** Mapped event type: 'MINT' | 'LIST' | 'SALE' | 'XFER'. */
    type: string;
    to_address: string | null;
    /** ISO string or unix-ms — both accepted. */
    timestamp: string | number;
}

export interface HandInput {
    owner: string | null;
    minter: string | null;
    /** Mint moment, ms (null when unknown). */
    mintedAtMs: number | null;
    history: HandHistoryEvent[];
    /** "Now", ms — passed in so the read is pure/testable. */
    nowMs: number;
}

export interface HandRead {
    /** The conviction tier — 'Original' · 'Diamond' · 'Held' · 'Fresh'. */
    tier: string;
    /** Days the CURRENT owner has held, unbroken. */
    holdDays: number;
    /** Times the piece has sold (priced transfers). */
    flips: number;
    /** Never carried a listing. */
    neverListed: boolean;
    /** Never sold since mint. */
    neverSold: boolean;
    /** Minted it and never let go — the crown. */
    originalHands: boolean;
}

function ms(t: string | number): number {
    if (typeof t === 'number') return t;
    const n = Date.parse(t);
    return Number.isFinite(n) ? n : NaN;
}
const same = (a: string | null, b: string | null): boolean =>
    !!a && !!b && a.toLowerCase() === b.toLowerCase();

/**
 * The conviction read. Original = minted it and never sold (the crown); Diamond
 * = bought in, never listed, held long; Held = a solid hold; Fresh = recently
 * acquired. Hold-time is the true gradient — mint order never inflates it.
 */
export function handRead(input: HandInput): HandRead {
    const { owner, minter, mintedAtMs, history, nowMs } = input;

    const flips = history.filter((e) => e.type === 'SALE').length;
    const neverListed = !history.some((e) => e.type === 'LIST');
    const neverSold = flips === 0;
    const originalHands = neverSold && same(owner, minter);

    // When did the CURRENT owner acquire it? The latest transfer INTO the owner,
    // or the mint if the minter still holds. Falls back to the mint moment.
    let acquiredMs = originalHands ? (mintedAtMs ?? NaN) : NaN;
    if (!originalHands && owner) {
        for (const e of history) {
            if ((e.type === 'SALE' || e.type === 'XFER') && same(e.to_address, owner)) {
                const t = ms(e.timestamp);
                if (Number.isFinite(t) && (!Number.isFinite(acquiredMs) || t > acquiredMs)) acquiredMs = t;
            }
        }
    }
    if (!Number.isFinite(acquiredMs)) acquiredMs = mintedAtMs ?? nowMs;

    const holdDays = Math.max(0, Math.floor((nowMs - acquiredMs) / 86_400_000));

    let tier: string;
    if (originalHands) tier = 'Original';
    else if (neverListed && holdDays >= 90) tier = 'Diamond';
    else if (holdDays >= 30) tier = 'Held';
    else tier = 'Fresh';

    return { tier, holdDays, flips, neverListed, neverSold, originalHands };
}
