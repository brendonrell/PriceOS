'use client';

/*
 * npc/actions — how the cast sees what you DO, not just what you look at.
 *
 * Every action in the app already announces itself on screen as a toast
 * ("Added to your Wishlist (Private)", "Cart: ADDED · 3", "Minted: 2 × …").
 * The residents watch the same screen you do — so the toast pipeline is the
 * ONE honest tap point: ToastContext feeds every message through
 * publishToast(), the classifier below turns the ones that matter into typed
 * action events, and the director reacts. No component instrumentation, no
 * new wiring per feature — if it toasts, they saw it.
 *
 * Strictly within the NPC boundary: these are things literally shown on your
 * screen. The omniscient stuff stays with the Familiar.
 */

export type ActionKind =
    | 'star' | 'unstar'
    | 'wishlist' | 'unwishlist'
    | 'cart' | 'bench'
    | 'grail' | 'ungrail'
    | 'album' | 'todo' | 'note'
    | 'follow' | 'unfollow'
    | 'mint' | 'buy' | 'sell' | 'listed' | 'offer' | 'sweep'
    | 'colorway' | 'achievement' | 'zen';

export interface NpcAction {
    kind: ActionKind;
    at: number;
    /** The raw toast text, for detail parsing ("Minted: 2 × BOREAL …"). */
    msg: string;
}

/* Ordered — first match wins. Patterns mirror the app's real toast strings. */
const RULES: [RegExp, ActionKind][] = [
    [/^STARRED #|^Added to your Starred/i, 'star'],
    [/^Removed .*Starred/i, 'unstar'],
    [/Added .*to your Wishlist/i, 'wishlist'],
    [/^Removed .*from your Wishlist/i, 'unwishlist'],
    [/^Cart: ADDED|^Added to cart|ADDED TO CART$/i, 'cart'],
    [/^Bench: ADDED/i, 'bench'],
    [/ GRAIL PINNED$/i, 'grail'],
    [/ DE-PINNED$/i, 'ungrail'],
    [/^Added to Album/i, 'album'],
    [/^Added to To-Dos|^To-Dos: ADDED/i, 'todo'],
    [/^Note .*: SAVED/i, 'note'],
    [/: FOLLOWED$/i, 'follow'],
    [/: UNFOLLOWED$/i, 'unfollow'],
    [/^Minted: /i, 'mint'],
    [/^Bought: /i, 'buy'],
    [/^Sold: /i, 'sell'],
    [/^Listed: /i, 'listed'],
    [/^Offer placed/i, 'offer'],
    [/^Sweep complete/i, 'sweep'],
    [/^Colorway: |^Default Colorway: /i, 'colorway'],
    [/^Achievement: /i, 'achievement'],
    [/^Zen Mode/i, 'zen'],
];

export function classifyToast(msg: string): ActionKind | null {
    for (const [re, kind] of RULES) if (re.test(msg)) return kind;
    return null;
}

/* One pending action at a time — the freshest wins; the director consumes. */
let pending: NpcAction | null = null;
const listeners = new Set<(a: NpcAction) => void>();

/** Called by ToastContext for EVERY toast (guarded, fire-and-forget). */
export function publishToast(msg: string): void {
    try {
        const kind = classifyToast(msg);
        if (!kind) return;
        const action: NpcAction = { kind, at: Date.now(), msg };
        pending = action;
        listeners.forEach((cb) => {
            try { cb(action); } catch { /* subscriber's problem */ }
        });
    } catch { /* never let the show break a toast */ }
}

/** Pull the pending action (clears it). */
export function consumeAction(): NpcAction | null {
    const a = pending;
    pending = null;
    return a;
}

/** Live subscription — NpcCast reacts quickly; the Familiar witnesses mints. */
export function subscribeActions(cb: (a: NpcAction) => void): () => void {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
}
