'use client';

/*
 * ValuePromptContext
 *
 * The Value Prompt — sim line 11471's window.openValuePrompt(config).
 * A reusable bottom-sheet for 1- or 2-field value entry, used in sim by:
 *   - addBudget          (NEW BUDGET — name + ETH)
 *   - openAnchorPrompt   (Your Anchor Price for <em>X</em> — single ETH)
 * Future callers: any 2-field or single-numeric entry that previously
 * would have used native window.prompt() (banned per Brendon's rules).
 *
 * API: useValuePrompt().openValuePrompt({ title, help?, fields, submit?,
 *   onSubmit }) — onSubmit receives a string[] on save, or null on
 *   cancel/backdrop dismiss. Caller does its own validation + toasting.
 *
 * Behaviour parity with sim:
 *   1. Mount with .mounted (display: flex, opacity 0)
 *   2. rAF later add .active (opacity 1 + slide-up)
 *   3. After 280ms (transition + buffer), focus + select field 1
 *   4. Enter in field-1 of a 2-field prompt → focus field 2
 *   5. Enter in the last field → submit
 *   6. Backdrop tap or X → close, fire onSubmit(null)
 *   7. After close-animation (250ms), drop .mounted + clear config
 *
 * Single-instance singleton: opening a second prompt while one is active
 * replaces the first. The first's onSubmit is fired with null first so
 * callers can clean up (matches sim's behaviour — sim's #valuePromptWrap
 * has only one set of input fields).
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
import ValuePromptModal from '../../components/ValuePromptModal';
import { useToast } from './ToastContext';
import { lockBodyScroll, unlockBodyScroll } from './bodyScrollLock';

export interface ValuePromptField {
    label: string;
    /** Pre-filled value (string-coerced for input). */
    value?: string | number;
    placeholder?: string;
    /** iOS keyboard hint. 'decimal' for ETH amounts. */
    inputmode?: 'text' | 'decimal' | 'numeric' | 'tel' | 'email' | 'url';
}

export interface ValuePromptConfig {
    /**
     * Title of the sheet. Limited HTML allowed for italics on project
     * names — sim uses `<em>${PROJECT_TITLE}</em>` in the anchor prompt.
     * Caller is responsible for not interpolating user input.
     */
    title: string;
    /** Optional help text under title. */
    help?: string;
    /** 1 or 2 fields. More than 2 are ignored (matches sim's cap). */
    fields: ValuePromptField[];
    /** Submit button label. Default 'Save'. */
    submit?: string;
    /** Receives string[] on save, null on cancel. */
    onSubmit: (values: string[] | null) => void;
}

interface ValuePromptContextValue {
    openValuePrompt: (config: ValuePromptConfig) => void;
    closeValuePrompt: () => void;
    /**
     * D17 anchor system. Convenience wrapper around openValuePrompt that
     * persists per-key anchor prices to localStorage 'pd_anchors' and
     * dispatches a 'pd:anchors-changed' window event so any consumer
     * (project page, profile page, etc.) can re-stamp deltas + update
     * displays. Sim ref: openAnchorPrompt at sim 11915.
     *
     * Behaviour:
     *   - Pre-fills the bottom sheet with the current saved value (if any).
     *   - Submitting an empty input clears the key.
     *   - Submitting an unchanged value (same as current) ALSO clears the
     *     key — "tap-twice-to-clear" toggle parity with Brendon's spec.
     *   - Invalid input (non-positive / NaN) toasts and does not save.
     *   - Helper toggles body.anchor-active iff any saved anchor > 0
     *     so the body class stays consistent across surfaces.
     */
    openAnchorPrompt: (opts: { key: string; label?: string }) => void;
}

const ValuePromptCtx = createContext<ValuePromptContextValue | null>(null);

