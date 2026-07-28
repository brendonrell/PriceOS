'use client';

/*
 * SuiteCal — ▦ PriceCal in the Suite's one presentation (Brendon,
 * 2026-07-28). The pane is the To-Dos box; the app inside it is the REAL
 * connect-menu calendar, untouched (Rule #0).
 *
 * The month steppers are the menu's own — same handler, same ◀ ▶ marks, same
 * .cal-nav treatment as CalendarHeaderInline. In the menu they live in the
 * dropdown's top row, which the Suite never mounts; here they sit in the
 * header's right-hand cluster where every other app keeps its actions.
 */

import CalendarPanel from '../CalendarPanel';
import { useCalendar } from '../../lib/calendar/CalendarContext';
import { CAL_MONTH_NAMES } from '../../lib/calendar/data';
import SuitePane from './SuitePane';

export default function SuiteCal() {
    const { viewY, viewM, navMonth } = useCalendar();

    const step = (dir: -1 | 1, label: string) => (
        <span
            className="cal-nav"
            role="button"
            tabIndex={0}
            title={label}
            aria-label={label}
            onClick={(e) => { e.stopPropagation(); navMonth(dir); }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    navMonth(dir);
                }
            }}
        >
            {dir === -1 ? '◀︎' : '▶︎'}
        </span>
    );

    return (
        <SuitePane
            id="Cal"
            title="CALENDAR"
            className="suite-cal"
            actions={
                <>
                    {step(-1, 'Previous month')}
                    <span className="cal-month-label" id="calMonthLabel">
                        {`${CAL_MONTH_NAMES[viewM]} ${viewY}`}
                    </span>
                    {step(1, 'Next month')}
                </>
            }
        >
            <CalendarPanel />
        </SuitePane>
    );
}
