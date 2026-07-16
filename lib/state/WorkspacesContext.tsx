'use client';

/*
 * WorkspacesContext
 *
 * Sim refs: 10097-10450 (storage + load/save/delete/restore + dot
 * render + popover + long-press attach + init).
 *
 * Owns the user's saved Setup Code workspaces. SIX defaults ship out of
 * the box — Main · Zen · Observatory · The Floor · Museum · The Village
 * (the shipped set, codes, personas, top-bar rule, and load flourishes all
 * live in lib/state/workspaceDefaults.ts — 2026-07-16 wow pass; Degen
 * stays RETIRED, its promised replacements arrived).
 *
 * Tapping a dot loads (decode + apply via applySetupCodeState). Long-press
 * opens the popover; trailing + creates a new workspace from current state.
 * Capped at 10 — beyond that the + fades and tap toasts.
 *
 * Storage:
 *   localStorage.pd_workspaces        → JSON [{id, name, code, isDefault}]
 *   localStorage.pd_active_workspace  → numeric id
 *
 * State drift: per sim's note (line 7628 changelog), changing settings
 * after loading a workspace silently diverges live state from the
 * workspace's saved code. The Setup Code field tracks live; the workspace
 * stays at its snapshot until explicitly re-saved via SAVE HERE. Init
 * does NOT auto-apply the active workspace's code — other localStorage
 * restores (colorway/sort/notifs) already handle resume.
 *
 * Default migration (sim 10170-10188 + _OLD_DEFAULT_CODES at 10133-10141):
 * when a default's shipped code changes, the OLD code goes into the
 * migration map so existing users get bumped on next load. Workspaces
 * whose code matches NEITHER current NOR a known previous default are
 * treated as user-customised and left alone. NEW shipped defaults reach
 * existing users via the seed-version pass (workspaceDefaults.ts): hydrate
 * appends missing shipped ids ONCE per DEFAULTS_SEED_VERSION, so deleting
 * one afterwards sticks.
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { usePdNotifs } from './PdNotifsContext';
import { useColorway } from './ColorwayContext';
import { useSort } from './SortContext';
import { useToast } from './ToastContext';
import {
    decodeSetupCode,
    encodeSetupCode,
    notifsPatchFromDecodedState,
    type DecodedState,
} from './SetupCode';
import {
    SHIPPED_WORKSPACES,
    DEFAULT_LOAD_TOASTS,
    DEFAULTS_SEED_VERSION,
    DEFAULTS_SEED_KEY,
    WORKSPACE_SEED_VERSION,
} from './workspaceDefaults';

export interface Workspace {
    id: number;
    name: string;
    code: string;
    isDefault: boolean;
}

export const MAX_WORKSPACES = 10;

// The shipped set (Main · Zen · Observatory · The Floor · Museum · The
// Village) lives in workspaceDefaults.ts — pure data, testable, and the
// top-bar rule is documented there.
const DEFAULT_WORKSPACES: ReadonlyArray<Workspace> = SHIPPED_WORKSPACES;

// Sim 10133-10141. When changing a default workspace's shipped code,
// drop the OLD code into this map so existing users migrate automatically.
const OLD_DEFAULT_CODES: Record<number, string[]> = {
    1: ['[\u2030-ARTS-IDAS-V1]', '\u2030ARTS-IDAS'],
    2: [
        '[\u2030-ARTS-NASC-NSTK-ZNMD-ZRCX-IDAS-V1]', // v1.0.34 had ZRCX (removed v1.0.35)
        '[\u2030-ARTS-NASC-NSTK-ZNMD-IDAS-V1]',
        '\u2030ARTS-NASC-NSTK-ZNMD-IDAS', // pre-blue Zen (colour added 2026-06-12)
    ],
};

// Degen RETIRED as a shipped default (Brendon 2026-06-12 — a new default
// replaces it later). Hydrate REMOVES a stored Degen whose code still
// matches any shipped/migrated form of the default; a user-customised
// Degen (re-saved with their own code) is the user's and is left alone.
const RETIRED_DEFAULT_CODES: Record<number, string[]> = {
    3: [
        '\u2030DARK-DGEN-ECHO-HMMR-LENS-SNTM-FDTD-TAPB',
        '[\u2030-DARK-AURA-DGEN-ECHO-HMMR-LENS-SNTM-FDTD-TAPB-V1]',
        '\u2030DARK-AURA-DGEN-ECHO-HMMR-LENS-SNTM-FDTD-TAPB', // pre-BUG-15 form
    ],
};

const STORAGE_KEY_LIST   = 'pd_workspaces';
const STORAGE_KEY_ACTIVE = 'pd_active_workspace';

interface WorkspacesContextValue {
    workspaces: Workspace[];
    /** Null when the user has deleted every workspace (all of them are
        deletable, defaults included — they're suggestions). */
    activeId: number | null;
    /** Live-encoded current state — what the Setup Code field shows. */
    currentCode: string;
    loadWorkspace: (id: number) => void;
    saveCurrentToWorkspace: (id: number) => void;
    saveCurrentAsNewWorkspace: (name: string) => void;
    restoreDefaultWorkspace: (id: number) => void;
    deleteWorkspace: (id: number) => void;
    /** Apply an arbitrary Setup Code (paste path from the field). */
    applyCode: (raw: string) => boolean;
}

