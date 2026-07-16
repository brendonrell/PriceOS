'use client';

/*
 * WorkspaceSwitcher — Build 26 D12.
 *
 * Sim refs: 10097-10450 (storage + load/save/delete/restore + dot
 * render + popover + long-press attach + init). Replaces the visual
 * stub shipped in Build 4.
 *
 * Two default workspaces ship out of the box (Main / Zen — Degen
 * retired 2026-06-12). Tapping a dot loads (decode + apply via
 * WorkspacesContext). The dot popover (SAVE HERE + RESTORE DEFAULT +
 * DELETE) opens three ways (Brendon 2026-06-12 — long-press alone was
 * invisible, "there's no way to delete"):
 *   1. the trailing ⋯ manage toggle — while on, tapping a dot opens its
 *      popover instead of loading (the visible, discoverable path);
 *   2. right-click on a dot (desktop);
 *   3. long-press on a dot (the original sim gesture, kept).
 * Trailing + creates a new workspace from the current state, prompts
 * for a name, capped at 10 — beyond that the + fades and tap toasts.
 *
 * Long-press mechanics (sim 10273-10314):
 *   - pointerdown starts a 500ms timer
 *   - 8px movement tolerance — pointermove past 8px cancels
 *   - pointerup / pointerleave / pointercancel cancel
 *   - capture-phase click handler suppresses the click that would
 *     otherwise fire after the long-press completes (which would
 *     load the workspace immediately after opening its popover)
 *
 * stopPropagation on every click (sim 10396-10410): the document-level
 * outside-click handler that closes the user dropdown checks
 * .contains(e.target) — but loadWorkspace synchronously rebuilds the
 * dot list, detaching the clicked dot before the bubble reaches
 * document. Without stopPropagation the entire dropdown closes.
 *
 * Outside-click dismissal of the popover has a 100ms grace period
 * after open (sim 10374-10379) so the click that completes the
 * long-press doesn't fire immediate dismissal.
 */

import { useEffect, useRef, useState } from 'react';
import { MAX_WORKSPACES, useWorkspaces, type Workspace } from '../../../lib/state/WorkspacesContext';
import { SPACES } from '../../../lib/state/workspaceDefaults';
import { useToast } from '../../../lib/state/ToastContext';
import { useValuePrompt } from '../../../lib/state/ValuePromptContext';
import { useAuth } from '../../../lib/state/AuthContext';

interface PopoverState {
    wsId: number;
    rect: DOMRect;
}

