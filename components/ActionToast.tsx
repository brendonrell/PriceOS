'use client';

/*
 * ActionToast
 *
 * Single fixed pill at the bottom of the viewport. Reads state from
 * ToastContext. Sim renders this as <div class="ens-copy-toast"
 * id="actionToast"> at line 4960; we keep both class names so the
 * sim's existing CSS hooks port over verbatim.
 *
 * With-art extension (Brendon, 2026-07-17 — "our normal ones just extended"
 * · "up to 3 in a row, depending on the ping"): when the toast is about
 * specific Output(s), a row of their mint-pinned ASCII artifacts (max 3)
 * stacks above the message and the text wraps inside a compact card. The
 * message string is byte-identical either way; a piece whose artifact
 * misses simply drops out of the row, and an all-miss renders today's
 * plain pill.
 */

import { useState } from 'react';
import { useToast } from '../lib/state/ToastContext';
import AsciiArtImage from './AsciiArtImage';

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

    const cls = [
        'ens-copy-toast',
        state.mounted ? 'mounted' : '',
        state.show ? 'show' : '',
        showArt ? 'with-art' : '',
        showFace ? 'with-face' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            className={cls}
            id="actionToast"
            aria-live="polite"
            aria-atomic="true"
            style={{ transitionDuration: `${state.fadeMs}ms` }}
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
            {state.msg}
        </div>
    );
}
