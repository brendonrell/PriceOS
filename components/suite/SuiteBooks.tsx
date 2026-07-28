'use client';

/*
 * SuiteBooks — ◊ PriceBooks in the Suite's one presentation (Brendon,
 * 2026-07-28). The pane is the To-Dos box; the app inside it is the REAL
 * Portfolios panel from the connect menu, untouched (Rule #0). Its dropdown
 * back-arrow is meaningless here and stays hidden, as it already was.
 */

import { PortfolioView } from '../dropdown/PortfolioView';
import SuitePane from './SuitePane';

export default function SuiteBooks() {
    return (
        <SuitePane id="Books" title="PORTFOLIOS" className="suite-books">
            <PortfolioView />
        </SuitePane>
    );
}
