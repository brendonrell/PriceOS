'use client';

/*
 * PdNotifsContext
 *
 * The pdNotifs object is the sim's master settings + UI state bag.
 * Everything that needs to persist across reloads — tape mode, accordion
 * open flags, spell toggles, ping category prefs — lives here.
 *
 * Storage key: 'pd_settings_notifs' (matches the sim verbatim so a user
 * who used the prototype keeps their settings when they hit the React
 * port — same key, same shape).
 *
 * Body classes derived from this state are applied by useBodyClass()
 * inside PriceOSShell. The pre-hydration script in layout.tsx primes
 * the same classes synchronously before React mounts so there's no
 * flash-of-default-state.
 *
 * Accordion mutual exclusion:
 *   The four accordion boxes (Tape/Pings/Todos/Notes) at the bottom of
 *   the Connect Menu are mutually exclusive — opening one closes the
 *   others. The sim enforces this in each accordion's toggle handler.
 *   We expose setAccordion(name, open) here as the single source of
 *   truth for that behavior.
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

// ── Tape modes (matches sim) ────────────────────────────────
// 0 = OFF (default), 1 = Faded (desktop only), 2 = Standard (desktop only),
// 3 = Bold, 4 = Framed (inverted strip). Mobile cycle skips 1 and 2.
export type TapeMode = 0 | 1 | 2 | 3 | 4;

// Menu Tape (the in-dropdown clone) supports a subset: 0, 3, 4.
export type MenuTapeMode = 0 | 3 | 4;

// ── Type ────────────────────────────────────────────────────
export interface PdNotifs {
    // Tape
    tape: TapeMode;
    menutape: MenuTapeMode;
    tapeOpen: boolean; // Tape accordion expanded

    // Connect Menu accordion-open flags. Mutually exclusive in practice;
    // setAccordion() below enforces this.
    notes: boolean;
    todos: boolean;
    // tapeOpen above is the third accordion flag — colocated with tape mode.

    // Spell Book toggles. Matches the sim's spell_<name> naming.
    spell_familiar: boolean;
    spell_cartel: boolean;
    spell_spitebook: boolean;
    spell_gravitydrop: boolean;
    spell_celestial: boolean;
    spell_tribunal: boolean;
    spell_panopticon: boolean;
    spell_invisible: boolean;
    spell_tarot: boolean;
    spell_priceghost: boolean;
    spell_portal: boolean;
    spell_cme: boolean;
    /* F48 — Astral (Identity Plate Export) is its own pdNotifs flag.
       Sim relocates the UI to the PriceSprite modal (sim 4350-4356);
       repo keeps it as a Spell Book pill via lib/data/spells.ts so the
       Setup Code roundtrip (ASTR token, sim 9786) stays whole. No body
       class — sim 9955-9963 _bodyClassMap omits spell_astral. */
    spell_astral: boolean;
    spell_offershield: boolean;
    spell_sybilnet: boolean;
    spell_gossip: boolean;
    spell_aura: boolean;
    spell_arbitrage: boolean;
    spell_moodring: boolean;
    spell_pricelens: boolean;
    spell_hammer: boolean;
    /* F48 — `stargazing` (no spell_ prefix) matches sim 6782 verbatim.
       Drives body.stargazing-mode (sim 9370 / 9960). Pill lives in
       MyPdSection per Brendon's spec; setup-code token STAR maps here
       (sim 9761). The earlier `spell_stargazing` field was a port-time
       slot mismatch — sim never had that key. */
    stargazing: boolean;

    // Default sort + view modes
    fogMode: boolean;
    zenMode: boolean;
    redactedMode: boolean;
    sentimentOn: boolean;

    // Build 24 — anon mode (sim 9499 + 13033). Hides info-line,
    // follow-badge, follower-count, the Network category pill, and
    // artists pill rel filters (mutual/following/followers). Also
    // swaps the ascii-sprite to a redacted block glyph (sim 925-936).
    // Sim has no UI toggle for this yet — flip from console with
    // `window.setAnonMode(true|false)` (debug binding mounted by
    // PdNotifsProvider, mirrors the persona pattern from Build 23).
    anon: boolean;

    // Top Bar Calendar visibility
    topBarCalendar: boolean;

    // Build 26 — additional MY PD mode flags introduced for Setup Code
    // roundtrip parity with sim's _SETUP_MODES table (sim 9746-9764).
    // No UI surface listens to these yet — they're stored so a Setup Code
    // import/export preserves the user's intent across versions. UI wiring
    // for each lands in subsequent passes as the corresponding spell
    // behaviour ships. Sim names kept verbatim (under_score / camel) so the
    // SetupCode mode→pdNotifs key map stays trivially 1:1 for these.
    pure_light: boolean;
    pure_dark: boolean;
    sticker: boolean;       // negative — active = stickers hidden
    echo: boolean;
    zerocontext: boolean;
    asciiId: boolean;       // negative — active = ASCII-ID hidden
    degen: boolean;
    autoscroll: boolean;

    // Ping category preferences (MY PINGS panel)
    pings: {
        mints: boolean;
        lists: boolean;
        offers: boolean;
        xfers: boolean;
        mutuals: boolean;
        cooldown: boolean;
    };

    // Misc UI prefs
    nightmode: boolean;
    priceLogo: boolean;
}