export function WorkspaceSwitcher() {
    const {
        workspaces,
        activeId,
        loadWorkspace,
        saveCurrentToWorkspace,
        saveCurrentAsNewWorkspace,
        createWorkspaceFromCode,
        restoreDefaultWorkspace,
        deleteWorkspace,
    } = useWorkspaces();
    const { showToast } = useToast();
    const { openValuePrompt } = useValuePrompt();
    const { siweAddress } = useAuth();
    const isAuthed = !!siweAddress;

    const [popover, setPopover] = useState<PopoverState | null>(null);
    const [managing, setManaging] = useState(false);
    const justOpenedRef = useRef(false);

    // Outside-click dismissal — 100ms grace via justOpenedRef.
    useEffect(() => {
        if (!popover) return;
        const onClick = (e: MouseEvent) => {
            if (justOpenedRef.current) return;
            const popEl = document.getElementById('ws-popover-active');
            if (popEl && !popEl.contains(e.target as Node)) {
                setPopover(null);
            }
        };
        document.addEventListener('click', onClick, true);
        return () => document.removeEventListener('click', onClick, true);
    }, [popover]);

    const handleAddClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (workspaces.length >= MAX_WORKSPACES) {
            showToast('Workspaces: CAP REACHED');
            return;
        }
        // Brendon item 13 (chat A) — replace native window.prompt with the
        // app's own ValuePromptModal (same modal as the Anchor / Floor /
        // Calc value prompts). NOT a sim port (sim uses window.prompt at
        // 10288), but Brendon explicitly greenlit the swap because the
        // native prompt is jarring inside an otherwise colorway-cohesive UI.
        // openValuePrompt seeds an empty input, slides up the bottom sheet,
        // focuses field 1 after the 280ms transition, and routes Enter →
        // submit / Esc → cancel via the same handlers the Anchor flow uses.
        // "Spaces" (Brendon, 2026-07-16) — preset picker in the same sheet:
        // CURRENT saves the live Setup Code (the original flow); any Space
        // mints + loads its preset code, prefilling the name (editable).
        openValuePrompt({
            title: 'Name Your Workspace',
            help: 'Saves the current Setup Code to a new workspace dot — or start from a Space.',
            chips: {
                label: 'SPACE',
                options: [
                    { key: 'current', label: 'CURRENT' },
                    ...SPACES.map((s) => ({ key: s.key, label: s.name.toUpperCase(), fill: s.name })),
                ],
                initial: 'current',
            },
            fields: [
                {
                    label: 'NAME',
                    placeholder: 'My Workspace',
                    inputmode: 'text',
                },
            ],
            submit: 'Save',
            onSubmit: (vals, chip) => {
                if (!vals) return; // cancel / backdrop close
                const space = chip && chip !== 'current' ? SPACES.find((s) => s.key === chip) : undefined;
                const trimmed = vals[0]?.trim() || space?.name || '';
                if (!trimmed) return;
                if (space) {
                    createWorkspaceFromCode(trimmed, space.code);
                } else {
                    saveCurrentAsNewWorkspace(trimmed);
                    showToast('SAVED');
                }
            },
        });
    };

    const closePopover = () => setPopover(null);

    const ws = popover ? workspaces.find((w) => w.id === popover.wsId) : undefined;

    return (
        <>
            <div
                className={`workspace-switcher${isAuthed ? '' : ' auth-gated'}${managing ? ' managing' : ''}`}
                id="workspace-switcher"
                role="tablist"
                aria-label="Workspaces"
            >
                {workspaces.map((w) => (
                    <WorkspaceDot
                        key={w.id}
                        workspace={w}
                        active={w.id === activeId}
                        managing={managing}
                        onTap={() => {
                            // loadWorkspace owns the toast (plain name, or a
                            // shipped default's flourish line) — the old
                            // duplicate here was overriding it.
                            loadWorkspace(w.id);
                        }}
                        onOpenMenu={(rect) => {
                            justOpenedRef.current = true;
                            setPopover({ wsId: w.id, rect });
                            // 100ms grace period before outside-click dismissal
                            // — the pointerup that completes the long-press
                            // would otherwise close the popover immediately.
                            setTimeout(() => { justOpenedRef.current = false; }, 100);
                        }}
                    />
                ))}
                <button
                    type="button"
                    className={`ws-add${workspaces.length >= MAX_WORKSPACES ? ' faded' : ''}`}
                    aria-label={
                        workspaces.length >= MAX_WORKSPACES
                            ? 'Workspace cap reached'
                            : 'New workspace'
                    }
                    title={
                        workspaces.length >= MAX_WORKSPACES
                            ? 'Workspace cap reached'
                            : 'New workspace'
                    }
                    onClick={handleAddClick}
                >
                    +
                </button>
                {/* Manage toggle — THE visible path to the dot popover
                    (SAVE HERE / RESTORE DEFAULT / DELETE). While on,
                    tapping a dot edits it instead of loading it. */}
                {workspaces.length > 0 && (
                    <button
                        type="button"
                        className={`ws-manage${managing ? ' on' : ''}`}
                        aria-label="Manage workspaces"
                        aria-pressed={managing}
                        title="Manage workspaces"
                        onClick={(e) => {
                            e.stopPropagation();
                            setPopover(null);
                            setManaging((m) => !m);
                        }}
                    >
                        ⋯
                    </button>
                )}
            </div>

            {popover && ws ? (
                <div
                    className="ws-popover"
                    id="ws-popover-active"
                    style={{
                        left: popover.rect.left + popover.rect.width / 2,
                        bottom: window.innerHeight - popover.rect.top + 8,
                        transform: 'translateX(-50%)',
                    }}
                >
                    <div className="ws-popover-name">{ws.name}</div>
                    <div
                        className="ws-popover-item"
                        onClick={(e) => {
                            e.stopPropagation();
                            saveCurrentToWorkspace(ws.id);
                            showToast('Saved To: ' + ws.name.toUpperCase());
                            closePopover();
                        }}
                    >
                        SAVE HERE
                    </div>
                    {/* Defaults keep RESTORE DEFAULT and are ALSO deletable
                        (Brendon 2026-06-10: defaults are suggestions, not
                        fixtures — a user may run with zero workspaces). */}
                    {ws.isDefault && (
                        <div
                            className="ws-popover-item"
                            onClick={(e) => {
                                e.stopPropagation();
                                restoreDefaultWorkspace(ws.id);
                                closePopover();
                            }}
                        >
                            RESTORE DEFAULT
                        </div>
                    )}
                    <div
                        className="ws-popover-item danger"
                        onClick={(e) => {
                            e.stopPropagation();
                            deleteWorkspace(ws.id);
                            closePopover();
                        }}
                    >
                        DELETE
                    </div>
                </div>
            ) : null}
        </>
    );
}

