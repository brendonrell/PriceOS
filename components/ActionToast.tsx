'use client';

/*
 * ActionToast
 *
 * Single fixed pill at the bottom of the viewport. Reads state from
 * ToastContext. Sim renders this as <div class="ens-copy-toast"
 * id="actionToast"> at line 4960; we keep both class names so the
 * sim's existing CSS hooks port over verbatim.
 *
 * With-art extension (Brendon, 2026-07-17): a row of an Output's mint-pinned
 * ASCII artifacts (max 3) stacks above the message for piece-about toasts.
 *
 * Recolour tint (Brendon, 2026-07-21): the Command Stone's recolour toast
 * paints the pill the chosen colour, with the ink auto-picked for contrast by
 * the SAME YIQ system the colorways use (resolveTextColor).
 *
 * The wrap rule (Brendon, 2026-07-21, SITE-WIDE): a `Label: action` toast
 * whose single line would overrun the pill drops the WHOLE action to its own
 * row, leaving the label + colon alone on top (the summon-toast shape). Only
 * plain colon-labelled toasts wrap; art / face / tint toasts are untouched.
 */

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useToast } from '../lib/state/ToastContext';
import { resolveTextColor } from '../lib/state/ColorwayContext';
import AsciiArtImage from './AsciiArtImage';

/* One shared canvas measures a toast's single line in its REAL font, so the
   wrap decision needs no DOM pass (no flicker). */
let _measureCtx: CanvasRenderingContext2D | null = null;
function oneLineFits(text: string): boolean {
    if (typeof window === 'undefined' || typeof document === 'undefined') return true;
    if (!_measureCtx) _measureCtx = document.createElement('canvas').getContext('2d');
    if (!_measureCtx) return true;
    _measureCtx.font = "bold 12px 'Courier New', Courier, monospace";
    const w = _measureCtx.measureText(text).width;
    const budget = Math.min(window.innerWidth * 0.86, 330) - 34; // pill max − padding
    return w <= budget;
}

/* The mini*player*™ wordmark — the ONLY toast token drawn with markup: the
   "player" half renders italic and the ™ rides every mention (Brendon's
   word-lock, 2026-07-22; ™ on every toast mention, 2026-07-28). TOASTS ONLY —
   every other toast string passes through plain. */
function withWordmark(text: string, hasOwnTm = false): ReactNode {
    if (!text.includes('miniplayer')) return text;
    return text.split(/(miniplayer)/).map((seg, i) =>
        seg === 'miniplayer'
            ? <span key={i}>mini<span style={{ fontStyle: 'italic' }}>player</span>{hasOwnTm ? null : '™'}</span>
            : seg,
    );
}

export default function ActionToast() {
    const { state } = useToast();
    /* Artifact misses, keyed per piece so a miss on one toast never mutes the
       art on the next (the singleton pill re-renders in place). */
    const [missed, setMissed] = useState<ReadonlySet<string>>(() => new Set());
    const pieces = (state.art ?? []).filter(
        (a) => !missed.has(`${a.slug}:${a.id}`),
    );
    const showArt = pieces.length > 0;
    /* One piece rides big; a row of three shares the card width. */
    const artMax = pieces.length === 1 ? 110 : pieces.length === 2 ? 94 : 68;

    /* The Command Stone's face — monospace lines drawn in the toast on close. */
    const face = state.face ?? null;
    const showFace = !!face && face.length > 0;

    /* The recolour toast — the pill wears the chosen colour. */
    const tint = state.tint ?? null;

    /* The wrap rule — split a `Label: action` toast onto two rows ONLY when its
       single line would overrun the pill. Skipped for art / face / tint. */
    /* ⛔ A TOAST MAY CARRY A HINT ROW (Brendon, 2026-08-02: the Group toast says
       what it landed on, and the row under it says there is more behind a
       long-press). Anything after a newline is that second row — full-strength
       and 12px like the rest of the toast, never whisper text (Rule #2). */
    const [headline, hint] = useMemo(() => {
        const nl = state.msg.indexOf('\n');
        return nl < 0
            ? [state.msg, null as string | null]
            : [state.msg.slice(0, nl), state.msg.slice(nl + 1)];
    }, [state.msg]);

    const labelSplit = useMemo(() => {
        if (showArt || showFace || tint) return null;
        const i = headline.indexOf(': ');
        if (i <= 0 || i >= headline.length - 2) return null;
        const label = headline.slice(0, i);
        const action = headline.slice(i + 2);
        if (oneLineFits(`${label}: ${action}`)) return null;
        return { label, action };
    }, [headline, showArt, showFace, tint]);

    const cls = [
        'ens-copy-toast',
        state.mounted ? 'mounted' : '',
        state.show ? 'show' : '',
        showArt ? 'with-art' : '',
        showFace ? 'with-face' : '',
        tint ? 'with-tint' : '',
        labelSplit ? 'stacked' : '',
        hint ? 'with-hint' : '',
    ]
        .filter(Boolean)
        .join(' ');

    /* A toast that already writes its own ™ (the MODE face toast) keeps it
       exactly where it is — the wordmark's ™ stands down so only one shows. */
    const ownTm = headline.includes('™');

    const style: CSSProperties = { transitionDuration: `${state.fadeMs}ms` };
    if (tint) {
        style.background = tint;
        style.color = resolveTextColor(tint);
    }

    return (
        <div
            className={cls}
            id="actionToast"
            aria-live="polite"
            aria-atomic="true"
            style={style}
        >
            {showFace && <pre className="toast-face">{face.join('\n')}</pre>}
            {showArt && (
                <div className="toast-art-row">
                    {pieces.map((a) => {
                        const k = `${a.slug}:${a.id}`;
                        return (
                            <AsciiArtImage
                                key={k}
                                slug={a.slug}
                                id={a.id}
                                widthPx={220}
                                className="toast-ascii-art"
                                style={{ width: 'auto', height: 'auto', maxWidth: artMax, maxHeight: artMax }}
                                onMiss={() => setMissed((prev) => new Set(prev).add(k))}
                            />
                        );
                    })}
                </div>
            )}
            {labelSplit ? (
                <>
                    <span className="toast-label">{withWordmark(labelSplit.label, ownTm)}:</span>
                    <span className="toast-action">{withWordmark(labelSplit.action, ownTm)}</span>
                </>
            ) : (
                withWordmark(headline, ownTm)
            )}
            {hint && <span className="toast-hint">{hint}</span>}
        </div>
    );
}
