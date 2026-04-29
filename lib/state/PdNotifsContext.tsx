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
 * Future Claudes: when a new spell or mode is added, extend the
 * PdNotifs type, the DEFAULTS object, and the body-class mapping in
 * useBodyClass — those three are the contract.
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
    tapeOpen: boolean; // session-only in sim; we persist for simplicity, no harm

    // Connect Menu accordion-open flags (mutually exclusive in practice;
    // the toggle handlers enforce that, not the type)
    notes: boolean;
    todos: boolean;

    // Spell Book toggles. Matches the sim's spell_<name> naming.
    // 19 spells per the Atlas; some are wired, most are stubs that just
    // persist their on/off state for now.
    spell_familiar: boolean;
    spell_cartel: boolean;
    spell_spitebook: boolean;
    spell_gravitydrop: boolean;
    spell_celestial: boolean;
    spell_tribunal: boolean;
    spell_panopticon: boolean;
    spell_invisible: boolean;
    spell_tarot: boolean;
    spell_priceghost: boolean; // Price Memory ghost (= togglePriceMemory)
    spell_portal: boolean;
    spell_cme: boolean; // Solar Flare
    spell_stargazing: boolean;
    spell_offershield: boolean;
    spell_sybilnet: boolean;
    spell_gossip: boolean;
    spell_aura: boolean;
    spell_arbitrage: boolean;
    spell_moodring: boolean;
    spell_pricelens: boolean;
    spell_hammer: boolean; // The Hammer — always last in the row

    // Default sort + view modes
    fogMode: boolean;
    zenMode: boolean;
    redactedMode: boolean;
    sentimentOn: boolean;

    // Top Bar Calendar visibility
    topBarCalendar: boolean;

    // Ping category preferences (MY PINGS panel)
    pings: {
        mints: boolean;
        lists: boolean;
        offers: boolean;
        xfers: boolean;
        mutuals: boolean;
        cooldown: boolean;
    };

    // Misc UI prefs that the sim persists alongside the settings bag
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
    spell_stargazing: false,
    spell_offershield: false,
    spell_sybilnet: false,
    spell_gossip: false,
    spell_aura: false,
    spell_arbitrage: false,
    spell_moodring: false,
    spell_pricelens: false,
    spell_hammer: false,

    fogMode: false,
    zenMode: false,
    redactedMode: false,
    sentimentOn: false,

    topBarCalendar: false,

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

// ── Context ─────────────────────────────────────────────────
interface PdNotifsContextValue {
    notifs: PdNotifs;
    /** Replace the entire notifs object. Rare — prefer `update`. */
    setNotifs: (next: PdNotifs) => void;
    /** Patch one or more fields. Triggers persist + body-class sync. */
    update: (patch: Partial<PdNotifs>) => void;
    /** Toggle a boolean field. Convenience wrapper around update. */
    toggle: (key: keyof PdNotifs) => void;
}

const PdNotifsContext = createContext<PdNotifsContextValue | null>(null);

export function PdNotifsProvider({ children }: { children: ReactNode }) {
    // Start with DEFAULTS to keep SSR + first client paint identical.
    // The pre-hydration script has already applied any saved body
    // classes by this point, so the visual state is correct even
    // before React reads localStorage in the effect below.
    const [notifs, setNotifsState] = useState<PdNotifs>(DEFAULTS);

    // Load from localStorage once on mount (client only).
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                // Merge over defaults so newly-added fields get sensible values
                // when an older saved blob is loaded.
                setNotifsState({ ...DEFAULTS, ...parsed, pings: { ...DEFAULTS.pings, ...(parsed.pings || {}) } });
            }
        } catch {
            // Corrupted blob — fall back to defaults silently.
        }
    }, []);

    // Persist on every change.
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs));
        } catch {
            // Quota / private mode — no-op. State stays in memory.
        }
    }, [notifs]);

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

    const value = useMemo<PdNotifsContextValue>(
        () => ({ notifs, setNotifs, update, toggle }),
        [notifs, setNotifs, update, toggle]
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
