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
 *   ⊟ PriceWrite — the REAL Notes box, expanded (renamed from PriceNotes,
 *                  Brendon 2026-07-27)
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
import SuiteCalm from './SuiteCalm';
import { PerMilleMark } from '../shell/PerMilleMark';

const VS15 = '︎';

/* Glyphs are the canonical ones from docs/GLYPHS.md — ▦ Calendar · ❍ To-Do
   · ☇ Workflows · ◊ the ETH mark (money = PriceBooks) · ƒ the Calc
   (PriceCalc) · ⊟ Note — plus the real per-mille SVG mark (PerMilleMark,
   never the text ‰ — Brendon's logo law) fronting the Today dashboard.
   Never swapped, never invented. */
/* ‰ Today is NOT an app icon — it's the long bar UNDER the grid (Brendon,
   2026-07-28: "almost like a space bar, normal pill style, 80% width of the
   icon grid"; moved below the icons the same day). */
const TODAY = { key: 'today', glyph: 'mille', name: 'Today' } as const;

/* Brendon's order, 2026-07-28: Task · Flows · Write · Books, then
   Cal · Calc · Call · Calm. */
const APPS = [
    { key: 'task', glyph: '❍', name: 'PriceTask' },
    { key: 'flow', glyph: '☇', name: 'PriceFlows' },
    /* Renamed PriceNotes → PriceWrite (Brendon, 2026-07-27). Key unchanged. */
    { key: 'notes', glyph: '⊟', name: 'PriceWrite' },
    { key: 'books', glyph: '◊', name: 'PriceBooks' },
    { key: 'cal', glyph: '▦', name: 'PriceCal' },
    /* PriceCalc is a DOOR, not a pane — tapping it summons PROFIT PAL over
       the Suite (the real Pal, ModalContext 'pal'/'profit'); closing it
       lands you back here. */
    { key: 'calc', glyph: 'ƒ', name: 'PriceCalc' },
    /* ⚯ — the Friend Inspector's circle glyph fronts the contacts app.
       Renamed PricePhone → PriceCall (Brendon, 2026-07-27). Key unchanged. */
    { key: 'phone', glyph: '⚯', name: 'PriceCall' },
    /* ⬟ — the Zen Garden's own stone fronts the calm room (Brendon's pick,
       2026-07-28: PriceCal · PriceCalc · PriceCalm). */
    { key: 'calm', glyph: '⬟', name: 'PriceCalm' },
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
                        {/* ❏ — the Suite's mark (Brendon's pick, GLYPHS §12l). */}
                        <span className="smgr-title-ic">{`❏${VS15}`}</span>{' '}
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
                {/* the app switcher — the small APP ICONS (Brendon,
                    2026-07-27): the glyph in a rounded square, the name below
                    it — then Today as the long bar under them. */}
                <div className="suite-switcher" role="tablist" aria-label="Suite apps">
                <div className="suite-tabs">
                    {APPS.map((a) => (
                        <button
                            key={a.key}
                            type="button"
                            role="tab"
                            aria-selected={app === a.key}
                            className={`suite-tab${app === a.key ? ' on' : ''}`}
                            onClick={() => { if (a.key === 'calc') open('pal', 'profit'); else setApp(a.key as AppKey); }}
                        >
                            <span className="suite-tab-icbox" aria-hidden="true">
                                <span className="suite-tab-ic">{`${a.glyph}${VS15}`}</span>
                            </span>
                            <span className="suite-tab-name">{a.name}</span>
                        </button>
                    ))}
                </div>
                <div className="suite-todaybar-row">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={app === TODAY.key}
                        className={`suite-todaybar${app === TODAY.key ? ' on' : ''}`}
                        onClick={() => setApp(TODAY.key)}
                    >
                        <PerMilleMark className="suite-todaybar-permille" />
                        <span className="suite-todaybar-name">{TODAY.name}</span>
                    </button>
                </div>
                </div>
                <div className="followers-plus-body suite-body">
                    {app === 'today' && <SuiteToday openApp={setApp} />}
                    {app === 'cal' && <div className="suite-cal"><CalendarPanel /></div>}
                    {app === 'task' && <TodosBox suite />}
                    {app === 'flow' && <WorkflowsSheet inline />}
                    {app === 'books' && <div className="suite-books"><PortfolioView /></div>}
                    {app === 'calm' && <SuiteCalm />}
                    {app === 'phone' && <SuitePhone />}
                    {app === 'notes' && <NotesBox suite />}
                </div>
            </div>
        </div>,
        document.body,
    );
}
