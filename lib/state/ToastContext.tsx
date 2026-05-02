'use client';

/*
 * ToastContext
 *
 * The Action Toast — sim line 6645's window.showToast(msg). A small fixed
 * bottom-centred pill that fades in for 1.8s then fades out. Used everywhere
 * in sim ('COPIED', 'APPLIED', 'Pinned @snowfro', 'Profile coming soon — …'
 * and so on). Singleton: the most recent showToast() call wins, which
 * matches sim's clearTimeout(window._toastTimeout) behaviour.
 *
 * Behavior parity with sim:
 *   1. Set message text + add .mounted (display: block)
 *   2. Two rAFs later, add .show (opacity 1 + slide-in)
 *   3. After 1800ms, drop .show; 250ms later, drop .mounted
 *
 * The two-rAF dance is what gives the CSS transition a frame to attach to
 * — without it the .show class lands on the same paint as .mounted and
 * the transition is skipped. Sim does the same thing for the same reason.
 *
 * Anyone in the tree can call showToast(). The renderer (<ActionToast />)
 * is mounted once near the root by PriceOSShell.
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

interface ToastState {
    msg: string;
    mounted: boolean;
    show: boolean;
}

interface ToastContextValue {
    showToast: (msg: string) => void;
    /** Read-only snapshot for the renderer. */
    state: ToastState;
}

const ToastCtx = createContext<ToastContextValue | null>(null);

const SHOW_MS = 1800;
const FADE_MS = 250;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<ToastState>({
        msg: '',
        mounted: false,
        show: false,
    });
    const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rafA = useRef<number | null>(null);
    const rafB = useRef<number | null>(null);

    const clearAllTimers = useCallback(() => {
        if (fadeTimer.current !== null) {
            clearTimeout(fadeTimer.current);
            fadeTimer.current = null;
        }
        if (unmountTimer.current !== null) {
            clearTimeout(unmountTimer.current);
            unmountTimer.current = null;
        }
        if (rafA.current !== null) {
            cancelAnimationFrame(rafA.current);
            rafA.current = null;
        }
        if (rafB.current !== null) {
            cancelAnimationFrame(rafB.current);
            rafB.current = null;
        }
    }, []);

    const showToast = useCallback(
        (msg: string) => {
            // Latest call wins — drop any in-flight timers.
            clearAllTimers();

            // Stage 1: mount with text but show: false (CSS opacity 0).
            setState({ msg, mounted: true, show: false });

            // Stage 2 (sim line 6650-6653): two rAFs, then flip .show on so
            // the CSS transition has a frame to engage.
            rafA.current = requestAnimationFrame(() => {
                rafB.current = requestAnimationFrame(() => {
                    setState((prev) => ({ ...prev, show: true }));
                });
            });

            // Stage 3 (sim line 6656-6659): after SHOW_MS, drop .show; after
            // a further FADE_MS, fully unmount.
            fadeTimer.current = setTimeout(() => {
                setState((prev) => ({ ...prev, show: false }));
                unmountTimer.current = setTimeout(() => {
                    setState({ msg: '', mounted: false, show: false });
                }, FADE_MS);
            }, SHOW_MS);
        },
        [clearAllTimers]
    );

    // Cleanup on unmount.
    useEffect(() => {
        return () => clearAllTimers();
    }, [clearAllTimers]);

    const value = useMemo<ToastContextValue>(
        () => ({ showToast, state }),
        [showToast, state]
    );

    return <ToastCtx.Provider value={value}>{children}</ToastCtx.Provider>;
}

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastCtx);
    if (!ctx) {
        throw new Error('useToast must be used inside <ToastProvider>');
    }
    return ctx;
}
