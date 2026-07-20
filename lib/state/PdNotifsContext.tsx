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
import { pushSettings, USERSTATE_HYDRATED_EVENT } from './userState';

// ── Tape modes (matches sim) ────────────────────────────────
// 0 = OFF (default), 1 = Faded (desktop only), 2 = Standard (desktop only),
// 3 = Bold, 4 = Framed (inverted strip). Mobile cycle skips 1 and 2.
export type TapeMode = 0 | 1 | 2 | 3 | 4;

// Pingtoast mode — how far a ping reaches. Cycled by the Pingtoasts pill in MY
// PINGS: OFF → ON → 3D → COMBO.
//   off   = nothing pops (pings still land silently in the inbox)
//   on    = regular Pingtoasts — in-app toast pop-ups + the connect-icon badge,
//           while PD is open (the no-extra-permission path, great on iOS Safari)
//   3d    = "3D Pingtoasts" — real native OS notifications that reach the lock
//           screen even when PD is closed (opt-in: needs the device's allow-
//           prompt + an installed PWA). No in-app toast — the OS shows it.
//   combo = both at once — in-app toasts AND native notifications.
export type PingToastMode = 'off' | 'on' | '3d' | 'combo';
export const PING_TOAST_CYCLE: PingToastMode[] = ['off', 'on', '3d', 'combo'];

