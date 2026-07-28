'use client';

/*
 * lib/stone/subjects.ts — the Command Stone's LONG MEMORY (the superpower
 * pass, 2026-07-28). Every subject the stone resolves — a project you asked
 * about, a collector you pulled the file on — is remembered with its moment,
 * across sessions (device cache, the lastLine pattern). The recall grammar
 * ("that project from tuesday" · "last collector") reads this history.
 *
 * Pure helpers + a thin storage shim; recall itself is testable with an
 * injected history + clock.
 */

import type { StoneSubject } from './memory';

export interface SubjectMemo {
    kind: 'project' | 'user';
    /** The display name the stone heard (users carry the leading '@'). */
    name: string;
    /** When it was the subject (ms). */
    ts: number;
}

const LS_KEY = 'pd_stone_subjects';
const MAX = 24;

export function readSubjectHistory(): SubjectMemo[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(LS_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(arr)) return [];
        return arr.filter(
            (m): m is SubjectMemo =>
                m && (m.kind === 'project' || m.kind === 'user') &&
                typeof m.name === 'string' && typeof m.ts === 'number',
        );
    } catch {
        return [];
    }
}

/** Remember a subject (newest first; consecutive repeats collapse). */
export function recordSubject(subject: StoneSubject, now = Date.now()): void {
    if (typeof window === 'undefined') return;
    try {
        const hist = readSubjectHistory();
        if (hist[0]?.name.toLowerCase() === subject.name.toLowerCase()) {
            hist[0].ts = now; // same subject, fresher moment
        } else {
            hist.unshift({ kind: subject.kind, name: subject.name, ts: now });
        }
        window.localStorage.setItem(LS_KEY, JSON.stringify(hist.slice(0, MAX)));
    } catch { /* private mode — session-only is fine */ }
}

/** The most recent remembered subject, or null — boots the stone's memory. */
export function latestSubject(): StoneSubject | null {
    const m = readSubjectHistory()[0];
    return m ? { kind: m.kind, name: m.name } : null;
}

/* ── RECALL — "that project from tuesday" resolves from the history ──── */

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function kindOf(word: string): SubjectMemo['kind'] | null {
    if (word === 'project') return 'project';
    if (word === 'collector' || word === 'user' || word === 'artist' || word === 'person') return 'user';
    return null;
}

/**
 * Read a typed line as a recall ("that project from tuesday" · "that
 * collector from yesterday" · "last project") and resolve it against the
 * history. Returns the remembered NAME (the stone then hears that name),
 * or null when the line isn't a recall / nothing matches.
 */
export function recallSubject(
    line: string,
    history: readonly SubjectMemo[],
    now: Date = new Date(),
): string | null {
    const q = line.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\?+$/, '');
    if (!q || history.length === 0) return null;

    /* last project · last collector */
    const last = /^(?:the\s+)?last\s+(project|collector|user|artist|person)$/.exec(q);
    if (last) {
        const kind = kindOf(last[1]);
        return history.find((m) => m.kind === kind)?.name ?? null;
    }

    /* that project from tuesday · that collector from yesterday */
    const from = /^that\s+(project|collector|user|artist|person)\s+from\s+([a-z]+)$/.exec(q);
    if (!from) return null;
    const kind = kindOf(from[1]);
    if (!kind) return null;
    const when = from[2];

    const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (when === 'yesterday') {
        const y0 = dayStart(now) - 86_400_000;
        return history.find((m) => m.kind === kind && m.ts >= y0 && m.ts < y0 + 86_400_000)?.name ?? null;
    }
    if (when === 'today' || when === 'earlier') {
        const t0 = dayStart(now);
        return history.find((m) => m.kind === kind && m.ts >= t0)?.name ?? null;
    }
    const dow = WEEKDAYS.indexOf(when);
    if (dow < 0) return null;
    /* the most recent entry on that weekday within the past 7 days */
    for (const m of history) {
        if (m.kind !== kind) continue;
        if (now.getTime() - m.ts > 7 * 86_400_000) break; // history is newest-first
        if (new Date(m.ts).getDay() === dow) return m.name;
    }
    return null;
}
