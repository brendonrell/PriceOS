'use client';

/*
 * TailBubble — an inline speech-bubble card that floats above its trigger with
 * a little tail, reusing the fiat-picker / 3D-pingtoast placement verbatim: a
 * body portal, clamped on-screen, tail (--p3d-tail-dx) aimed back at the pill,
 * dismiss on outside tap / scroll / resize. No screen-dimming backdrop.
 *
 * Lifted out of OutputPreview 2026-07-31 unchanged, so the profile keychain's
 * switcher runs the SAME bubble the "Showcase full. Replace?" card runs rather
 * than a lookalike (Rule #0). Nothing about its behaviour moved with it.
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/* Anchor for a tail-bubble — the trigger pill's viewport top + horizontal
   centre, captured at open. Taken off whatever element carries the handler, so
   a keyboard activation places the bubble exactly like a tap does. */
export type BubbleAnchor = { top: number; cx: number };

export function anchorFromEvent(e: { currentTarget: EventTarget | null }): BubbleAnchor {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { top: r.top, cx: r.left + r.width / 2 };
}

export default function TailBubble({
    anchor,
    className,
    onDismiss,
    children,
    dismissOnScroll = true,
}: {
    anchor: BubbleAnchor;
    className: string;
    onDismiss: () => void;
    children: ReactNode;
    /* The To-Do bubble carries native date/time inputs — an iOS scroll-into-view
       must NOT dismiss it, so it opts out. */
    dismissOnScroll?: boolean;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [layout, setLayout] = useState<{ centerX: number; tailDx: number } | null>(null);

    /* Clamp on-screen once measured, then aim the tail back at the trigger. */
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const half = el.offsetWidth / 2;
        const margin = 8;
        const vw = window.innerWidth;
        const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
        const centerX = clamp(anchor.cx, margin + half, vw - margin - half);
        const tailDx = clamp(anchor.cx - centerX, -(half - 12), half - 12);
        setLayout({ centerX, tailDx });
    }, [anchor]);

    /* An outside tap closes the bubble ONLY — we swallow the trailing click so
       it never falls through to the artwork (or any pill) underneath (Brendon,
       2026-07-23). Same click-swallow the hold-drag engine uses. */
    useEffect(() => {
        const onDown = (e: PointerEvent) => {
            if (ref.current?.contains(e.target as Node)) return;
            const swallow = (ce: Event) => {
                ce.stopPropagation();
                ce.preventDefault();
                window.removeEventListener('click', swallow, true);
            };
            window.addEventListener('click', swallow, true);
            window.setTimeout(() => window.removeEventListener('click', swallow, true), 500);
            onDismiss();
        };
        const dismiss = () => onDismiss();
        document.addEventListener('pointerdown', onDown, true);
        if (dismissOnScroll) window.addEventListener('scroll', dismiss, true);
        window.addEventListener('resize', dismiss);
        return () => {
            document.removeEventListener('pointerdown', onDown, true);
            if (dismissOnScroll) window.removeEventListener('scroll', dismiss, true);
            window.removeEventListener('resize', dismiss);
        };
    }, [onDismiss, dismissOnScroll]);

    if (typeof document === 'undefined') return null;
    return createPortal(
        <div
            ref={ref}
            className={`tail-bubble ${className}`}
            role="dialog"
            aria-modal="true"
            style={{
                position: 'fixed',
                top: anchor.top,
                left: layout?.centerX ?? anchor.cx,
                transform: 'translate(-50%, calc(-100% - 10px))',
                visibility: layout ? 'visible' : 'hidden',
                zIndex: 100000,
                ['--p3d-tail-dx' as string]: `${layout?.tailDx ?? 0}px`,
            } as CSSProperties}
        >
            {children}
        </div>,
        document.body,
    );
}
