/*
 * Shipped workspace defaults + the Spaces preset library — every code must
 * decode cleanly, be canonical, and carry only LIVE tokens. The DEFAULTS
 * additionally may not carry a top-bar token (Brendon, 2026-07-16:
 * switching dots must never make the navbar jump — no calendar row, no
 * Hammer pill, no logo swap; the tape is explicitly FINE, "it's low
 * enough"). SPACES have no top-bar restriction at all — his call.
 */

import { describe, it, expect } from 'vitest';
import { decodeSetupCode, encodeSetupCode, notifsPatchFromDecodedState } from '../lib/state/SetupCode';
import { SHIPPED_WORKSPACES, SPACES, DEFAULT_LOAD_TOASTS, WORKSPACE_SEED_VERSION, DEFAULTS_SEED_VERSION } from '../lib/state/workspaceDefaults';

/* Tokens that put something in the top bar (tape deliberately NOT here). */
const TOP_BAR_TOKENS = ['TBCL', 'HMMR', 'PLGO', 'ANON'];

/* Tokens no shipped code or Space may ever carry: inert roundtrip-parity
   flags (nothing listens — a preset carrying them would lie) + the two
   consent-gated features (Panopticon confirms first; Deactivate is a
   public act) + stubs. */
const DEAD_OR_GATED_TOKENS = ['MOOD', 'ASTR', 'PRTL', 'FLAR', 'GRAV', 'SYBN', 'ARBT', 'PURL', 'PURD', 'INVS', 'PNOP'];

const tokensOf = (code: string) => code.replace(/^‰/, '').split('-');

/** decode → rebuild notifs from the patch → re-encode must be identity. */
function expectCanonical(name: string, code: string) {
    const r = decodeSetupCode(code);
    expect(r.ok, `${name} should decode`).toBe(true);
    expect(r.unknown ?? [], `${name} has unknown tokens`).toEqual([]);
    expect(r.state?.colorway, `${name} must pin a colorway`).toBeTruthy();
    expect(r.state?.sort, `${name} must pin a sort`).toBeTruthy();
    const patch = notifsPatchFromDecodedState(r.state!);
    const encoded = encodeSetupCode(r.state!.colorway!, r.state!.sort!, { ...patch } as never);
    expect(encoded, `${name} is not in canonical encoder form`).toBe(code);
}

describe('shipped workspace defaults', () => {
    it('ships nine, ids unique, names within the 24-char cap', () => {
        expect(SHIPPED_WORKSPACES.length).toBe(9);
        const ids = SHIPPED_WORKSPACES.map((w) => w.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const w of SHIPPED_WORKSPACES) {
            expect(w.isDefault).toBe(true);
            expect(w.name.length).toBeGreaterThan(0);
            expect(w.name.length).toBeLessThanOrEqual(24);
        }
    });

    it('every shipped code decodes clean and is canonical', () => {
        for (const w of SHIPPED_WORKSPACES) expectCanonical(w.name, w.code);
    });

    it('no DEFAULT carries a top-bar token (the 2026-07-16 rule; tape is fine)', () => {
        for (const w of SHIPPED_WORKSPACES) {
            for (const banned of TOP_BAR_TOKENS) {
                expect(tokensOf(w.code), `${w.name} must not ship ${banned}`).not.toContain(banned);
            }
            const r = decodeSetupCode(w.code);
            expect(r.state?.flags.topBarCalendar).toBeUndefined();
            expect(r.state?.flags.spell_hammer).toBeUndefined();
        }
    });

    it('no shipped code or Space carries a dead or consent-gated token', () => {
        for (const w of [...SHIPPED_WORKSPACES, ...SPACES.map((s) => ({ name: s.name, code: s.code }))]) {
            for (const banned of DEAD_OR_GATED_TOKENS) {
                expect(tokensOf(w.code), `${w.name} must not carry ${banned}`).not.toContain(banned);
            }
        }
    });

    it('every Space decodes clean, is canonical, and keys/names are unique', () => {
        for (const s of SPACES) expectCanonical(`Space ${s.name}`, s.code);
        expect(new Set(SPACES.map((s) => s.key)).size).toBe(SPACES.length);
        expect(new Set(SPACES.map((s) => s.name)).size).toBe(SPACES.length);
        for (const s of SPACES) {
            expect(s.name.length).toBeLessThanOrEqual(24); // workspace-name cap
            // A Space must not duplicate an installed default's code — the
            // library is "not the installed defaults" by definition.
            expect(SHIPPED_WORKSPACES.some((w) => w.code === s.code), `${s.name} duplicates a default`).toBe(false);
        }
    });

    it('the eight personas carry their flourish toasts; Main stays plain', () => {
        expect(DEFAULT_LOAD_TOASTS[1]).toBeUndefined();
        for (const id of [101, 102, 103, 104, 105, 106, 107, 108]) {
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
