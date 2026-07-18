'use client';

/*
 * DispatchColophonUrl — the edition's permanent URL in the colophon, plus the
 * standard ⧉ copy affordance (inline ✓ swap + COPIED toast — the same
 * .icon-copy glyph the profile heroes use, Rule #0). A client island so the
 * otherwise server-rendered Dispatch page can carry a copy button, exactly
 * like DispatchClose / DigestSignup.
 */

import { useState } from 'react';
import { useToast } from '@/lib/state/ToastContext';

export default function DispatchColophonUrl({ url }: { url: string }) {
    const { showToast } = useToast();
    const [copied, setCopied] = useState(false);
    const copy = () => {
        try {
            navigator.clipboard?.writeText(`https://${url}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
            showToast('Link: COPIED');
        } catch {
            /* clipboard blocked — no-op */
        }
    };
    return (
        <span className="dp-colophon-url">
            {url}
            <span
                className="icon-copy id-copy"
                role="button"
                tabIndex={0}
                title="Copy dispatch link"
                onClick={copy}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        copy();
                    }
                }}
            >
                {copied ? '✓︎' : '⧉︎'}
            </span>
        </span>
    );
}