/** True when this mode pops the in-app toast + shows the connect-icon badge. */
export function showsRegularToasts(mode: PingToastMode): boolean {
  return mode === 'on' || mode === 'combo';
}
/** True when this mode delivers native (3D) OS notifications. */
export function showsNativePings(mode: PingToastMode): boolean {
  return mode === '3d' || mode === 'combo';
}

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
    /* NPC — Spell Book pill (on/off) drives the off-screen NPC Cast. */
    spell_npc: boolean;
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
    /* ASCII Art Mode — every artwork surface renders its mint-pinned ASCII
       backup as a real stand-in (Brendon, 2026-07-10). Positive flag. */
    asciiArt: boolean;
    /* Back Button Mode — a persistent back arrow parked under the connect
       menu, site-wide. Not part of the Setup Code (a personal nav pref). */
    backButton: boolean;
    degen: boolean;
    autoscroll: boolean;
    /* Ambient Strip — the LED light bar under the Tape. Off by default;
       toggled from MY PD. When off the strip isn't rendered at all. */
    ambientStrip: boolean;
    /* PD miniplayer — the bottom-right soundtrack device. OFF by default:
       closed = THE DOT; tapping it summons the deck; × collapses and stops
       audio. ⛔ KEY RENAMED from `miniplayer` (2026-07-20): the flag shipped
       default-ON for a few hours and saved bags kept resurrecting the open
       deck over the new OFF default — Brendon's second haunted toggle in a
       day. The rename makes every stale save meaningless; never reuse the
       old key. Not part of the Setup Code (a personal device pref). */
    miniplayerOpen: boolean;
    /* The Watch — a small persistent live-stat chip that floats over every
       page. Off by default; enabled from the Spell Book (took the retired
       Solar Flare slot, 2026-06-14). `watchMetric` is the index into the
       chip's cycle of platform vitals (volume / minted / holders / projects),
       advanced by tapping the chip. */
    watch: boolean;
    watchMetric: number;
    /** The Audience — live per-project viewer presence. ON = you're counted in
     *  and see the "watching now" indicator; OFF = you opt out (no presence
     *  broadcast, indicator hidden for you). Default ON (Brendon, 2026-06-16). */
    audience: boolean;

    // Ping category preferences (MY PINGS panel)
    pings: {
        mints: boolean;
        lists: boolean;
        offers: boolean;
        xfers: boolean;
        mutuals: boolean;
        // Starred-collection pings — movement on the projects / traits / artists
        // you star, plus rarity-tier movement.
        projects: boolean;
        traits: boolean;
        artists: boolean;
        rarity: boolean;
        cooldown: boolean;
    };

    // Misc UI prefs
    nightmode: boolean;
    priceLogo: boolean;
    /* Pingtoasts — how far a ping reaches. OFF (silent inbox) → ON (in-app
       toasts + connect-icon badge) → 3D (native OS notifications, opt-in) →
       COMBO (both). See PingToastMode above. Was a 4-stop off/money/social/all
       cycle (2026-06-14); re-modelled to the notification-reach cycle on
       2026-06-26 when native "3D Pingtoasts" landed. Legacy values map forward
       on load. */
    pingToasts: PingToastMode;
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
    spell_npc: false,
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
    asciiArt: false,
    backButton: false,
    degen: false,
    autoscroll: false,
    ambientStrip: false,
    miniplayerOpen: false,
    watch: false,
    watchMetric: 0,
    audience: true,

    pings: {
        mints: true,
        lists: true,
        offers: true,
        xfers: true,
        mutuals: true,
        artists: true,
        projects: true,
        traits: true,
        rarity: true,
        cooldown: true,
    },

    nightmode: false,
    priceLogo: false,
    /* Pingtoasts default OFF — the feature is buried + opt-in (Brendon,
       2026-06-26). Users turn it on (regular), 3D (native), or COMBO via the
       MY PINGS pill. Legacy stored values map forward on load (hydration). */
    pingToasts: 'off',
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

    /* Read the persisted notifs blob (localStorage) + the session-scoped
       accordion overlay into a complete PdNotifs. Used at mount AND whenever an
       account snapshot hydrates — userState overwrites this same localStorage
       key with the server's `notifs`, so re-reading lets the account win. */
    const readStored = useCallback((): PdNotifs => {
        let next: PdNotifs = DEFAULTS;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                next = {
                    ...DEFAULTS,
                    ...parsed,
                    pings: { ...DEFAULTS.pings, ...(parsed.pings || {}) },
                };
                // Back-compat: pingToasts was a boolean (pre-cycle), then a
                // four-stop off/money/social/all cycle. Map both onto the
                // current off/on/3d/combo model. Money/social/all all popped
                // toasts → the new regular "on". An unknown/missing value lands
                // on the buried default (off — Pingtoasts is opt-in).
                const pt = (next as { pingToasts: unknown }).pingToasts;
                if (typeof pt === 'boolean') {
                    next.pingToasts = pt ? 'on' : 'off';
                } else if (pt === 'money' || pt === 'social' || pt === 'all') {
                    next.pingToasts = 'on';
                } else if (!PING_TOAST_CYCLE.includes(pt as PingToastMode)) {
                    next.pingToasts = 'off';
                }
            }
        } catch {
            // Corrupted blob — fall back to defaults silently.
        }
        /* F59 (BUG-26) — overlay session-scoped accordion flags (notes/todos/
           tapeOpen). Missing keys → false (closed). */
        try {
            const overlay: Partial<Record<typeof SESSION_KEYS[number], boolean>> = {};
            for (const k of SESSION_KEYS) {
                overlay[k] = sessionStorage.getItem(SESSION_STORAGE_KEYS[k]) === '1';
            }
            next = { ...next, ...overlay };
        } catch {
            // Private mode / disabled storage — fall through with localStorage values.
        }
        return next;
    }, []);

    useEffect(() => {
        setNotifsState(readStored());
    }, [readStored]);

    /* Cross-device: when the account snapshot lands (e.g. fresh-device login),
       userState rewrites the notifs cache with the server's copy and fires
       USERSTATE_HYDRATED_EVENT. Re-read so spell toggles — including the Digital
       Familiar on/off — reflect the account, not the device. Server wins. */
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onHydrated = () => setNotifsState(readStored());
        window.addEventListener(USERSTATE_HYDRATED_EVENT, onHydrated);
        return () => window.removeEventListener(USERSTATE_HYDRATED_EVENT, onHydrated);
    }, [readStored]);

    useEffect(() => {
        /* F59 (BUG-26) — strip the three accordion flags from the persisted
           blob; they ride sessionStorage instead. The localStorage envelope
           keeps the same `pd_settings_notifs` key so existing pre-F59 users get
           their other settings carried forward intact. */
        const { notes, todos, tapeOpen, ...rest } = notifs;
        void notes; void todos; void tapeOpen;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
        } catch {
            // Quota / private mode — no-op.
        }
        /* Write-through to the account so spell + ping prefs persist server-side
           and follow the user across devices (Brendon, 2026-06-16: the Digital
           Familiar on/off must live in the DB). Fire-and-forget; no-op until the
           account snapshot has hydrated, so boot defaults can't clobber the row. */
        pushSettings({ notifs: rest as Record<string, unknown> });
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
