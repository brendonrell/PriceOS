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

import type { ReactNode, MouseEvent as ReactMouseEvent } from 'react';
import type { useStarLongPress } from '../lib/hooks/rowFlags';

export default function SectionHead({
    title,
    titleHref,
    artist,
    className,
    star,
}: {
    title: ReactNode;
    /** When set, the title links here (e.g. the project page). */
    titleHref?: string;
    /** Artist handle (no '@'). When present, renders " by @artist". */
    artist?: string | null;
    /** Extra class on the wrapper. */
    className?: string;
    /* Bookmark star — an unfilled/filled ☆/★ glyph at the end of the title,
       before the " by @artist" byline. Tapping it OR long-pressing the title
       itself toggles the star (Brendon, 2026-09-08 — the Shuffle "save for
       later" feature). Omit to render no star at all (every other SectionHead
       caller). */
    star?: {
        starred: boolean;
        onToggle: () => void;
        longPress: ReturnType<typeof useStarLongPress>;
    };
}) {
    /* Tolerate a handle that already carries a leading '@' (some registry/
       migrated handles do) — strip it so the byline reads "@name", not "@@name",
       and the profile link is /name, not the broken /@name. */
    const handle = artist ? artist.replace(/^@+/, '') : null;
    /* A long-press on the title fires the star toggle (via longPress.handlers'
       timer) and sets longFired — this guards the anchor's own click so a
       long-press never ALSO navigates to the project page. */
    const guardTitleClick = star
        ? (e: ReactMouseEvent) => {
              if (star.longPress.longFired.current) {
                  e.preventDefault();
                  star.longPress.longFired.current = false;
              }
          }
        : undefined;
    return (
        <div className={`section-head${className ? ' ' + className : ''}`}>
            {titleHref ? (
                <a
                    className="section-head-title"
                    href={titleHref}
                    onClick={guardTitleClick}
                    {...(star ? star.longPress.handlers : {})}
                >
                    {title}
                    {star?.longPress.floatId ? (
                        <span
                            key={star.longPress.floatId}
                            className={`project-name-star-float${star.longPress.floatDown ? ' is-down' : ''}`}
                            aria-hidden="true"
                        >
                            {'★︎'}
                        </span>
                    ) : null}
                </a>
            ) : (
                <span className="section-head-title">{title}</span>
            )}
            {star && (
                <span
                    className={`section-head-star${star.starred ? ' is-starred' : ''}`}
                    role="button"
                    tabIndex={0}
                    title={star.starred ? 'Starred — tap to unstar' : 'Save for later'}
                    aria-label={star.starred ? 'Unstar' : 'Save for later'}
                    onClick={(e) => { e.stopPropagation(); star.onToggle(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); star.onToggle(); } }}
                >
                    {star.starred ? '★︎' : '☆︎'}
                </span>
            )}
            {handle && (
                <span className="section-head-by"> by <a href={`/${handle}`}>@{handle}</a></span>
            )}
        </div>
    );
}
