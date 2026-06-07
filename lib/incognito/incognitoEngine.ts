'use client';

/*
 * incognitoEngine — Build 33 D22
 *
 * Sim refs: 12506-12524 (INCOGNITO PROXY ⚇).
 *
 * Mirrors sim's `_incognitoActive` module variable + `toggleIncognitoProxy`.
 * The proxy is a session-only mode (no localStorage) that:
 *   - When ON: surfaces the bar-center-wrap incognito pill (TopBarRow)
 *     and underlines/lights the ⚇ button in WalletSection.
 *   - Is mutually exclusive with hammer-mode at toggle time (sim
 *     12513-12515): turning Incognito ON deactivates Hammer if it's on.
 *     The reverse direction (Hammer ON → Incognito OFF) is sim's
 *     responsibility inside spell logic; not handled here.
 *
 * Same singleton+pub/sub shape as rpcEngine — see that file for the
 * rationale. The two engines stay separate files to keep concerns
 * isolated; merging would couple unrelated state.
 *
 * The hammer-deactivation side effect is NOT performed inside this
 * engine — the engine has no dependency on PdNotifsContext. The caller
 * (WalletSection ⚇ onClick) reads pdNotifs.spell_hammer and calls
 * toggle('spell_hammer') if needed. Keeps the engine pure.
 */

type IncognitoState = {
    active: boolean;
};

type Listener = (state: IncognitoState) => void;

let state: IncognitoState = { active: false };
const listeners = new Set<Listener>();

function notify() {
    listeners.forEach((cb) => cb(state));
}

export function isIncognitoActive(): boolean {
    return state.active;
}

export function toggleIncognito(): boolean {
    state = { active: !state.active };
    notify();
    return state.active;
}

export function subscribeIncognito(cb: Listener): () => void {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
