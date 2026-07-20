/*
 * Setup Code accuracy — the share contract (Brendon, 2026-07-16: "we need
 * setup codes to be working 100% accurately so people can easily share
 * their workspace setups").
 *
 * The guarantee under test: for ANY reachable settings state,
 *   encode → decode → apply-patch → encode
 * reproduces the identical code, and the decoded patch carries exactly the
 * flags the code names (everything else reset). Plus the legacy forms
 * (bracketed +V1, ARTS colorway, %∞ stamp) keep decoding.
 */

import { describe, it, expect } from 'vitest';
import {
    encodeSetupCode,
    decodeSetupCode,
    notifsPatchFromDecodedState,
    SETUP_CODE_FLAG_KEYS,
    _internal,
} from '../lib/state/SetupCode';
import type { PdNotifs, PingToastMode, MenuTapeMode } from '../lib/state/PdNotifsContext';
import type { ColorwayKey } from '../lib/state/ColorwayContext';
import type { SortKey } from '../lib/state/SortContext';

/* Deterministic PRNG (mulberry32) — reproducible fuzz, no Math.random. */
function seeded(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const COLORWAYS: ColorwayKey[] = ['custom', 'light', 'dark', 'orange', 'hashsyn', 'blue', 'red', 'haze'];
const SORTS: SortKey[] = ['id', 'price', 'feed', 'fog'];
const PING_MODES: PingToastMode[] = ['off', 'on', '3d', 'combo'];
const MENUTAPES: MenuTapeMode[] = [0, 3, 4] as MenuTapeMode[];

/** A minimal notifs object carrying every envelope-relevant field. */
function randomNotifs(rand: () => number): Partial<PdNotifs> {
    const n: Record<string, unknown> = {};
    for (const key of SETUP_CODE_FLAG_KEYS) n[key] = rand() < 0.3;
    n.tape = Math.floor(rand() * 5); // 0..4
    n.watchMetric = Math.floor(rand() * 4); // 0..3
    n.pingToasts = PING_MODES[Math.floor(rand() * PING_MODES.length)];
    n.menutape = MENUTAPES[Math.floor(rand() * MENUTAPES.length)];
    return n as Partial<PdNotifs>;
}

describe('Setup Code share contract', () => {
    it('fuzz: encode → decode → patch → encode is the identity (500 states)', () => {
        const rand = seeded(20260716);
        for (let i = 0; i < 500; i++) {
            const colorway = COLORWAYS[Math.floor(rand() * COLORWAYS.length)];
            const sort = SORTS[Math.floor(rand() * SORTS.length)];
            const notifs = randomNotifs(rand) as PdNotifs;

            const code = encodeSetupCode(colorway, sort, notifs);
            const decoded = decodeSetupCode(code);
            expect(decoded.ok, `decode failed for ${code}`).toBe(true);
            expect(decoded.unknown ?? [], `unknown tokens in own code ${code}`).toEqual([]);
            expect(decoded.state!.colorway).toBe(colorway);
            expect(decoded.state!.sort).toBe(sort);

            // Re-encode from the applied patch — must be byte-identical.
            const patch = notifsPatchFromDecodedState(decoded.state!) as PdNotifs;
            const again = encodeSetupCode(decoded.state!.colorway!, decoded.state!.sort!, patch);
            expect(again, `roundtrip drifted: ${code} → ${again}`).toBe(code);

            // The patch resets EVERY envelope flag the code doesn't carry.
            for (const key of SETUP_CODE_FLAG_KEYS) {
                expect(!!(patch as unknown as Record<string, unknown>)[key], `${String(key)} drifted in ${code}`)
                    .toBe(!!(notifs as unknown as Record<string, unknown>)[key]);
            }
            expect(patch.tape).toBe(notifs.tape);
            expect(patch.watchMetric).toBe(notifs.watchMetric);
            expect(patch.pingToasts).toBe(notifs.pingToasts);
            expect(patch.menutape).toBe(notifs.menutape);
            // audience is NOT in the envelope (2026-07-20 — the haunted
            // toggle): a code must never carry or move it.
            expect(patch.audience).toBeUndefined();
            expect(code.includes('NAUD')).toBe(false);
        }
    });

    it('every UI-reachable envelope token has a decode entry (no orphans)', () => {
        // Every encodable token must decode back to the SAME key.
        for (const [key, tok] of Object.entries(_internal.MODE_KEY_TO_TOKEN)) {
            expect(_internal.MODE_TOKEN_TO_KEY[tok!]).toBe(key);
        }
        for (const [key, tok] of Object.entries(_internal.SPELL_KEY_TO_TOKEN)) {
            expect(_internal.SPELL_TOKEN_TO_KEY[tok!]).toBe(key);
        }
        for (const [, tok] of Object.entries(_internal.SORT_TO_TOKEN)) {
            expect(_internal.TOKEN_TO_SORT[tok]).toBeTruthy();
        }
        for (const [, tok] of Object.entries(_internal.COLORWAY_TO_TOKEN)) {
            expect(_internal.TOKEN_TO_COLORWAY[tok]).toBeTruthy();
        }
        for (const [, tok] of Object.entries(_internal.TAPE_TO_TOKEN)) {
            expect(_internal.TOKEN_TO_TAPE[tok]).toBeTruthy();
        }
    });

    it('legacy forms decode: bracketed +V1, ARTS colorway, %∞ stamp', () => {
        const legacy = decodeSetupCode('[‰-ARTS-NASC-NSTK-ZNMD-IDAS-V1]');
        expect(legacy.ok).toBe(true);
        expect(legacy.unknown ?? []).toEqual([]);
        expect(legacy.state!.colorway).toBe('custom'); // ARTS = pre-rename Custom
        expect(legacy.state!.flags.zenMode).toBe(true);
        expect(legacy.state!.sort).toBe('id');

        const misrendered = decodeSetupCode('%∞DARK-CLST-FOG');
        expect(misrendered.ok).toBe(true);
        expect(misrendered.state!.colorway).toBe('dark');
        expect(misrendered.state!.flags.spell_celestial).toBe(true);
        expect(misrendered.state!.sort).toBe('fog');
    });

    it('garbage is rejected; unknown tokens are surfaced, not silently eaten', () => {
        expect(decodeSetupCode('DARK-CLST').ok).toBe(false); // no ‰ stamp
        expect(decodeSetupCode('').ok).toBe(false);
        const r = decodeSetupCode('‰DARK-NOTATOKEN-IDAS');
        expect(r.ok).toBe(true);
        expect(r.unknown).toEqual(['NOTATOKEN']);
    });

    it('lowercase + whitespace-padded pastes decode (share hygiene)', () => {
        const r = decodeSetupCode('  ‰dark-clst-star-fog  ');
        expect(r.ok).toBe(true);
        expect(r.state!.colorway).toBe('dark');
        expect(r.state!.flags.stargazing).toBe(true);
        expect(r.state!.sort).toBe('fog');
    });
});
