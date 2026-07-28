'use client';

/*
 * SuitePane — the ONE presentation every PriceOS Suite app wears (Brendon,
 * 2026-07-28: "the app presentation is inconsistent. The one that nailed it
 * was todos: header, action buttons in top right, box around it. I want all
 * apps in this modal to have this presentation").
 *
 * This is NOT a new shape (Rule #0) — it IS the To-Dos box: the same
 * AccordionBox (box · header · divider · scroll arrows · list), the same
 * .todos-header-row split and the same .todos-header-icons cluster on the
 * right. Apps hand it a title, an optional count and their own action
 * buttons; nothing here re-implements any of it.
 *
 * Today is deliberately NOT a pane — it's a view, not an app (Brendon,
 * 2026-07-28).
 */

import type { ReactNode } from 'react';
import { AccordionBox } from '../dropdown/AccordionBox';

export default function SuitePane({
    id,
    title,
    count,
    actions,
    className,
    children,
}: {
    /** Stable id fragment — becomes the box/list ids, as the To-Dos box does. */
    id: string;
    /** Header label, left. Written in the boxes' own caps voice. */
    title: ReactNode;
    /** Optional count beside the label, exactly as TO-DOS (1) reads. */
    count?: number;
    /** The app's own buttons, clustered top-right. */
    actions?: ReactNode;
    className?: string;
    children?: ReactNode;
}) {
    return (
        <AccordionBox
            boxId={`suite${id}Box`}
            listId={`suite${id}List`}
            open
            /* A Suite pane never collapses — the app switcher is the door. */
            onHeaderClick={() => {}}
            className={`suite-pane${className ? ` ${className}` : ''}`}
            header={
                <span className="todos-header-row">
                    <span>
                        {title}
                        {count != null && <> <span className="notif-count">({count})</span></>}
                    </span>
                    {actions && <span className="todos-header-icons">{actions}</span>}
                </span>
            }
        >
            {children}
        </AccordionBox>
    );
}
