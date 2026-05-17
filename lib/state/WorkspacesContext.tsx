'use client';

/*
 * WorkspacesContext
 *
 * Sim refs: 10097-10450 (storage + load/save/delete/restore + dot
 * render + popover + long-press attach + init).
 *
 * Owns the user's saved Setup Code workspaces. Three default workspaces
 * ship out of the box:
 *
 *   1 · Main  — ‰ARTS-IDAS                                      (clean)
 *   2 · Zen   — ‰ARTS-NASC-NSTK-ZNMD-IDAS                       (zen)
 *   3 · Degen — ‰DARK-DGEN-ECHO-HMMR-LENS-SNTM-FDTD-TAPB        (loud, BUG-15: AURA dropped)
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
 * restores (theme/sort/notifs) already handle resume.
 *
 * Default migration (sim 10170-10188 + _OLD_DEFAULT_CODES at 10133-10141):
 * when a default's shipped code changes, the OLD code goes into the
 * migration map so existing users get bumped on next load. Workspaces
 * whose code matches NEITHER current NOR a known previous default are
 * treated as user-customised and left alone.
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
import { useTheme } from './ThemeContext';
import { useSort } from './SortContext';
import { useToast } from './ToastContext';
import {
    decodeSetupCode,
    encodeSetupCode,
    notifsPatchFromDecodedState,
    type DecodedState,
} from './SetupCode';

export interface Workspace {
    id: number;
    name: string;
    code: string;
    isDefault: boolean;
}

export const MAX_WORKSPACES = 10;

const DEFAULT_WORKSPACES: ReadonlyArray<Workspace> = [
    // Sim 10120-10127 — codes are post-v1.0.45 short form.
    { id: 1, name: 'Main',  code: '\u2030ARTS-IDAS', isDefault: true },
    { id: 2, name: 'Zen',   code: '\u2030ARTS-NASC-NSTK-ZNMD-IDAS', isDefault: true },
    // BUG-15 (greenlit 2026-05-05) — AURA dropped from Degen default.
    // Existing users on the with-AURA short-form auto-migrate via the
    // _OLD_DEFAULT_CODES entry below.
    { id: 3, name: 'Degen', code: '\u2030DARK-DGEN-ECHO-HMMR-LENS-SNTM-FDTD-TAPB', isDefault: true },
];

// Sim 10133-10141. When changing a default workspace's shipped code,
// drop the OLD code into this map so existing users migrate automatically.
const OLD_DEFAULT_CODES: Record<number, string[]> = {
    1: ['[\u2030-ARTS-IDAS-V1]'],
    2: [
        '[\u2030-ARTS-NASC-NSTK-ZNMD-ZRCX-IDAS-V1]', // v1.0.34 had ZRCX (removed v1.0.35)
        '[\u2030-ARTS-NASC-NSTK-ZNMD-IDAS-V1]',
    ],
    3: [
        '[\u2030-DARK-AURA-DGEN-ECHO-HMMR-LENS-SNTM-FDTD-TAPB-V1]',
        // BUG-15 (greenlit 2026-05-05) — pre-drop short-form code; existing
        // users on this string get bumped to the new no-AURA default.
        '\u2030DARK-AURA-DGEN-ECHO-HMMR-LENS-SNTM-FDTD-TAPB',
    ],
};

const STORAGE_KEY_LIST   = 'pd_workspaces';
const STORAGE_KEY_ACTIVE = 'pd_active_workspace';

interface WorkspacesContextValue {
    workspaces: Workspace[];
    activeId: number;
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
    const { theme, setTheme } = useTheme();
    const { sort, setSort } = useSort();
    const { showToast } = useToast();

    const [workspaces, setWorkspaces] = useState<Workspace[]>(() => freshDefaults());
    const [activeId, setActiveId] = useState<number>(1);

    // Hydrate once on mount. Sim 10147-10168.
    useEffect(() => {
        let next: Workspace[];
        try {
            const saved = localStorage.getItem(STORAGE_KEY_LIST);
            if (saved) {
                const parsed = JSON.parse(saved) as unknown;
                if (Array.isArray(parsed) && parsed.length > 0) {
                    next = parsed as Workspace[];
                } else {
                    next = freshDefaults();
                }
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

        let activeFromStorage = 1;
        try {
            const a = localStorage.getItem(STORAGE_KEY_ACTIVE);
            if (a) activeFromStorage = parseInt(a, 10) || 1;
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
            localStorage.setItem(STORAGE_KEY_ACTIVE, String(activeId));
        } catch {
            /* ignore */
        }
    }, [workspaces, activeId]);

    const currentCode = useMemo(
        () => encodeSetupCode(theme, sort, notifs),
        [theme, sort, notifs]
    );

    /**
     * Apply a decoded state to live UI. Sim 9894-9978.
     *
     * Order matters:
     *   1. Reset every encoded flag to false (so switching codes drops
     *      previously-on flags) — handled by notifsPatchFromDecodedState.
     *   2. Theme via ThemeContext.setTheme (writes CSS vars + localStorage).
     *   3. Sort via SortContext.setSort.
     *   4. PdNotifs patch — single update() call, batched.
     *
     * Step 4 in sim also re-attaches body classes for modes/spells; in
     * the React port that's already handled reactively by useBodyClass()
     * once notifs change.
     */
    const applyDecodedState = useCallback(
        (state: DecodedState) => {
            if (state.theme) setTheme(state.theme);
            else setTheme('artist'); // default — ensures theme resets on every workspace load
            if (state.sort)  setSort(state.sort);
            const patch = notifsPatchFromDecodedState(state);
            updateNotifs(patch);
        },
        [setTheme, setSort, updateNotifs]
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
            showToast(ws.name.toUpperCase());
        },
        [workspaces, applyDecodedState, showToast]
    );

    const saveCurrentToWorkspace = useCallback(
        (id: number) => {
            const ws = workspaces.find((w) => w.id === id);
            if (!ws) return;
            const code = encodeSetupCode(theme, sort, notifs);
            setWorkspaces((prev) =>
                prev.map((w) => (w.id === id ? { ...w, code } : w))
            );
            setActiveId(id);
            showToast('SAVED TO ' + ws.name.toUpperCase());
        },
        [workspaces, theme, sort, notifs, showToast]
    );

    const saveCurrentAsNewWorkspace = useCallback(
        (name: string) => {
            if (workspaces.length >= MAX_WORKSPACES) {
                showToast('Workspace cap reached');
                return;
            }
            const code = encodeSetupCode(theme, sort, notifs);
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
        [workspaces, theme, sort, notifs, showToast]
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
            const ws = workspaces.find((w) => w.id === id);
            if (!ws || ws.isDefault) return;
            const next = workspaces.filter((w) => w.id !== id);
            setWorkspaces(next);
            // If this was the active workspace, fall back to the first
            // remaining and load its state (sim 10262-10269).
            if (activeId === id && next.length > 0) {
                const fallback = next[0];
                const parsed = decodeSetupCode(fallback.code);
                if (parsed.ok && parsed.state) {
                    setActiveId(fallback.id);
                    applyDecodedState(parsed.state);
                }
            }
            showToast('DELETED');
        },
        [workspaces, activeId, applyDecodedState, showToast]
    );

    const applyCode = useCallback(
        (raw: string): boolean => {
            const parsed = decodeSetupCode(raw);
            if (!parsed.ok || !parsed.state) {
                showToast('Invalid Setup Code');
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
