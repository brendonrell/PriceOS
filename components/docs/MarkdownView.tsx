'use client';

/*
 * "View as Markdown" — in-place raw-markdown viewer. The .md URLs serve a
 * bare text/markdown response; navigating the PWA there strands the reader
 * (standalone mode has no browser back). So the link opens the same bytes
 * in a full-screen overlay with a visible ✕ instead — the .md URL itself
 * stays untouched for agents, and a failed fetch falls back to plain
 * navigation so the content is never unreachable.
 */

import { useEffect, useState } from 'react';

export function MarkdownView({ href }: { href: string }) {
    const [text, setText] = useState<string | null>(null);

    /* Close on Escape — desktop courtesy; the ✕ is the primary exit. */
    useEffect(() => {
        if (text === null) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setText(null);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [text]);

    const open = async (e: React.MouseEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(href);
            if (!res.ok) throw new Error(String(res.status));
            setText(await res.text());
        } catch {
            window.location.href = href;
        }
    };

    return (
        <>
            <a href={href} title="This page as raw markdown" data-native-nav="" onClick={open}>
                View as Markdown
            </a>
            {text !== null && (
                <div className="pd-docs-mdview" role="dialog" aria-label="Raw markdown">
                    <button
                        type="button"
                        className="pd-docs-mdview-x"
                        aria-label="Close markdown view"
                        onClick={() => setText(null)}
                    >
                        ✕
                    </button>
                    <pre className="pd-docs-mdview-body">{text}</pre>
                </div>
            )}
        </>
    );
}
