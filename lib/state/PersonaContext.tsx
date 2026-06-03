'use client';

/*
 * PersonaContext
 *
 * Sim parity with debugPersona (sim 12015 + 12035). Sim has two persona
 * modes: 'pd' (default — Brendon as the logged-in PD user) and 'default'
 * (a logged-out viewer). Sim flips body.persona-default whenever
 * debugPersona === 'default' (sim 12035), which is read by a handful of
 * CSS rules to hide PD-specific surfaces:
 *   - .stats-row-2  (sim 4107 / globals.css 2090) — Owned/Spent/Anchor
 *   - .t-custom     (sim 61) — artist tab on profile
 *   - .btn-soundtrack (sim 62) — soundtrack button
 *
 * Build 23 wires the body class only; the matching rules already live in
 * globals.css. Switching persona is exposed via window.setDebugPersona
 * (sim 12086 verbatim) since sim itself has no UI button — toggle from
 * the JS console with `setDebugPersona('default')` / `setDebugPersona('pd')`.
 *
 * Persisted to localStorage under 'pd_debug_persona' so the toggle
 * survives reloads. The pre-hydration script in app/layout.tsx reads
 * the same key synchronously to apply the body class before paint —
 * keeps the two in lockstep.
 *
 * Default is 'pd' (Brendon-as-logged-in) per sim 12015 — body.persona-default
 * is OFF by default and stats-row-2 is visible.
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

export type Persona = 'pd' | 'default';

const STORAGE_KEY = 'pd_debug_persona';

interface PersonaContextValue {
    persona: Persona;
    setPersona: (p: Persona) => void;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

function isPersona(v: unknown): v is Persona {
    return v === 'pd' || v === 'default';
}

export function PersonaProvider({ children }: { children: ReactNode }) {
    const [persona, setPersonaState] = useState<Persona>('pd');

    // Hydrate from localStorage. Pre-hydration script applies the class
    // synchronously; this just re-syncs state once React mounts.
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (isPersona(raw)) setPersonaState(raw);
        } catch {
            // Corrupted blob — fall back to default silently.
        }
    }, []);

    // Body class effect — mirrors sim 12035 verbatim.
    useEffect(() => {
        const cl = document.body.classList;
        if (persona === 'default') cl.add('persona-default');
        else cl.remove('persona-default');
    }, [persona]);

    const setPersona = useCallback((p: Persona) => {
        setPersonaState(p);
        try {
            localStorage.setItem(STORAGE_KEY, p);
        } catch {
            // Quota / private mode — no-op.
        }
    }, []);

    /* Sim 12086 verbatim — `window.setDebugPersona` is the canonical
       entry point. Sim has no toggle UI, so console invocation is the
       supported flow. Re-bind on every setPersona identity change so
       the global stays current; clean up on unmount to avoid leaking
       a stale closure if the provider ever remounts. */
    useEffect(() => {
        if (typeof window === 'undefined') return;
        // @ts-expect-error — sim parity, intentional global
        window.setDebugPersona = setPersona;
        return () => {
            // @ts-expect-error — same intentional global
            if (window.setDebugPersona === setPersona) delete window.setDebugPersona;
        };
    }, [setPersona]);

    const value = useMemo<PersonaContextValue>(
        () => ({ persona, setPersona }),
        [persona, setPersona]
    );

    return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function usePersona(): PersonaContextValue {
    const ctx = useContext(PersonaContext);
    if (!ctx) {
        throw new Error('usePersona must be used inside <PersonaProvider>');
    }
    return ctx;
}
