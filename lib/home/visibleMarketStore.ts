/*
 * visibleMarketStore — a tiny module-scoped registry of the live market state
 * (owned / listed / price) for Output cards currently on screen, keyed
 * `${slug}:${id}`.
 *
 * Why it exists: the home page is the one MIXED zone — its carousels show pieces
 * you own alongside pieces you don't, spanning many projects. Multi-select needs
 * to know, per selected piece, whether it's yours (owner actions) or not (buyer
 * actions), and whether it's listed (Add to Cart). Each ArtworkCard already
 * derives that from its project provider; it just can't be read from the single
 * float bar mounted outside every provider. Cards publish their snapshot here
 * while multi-select is active; the home float bar reads it back. No new fetches
 * — it's the data the cards already hold.
 *
 * Scope: cards publish only while multi-select mode is on, so this stays empty
 * (and inert) on every normal page view. The project/profile pages have their
 * own float bars and never read this — extra entries are harmless.
 */

export interface MarketSnap {
    /** Held by the viewer (drives owner vs buyer actions). */
    owned: boolean;
    /** Currently listed for sale (drives Add to Cart eligibility). */
    listed: boolean;
    /** Listing price in ETH, or null when not listed. */
    price: number | null;
}

const snaps = new Map<string, MarketSnap>();
const subscribers = new Set<() => void>();

function key(slug: string, id: number): string {
    return `${slug}:${id}`;
}

/** Card → store. Only emits when the snapshot actually changed (avoids render
    loops; the effect that calls this re-runs on every meta change). */
export function publishMarket(slug: string, id: number, snap: MarketSnap): void {
    const k = key(slug, id);
    const prev = snaps.get(k);
    if (prev && prev.owned === snap.owned && prev.listed === snap.listed && prev.price === snap.price) {
        return;
    }
    snaps.set(k, snap);
    subscribers.forEach((cb) => cb());
}

export function getMarket(slug: string, id: number): MarketSnap | undefined {
    return snaps.get(key(slug, id));
}

export function subscribeMarket(cb: () => void): () => void {
    subscribers.add(cb);
    return () => {
        subscribers.delete(cb);
    };
}
