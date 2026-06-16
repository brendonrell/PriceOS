'use client';

/*
 * SectionHead — a section title with an OPTIONAL "by @artist" byline.
 *
 * The title renders in the section-title face (Rubik mono); the byline is the
 * quieter Courier "by @name" that can sit beside any title. Pass `artist` to
 * show it, omit it to hide — so adding/removing the credit on any section is a
 * one-prop decision (Brendon, 2026-06-16).
 *
 * The byline is a single non-breaking unit: it never splits at the handle's
 * hyphen, and the whole "by @name" drops to the next line together when it
 * can't fit beside the title.
 */

import type { ReactNode } from 'react';

export default function SectionHead({
    title,
    titleHref,
    artist,
    className,
}: {
    title: ReactNode;
    /** When set, the title links here (e.g. the project page). */
    titleHref?: string;
    /** Artist handle (no '@'). When present, renders " by @artist". */
    artist?: string | null;
    /** Extra class on the wrapper. */
    className?: string;
}) {
    return (
        <div className={`section-head${className ? ' ' + className : ''}`}>
            {titleHref ? (
                <a className="section-head-title" href={titleHref}>{title}</a>
            ) : (
                <span className="section-head-title">{title}</span>
            )}
            {artist && (
                <span className="section-head-by"> by <a href={`/${artist}`}>@{artist}</a></span>
            )}
        </div>
    );
}
