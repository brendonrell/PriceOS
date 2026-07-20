/*
 * renderMentions — @name → profile link, for React-rendered user text
 * (to-do titles). The string-HTML side (note markdown) carries the same
 * rule inside renderNoteMarkdown. Handle charset matches the by-handle
 * route; a mention must follow start-of-text or whitespace so emails
 * never linkify.
 */

import type { ReactNode } from 'react';

const MENTION_RE = /(^|\s)@([a-zA-Z0-9_-]{2,})/g;

export function renderMentions(text: string): ReactNode {
    MENTION_RE.lastIndex = 0;
    if (!MENTION_RE.test(text)) return text;
    MENTION_RE.lastIndex = 0;
    const out: ReactNode[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = MENTION_RE.exec(text)) !== null) {
        const start = m.index + m[1]!.length;
        if (start > last) out.push(text.slice(last, start));
        const handle = m[2]!;
        out.push(
            <a
                key={`${start}-${handle}`}
                className="todo-mention"
                href={`/${handle.toLowerCase()}`}
                onClick={(e) => e.stopPropagation()}
            >
                @{handle}
            </a>,
        );
        last = start + handle.length + 1;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
}