const WorkspacesContext = createContext<WorkspacesContextValue | null>(null);

/** Deep-clone the defaults array so callers can't mutate the const. */
function freshDefaults(): Workspace[] {
    return DEFAULT_WORKSPACES.map((w) => ({ ...w }));
}

export function WorkspacesProvider({ children }: { children: ReactNode }) {
    const { notifs, update: updateNotifs } = usePdNotifs();
    const { colorway, setColorway } = useColorway();
    const { sort, setSort } = useSort();
    const { showToast } = useToast();

    const [workspaces, setWorkspaces] = useState<Workspace[]>(() => freshDefaults());
    const [activeId, setActiveId] = useState<number | null>(1);

    // Hydrate once on mount. Sim 10147-10168.
    useEffect(() => {
        let next: Workspace[];
        try {
            const saved = localStorage.getItem(STORAGE_KEY_LIST);
            if (saved) {
                const parsed = JSON.parse(saved) as unknown;
                // An EMPTY saved array is a legitimate state — the user
                // deleted every workspace (defaults included). Only a
                // missing/corrupt key reseeds the default suggestions.
                next = Array.isArray(parsed)
                    ? (parsed as Workspace[])
                    : freshDefaults();
            } else {
                next = freshDefaults();
            }
        } catch {
            next = freshDefaults();
        }

        // Default migration — bump any default whose code matches a known
        // previous default to the current default code/name (sim 10170-10188).
        let migrated = false;
        for (const ws of next) {
            if (!ws.isDefault) continue;
            const def = DEFAULT_WORKSPACES.find((d) => d.id === ws.id);
            if (!def) continue;
            if (ws.code === def.code) continue;
            const oldCodes = OLD_DEFAULT_CODES[ws.id] || [];
            if (oldCodes.includes(ws.code)) {
                ws.code = def.code;
                if (def.name && ws.name !== def.name) ws.name = def.name;
                migrated = true;
            }
        }

        // Retired defaults — drop any stored default whose code still matches
        // a retired shipped default (Degen, 2026-06-12). A customised code
        // doesn't match, so the user's own re-saved version survives.
        const beforeRetire = next.length;
        next = next.filter((ws) => {
            if (!ws.isDefault) return true;
            const retired = RETIRED_DEFAULT_CODES[ws.id];
            return !(retired && retired.includes(ws.code));
        });
        if (next.length !== beforeRetire) migrated = true;

        // Seed-version pass — NEW shipped defaults reach EXISTING users
        // exactly once per DEFAULTS_SEED_VERSION (2026-07-16: Observatory ·
        // The Floor · Museum · The Village). An unstamped user counts as
        // version 1 (the Main/Zen baseline) so v1 ids are never re-injected —
        // old deletions of Main/Zen stick, and deleting a seeded default
        // afterwards sticks too (the stamp stops it coming back). Cap-aware.
        try {
            const seeded = Math.max(1, parseInt(localStorage.getItem(DEFAULTS_SEED_KEY) ?? '1', 10) || 1);
            if (seeded < DEFAULTS_SEED_VERSION) {
                for (const def of DEFAULT_WORKSPACES) {
                    if (next.length >= MAX_WORKSPACES) break;
                    if ((WORKSPACE_SEED_VERSION[def.id] ?? 1) <= seeded) continue;
                    if (!next.some((w) => w.id === def.id)) {
                        next.push({ ...def });
                        migrated = true;
                    }
                }
                localStorage.setItem(DEFAULTS_SEED_KEY, String(DEFAULTS_SEED_VERSION));
            }
        } catch {
            /* ignore */
        }

        let activeFromStorage: number | null = next.length > 0 ? next[0].id : null;
        try {
            const a = localStorage.getItem(STORAGE_KEY_ACTIVE);
            if (a) {
                const n = parseInt(a, 10);
                // Honor a saved id only if that workspace still exists;
                // an empty list always hydrates to null.
                if (Number.isFinite(n) && next.some((w) => w.id === n)) {
                    activeFromStorage = n;
                }
            }
        } catch {
            /* ignore */
        }

        setWorkspaces(next);
        setActiveId(activeFromStorage);

        if (migrated) {
            try {
                localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(next));
            } catch {
                /* ignore */
            }
        }
    }, []);

    // Persist on change. Skipped on the very first render so the hydrate
    // effect has a chance to read first.
    const hydratedRef = useRef(false);
    useEffect(() => {
        if (!hydratedRef.current) { hydratedRef.current = true; return; }
        try {
            localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(workspaces));
            if (activeId === null) {
                localStorage.removeItem(STORAGE_KEY_ACTIVE);
            } else {
                localStorage.setItem(STORAGE_KEY_ACTIVE, String(activeId));
            }
        } catch {
            /* ignore */
        }
    }, [workspaces, activeId]);

    const currentCode = useMemo(
        () => encodeSetupCode(colorway, sort, notifs),
        [colorway, sort, notifs]
    );

    /**
     * Apply a decoded state to live UI. Sim 9894-9978.
     *
     * Order matters:
     *   1. Reset every encoded flag to false (so switching codes drops
     *      previously-on flags) — handled by notifsPatchFromDecodedState.
     *   2. Colorway via ColorwayContext.setColorway (writes CSS vars + localStorage).
     *   3. Sort via SortContext.setSort.
     *   4. PdNotifs patch — single update() call, batched.
     *
     * Step 4 in sim also re-attaches body classes for modes/spells; in
     * the React port that's already handled reactively by useBodyClass()
     * once notifs change.
     */
    const applyDecodedState = useCallback(
        (state: DecodedState) => {
            if (state.colorway) setColorway(state.colorway);
            else setColorway('custom'); // default — ensures colorway resets on every workspace load
            if (state.sort)  setSort(state.sort);
            const patch = notifsPatchFromDecodedState(state);
            updateNotifs(patch);
        },
        [setColorway, setSort, updateNotifs]
    );

    const loadWorkspace = useCallback(
        (id: number) => {
            const ws = workspaces.find((w) => w.id === id);
            if (!ws) return;
            const parsed = decodeSetupCode(ws.code);
            if (!parsed.ok || !parsed.state) {
                showToast('Workspace code invalid');
                return;
            }
            setActiveId(id);
            applyDecodedState(parsed.state);
            // The 2026-07-16 personas announce themselves in the cast-toast
            // voice — but only while still wearing their SHIPPED code; a
            // re-saved (customised) default goes back to the plain toast.
            const def = DEFAULT_WORKSPACES.find((d) => d.id === id);
            const flourish =
                ws.isDefault && def && ws.code === def.code
                    ? DEFAULT_LOAD_TOASTS[id]
                    : undefined;
            showToast(flourish ?? `Workspace: ${ws.name.toUpperCase()}`);
        },
        [workspaces, applyDecodedState, showToast]
    );

    const saveCurrentToWorkspace = useCallback(
        (id: number) => {
            const ws = workspaces.find((w) => w.id === id);
            if (!ws) return;
            const code = encodeSetupCode(colorway, sort, notifs);
            setWorkspaces((prev) =>
                prev.map((w) => (w.id === id ? { ...w, code } : w))
            );
            setActiveId(id);
            showToast('Saved To: ' + ws.name.toUpperCase());
        },
        [workspaces, colorway, sort, notifs, showToast]
    );

    const saveCurrentAsNewWorkspace = useCallback(
        (name: string) => {
            if (workspaces.length >= MAX_WORKSPACES) {
                showToast('Workspaces: CAP REACHED');
                return;
            }
            const code = encodeSetupCode(colorway, sort, notifs);
            const newId =
                workspaces.reduce((m, w) => Math.max(m, w.id), 0) + 1;
            const trimmed = (name || 'WS' + newId).slice(0, 24);
            setWorkspaces((prev) => [
                ...prev,
                { id: newId, name: trimmed, code, isDefault: false },
            ]);
            setActiveId(newId);
            showToast('SAVED');
        },
        [workspaces, colorway, sort, notifs, showToast]
    );

    const restoreDefaultWorkspace = useCallback(
        (id: number) => {
            const def = DEFAULT_WORKSPACES.find((d) => d.id === id);
            const ws  = workspaces.find((w) => w.id === id);
            if (!def || !ws) return;
            setWorkspaces((prev) =>
                prev.map((w) =>
                    w.id === id ? { ...w, code: def.code, name: def.name } : w
                )
            );
            // If this was the active workspace, re-apply so the visible
            // state matches the freshly-restored code (sim 10248-10254).
            if (activeId === id) {
                const parsed = decodeSetupCode(def.code);
                if (parsed.ok && parsed.state) applyDecodedState(parsed.state);
            }
            showToast('RESTORED');
        },
        [workspaces, activeId, applyDecodedState, showToast]
    );

    const deleteWorkspace = useCallback(
        (id: number) => {
            /* Defaults are deletable too (Brendon 2026-06-10): the shipped
               workspaces are SUGGESTIONS, not fixtures — a user may end up
               with none at all. The current settings simply stay applied
               when the last workspace goes; the + button starts fresh. */
            const ws = workspaces.find((w) => w.id === id);
            if (!ws) return;
            const next = workspaces.filter((w) => w.id !== id);
            setWorkspaces(next);
            // If this was the active workspace, fall back to the first
            // remaining and load its state (sim 10262-10269). With no
            // remaining workspaces, clear the active id — live settings
            // stay exactly as they are.
            if (activeId === id) {
                if (next.length > 0) {
                    const fallback = next[0];
                    const parsed = decodeSetupCode(fallback.code);
                    if (parsed.ok && parsed.state) {
                        setActiveId(fallback.id);
                        applyDecodedState(parsed.state);
                    }
                } else {
                    setActiveId(null);
                }
            }
            showToast('Workspace: DELETED');
        },
        [workspaces, activeId, applyDecodedState, showToast]
    );

    const applyCode = useCallback(
        (raw: string): boolean => {
            const parsed = decodeSetupCode(raw);
            if (!parsed.ok || !parsed.state) {
                showToast('Setup Code: INVALID');
                return false;
            }
            applyDecodedState(parsed.state);
            showToast('APPLIED');
            return true;
        },
        [applyDecodedState, showToast]
    );

    const value = useMemo<WorkspacesContextValue>(
        () => ({
            workspaces,
            activeId,
            currentCode,
            loadWorkspace,
            saveCurrentToWorkspace,
            saveCurrentAsNewWorkspace,
            restoreDefaultWorkspace,
            deleteWorkspace,
            applyCode,
        }),
        [
            workspaces, activeId, currentCode,
            loadWorkspace, saveCurrentToWorkspace, saveCurrentAsNewWorkspace,
            restoreDefaultWorkspace, deleteWorkspace, applyCode,
        ]
    );

    return (
        <WorkspacesContext.Provider value={value}>
            {children}
        </WorkspacesContext.Provider>
    );
}

export function useWorkspaces(): WorkspacesContextValue {
    const ctx = useContext(WorkspacesContext);
    if (!ctx) {
        throw new Error('useWorkspaces must be used inside <WorkspacesProvider>');
    }
    return ctx;
}
