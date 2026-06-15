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
 * Storage key: 'pd_cart' (JSON array of `${slug}:${id}` keys). Cart items are
 * Project-exact — a bare token number collides across Projects (the Cart can
 * hold pieces from several Projects at once), and the panel must show each
 * item's correct Project title + live price. Legacy bare-number carts are not
 * migrated (no slug to place them) — a one-time reset, device-only.
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
import { useCollectionSync } from '../collections/useCollectionSync';

const STORAGE_KEY = 'pd_cart';
export const CART_GAS_PER_ITEM = 0.0005; // ETH; flat-per-item mock — sim 11722
// Buyer pays the listed sale price as-is on a secondary buy. The on-chain 5%
// royalty (EIP-2981) is paid by the seller out of their proceeds via
// PaymentSplitter, NOT added on top of what the buyer sees. PD takes no
// separate platform fee from the buyer on secondary.
// TODO: when the Cart starts handling primary mints, switch to
// `mintPrice + currentStorageFeeWei` per item (both sourced from chain).
export const CART_FEE_RATE = 0;

/** A cart entry — Project-exact. */
export interface CartItem {
    slug: string;
    id: number;
}

interface CartContextValue {
    /** Items in the cart, sorted by Project then id. */
    items: CartItem[];
    /** True if the slide-up panel is open. */
    panelOpen: boolean;

    /** Add an Output; no-op if already present. */
    add: (slug: string, id: number) => void;
    /** Remove an Output; no-op if not present. Auto-closes panel if cart empties. */
    remove: (slug: string, id: number) => void;
    /** Empty the cart and persist. */
    clear: () => void;
    /** Mock the buy-all action — clears the cart and closes the panel. Returns the count. */
    buyAll: () => number;

    /** Open the slide-up panel. */
    openPanel: () => void;
    /** Close the slide-up panel. */
    closePanel: () => void;

    /** True iff (slug, id) is currently in the cart. */
    has: (slug: string, id: number) => boolean;
}

const CartCtx = createContext<CartContextValue | null>(null);

function keyOf(slug: string, id: number): string {
    return `${slug}:${id}`;
}

function parseKey(k: string): CartItem {
    const i = k.indexOf(':');
    return { slug: k.slice(0, i), id: Number(k.slice(i + 1)) };
}

/** Dedupe + stable sort (Project then id) so render order is stable. */
function normalizeKeys(keys: string[]): string[] {
    return Array.from(new Set(keys)).sort((a, b) => {
        const ka = parseKey(a);
        const kb = parseKey(b);
        return ka.slug === kb.slug ? ka.id - kb.id : ka.slug.localeCompare(kb.slug);
    });
}

function loadFromStorage(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return [];
        // Only accept composite `slug:id` strings; skip legacy bare numbers.
        const keys = (arr as unknown[]).filter(
            (k): k is string => typeof k === 'string' && k.includes(':'),
        );
        return normalizeKeys(keys);
    } catch {
        return [];
    }
}

function saveToStorage(keys: string[]) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    } catch {
        // Quota / private mode — silent. In-memory state still works.
    }
}

export function CartProvider({ children }: { children: ReactNode }) {
    /* SSR/CSR matching: start empty server-side, hydrate from storage on
       mount. Same pattern as useLocalStorage. The btnCart .has-items class
       toggle is downstream of `items.length`, so a one-frame empty state
       on first paint is correct (cart appears as items resolve). */
    const [keys, setKeys] = useState<string[]>([]);
    const [panelOpen, setPanelOpen] = useState(false);

    useEffect(() => {
        const initial = loadFromStorage();
        if (initial.length > 0) setKeys(initial);
    }, []);

    const items = useMemo(() => keys.map(parseKey), [keys]);

    /* Cross-device persistence (cart_items) — merges with the on-device cart on
       sign-in, debounced save while signed in. Logged out → localStorage only. */
    const applyServer = useCallback((next: CartItem[]) => {
        const ks = normalizeKeys(next.map((it) => keyOf(it.slug, it.id)));
        setKeys(ks);
        saveToStorage(ks);
    }, []);
    useCollectionSync('/api/me/cart', items, applyServer, 100);

    const add = useCallback((slug: string, id: number) => {
        if (!slug || !Number.isFinite(id)) return;
        const key = keyOf(slug, id);
        setKeys((prev) => {
            if (prev.includes(key)) return prev;
            const next = normalizeKeys([...prev, key]);
            saveToStorage(next);
            return next;
        });
    }, []);

    const remove = useCallback((slug: string, id: number) => {
        const key = keyOf(slug, id);
        setKeys((prev) => {
            if (!prev.includes(key)) return prev;
            const next = prev.filter((k) => k !== key);
            saveToStorage(next);
            /* Sim 11848: if the panel is open and the cart just emptied, close it
               — keeping the panel over a hidden trigger orphans the user. */
            if (next.length === 0) {
                queueMicrotask(() => setPanelOpen(false));
            }
            return next;
        });
    }, []);

    const clear = useCallback(() => {
        setKeys([]);
        saveToStorage([]);
    }, []);

    const buyAll = useCallback(() => {
        let count = 0;
        setKeys((prev) => {
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
        (slug: string, id: number) => keys.includes(keyOf(slug, id)),
        [keys]
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
