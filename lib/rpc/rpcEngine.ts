'use client';

/*
 * rpcEngine — Build 33 D23 + S3
 *
 * Sim refs: 12453-12504 (RPC LATENCY PING ENGINE).
 *
 * Mirrors sim's module-level RPC state (`_rpcMs`, `_rpcActive`,
 * `_rpcTimer`) as a singleton in module scope. The sim wires the ⌁
 * button (Wallet section) → `triggerRpcPing()` → toggles `_rpcActive`,
 * starts/stops a 4-8s simulated-latency interval, and synchronously
 * mutates the DOM via `_updateRpcDisplay()`. The React port can't
 * mutate-via-id; we expose the same engine API but route updates
 * through a tiny pub/sub so any subscriber (TopBarRow's pill,
 * WalletSection's ⌁ active state) stays in sync via React state.
 *
 * Why a module file instead of a Context: only two components consume
 * this state (TopBarRow + WalletSection) and the engine has no
 * dependency on React's tree — the timer, sim function, and
 * threshold logic live in plain JS exactly as sim has them. A Context
 * would force every dropdown re-render to walk a provider tree for
 * data that's purely auxiliary. Build 32's hammer-badge used
 * localStorage+events for the same reason — the cross-component
 * channel doesn't need React's rendering machinery. Difference here:
 * RPC state is intentionally session-only (sim doesn't persist it
 * either; refresh resets _rpcActive to false), so no localStorage.
 *
 * Quality tier thresholds (sim 12462-12466):
 *   ms <  50 → 'good' (#4eff91)
 *   ms < 150 → 'ok'   (#ffe44e)
 *   else     → 'slow' (#ff6b35)
 *
 * S3 — realPing swap (replaces sim's simulateTick):
 *   The sim's simulated-latency drift is gone. Each tick now fires
 *   GET /api/rpc-ping, which itself runs eth_blockNumber against
 *   Alchemy and returns the server-measured round-trip in ms.
 *   The 4-8s tick cadence and visibility-pause are preserved exactly
 *   so the user-visible behavior (pill flickers on, value updates
 *   every few seconds, color tier per latency) doesn't change shape
 *   — only the source of the number does. The fetch result is
 *   clamped into the sim's 8-400ms window so the quality-tier
 *   classifier keeps working with the same boundaries.
 *
 *   Failure modes: a non-2xx response or a thrown fetch error pins
 *   the value at 400ms (slow tier), which surfaces network trouble
 *   in the UI without crashing the engine. Toggle-off mid-fetch
 *   no-ops the resolve via the `state.active` re-check, so a stale
 *   resolution can't revive a disabled ping.
 *
 *   The /api/rpc-ping route is itself revalidated at 4s, so coincident
 *   ticks across many clients collapse to one Alchemy hit per window.
 *
 * Toast on toggle is intentionally NOT fired here; sim does it inline
 * in `triggerRpcPing` but the toast surface is a React Context. The
 * caller (WalletSection ⌁ onClick) fires the toast via useToast.
 */

type RpcState = {
    active: boolean;
    /** Latest simulated latency in ms, or null when inactive / pre-first-tick. */
    ms: number | null;
};

type Listener = (state: RpcState) => void;

let state: RpcState = { active: false, ms: null };
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<Listener>();

/* Re-enabled 2026-07-08 (Brendon) post-Cloudflare migration. Safe because:
   (a) opt-in — the poll only runs while the user has toggled the ⌁ pill ON, and
   only while the tab is visible (realPing skips hidden; the timer stops on hide);
   (b) /api/rpc-ping is KV-cached at 4s, so coincident ticks across ALL clients
   collapse to ONE Alchemy hit per 4s window globally — audience size doesn't
   change upstream load. The 2026-06-27 Vercel-CPU fear doesn't transfer. */
const RPC_PING_DISABLED = false;

function notify() {
    listeners.forEach((cb) => cb(state));
}

function qualityClass(ms: number): 'good' | 'ok' | 'slow' {
    if (ms < 50) return 'good';
    if (ms < 150) return 'ok';
    return 'slow';
}

async function realPing() {
    if (RPC_PING_DISABLED) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!state.active) return;
    try {
        const res = await fetch('/api/rpc-ping');
        if (!state.active) return; // toggled off mid-fetch
        if (!res.ok) {
            state = { active: state.active, ms: 400 };
            notify();
            return;
        }
        const json = (await res.json()) as { ms: number };
        if (!state.active) return;
        const clamped = Math.max(8, Math.min(400, Math.round(json.ms)));
        state = { active: state.active, ms: clamped };
        notify();
    } catch {
        if (!state.active) return;
        state = { active: state.active, ms: 400 };
        notify();
    }
}

function scheduleNext() {
    // Sim 12494: setInterval(_simulateRpc, 4000 + Math.random()*4000) — but
    // setInterval gives a fixed cadence per call. Sim re-randomizes each
    // run by re-creating the interval; the React port mirrors that with a
    // chained setTimeout that re-rolls every tick. realPing is fire-and-
    // forget — its async resolve writes state via notify when it lands;
    // we don't await it so the 4-8s cadence is unaffected by network
    // round-trip duration.
    timer = setTimeout(() => {
        realPing();
        if (state.active) scheduleNext();
    }, 4000 + Math.random() * 4000);
}

function clearTimer() {
    if (timer !== null) {
        clearTimeout(timer);
        timer = null;
    }
}

/* Visibility pause (perf batch 2026-06-10). realPing already skips its
   fetch when the tab is hidden, but the 4-8s timer kept re-arming —
   wasted wakeups in a backgrounded tab. Stop the cycle on hide; on
   return, re-arm the normal cadence (no immediate ping — same as a
   hidden-tab tick landing under the old in-tick skip). Listener attach
   is lazy + idempotent so module load order stays inert. */
let visAttached = false;

function onVisibility() {
    if (!state.active) return;
    if (document.hidden) {
        clearTimer();
    } else if (timer === null) {
        scheduleNext();
    }
}

function ensureVisibilityListener() {
    if (visAttached || typeof document === 'undefined') return;
    visAttached = true;
    document.addEventListener('visibilitychange', onVisibility);
}

export function isRpcActive(): boolean {
    return state.active;
}

export function getRpcMs(): number | null {
    return state.ms;
}

export function getRpcQualityClass(ms: number): 'good' | 'ok' | 'slow' {
    return qualityClass(ms);
}

/**
 * Toggles RPC ping. Returns the new active state. Mirrors sim 12486-12503
 * (`window.triggerRpcPing`). Caller is responsible for firing the toast
 * — the engine stays UI-free.
 */
export function toggleRpcPing(): boolean {
    if (RPC_PING_DISABLED) return false; // off for now — never starts the poll
    if (state.active) {
        state = { active: false, ms: null };
        clearTimer();
        notify();
        return false;
    }
    state = { active: true, ms: null };
    notify();
    ensureVisibilityListener();
    // Fire one immediate tick so the pill shows a number right away
    // (matches sim 12492: `_simulateRpc()` called before scheduling).
    // realPing is async; we don't await — the resolve will notify when
    // the round-trip lands.
    realPing();
    scheduleNext();
    return true;
}

export function subscribeRpc(cb: Listener): () => void {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