const DEFAULTS: PdNotifs = {
    tape: 0,
    menutape: 0,
    tapeOpen: false,

    notes: false,
    todos: false,

    spell_familiar: false,
    spell_cartel: false,
    spell_spitebook: false,
    spell_gravitydrop: false,
    spell_celestial: false,
    spell_tribunal: false,
    spell_panopticon: false,
    spell_invisible: false,
    spell_tarot: false,
    spell_priceghost: false,
    spell_portal: false,
    spell_cme: false,
    spell_astral: false,
    spell_offershield: false,
    spell_sybilnet: false,
    spell_gossip: false,
    spell_aura: false,
    spell_arbitrage: false,
    spell_moodring: false,
    spell_pricelens: false,
    spell_hammer: false,
    stargazing: false,

    fogMode: false,
    zenMode: false,
    redactedMode: false,
    sentimentOn: false,

    anon: false,

    topBarCalendar: false,

    // Build 26 — Setup Code roundtrip flags (no UI yet, see interface comment).
    pure_light: false,
    pure_dark: false,
    sticker: false,
    echo: false,
    zerocontext: false,
    asciiId: false,
    degen: false,
    autoscroll: false,

    pings: {
        mints: true,
        lists: true,
        offers: true,
        xfers: true,
        mutuals: true,
        cooldown: true,
    },

    nightmode: false,
    priceLogo: false,
};

const STORAGE_KEY = 'pd_settings_notifs';

/* F59 (BUG-26) — Accordion-open flags persist in sessionStorage, not
   localStorage. Sim 5921-5942 + 6092-6099 + 6789-6791 + 7206-7213: the
   three accordion booleans (notes / todos / tapeOpen) live under per-tab
   keys (`pd_notes_open` / `pd_todos_open` / `pd_tape_open`) so they
   reset on a full page reload — opening Notes shouldn't keep Notes open
   forever. Every other pdNotifs key stays in localStorage as before. */
const SESSION_KEYS = ['notes', 'todos', 'tapeOpen'] as const;
const SESSION_STORAGE_KEYS: Record<typeof SESSION_KEYS[number], string> = {
    notes:    'pd_notes_open',
    todos:    'pd_todos_open',
    tapeOpen: 'pd_tape_open',
};

export type AccordionName = 'tape' | 'pings' | 'todos' | 'notes';

interface PdNotifsContextValue {
    notifs: PdNotifs;
    setNotifs: (next: PdNotifs) => void;
    update: (patch: Partial<PdNotifs>) => void;
    toggle: (key: keyof PdNotifs) => void;
    /**
     * Set one of the four accordion boxes open/closed. Opening one
     * automatically closes the others (sim's single-panel rule).
     * Pings doesn't have its own flag because Pings is the default
     * "always shown" accordion in the sim — it's only closed by other
     * accordions opening on top of it.
     */
    setAccordion: (name: AccordionName, open: boolean) => void;
}

const PdNotifsContext = createContext<PdNotifsContextValue | null>(null);