/* ──────────────────────────────────────────────────────────────
   Dot — pointerdown long-press timer + capture-phase click
   suppressor. Sim 10273-10314.
   ────────────────────────────────────────────────────────────── */
function WorkspaceDot({
    workspace,
    active,
    managing,
    onTap,
    onOpenMenu,
}: {
    workspace: Workspace;
    active: boolean;
    /** Manage mode: tap opens the popover instead of loading. */
    managing: boolean;
    onTap: () => void;
    onOpenMenu: (rect: DOMRect) => void;
}) {
    const btnRef = useRef<HTMLButtonElement | null>(null);
    const timerRef = useRef<number | null>(null);
    const longPressedRef = useRef(false);
    const startRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    const cancel = () => {
        if (timerRef.current !== null) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        longPressedRef.current = false;
        startRef.current = { x: e.clientX, y: e.clientY };
        cancel();
        timerRef.current = window.setTimeout(() => {
            longPressedRef.current = true;
            timerRef.current = null;
            const rect = btnRef.current?.getBoundingClientRect();
            if (rect) onOpenMenu(rect);
        }, 500);
    };

    const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (timerRef.current === null) return;
        const dx = Math.abs(e.clientX - startRef.current.x);
        const dy = Math.abs(e.clientY - startRef.current.y);
        if (dx > 8 || dy > 8) cancel();
    };

    // Capture-phase click handler: when long-press fired, swallow the
    // click that follows pointerup so the dot's normal load handler
    // doesn't run. Sim 10307-10313.
    useEffect(() => {
        const el = btnRef.current;
        if (!el) return;
        const handler = (e: MouseEvent) => {
            if (longPressedRef.current) {
                e.preventDefault();
                e.stopPropagation();
                longPressedRef.current = false;
            }
        };
        el.addEventListener('click', handler, true);
        return () => el.removeEventListener('click', handler, true);
    }, []);

    return (
        <button
            ref={btnRef}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={workspace.name}
            title={workspace.name}
            data-ws-id={workspace.id}
            className={`ws-dot${active ? ' active' : ''}`}
            onClick={(e) => {
                // stopPropagation: the document-level outside-click handler
                // for the user dropdown checks .contains(e.target). Since
                // loadWorkspace synchronously rebuilds the dot list, the
                // clicked dot is detached by the time the bubble reaches
                // document — without this stop, the entire dropdown closes.
                e.stopPropagation();
                if (managing) {
                    const rect = btnRef.current?.getBoundingClientRect();
                    if (rect) onOpenMenu(rect);
                    return;
                }
                onTap();
            }}
            onContextMenu={(e) => {
                // Right-click = the desktop path to the popover (long-press
                // is invisible with a mouse).
                e.preventDefault();
                e.stopPropagation();
                cancel();
                const rect = btnRef.current?.getBoundingClientRect();
                if (rect) onOpenMenu(rect);
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={cancel}
            onPointerLeave={cancel}
            onPointerCancel={cancel}
        />
    );
}
