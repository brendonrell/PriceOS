/*
 * Inline markdown renderer for note text.
 *
 * Three markers, in priority order:
 *   `code`     → <code>code</code>
 *   **bold**   → <strong>bold</strong>
 *   _italic_   → <em>italic</em>
 *
 * Code is parsed first so we don't accidentally bold/italicise inside
 * a backtick span. Returns React nodes (not HTML strings) so we never
 * use dangerouslySetInnerHTML in user-displayed text.
 */

import { Fragment, type ReactNode } from 'react';

type Span = { kind: 'text' | 'code' | 'bold' | 'em'; value: string };

function parseSpans(input: string): Span[] {
    const spans: Span[] = [];
    let rest = input;

    // First pass: split on backticks. Inside-backtick chunks are code,
    // outside chunks get further parsed for bold/italic.
    const codeRe = /`([^`]+)`/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeRe.exec(rest)) !== null) {
        if (match.index > lastIndex) {
            spans.push(...parseBoldItalic(rest.slice(lastIndex, match.index)));
        }
        spans.push({ kind: 'code', value: match[1] });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < rest.length) {
        spans.push(...parseBoldItalic(rest.slice(lastIndex)));
    }

    return spans;
}

function parseBoldItalic(input: string): Span[] {
    const out: Span[] = [];
    // Combined regex for **bold** and _italic_ with capture groups.
    const re = /\*\*([^*]+)\*\*|_([^_]+)_/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = re.exec(input)) !== null) {
        if (match.index > lastIndex) {
            out.push({ kind: 'text', value: input.slice(lastIndex, match.index) });
        }
        if (match[1] !== undefined) {
            out.push({ kind: 'bold', value: match[1] });
        } else if (match[2] !== undefined) {
            out.push({ kind: 'em', value: match[2] });
        }
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < input.length) {
        out.push({ kind: 'text', value: input.slice(lastIndex) });
    }
    return out;
}

export function renderInlineMarkdown(input: string): ReactNode {
    const spans = parseSpans(input);
    return (
        <>
            {spans.map((span, i) => {
                if (span.kind === 'code') return <code key={i}>{span.value}</code>;
                if (span.kind === 'bold') return <strong key={i}>{span.value}</strong>;
                if (span.kind === 'em')   return <em key={i}>{span.value}</em>;
                return <Fragment key={i}>{span.value}</Fragment>;
            })}
        </>
    );
}
