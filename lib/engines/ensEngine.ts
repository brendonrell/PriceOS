/*
 * ensEngine — module singleton for wallet ENS name lookup.
 *
 * Fetch is triggered by WalletProviders when siweAddress changes, so
 * ENS data is ready before the user ever opens the Settings panel.
 * WalletSection reads from this engine via getEnsNames() +
 * subscribeEnsNames() instead of doing its own fetch, eliminating the
 * "jump in" effect on first settings open.
 *
 * Cache: localStorage key `pd_ens_cache`, 5-minute TTL, keyed by
 * address. On startEnsLookup the cache is read instantly (synchronous)
 * so any subscriber gets data on first render if the cache is warm.
 * The subgraph fetch then runs in the background and notifies if the
 * result differs.
 *
 * Pattern mirrors incognitoEngine / rpcEngine / budgetEngine.
 */

type EnsListener = (names: string[]) => void;

const CACHE_KEY = 'pd_ens_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let currentAddress: string | null = null;
let currentNames: string[] = [];
let fetchController: AbortController | null = null;
const listeners = new Set<EnsListener>();

function notify(): void {
    for (const cb of listeners) cb(currentNames);
}

function readCache(addr: string): string[] | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { addr: string; names: string[]; ts: number };
        if (parsed.addr !== addr) return null;
        if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
        return parsed.names;
    } catch { return null; }
}

function writeCache(addr: string, names: string[]): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ addr, names, ts: Date.now() }));
    } catch { /* quota */ }
}

/**
 * Trigger an ENS lookup for the given address.
 * Safe to call with null (clears state).
 * Called by WalletProviders on every siweAddress change.
 */
export function startEnsLookup(address: string | null): void {
    // Abort any in-flight fetch for a previous address.
    if (fetchController) {
        fetchController.abort();
        fetchController = null;
    }

    if (!address) {
        currentAddress = null;
        currentNames = [];
        notify();
        return;
    }

    // Already loaded for this exact address — no-op (avoid double fetch on
    // re-render without address change).
    if (address === currentAddress && currentNames.length > 0) return;

    currentAddress = address;

    // Instant warm-start: read localStorage cache synchronously so any
    // subscriber already mounted gets data on the next tick.
    const cached = readCache(address);
    if (cached) {
        currentNames = cached;
        notify();
    }

    const addr = address.toLowerCase();
    const nowSecs = Math.floor(Date.now() / 1000);
    const query = `{
        account(id: "${addr}") {
            domains(first: 100, where: { parent_not: null }) {
                name
                expiryDate
                owner { id }
            }
            wrappedDomains(first: 100) {
                domain { name expiryDate }
            }
        }
    }`;

    const controller = new AbortController();
    fetchController = controller;

    fetch('https://api.thegraph.com/subgraphs/name/ensdomains/ens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: controller.signal,
    })
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((data) => {
            if (controller.signal.aborted || address !== currentAddress) return;
            const seen = new Set<string>();
            const names: string[] = [];
            const acc = data?.data?.account;
            if (acc) {
                for (const d of (acc.domains ?? [])) {
                    const n = d?.name;
                    const exp = d?.expiryDate ? Number(d.expiryDate) : null;
                    if (!n || !n.endsWith('.eth')) continue;
                    if (exp !== null && exp < nowSecs) continue;
                    if (!seen.has(n)) { seen.add(n); names.push(n); }
                }
                for (const r of (acc.wrappedDomains ?? [])) {
                    const n = r?.domain?.name;
                    const exp = r?.domain?.expiryDate ? Number(r.domain.expiryDate) : null;
                    if (!n || !n.endsWith('.eth')) continue;
                    if (exp !== null && exp < nowSecs) continue;
                    if (!seen.has(n)) { seen.add(n); names.push(n); }
                }
            }
            currentNames = names;
            writeCache(addr, names);
            notify();
        })
        .catch(() => {
            // Subgraph unavailable — keep whatever we have (cache hit or empty).
        })
        .finally(() => {
            if (fetchController === controller) fetchController = null;
        });
}

/** Return the current resolved ENS names for the active wallet. */
export function getEnsNames(): string[] {
    return currentNames;
}

/**
 * Subscribe to ENS name list changes.
 * Returns an unsubscribe function.
 */
export function subscribeEnsNames(cb: EnsListener): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
}
