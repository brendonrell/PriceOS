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
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import ValuePromptModal from '../../components/ValuePromptModal';

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
     * Title of the sheet. Limited HTML allowed for italics on collection
     * names — sim uses `<em>${COLLECTION_TITLE}</em>` in the anchor prompt.
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
}

const ValuePromptCtx = createContext<ValuePromptContextValue | null>(null);

export function ValuePromptProvider({ children }: { children: ReactNode }) {
    const [config, setConfig] = useState<ValuePromptConfig | null>(null);

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
        () => ({ openValuePrompt, closeValuePrompt }),
        [openValuePrompt, closeValuePrompt]
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
