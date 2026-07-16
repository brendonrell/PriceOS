/*
 * Shipped workspace defaults — every code must decode cleanly, and none may
 * carry a top-bar token (Brendon, 2026-07-16: switching dots must never make
 * the navbar jump — no calendar row, no Hammer pill, no logo swap, no tape).
 */

import { describe, it, expect } from 'vitest';
import { decodeSetupCode, encodeSetupCode, notifsPatchFromDecodedState } from '../lib/state/SetupCode';
import { SHIPPED_WORKSPACES, DEFAULT_LOAD_TOASTS, WORKSPACE_SEED_VERSION, DEFAULTS_SEED_VERSION } from '../lib/state/workspaceDefaults';

/* Tokens that put something in the top bar. TAP* = the navbar ticker. */
const TOP_BAR_TOKENS = ['TBCL', 'HMMR', 'PLGO', 'ANON', 'TAPF', 'TAPS', 'TAPB', 'TAPX'];

describe('shipped workspace defaults', () => {
    it('ships six, ids unique, names within the 24-char cap', () => {
        expect(SHIPPED_WORKSPACES.length).toBe(6);
        const ids = SHIPPED_WORKSPACES.map((w) => w.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const w of SHIPPED_WORKSPACES) {
            expect(w.isDefault).toBe(true);
            expect(w.name.length).toBeGreaterThan(0);
            expect(w.name.length).toBeLessThanOrEqual(24);
        }
    });

    it('every shipped code decodes with zero unknown tokens', () => {
        for (const w of SHIPPED_WORKSPACES) {
            const r = decodeSetupCode(w.code);
            expect(r.ok, `${w.name} should decode`).toBe(true);
            expect(r.unknown ?? [], `${w.name} has unknown tokens`).toEqual([]);
            expect(r.state?.colorway, `${w.name} must pin a colorway`).toBeTruthy();
            expect(r.state?.sort, `${w.name} must pin a sort`).toBeTruthy();
        }
    });

    it('no shipped code carries a top-bar token (the 2026-07-16 rule)', () => {
        for (const w of SHIPPED_WORKSPACES) {
            const tokens = w.code.replace(/^‰/, '').split('-');
            for (const banned of TOP_BAR_TOKENS) {
                expect(tokens, `${w.name} must not ship ${banned}`).not.toContain(banned);
            }
            // The decoded state must also agree: no tape, no top-bar flags.
            const r = decodeSetupCode(w.code);
            expect(r.state?.tape).toBe(0);
            expect(r.state?.flags.topBarCalendar).toBeUndefined();
            expect(r.state?.flags.spell_hammer).toBeUndefined();
        }
    });

    it('the four personas carry their flourish toasts; Main/Zen stay plain', () => {
        expect(DEFAULT_LOAD_TOASTS[1]).toBeUndefined();
        expect(DEFAULT_LOAD_TOASTS[2]).toBeUndefined();
        for (const id of [101, 102, 103, 104]) {
            const ws = SHIPPED_WORKSPACES.find((w) => w.id === id)!;
            expect(ws).toBeTruthy();
            const toast = DEFAULT_LOAD_TOASTS[id];
            expect(toast, `${id} needs a flourish`).toBeTruthy();
            // Toast casing rule: the workspace NAME is the ALLCAPS changed-thing.
            expect(toast).toContain(ws.name.toUpperCase());
        }
    });

    it('seed versions cover every shipped id and never exceed the current version', () => {
        for (const w of SHIPPED_WORKSPACES) {
            const v = WORKSPACE_SEED_VERSION[w.id];
            expect(v, `${w.name} needs a seed version`).toBeTruthy();
            expect(v).toBeLessThanOrEqual(DEFAULTS_SEED_VERSION);
        }
    });

    it('each code is in canonical encoded form (round-trips through decode→encode)', () => {
        for (const w of SHIPPED_WORKSPACES) {
            const r = decodeSetupCode(w.code);
            expect(r.ok).toBe(true);
            // Rebuild notifs from the decoded patch over a false-y base, then
            // re-encode: the canonical form must equal the shipped string.
            const patch = notifsPatchFromDecodedState(r.state!);
            const notifs = { ...patch } as never;
            const encoded = encodeSetupCode(r.state!.colorway!, r.state!.sort!, notifs);
            expect(encoded).toBe(w.code);
        }
    });
});
