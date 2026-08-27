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
import { readSoundOn, writeSoundOn } from '../../../lib/sound/soundStore';
import { readThemeOn, writeThemeOn } from '../../../lib/sound/themeStore';
import { readTextSize, writeTextSize, nextTextSize, type TextSize } from '../../../lib/textSize/textSizeStore';
import { playSound, unlockSound } from '../../../lib/sound/engine';
import { useLongPress } from '../../../lib/hooks/useLongPress';

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
    /* Delete now runs through the app's usual confirm modal (Brendon,
       2026-07-21) — no silent destructive tap. */
    const [confirm, setConfirm] = useState<{ question: string; onConfirm: () => void } | null>(null);

    // Sound layer key (Brendon, 2026-07-20 — the FINAL icon in this row,
    // after ⋯, two font sizes up). Default OFF; flag lives in soundStore.
    const [soundOn, setSoundOn] = useState(false);
    useEffect(() => {
        setSoundOn(readSoundOn()); // post-mount read — SSR renders off
        const onChange = () => setSoundOn(readSoundOn());
        window.addEventListener('pd:sound-changed', onChange);
        return () => window.removeEventListener('pd:sound-changed', onChange);
    }, []);

    // THEME MUSIC lives on the same key, behind a HOLD (Brendon, 2026-07-31):
    // hold to summon it, hold again to dismiss it. Default OFF, like the blips.
    const [themeOn, setThemeOn] = useState(false);
    useEffect(() => {
        setThemeOn(readThemeOn());
        const onChange = () => setThemeOn(readThemeOn());
        window.addEventListener('pd:theme-changed', onChange);
        return () => window.removeEventListener('pd:theme-changed', onChange);
    }, []);
    const soundHold = useLongPress(() => {
        const next = !readThemeOn();
        unlockSound();          // the hold IS the gesture that unlocks iOS audio
        if (next) writeSoundOn(true); // themes need the sound layer on to be heard
        writeThemeOn(next);
        showToast(next ? 'Theme music: ON' : 'Theme music: OFF');
    });

    // Text size key — Aa, right of sound (Brendon, 2026-08-26). One tap
    // cycles S → M → L → S; the glyph itself grows a step each tap.
    const [textSize, setTextSize] = useState<TextSize>('M');
    useEffect(() => {
        setTextSize(readTextSize()); // post-mount read — SSR renders M
        const onChange = () => setTextSize(readTextSize());
        window.addEventListener('pd:text-size-changed', onChange);
        return () => window.removeEventListener('pd:text-size-changed', onChange);
    }, []);

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
                {/* Sound layer toggle — the row's FINAL key (Brendon's
                    placement lock, 2026-07-20). The tap is the user
                    gesture that unlocks iOS audio; flipping ON ticks so
                    the switch proves itself audibly.
                    HOLD the same key for theme music (Brendon, 2026-07-31) —
                    hold on, hold again off. The hold swallows its own click,
                    so a hold never also flips the blips. */}
                <button
                    type="button"
                    className={`ws-sound${soundOn ? ' on' : ''}`}
                    aria-label="Sound"
                    aria-pressed={soundOn}
                    title={themeOn ? 'Sound · theme music on (hold to turn off)' : 'Sound (hold for theme music)'}
                    {...soundHold}
                    onClick={(e) => {
                        e.stopPropagation();
                        const next = !soundOn;
                        unlockSound();
                        writeSoundOn(next);
                        if (next) playSound('tick');
                        showToast(next ? 'Sound: ON' : 'Sound: OFF');
                    }}
                >
                    {'⚟︎'}
                </button>
                {/* Text size key — right of sound (Brendon, 2026-08-26).
                    One tap cycles S → M → L → S; the "Aa" glyph itself
                    renders a step bigger at each size via ws-textsize's
                    size modifier classes. */}
                <button
                    type="button"
                    className={`ws-textsize ws-textsize-${textSize.toLowerCase()}`}
                    aria-label="Text size"
                    title={`Text size: ${textSize} (tap to cycle)`}
                    onClick={(e) => {
                        e.stopPropagation();
                        const next = nextTextSize(textSize);
                        writeTextSize(next);
                        showToast(`Text size: ${next}`);
                    }}
                >
                    Aa
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
                            const id = ws.id;
                            const name = ws.name;
                            closePopover();
                            setConfirm({
                                question: `Delete workspace “${name}”?`,
                                onConfirm: () => deleteWorkspace(id),
                            });
                        }}
                    >
                        DELETE
                    </div>
                </div>
            ) : null}

            {confirm && (
                <div
                    className="starred-confirm-overlay"
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setConfirm(null)}
                >
                    <div className="ms-confirm-card is-centered" onClick={(e) => e.stopPropagation()}>
                        <div className="ms-confirm-question">{confirm.question}</div>
                        <div className="ms-confirm-btns">
                            <button
                                className="ms-confirm-btn ms-confirm-btn--cancel"
                                onClick={() => setConfirm(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="ms-confirm-btn ms-confirm-btn--ok"
                                onClick={() => { confirm.onConfirm(); setConfirm(null); }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
