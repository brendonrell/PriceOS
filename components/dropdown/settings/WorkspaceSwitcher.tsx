'use client';

/*
 * WorkspaceSwitcher — Build 26 D12.
 *
 * Sim refs: 10097-10450 (storage + load/save/delete/restore + dot
 * render + popover + long-press attach + init). Replaces the visual
 * stub shipped in Build 4.
 *
 * Three default workspaces ship out of the box (Main / Zen / Degen).
 * Tapping a dot loads (decode + apply via WorkspacesContext).
 * Long-press opens the popover (SAVE HERE + RESTORE DEFAULT or DELETE).
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
        restoreDefaultWorkspace,
        deleteWorkspace,
    } = useWorkspaces();
    const { showToast } = useToast();
    const { openValuePrompt } = useValuePrompt();
    const { siweAddress } = useAuth();
    const isAuthed = !!siweAddress;

    const [popover, setPopover] = useState<PopoverState | null>(null);
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
            showToast('Workspace cap reached');
            return;
        }
        // Brendon item 13 (chat A) — replace native window.prompt with the
        // app's own ValuePromptModal (same modal as the Anchor / Floor /
        // Calc value prompts). NOT a sim port (sim uses window.prompt at
        // 10288), but Brendon explicitly greenlit the swap because the
        // native prompt is jarring inside an otherwise theme-cohesive UI.
        // openValuePrompt seeds an empty input, slides up the bottom sheet,
        // focuses field 1 after the 280ms transition, and routes Enter →
        // submit / Esc → cancel via the same handlers the Anchor flow uses.
        openValuePrompt({
            title: 'Name Your Workspace',
            help: 'Saves the current Setup Code to a new workspace dot.',
            fields: [
                {
                    label: 'NAME',
                    placeholder: 'My Workspace',
                    inputmode: 'text',
                },
            ],
            submit: 'Save',
            onSubmit: (vals) => {
                if (!vals) return; // cancel / backdrop close
                const trimmed = vals[0]?.trim();
                if (trimmed) {
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
                className={`workspace-switcher${isAuthed ? '' : ' auth-gated'}`}
                id="workspace-switcher"
                role="tablist"
                aria-label="Workspaces"
            >
                {workspaces.map((w) => (
                    <WorkspaceDot
                        key={w.id}
                        workspace={w}
                        active={w.id === activeId}
                        onTap={() => {
                            loadWorkspace(w.id);
                            showToast(w.name.toUpperCase());
                        }}
                        onLongPress={(rect) => {
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
                            showToast('SAVED TO ' + ws.name.toUpperCase());
                            closePopover();
                        }}
                    >
                        SAVE HERE
                    </div>
                    {ws.isDefault ? (
                        <div
                            className="ws-popover-item"
                            onClick={(e) => {
                                e.stopPropagation();
                                restoreDefaultWorkspace(ws.id);
                                showToast('RESTORED');
                                closePopover();
                            }}
                        >
                            RESTORE DEFAULT
                        </div>
                    ) : (
                        <div
                            className="ws-popover-item danger"
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteWorkspace(ws.id);
                                showToast('DELETED');
                                closePopover();
                            }}
                        >
                            DELETE
                        </div>
                    )}
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
    onTap,
    onLongPress,
}: {
    workspace: Workspace;
    active: boolean;
    onTap: () => void;
    onLongPress: (rect: DOMRect) => void;
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
            if (rect) onLongPress(rect);
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
                onTap();
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={cancel}
            onPointerLeave={cancel}
            onPointerCancel={cancel}
        />
    );
}