export function ValuePromptProvider({ children }: { children: ReactNode }) {
    const [config, setConfig] = useState<ValuePromptConfig | null>(null);
    const { showToast } = useToast();

    const openValuePrompt = useCallback((next: ValuePromptConfig) => {
        // If a prompt is already open, fire its onSubmit(null) before
        // replacing — caller cleanup parity with sim.
        setConfig((prev) => {
            if (prev) {
                try { prev.onSubmit(null); } catch { /* swallow */ }
            }
            return next;
        });
    }, []);

    const closeValuePrompt = useCallback(() => {
        setConfig(null);
    }, []);

    /* G item 10 — body.modal-open while the value prompt is mounted.
       DropdownContext's outside-mousedown handler gates on this class;
       without it, addBudget / openAnchorPrompt / WorkspaceSwitcher's
       Name-prompt close the connect menu when the user taps inside the
       value-prompt sheet. Same pattern as NotePromptContext / ModalContext. */
    useEffect(() => {
        if (!config) return;
        lockBodyScroll();
        return () => unlockBodyScroll();
    }, [config]);

    /* ── D17 anchor helper ──
       Reads pd_anchors from localStorage, opens the value prompt
       prefilled with the current value for the given key, and on save
       writes back + toggles body.anchor-active + dispatches
       'pd:anchors-changed' so listeners can re-stamp deltas. */
    const openAnchorPrompt = useCallback(
        ({ key, label }: { key: string; label?: string }) => {
            // Defensive read — bad JSON or unavailable storage falls back to {}.
            let anchors: Record<string, number> = {};
            try {
                if (typeof window !== 'undefined') {
                    const raw = window.localStorage.getItem('pd_anchors');
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (parsed && typeof parsed === 'object') {
                            anchors = parsed as Record<string, number>;
                        }
                    }
                }
            } catch { /* keep empty */ }

            const cur = anchors[key];
            const curValid =
                typeof cur === 'number' && isFinite(cur) && cur > 0;

            const titleLabel = label ?? key;
            openValuePrompt({
                title: `Your Anchor Price for <em>${titleLabel}</em>`,
                help: curValid
                    ? 'Your personal reference price. Every listing shows a bracketed delta vs this number. Leave blank and save to clear.'
                    : 'Set your personal reference price. Every listing on this project will show a bracketed delta vs this number.',
                fields: [
                    {
                        label: 'ETH',
                        value: curValid ? String(cur) : '',
                        placeholder: '0.05',
                        inputmode: 'decimal',
                    },
                ],
                submit: curValid ? 'Update' : 'Set',
                onSubmit: (vals) => {
                    if (!vals) return; // Cancelled

                    const finalize = (next: Record<string, number>) => {
                        try {
                            if (typeof window !== 'undefined') {
                                window.localStorage.setItem(
                                    'pd_anchors',
                                    JSON.stringify(next)
                                );
                            }
                        } catch { /* swallow */ }
                        if (typeof document !== 'undefined') {
                            const hasAny = Object.values(next).some(
                                (v) =>
                                    typeof v === 'number' &&
                                    isFinite(v) &&
                                    v > 0
                            );
                            document.body.classList.toggle(
                                'anchor-active',
                                hasAny
                            );
                        }
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(
                                new CustomEvent('pd:anchors-changed', {
                                    detail: {
                                        key,
                                        value: next[key] ?? null,
                                    },
                                })
                            );
                        }
                    };

                    const trimmed = (vals[0] || '').trim();

                    // Empty → clear.
                    if (trimmed === '') {
                        const next = { ...anchors };
                        delete next[key];
                        finalize(next);
                        showToast('Anchor: CLEARED');
                        return;
                    }

                    const v = parseFloat(trimmed);
                    if (!(v > 0) || !isFinite(v)) {
                        showToast('Anchor: INVALID PRICE');
                        return;
                    }

                    // Tap-twice-with-same-value → clear.
                    if (curValid && v === cur) {
                        const next = { ...anchors };
                        delete next[key];
                        finalize(next);
                        showToast('Anchor: CLEARED');
                        return;
                    }

                    const next = { ...anchors, [key]: v };
                    finalize(next);
                    showToast(`Anchor: ${v} ETH`);
                },
            });
        },
        [openValuePrompt, showToast]
    );

    /**
     * The modal calls these on user action. submit() fires onSubmit with
     * the values and closes; cancel() fires onSubmit(null) and closes.
     * Modal's own animation logic decides when to actually unmount.
     */
    const handleSubmit = useCallback(
        (values: string[]) => {
            const cb = config?.onSubmit;
            setConfig(null);
            if (cb) {
                try { cb(values); } catch { /* swallow */ }
            }
        },
        [config]
    );

    const handleCancel = useCallback(() => {
        const cb = config?.onSubmit;
        setConfig(null);
        if (cb) {
            try { cb(null); } catch { /* swallow */ }
        }
    }, [config]);

    const value = useMemo<ValuePromptContextValue>(
        () => ({ openValuePrompt, closeValuePrompt, openAnchorPrompt }),
        [openValuePrompt, closeValuePrompt, openAnchorPrompt]
    );

    return (
        <ValuePromptCtx.Provider value={value}>
            {children}
            <ValuePromptModal
                config={config}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
            />
        </ValuePromptCtx.Provider>
    );
}

export function useValuePrompt(): ValuePromptContextValue {
    const ctx = useContext(ValuePromptCtx);
    if (!ctx) {
        throw new Error('useValuePrompt must be used inside <ValuePromptProvider>');
    }
    return ctx;
}
