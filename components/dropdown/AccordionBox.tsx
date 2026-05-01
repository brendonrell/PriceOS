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
 * Behavior:
 *   - Header click toggles open/closed
 *   - Mutual exclusion is handled by the caller via setAccordion in
 *     PdNotifsContext; this component just renders state
 *   - Scroll arrows scroll the inner list by `scrollStep` px in either
 *     direction. Defaults to 80 (Tape / Todos / Notes per sim 5952,
 *     6105, 7222). Pings overrides to 60 (sim 6760).
 *   - When the body is visible, a `.dropdown-divider` is rendered
 *     between the header and the body. Its visibility tracks the body
 *     (both gated on `isVisible` here, matching sim's
 *     applyDropdownStates which toggles body and divider together —
 *     sim 7238–7246).
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
    scrollStep = 80,
}: Props) {
    const listRef = useRef<HTMLDivElement>(null);

    const isVisible = alwaysOpen || open;

    const scrollList = (direction: 1 | -1) => {
        const el = listRef.current;
        if (el) el.scrollBy({ top: direction * scrollStep, behavior: 'smooth' });
    };

    return (
        <div
            className={`user-dropdown notifications-box${className ? ' ' + className : ''}`}
            id={boxId}
        >
            <div
                className="notif-header"
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

            {isVisible && (
                <>
                    <div className="dropdown-divider" />
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
                </>
            )}
        </div>
    );
}
