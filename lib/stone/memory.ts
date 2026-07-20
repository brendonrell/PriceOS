/*
 * MEMORY — the Command Stone remembers its last subject (stage 5, the
 * "it's alive" pass). Ask "prisms floor", then just type "ath" — the
 * stone knows you still mean Prisms. Deterministic and $0 like every
 * stone faculty: no model, just the last resolved subject + a fixed
 * follow-up grammar. Pure functions (testable, no DOM).
 *
 * A follow-up only expands when the typed line is EXACTLY a follow-up
 * word (the CAST/summon discipline — a miscast is worse than a search):
 *
 *   project subject (e.g. PRISMS):
 *     floor · ath · volume · minted · supply · holders     → "prisms ath"
 *     who holds 7 · holds 7                                → "who holds prisms 7"
 *     calc · calc 0.5 (no project named)                   → "calc prisms 0.5"
 *     gallery                                              → "gallery prisms"
 *     30d · 7d (a bare trend window)                       → "prisms 30d"
 *   user subject (e.g. @gmoney):
 *     spent · collected · followers                        → "@gmoney spent"
 */

export type StoneSubject =
    | { kind: 'project'; name: string }
    | { kind: 'user'; name: string }; // name carries the leading '@'

const PROJECT_WORDS = /^(floor|ath|volume|minted|supply|holders?)\??$/;
const HOLDS_RE = /^(?:who\s+)?holds\s+(\d+)\??$/;
const CALC_RE = /^calc(?:\s+(\d+(?:\.\d+)?))?$/;
const TREND_RE = /^(\d{1,3})d$/;
const USER_WORDS = /^(spent|collected|followers)\??$/;

function norm(s: string): string {
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Expand a bare follow-up line against the remembered subject. Returns
    the full line the stone should hear, or null when the line stands on
    its own (no expansion — never guess). */
export function expandFollowUp(line: string, subject: StoneSubject | null): string | null {
    if (!subject) return null;
    const q = norm(line);
    if (!q) return null;

    if (subject.kind === 'project') {
        const name = subject.name;
        if (PROJECT_WORDS.test(q)) return `${name} ${q.replace(/\?+$/, '')}`;
        const holds = HOLDS_RE.exec(q);
        if (holds) return `who holds ${name} ${holds[1]}`;
        const calc = CALC_RE.exec(q);
        if (calc) return calc[1] != null ? `calc ${name} ${calc[1]}` : `calc ${name}`;
        if (q === 'gallery') return `gallery ${name}`;
        const trend = TREND_RE.exec(q);
        if (trend) return `${name} ${trend[1]}d`;
        return null;
    }

    // user subject — the search's own @name answer grammar
    if (USER_WORDS.test(q)) return `${subject.name} ${q.replace(/\?+$/, '')}`;
    return null;
}
