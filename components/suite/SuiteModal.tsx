'use client';

/*
 * PriceOS Suite — the productivity super-app (Brendon, 2026-07-27): one
 * modal, little icons at the top, six apps under them —
 *
 *   ‰ Today      — the landing dashboard (SuiteToday): Fantastical-style
 *                  week strip, today's work, the live pulse tiles
 *   ▦ PriceCal   — the REAL connect-menu calendar (month grid + day column)
 *   ❍ PriceTask  — the REAL To-Dos box, expanded (☇ Workflows ride its
 *                  header too, exactly as in the menu)
 *   ☇ PriceFlows — the workflows builder + armed list, inline
 *   ◊ PriceBooks — the REAL Portfolios panel (Budgets + Main/Shadow)
 *   ⊟ PriceNotes — the REAL Notes box, expanded
 *
 * Nothing here is re-implemented (Rule #0): the tabs mount the same
 * components the connect menu runs; the chrome is the Friend-Inspector
 * PLUS panel verbatim; the dashboard reads the same stores.
 *
 * THE DOOR (Brendon-confirmed 2026-07-27): long-press the TO-DOS header in
 * the connect menu — right where it says "TO-DOS". Out: × / Esc / backdrop.
 * Opens on the Today dashboard.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModal, useModalLayer } from '../../lib/state/ModalContext';
import { lockBodyScroll, unlockBodyScroll } from '../../lib/state/bodyScrollLock';
import CalendarPanel from '../CalendarPanel';
import { TodosBox } from '../dropdown/TodosBox';
import { NotesBox } from '../dropdown/NotesBox';
import { WorkflowsSheet } from '../dropdown/WorkflowsSheet';
import { PortfolioView } from '../dropdown/PortfolioView';
import SuiteToday, { type SuiteAppKey } from './SuiteToday';
import SuitePhone from './SuitePhone';
import { PerMilleMark } from '../shell/PerMilleMark';

const VS15 = '︎';

/* Glyphs are the canonical ones from docs/GLYPHS.md — ▦ Calendar · ❍ To-Do
   · ☇ Workflows · ◊ the ETH mark (money = PriceBooks) · ƒ the Calc
   (PriceCalc) · ⊟ Note — plus the real per-mille SVG mark (PerMilleMark,
   never the text ‰ — Brendon's logo law) fronting the Today dashboard.
   Never swapped, never invented. */
const APPS = [
    { key: 'today', glyph: 'mille', name: 'Today' },
    { key: 'cal', glyph: '▦', name: 'PriceCal' },
    { key: 'task', glyph: '❍', name: 'PriceTask' },
    { key: 'flow', glyph: '☇', name: 'PriceFlows' },
    { key: 'books', glyph: '◊', name: 'PriceBooks' },
    /* PriceCalc is a DOOR, not a pane — tapping it summons PROFIT PAL over
       the Suite (the real Pal, ModalContext 'pal'/'profit'); closing it
       lands you back here. */
    { key: 'calc', glyph: 'ƒ', name: 'PriceCalc' },
    /* ⚯ — the Friend Inspector's circle glyph fronts the contacts app. */
    { key: 'phone', glyph: '⚯', name: 'PricePhone' },
    { key: 'notes', glyph: '⊟', name: 'PriceNotes' },
] as const;
type AppKey = SuiteAppKey;

export default function SuiteModal() {
    const { close, open } = useModal();
    const { isOpen, isTopStacked } = useModalLayer('suite');
    const [app, setApp] = useState<AppKey>('task');

    useEffect(() => {
        if (!isOpen) return;
        setApp('today'); // fresh open lands on the Today dashboard
        lockBodyScroll();
        return () => unlockBodyScroll();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, close]);

    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="sticker-mgr-plus-backdrop"
            data-stack-top={isTopStacked || undefined}
            role="dialog"
            aria-modal="true"
            aria-label="PriceOS Suite"
            onClick={close}
        >
            <div className="sticker-mgr-plus followers-plus suite-plus" onClick={(e) => e.stopPropagation()}>
                <div className="smgr-plus-head">
                    <span className="ambient-pop-title-text">
                        <span className="smgr-title-words">PriceOS SUITE</span>
                    </span>
                    <span
                        className="ambient-pop-close"
                        role="button"
                        tabIndex={0}
                        title="Close"
                        onClick={close}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}
                    >
                        {`×${VS15}`}
                    </span>
                </div>
                {/* the little icons at the top — the app switcher */}
                <div className="suite-tabs" role="tablist" aria-label="Suite apps">
                    {APPS.map((a) => (
                        <button
                            key={a.key}
                            type="button"
                            role="tab"
                            aria-selected={app === a.key}
                            className={`suite-tab${app === a.key ? ' on' : ''}`}
                            onClick={() => { if (a.key === 'calc') open('pal', 'profit'); else setApp(a.key as AppKey); }}
                        >
                            {a.glyph === 'mille'
                                ? <PerMilleMark className="suite-tab-permille" />
                                : <span className="suite-tab-ic">{`${a.glyph}${VS15}`}</span>}
                            {a.name}
                        </button>
                    ))}
                </div>
                <div className="followers-plus-body suite-body">
                    {app === 'today' && <SuiteToday openApp={setApp} />}
                    {app === 'cal' && <div className="suite-cal"><CalendarPanel /></div>}
                    {app === 'task' && <TodosBox suite />}
                    {app === 'flow' && <WorkflowsSheet inline />}
                    {app === 'books' && <div className="suite-books"><PortfolioView /></div>}
                    {app === 'phone' && <SuitePhone />}
                    {app === 'notes' && <NotesBox suite />}
                </div>
            </div>
        </div>,
        document.body,
    );
}
