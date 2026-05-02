'use client';

/*
 * ValuePromptModal
 *
 * Renderer for ValuePromptContext. Always rendered inside the provider;
 * visibility is driven by .mounted (display: flex) + .active (opacity 1
 * + slide-up). Decoupling React's "is it in the tree" from CSS's "is it
 * visible" lets the close animation actually run before unmount, which
 * is what sim does (sim line 11529 — drops .active first, then waits
 * 250ms before dropping .mounted).
 *
 * Field state is local: input values live in a useState seeded from the
 * config's `value` defaults. On submit the caller receives the current
 * input strings; on cancel the caller receives null.
 *
 * Enter handling (sim line 11555-11569):
 *   - Enter in field-1 of a 2-field prompt → focus field-2
 *   - Enter in the last field → submit
 * Implemented per-input via onKeyDown (no document-level listener
 * needed in the React version — input refs are stable across renders).
 *
 * Focus + select on open (sim line 11515-11520): timer fires 280ms after
 * mount; matches the 220ms slide-up + a small buffer so the focus lands
 * after the animation has settled. iOS Safari ignores .focus() during
 * a click handler — the delay also covers that.
 */

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import type { ValuePromptConfig } from '../lib/state/ValuePromptContext';

interface Props {
    config: ValuePromptConfig | null;
    onSubmit: (values: string[]) => void;
    onCancel: () => void;
}

const FOCUS_DELAY_MS = 280;
const CLOSE_FADE_MS = 250;

export default function ValuePromptModal({ config, onSubmit, onCancel }: Props) {
    // Two-stage visibility (sim's .mounted/.active pattern). `mounted` is
    // the React-tree presence flag; `active` is the CSS animation flag.
    const [mounted, setMounted] = useState(false);
    const [active, setActive] = useState(false);

    // Input values, seeded from config when it changes.
    const fieldCount = Math.min(config?.fields.length ?? 0, 2);
    const initialValues = useMemo(() => {
        const arr: string[] = [];
        for (let i = 0; i < fieldCount; i++) {
            const f = config!.fields[i];
            arr.push(f.value != null ? String(f.value) : '');
        }
        return arr;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config]);
    const [values, setValues] = useState<string[]>(initialValues);

    const input1Ref = useRef<HTMLInputElement>(null);
    const input2Ref = useRef<HTMLInputElement>(null);

    // Open: when config arrives, mount + rAF-active + reset values + focus.
    useEffect(() => {
        if (!config) return;

        setValues(initialValues);
        setMounted(true);

        // rAF to give the browser a frame to paint .mounted (display:flex
        // + opacity 0) before .active engages the transition.
        const rafId = requestAnimationFrame(() => {
            setActive(true);
        });

        // Focus + select field 1 after slide-up settles.
        const focusTimer = setTimeout(() => {
            const inp = input1Ref.current;
            if (inp) {
                try {
                    inp.focus();
                    inp.select();
                } catch {
                    /* swallow */
                }
            }
        }, FOCUS_DELAY_MS);

        return () => {
            cancelAnimationFrame(rafId);
            clearTimeout(focusTimer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config]);

    // Close: when config goes null while mounted, run the close animation
    // (drop .active immediately; drop .mounted after fade).
    useEffect(() => {
        if (config || !mounted) return;
        setActive(false);
        const t = setTimeout(() => {
            setMounted(false);
        }, CLOSE_FADE_MS);
        return () => clearTimeout(t);
    }, [config, mounted]);

    const updateValue = useCallback((idx: number, v: string) => {
        setValues((prev) => {
            const next = [...prev];
            next[idx] = v;
            return next;
        });
    }, []);

    const handleSubmit = useCallback(() => {
        onSubmit(values.slice(0, fieldCount));
    }, [onSubmit, values, fieldCount]);

    const handleEnter = useCallback(
        (idx: number) => {
            if (idx === 0 && fieldCount > 1) {
                input2Ref.current?.focus();
            } else {
                handleSubmit();
            }
        },
        [fieldCount, handleSubmit]
    );

    // Backdrop click — only fire close when the click target is the wrap
    // itself, not bubbled from inside the box (sim line 11525).
    const handleBackdrop = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) onCancel();
        },
        [onCancel]
    );

    // Render a stable shell so the CSS classes can drive open/close
    // animation on a single DOM element. The inner content is gated on
    // config so we don't keep stale fields visible during fade-out.
    const wrapClass = [
        'value-prompt-wrap',
        mounted ? 'mounted' : '',
        active ? 'active' : '',
    ]
        .filter(Boolean)
        .join(' ');

    // Defensive: if mounted is false and we have no config either, render
    // nothing (saves a hidden node when the prompt has never opened).
    if (!mounted && !config) return null;

    const titleHtml = config?.title ?? '';
    const help = config?.help;
    const submitLabel = config?.submit ?? 'Save';
    const fields = config?.fields ?? [];

    return (
        <div
            className={wrapClass}
            id="valuePromptWrap"
            onClick={handleBackdrop}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="value-prompt-box"
                id="valuePromptBox"
                onClick={(e) => e.stopPropagation()}
            >
                <span
                    className="value-prompt-close-x"
                    onClick={onCancel}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onCancel();
                        }
                    }}
                    title="Close"
                >
                    {'\u00D7\uFE0E'}
                </span>
                <div
                    className="value-prompt-title"
                    id="valuePromptLabel"
                    // dangerouslySetInnerHTML mirrors sim's innerHTML usage
                    // (line 11477) so callers can italicise collection
                    // names. Caller controls the string — no user input
                    // is interpolated here.
                    dangerouslySetInnerHTML={{ __html: titleHtml }}
                />
                {help && (
                    <div className="value-prompt-help" id="valuePromptHelp">
                        {help}
                    </div>
                )}

                {fields[0] && (
                    <div className="value-prompt-field" id="valuePromptField1">
                        <div
                            className="value-prompt-field-label"
                            id="valuePromptFieldLabel1"
                        >
                            {fields[0].label}
                        </div>
                        <input
                            ref={input1Ref}
                            className="value-prompt-input"
                            id="valuePromptInput1"
                            type="text"
                            autoComplete="off"
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck={false}
                            enterKeyHint={fieldCount > 1 ? 'next' : 'done'}
                            inputMode={fields[0].inputmode ?? 'text'}
                            placeholder={fields[0].placeholder ?? ''}
                            value={values[0] ?? ''}
                            onChange={(e) => updateValue(0, e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleEnter(0);
                                }
                            }}
                        />
                    </div>
                )}

                {fields[1] && (
                    <div className="value-prompt-field" id="valuePromptField2">
                        <div
                            className="value-prompt-field-label"
                            id="valuePromptFieldLabel2"
                        >
                            {fields[1].label}
                        </div>
                        <input
                            ref={input2Ref}
                            className="value-prompt-input"
                            id="valuePromptInput2"
                            type="text"
                            autoComplete="off"
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck={false}
                            enterKeyHint="done"
                            inputMode={fields[1].inputmode ?? 'text'}
                            placeholder={fields[1].placeholder ?? ''}
                            value={values[1] ?? ''}
                            onChange={(e) => updateValue(1, e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleEnter(1);
                                }
                            }}
                        />
                    </div>
                )}

                <div className="value-prompt-actions">
                    <button
                        type="button"
                        className="value-prompt-btn"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="value-prompt-btn primary"
                        id="valuePromptSubmitBtn"
                        onClick={handleSubmit}
                    >
                        {submitLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
