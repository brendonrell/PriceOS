'use client';

/*
 * CartContext
 *
 * The Cart — sim line 11722's _pdCart Set. A bulk-buy slide-up panel
 * fed from gallery card hover (▢ icon) and consumed by the navbar
 * btnCart trigger. Sim refs:
 *   markup ............. sim.html 5075–5096 (panel shell)
 *   logic .............. sim.html 11720–11885 (load/save/render/buy)
 *   add-from-gallery ... sim.html 8055
 *
 * Why its own context (not ModalContext): the cart persists across
 * sessions via localStorage.pd_cart, while ModalContext is session-only
 * by design (sim's openModal/closeModal pattern is imperative + ephemeral).
 * A cart with 12 items half-assembled survives a refresh; an artwork
 * modal reopening on refresh would be a bug. Different lifecycle, own
 * context. Also matches sim — the cart never goes through openModal();
 * it has its own openCartPanel().
 *
 * Storage key: 'pd_cart' (matches sim verbatim — same key, same shape:
 * JSON-encoded array of token ids). A user who used the prototype keeps
 * their cart through the React port migration.
 *
 * Fees model: buyer pays listed sale price as-is on secondary; the 5%
 * royalty is the seller's burden (EIP-2981 → PaymentSplitter). Plus flat
 * CART_GAS_PER_ITEM × N as a gas estimate.
 *
 * The panel-open boolean lives here too because closing the panel when
 * the cart empties (sim 11848) needs both the items state and the panel
 * state — colocating them keeps the auto-close path local.
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

const STORAGE_KEY = 'pd_cart';
export const CART_GAS_PER_ITEM = 0.0005; // ETH; flat-per-item mock — sim 11722
// Buyer pays the listed sale price as-is on a secondary buy. The on-chain 5%
// royalty (EIP-2981) is paid by the seller out of their proceeds via
// PaymentSplitter, NOT added on top of what the buyer sees. PD takes no
// separate platform fee from the buyer on secondary.
// TODO: when the Cart starts handling primary mints, switch to
// `mintPrice + currentStorageFeeWei` per item (both sourced from chain).
export const CART_FEE_RATE = 0;

interface CartContextValue {
    /** Token ids in the cart, sorted ascending. */
    items: number[];
    /** True if the slide-up panel is open. */
    panelOpen: boolean;

    /** Add a token id; no-op if already present. */
    add: (id: number) => void;
    /** Remove a token id; no-op if not present. Auto-closes panel if cart empties. */
    remove: (id: number) => void;
    /** Empty the cart and persist. */
    clear: () => void;
    /** Mock the buy-all action — clears the cart and closes the panel. Returns the count. */
    buyAll: () => number;

    /** Open the slide-up panel. */
    openPanel: () => void;
    /** Close the slide-up panel. */
    closePanel: () => void;

    /** True iff id is currently in the cart. */
    has: (id: number) => boolean;
}

const CartCtx = createContext<CartContextValue | null>(null);

function loadFromStorage(): number[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return [];
        const ids = arr
            .map((n) => parseInt(n, 10))
            .filter((n) => Number.isFinite(n));
        // Dedup + sort to keep render order stable across sessions.
        return Array.from(new Set(ids)).sort((a, b) => a - b);
    } catch {
        return [];
    }
}

function saveToStorage(ids: number[]) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
        // Quota / private mode — silent. In-memory state still works.
    }
}

export function CartProvider({ children }: { children: ReactNode }) {
    /* SSR/CSR matching: start empty server-side, hydrate from storage on
       mount. Same pattern as useLocalStorage. The btnCart .has-items class
       toggle is downstream of `items.length`, so a one-frame empty state
       on first paint is correct (cart appears as items resolve). */
    const [items, setItems] = useState<number[]>([]);
    const [panelOpen, setPanelOpen] = useState(false);

    useEffect(() => {
        const initial = loadFromStorage();
        if (initial.length > 0) setItems(initial);
    }, []);

    const persist = useCallback((next: number[]) => {
        // Single source of truth: every mutation routes through here so
        // state and storage never drift.
        const sorted = Array.from(new Set(next)).sort((a, b) => a - b);
        setItems(sorted);
        saveToStorage(sorted);
        return sorted;
    }, []);

    const add = useCallback(
        (id: number) => {
            if (!Number.isFinite(id)) return;
            setItems((prev) => {
                if (prev.includes(id)) return prev;
                const next = [...prev, id].sort((a, b) => a - b);
                saveToStorage(next);
                return next;
            });
        },
        []
    );

    const remove = useCallback(
        (id: number) => {
            if (!Number.isFinite(id)) return;
            setItems((prev) => {
                if (!prev.includes(id)) return prev;
                const next = prev.filter((n) => n !== id);
                saveToStorage(next);
                /* Sim 11848: if the panel is open and the cart just emptied,
                   close it — keeping the panel over a hidden trigger orphans
                   the user. We schedule this on next tick so the same render
                   commit publishes the new items list before the panel closes. */
                if (next.length === 0) {
                    queueMicrotask(() => setPanelOpen(false));
                }
                return next;
            });
        },
        []
    );

    const clear = useCallback(() => {
        persist([]);
    }, [persist]);

    const buyAll = useCallback(() => {
        let count = 0;
        setItems((prev) => {
            count = prev.length;
            saveToStorage([]);
            return [];
        });
        setPanelOpen(false);
        return count;
    }, []);

    const openPanel = useCallback(() => setPanelOpen(true), []);
    const closePanel = useCallback(() => setPanelOpen(false), []);

    const has = useCallback(
        (id: number) => items.includes(id),
        [items]
    );

    /* Escape closes the panel — matches every other modal in the app and
       sim's pattern of esc-dismissing transient surfaces. */
    useEffect(() => {
        if (!panelOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setPanelOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [panelOpen]);

    const value = useMemo<CartContextValue>(
        () => ({
            items,
            panelOpen,
            add,
            remove,
            clear,
            buyAll,
            openPanel,
            closePanel,
            has,
        }),
        [items, panelOpen, add, remove, clear, buyAll, openPanel, closePanel, has]
    );

    return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart(): CartContextValue {
    const ctx = useContext(CartCtx);
    if (!ctx) {
        throw new Error('useCart must be used inside <CartProvider>');
    }
    return ctx;
}