export function PdNotifsProvider({ children }: { children: ReactNode }) {
    const [notifs, setNotifsState] = useState<PdNotifs>(DEFAULTS);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            let next: PdNotifs = DEFAULTS;
            if (raw) {
                const parsed = JSON.parse(raw);
                next = {
                    ...DEFAULTS,
                    ...parsed,
                    pings: { ...DEFAULTS.pings, ...(parsed.pings || {}) },
                };
            }
            /* F59 (BUG-26) — overlay session-scoped accordion flags. Read
               only at hydration; subsequent updates write through the
               persistence effect below. Missing keys → false (closed). */
            try {
                const overlay: Partial<Record<typeof SESSION_KEYS[number], boolean>> = {};
                for (const k of SESSION_KEYS) {
                    overlay[k] = sessionStorage.getItem(SESSION_STORAGE_KEYS[k]) === '1';
                }
                next = { ...next, ...overlay };
            } catch {
                // Private mode / disabled storage — fall through with localStorage values.
            }
            setNotifsState(next);
        } catch {
            // Corrupted blob — fall back to defaults silently.
        }
    }, []);

    useEffect(() => {
        try {
            /* F59 (BUG-26) — strip the three accordion flags from the
               localStorage blob; they ride sessionStorage instead. The
               localStorage envelope keeps the same `pd_settings_notifs`
               key so existing pre-F59 users get their other settings
               carried forward intact. */
            const { notes, todos, tapeOpen, ...rest } = notifs;
            void notes; void todos; void tapeOpen;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
        } catch {
            // Quota / private mode — no-op.
        }
        try {
            sessionStorage.setItem(SESSION_STORAGE_KEYS.notes,    notifs.notes    ? '1' : '0');
            sessionStorage.setItem(SESSION_STORAGE_KEYS.todos,    notifs.todos    ? '1' : '0');
            sessionStorage.setItem(SESSION_STORAGE_KEYS.tapeOpen, notifs.tapeOpen ? '1' : '0');
        } catch {
            // Private mode / disabled — no-op.
        }
    }, [notifs]);

    /* Build 24 — bind `window.setAnonMode(true|false)` for visual QA.
       Sim has no UI toggle for anon yet (it's wired into a Settings
       row that hasn't shipped); console binding mirrors the Build 23
       persona pattern so Brendon can flip the body class from devtools
       and verify all the dependent CSS rules in one go. The store of
       record is still `notifs.anon` — the global just calls update(). */
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const w = window as unknown as { setAnonMode?: (v: boolean) => void };
        w.setAnonMode = (v: boolean) => {
            setNotifsState((prev) => ({ ...prev, anon: !!v }));
        };
        return () => {
            delete w.setAnonMode;
        };
    }, []);

    const setNotifs = useCallback((next: PdNotifs) => {
        setNotifsState(next);
    }, []);

    const update = useCallback((patch: Partial<PdNotifs>) => {
        setNotifsState((prev) => ({ ...prev, ...patch }));
    }, []);

    const toggle = useCallback((key: keyof PdNotifs) => {
        setNotifsState((prev) => {
            const value = prev[key];
            if (typeof value !== 'boolean') return prev;
            return { ...prev, [key]: !value } as PdNotifs;
        });
    }, []);

    const setAccordion = useCallback((name: AccordionName, open: boolean) => {
        setNotifsState((prev) => {
            // Closing — just flip the named one off.
            if (!open) {
                if (name === 'tape')  return { ...prev, tapeOpen: false };
                if (name === 'todos') return { ...prev, todos: false };
                if (name === 'notes') return { ...prev, notes: false };
                // 'pings' has no boolean — it's the implicit default.
                return prev;
            }
            // Opening — flip ALL accordions off, then open the named one.
            const cleared = { ...prev, tapeOpen: false, todos: false, notes: false };
            if (name === 'tape')  return { ...cleared, tapeOpen: true };
            if (name === 'todos') return { ...cleared, todos: true };
            if (name === 'notes') return { ...cleared, notes: true };
            // 'pings' opens by closing the others.
            return cleared;
        });
    }, []);

    const value = useMemo<PdNotifsContextValue>(
        () => ({ notifs, setNotifs, update, toggle, setAccordion }),
        [notifs, setNotifs, update, toggle, setAccordion]
    );

    return <PdNotifsContext.Provider value={value}>{children}</PdNotifsContext.Provider>;
}

export function usePdNotifs(): PdNotifsContextValue {
    const ctx = useContext(PdNotifsContext);
    if (!ctx) {
        throw new Error('usePdNotifs must be used inside <PdNotifsProvider>');
    }
    return ctx;
}
