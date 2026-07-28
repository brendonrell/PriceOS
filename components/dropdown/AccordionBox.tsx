'use client';

/*
 * AccordionBox
 *
 * Reusable shape for the four collapsible boxes at the bottom of the
 * Connect Menu (Tape / Pings / Todos / Notes).
 *
 * Visual: matches .notifications-box from the sim — a self-contained
 * panel with a header row, a divider, and (when open) a scrollable
 * list with up/down scroll arrow rows above and below.
 *
 * DOM shape (mirrors sim 4870–4955):
 *   .notifications-box[id={boxId}]
 *     .notif-header
 *     .dropdown-divider                    ← toggled via display
 *     #{boxId}Body                         ← toggled via display
 *       .scroll-arrow (up)
 *       .notif-list[id={listId}]
 *       .scroll-arrow (down)
 *
 * Behavior:
 *   - Header click toggles open/closed
 *   - Mutual exclusion is handled by the caller via setAccordion in
 *     PdNotifsContext; this component just renders state
 *   - Scroll arrows scroll the inner list by `scrollStep` px in either
 *     direction. Defaults to 80 (Tape / Todos / Notes per sim 5952,
 *     6105, 7222). Pings overrides to 60 (sim 6760).
 *   - Body wrapper + divider stay mounted across open/close so the
 *     inner list's scroll position survives a close→reopen cycle
 *     (sim's applyDropdownStates only toggles `style.display`, never
 *     unmounts — sim 7238–7246).
 *
 * Pings is the only accordion that always shows when the menu opens
 * (its closed state isn't really "closed" — it's an "always there"
 * baseline). Other accordions hide their list until expanded.
 *
 * `children` is optional: TapeBox doesn't render items in step 3
 * (the ticker data source isn't wired yet) so it passes nothing.
 * Pings/Todos/Notes pass arrays of <div className="notif-item">.
 */

import { useRef, type ReactNode } from 'react';

interface Props {
    /** ID for the inner list, used by the scroll arrows. */
    listId: string;
    /** Header content — typically `LABEL (count)` or the tape rail. */
    header: ReactNode;
    /** Whether the list is currently visible. */
    open: boolean;
    /** Click handler for the header (toggles open). */
    onHeaderClick: () => void;
    /** List items. Optional — boxes with no data yet pass nothing. */
    children?: ReactNode;
    /** Optional id for the outer box (lets the sim's CSS hooks attach). */
    boxId?: string;
    /** If true, the list always renders (used by Pings — see comment above). */
    alwaysOpen?: boolean;
    /** Optional className additions on the outer box. */
    className?: string;
    /**
     * Optional className additions on the .notif-header element. Sim
     * 4871 stamps the TapeBox header with both `notif-header` and
     * `menu-tape-header` so the tape-specific CSS (sim 1391-1402,
     * 1422-1425) can attach. TapeBox is the only current consumer
     * (Build 29 D27); other accordions leave this undefined.
     */
    headerClassName?: string;
    /**
     * Pixels per scroll-arrow click. Defaults to 80 (Tape / Todos /
     * Notes per sim). Pings passes 60 (sim's scrollNotifs uses
     * `dir * 60`, line 6760).
     */
    scrollStep?: number;
}

export function AccordionBox({
    listId,
    header,
    open,
    onHeaderClick,
    children,
    boxId,
    alwaysOpen = false,
    className,
    headerClassName,
    scrollStep = 80,
}: Props) {
    const listRef = useRef<HTMLDivElement>(null);

    const isVisible = alwaysOpen || open;

    // Sim wraps [scroll-up + notif-list + scroll-down] in a #{boxId}Body
    // div (sim 4875 / 4884 / 4903 / 4919). Derive the body id when the
    // outer boxId is provided so legacy CSS / JS hooks resolve.
    const bodyId = boxId ? `${boxId}Body` : undefined;

    const scrollList = (direction: 1 | -1) => {
        const el = listRef.current;
        if (el) el.scrollBy({ top: direction * scrollStep, behavior: 'smooth' });
    };

    // Render body + divider unconditionally; toggle visibility via
    // `display: none` so DOM nodes (and inner scroll position) survive
    // close→reopen. Matches sim's applyDropdownStates (sim 7238–7246).
    const hiddenStyle = { display: 'none' } as const;

    return (
        <div
            className={`user-dropdown notifications-box${isVisible ? ' is-open' : ''}${className ? ' ' + className : ''}`}
            id={boxId}
        >
            <div
                className={`notif-header${headerClassName ? ' ' + headerClassName : ''}`}
                onClick={onHeaderClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onHeaderClick();
                    }
                }}
            >
                {header}
            </div>

            <div
                className="dropdown-divider"
                style={isVisible ? undefined : hiddenStyle}
            />
            <div
                id={bodyId}
                className="accordion-box-body"
                style={isVisible ? undefined : hiddenStyle}
            >
                <div
                    className="scroll-arrow"
                    onClick={() => scrollList(-1)}
                    role="button"
                    tabIndex={0}
                    title="Scroll Up"
                    aria-label="Scroll up"
                >
                    ⇡{'\uFE0E'}
                </div>
                <div className="notif-list" id={listId} ref={listRef}>
                    {children}
                </div>
                <div
                    className="scroll-arrow"
                    onClick={() => scrollList(1)}
                    role="button"
                    tabIndex={0}
                    title="Scroll Down"
                    aria-label="Scroll down"
                >
                    ⇣{'\uFE0E'}
                </div>
            </div>
        </div>
    );
}
