/**
 * Calendar utility functions.
 * Date math is ported verbatim from sim.html lines 6174–6230.
 */

import type { CalCell } from './types';

/** Format (y, m, d) as 'YYYY-MM-DD'. m is 0-indexed. */
export function dateKey(y: number, m: number, d: number): string {
  const mm = String(m + 1).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

/** Monday-first index: JS getDay() returns 0=Sun..6=Sat; we need 0=Mon..6=Sun. */
export function mondayIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

/**
 * Build the 6-row × 7-col (42-cell) grid for the given view month.
 * Cells before the 1st and after the last day of the month bleed in
 * from prev/next months and are flagged `other: true`.
 */
export function buildMonthCells(viewY: number, viewM: number): CalCell[] {
  const firstDayJs = new Date(viewY, viewM, 1).getDay();
  // Sunday-first grid: JS getDay() is already 0=Sun..6=Sat.
  const firstCol = firstDayJs;
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const daysInPrev = new Date(viewY, viewM, 0).getDate();

  const cells: CalCell[] = [];
  for (let i = 0; i < 42; i++) {
    let cellY = viewY;
    let cellM = viewM;
    let cellD: number;
    let other = false;

    if (i < firstCol) {
      // Prev month tail
      cellD = daysInPrev - (firstCol - 1 - i);
      cellM = viewM - 1;
      if (cellM < 0) {
        cellM = 11;
        cellY -= 1;
      }
      other = true;
    } else if (i >= firstCol + daysInMonth) {
      // Next month head
      cellD = i - firstCol - daysInMonth + 1;
      cellM = viewM + 1;
      if (cellM > 11) {
        cellM = 0;
        cellY += 1;
      }
      other = true;
    } else {
      cellD = i - firstCol + 1;
    }

    cells.push({ y: cellY, m: cellM, d: cellD, other });
  }
  return cells;
}

/**
 * Render a Day Note string with light markdown.
 * Mirrors the sim's renderNoteMarkdown for **bold**, _italic_, `code`.
 * Returns sanitized HTML — only emits the three tags above plus escaped
 * angle-brackets for everything else. URLs are linkified as <a> tags
 * with data-external so the delegated handler can open them natively.
 */
export function renderNoteMarkdown(s: string): string {
  if (!s) return '';
  // Escape HTML first so user content can't inject tags.
  const escaped = s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // Linkify URLs before other markdown so markers inside URLs aren't mangled.
  const linked = escaped.replace(
    /(https?:\/\/[^\s&<>"]+)/g,
    '<a class="note-ext-link" href="$1" data-external="1">$1</a>'
  );
  return linked
    .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+?)_/g, '<em>$1</em>')
    .replace(/`([^`]+?)`/g, '<code>$1</code>');
}
