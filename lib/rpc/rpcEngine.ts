'use client';

/*
 * rpcEngine — Build 33 D23
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
 * Simulation parameters (sim 12468-12475): seed at 28ms, drift each
 * tick by (rand-0.48)*22, 7% chance of a 80-260ms spike, clamped to
 * 8-400ms. Tick interval 4000-8000ms randomized per tick (matches
 * sim 12494). Same numbers, same skew — visual fidelity to sim.
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

function notify() {
    listeners.forEach((cb) => cb(state));
}

function qualityClass(ms: number): 'good' | 'ok' | 'slow' {
    if (ms < 50) return 'good';
    if (ms < 150) return 'ok';
    return 'slow';
}

function simulateTick() {
    if (typeof document !== 'undefined' && document.hidden) return;
    const prev = state.ms ?? 28;
    const drift = (Math.random() - 0.48) * 22;
    const spike = Math.random() < 0.07 ? Math.random() * 180 + 80 : 0;
    const next = Math.max(8, Math.min(400, Math.round(prev + drift + spike)));
    state = { active: state.active, ms: next };
    notify();
}

function scheduleNext() {
    // Sim 12494: setInterval(_simulateRpc, 4000 + Math.random()*4000) — but
    // setInterval gives a fixed cadence per call. Sim re-randomizes each
    // run by re-creating the interval; the React port mirrors that with a
    // chained setTimeout that re-rolls every tick.
    timer = setTimeout(() => {
        simulateTick();
        if (state.active) scheduleNext();
    }, 4000 + Math.random() * 4000);
}

function clearTimer() {
    if (timer !== null) {
        clearTimeout(timer);
        timer = null;
    }
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
    if (state.active) {
        state = { active: false, ms: null };
        clearTimer();
        notify();
        return false;
    }
    state = { active: true, ms: null };
    notify();
    // Fire one immediate tick so the pill shows a number right away
    // (matches sim 12492: `_simulateRpc()` called before scheduling).
    simulateTick();
    scheduleNext();
    return true;
}

export function subscribeRpc(cb: Listener): () => void {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
