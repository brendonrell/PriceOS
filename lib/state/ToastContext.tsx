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
import { publishToast } from '@/lib/npc/actions';

/** A piece a toast is about — the renderer stacks a row of up to three ASCII
    artifacts above the (unchanged) message text (Brendon, 2026-07-17: "our
    normal ones just extended" · "up to 3 in a row, depending on the ping").
    Null/empty = today's plain pill. */
export interface ToastArt {
    slug: string;
    id: number;
}

/** Hard cap on the artifact row — the pill stays a compact phone card. */
export const TOAST_ART_MAX = 3;

interface ToastState {
    msg: string;
    mounted: boolean;
    show: boolean;
    /** Fade-out transition length (ms) for THIS toast — the renderer applies
        it inline so a single toast can fade slower than the default. */
    fadeMs: number;
    /** Outputs the toast is about (ASCII artifact row, max 3), or null. */
    art: ToastArt[] | null;
    /** Pre-formatted monospace lines drawn in the toast — the Command Stone's
        face on close. Null = no face. */
    face: string[] | null;
    /** A colour the pill paints ITSELF (the stone's recolour toast); the text
        ink is auto-picked for contrast. Null = the normal pill. */
    tint: string | null;
}

interface ToastContextValue {
    /** Show a toast. `holdMs` = fully-visible time before fade (default
        SHOW_MS); `fadeMs` = fade-out length (default FADE_MS). The post-mint
        confirmation passes longer values so it lingers + fades gently.
        `art` names the Output(s) the toast is about — the pill extends upward
        with a row of their ASCII artifacts (first three); the text stays
        byte-identical. */
    showToast: (msg: string, holdMs?: number, fadeMs?: number, art?: ToastArt[] | null, face?: string[] | null, tint?: string | null) => void;
    /** Read-only snapshot for the renderer. */
    state: ToastState;
}

const ToastCtx = createContext<ToastContextValue | null>(null);

/* ⛔ SHOWING A TOAST MUST NOT REDRAW THE GALLERY (Brendon, 2026-08-01).
   The full value carries the live toast snapshot, so every toast — and every
   toast fading out again — re-ran every component holding this context. The
   gallery cards only ever SEND toasts; they never read one. They take this
   send-only handle instead, which never changes identity. */
const ToastSendCtx = createContext<ToastContextValue['showToast'] | null>(null);

const SHOW_MS = 1800;
const FADE_MS = 250;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<ToastState>({
        msg: '',
        mounted: false,
        show: false,
        fadeMs: FADE_MS,
        art: null,
        face: null,
        tint: null,
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
        (msg: string, holdMs: number = SHOW_MS, fadeMs: number = FADE_MS, art: ToastArt[] | null = null, face: string[] | null = null, tint: string | null = null) => {
            // Latest call wins — drop any in-flight timers.
            clearAllTimers();

            // The NPC Cast watches the same screen you do — every toast is an
            // on-screen event they can react to (guarded, fire-and-forget).
            publishToast(msg);

            // Stage 1: mount with text but show: false (CSS opacity 0).
            setState({ msg, mounted: true, show: false, fadeMs, art: art && art.length ? art.slice(0, TOAST_ART_MAX) : null, face: face && face.length ? face : null, tint: tint || null });

            // Stage 2 (sim line 6650-6653): two rAFs, then flip .show on so
            // the CSS transition has a frame to engage.
            rafA.current = requestAnimationFrame(() => {
                rafB.current = requestAnimationFrame(() => {
                    setState((prev) => ({ ...prev, show: true }));
                });
            });

            // Stage 3 (sim line 6656-6659): after holdMs, drop .show; after a
            // further fadeMs (the gentle fade), fully unmount.
            fadeTimer.current = setTimeout(() => {
                setState((prev) => ({ ...prev, show: false }));
                unmountTimer.current = setTimeout(() => {
                    setState({ msg: '', mounted: false, show: false, fadeMs: FADE_MS, art: null, face: null, tint: null });
                }, fadeMs);
            }, holdMs);
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

    return (
        <ToastCtx.Provider value={value}>
            <ToastSendCtx.Provider value={showToast}>{children}</ToastSendCtx.Provider>
        </ToastCtx.Provider>
    );
}

/** Send-only toast handle — see ToastSendCtx above. Stable for the app's life. */
export function useToastSend(): ToastContextValue['showToast'] {
    const ctx = useContext(ToastSendCtx);
    if (!ctx) {
        throw new Error('useToastSend must be used inside <ToastProvider>');
    }
    return ctx;
}

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastCtx);
    if (!ctx) {
        throw new Error('useToast must be used inside <ToastProvider>');
    }
    return ctx;
}
