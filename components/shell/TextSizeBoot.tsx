'use client';

/*
 * TextSizeBoot — applies the site-wide text size to <body> (Brendon,
 * 2026-08-26). Headless, mounted once in the shell, same pattern as
 * ThemeMusic: no UI of its own, just keeps the DOM in sync with the
 * store.
 *
 * M is the site's existing size — no class, nothing to override. S and L
 * add a body class the stylesheet scales typography off of. Applied via a
 * plain useEffect (not inline on <html>) so SSR always paints the site's
 * normal size first and the chosen size steps in a beat later — same
 * trade-off the colorway boot paint already makes for its own vars.
 */

import { useEffect } from 'react';
import { readTextSize } from '../../lib/textSize/textSizeStore';
import type { TextSize } from '../../lib/textSize/textSizeStore';

function apply(size: TextSize): void {
    const body = document.body;
    body.classList.toggle('text-size-s', size === 'S');
    body.classList.toggle('text-size-l', size === 'L');
}

export default function TextSizeBoot() {
    useEffect(() => {
        apply(readTextSize());
        const onChange = (e: Event) => {
            const detail = (e as CustomEvent<{ size: TextSize }>).detail;
            apply(detail?.size ?? readTextSize());
        };
        window.addEventListener('pd:text-size-changed', onChange);
        return () => window.removeEventListener('pd:text-size-changed', onChange);
    }, []);

    return null;
}
