/*
 * CAST — the Command Stone's spell/workspace matcher (the brief's fourth
 * intent). "Flip a spell or pull on a Workspace/persona by name" — degen,
 * fog, appraiser… Bare EXACT names cast (the brief's own examples are
 * bare); an optional `cast ` prefix always works. No prefix-guessing —
 * a miscast is worse than a search result, so anything inexact falls
 * through to GO/FIND.
 *
 * Pure matching only (testable) — execution is a plain toggle+toast in
 * the Stone (the "spells" are just settings with a fun name — Brendon,
 * 2026-07-19: don't overthink it) plus loadWorkspace for personas.
 */

import { SPELLS, type SpellEntry } from '../data/spells';

/** The hardcoded Spell Book pills (plain flags / sort modes, not spell_*). */
export type CastModeKey =
    | 'degen'
    | 'audience'
    | 'redacted'
    | 'thewatch'
    | 'npc'
    | 'stargazing'
    | 'echo'
    | 'fog';

export type CastTarget =
    | { kind: 'spell'; spell: SpellEntry; label: string; icon?: string }
    | { kind: 'mode'; key: CastModeKey; label: string; icon?: string }
    | { kind: 'workspace'; id: number; label: string };

/** The hardcoded settings pills, name → mode key. Labels/icons match
    the pills exactly. */
const MODES: Array<{ names: string[]; key: CastModeKey; label: string; icon?: string }> = [
    { names: ['degen'], key: 'degen', label: 'Degen', icon: '⚔︎' },
    { names: ['audience'], key: 'audience', label: 'Audience', icon: '●︎' },
    { names: ['redacted', 'redacted!'], key: 'redacted', label: 'Redacted!', icon: '@︎' },
    { names: ['the watch'], key: 'thewatch', label: 'The Watch', icon: '⬬︎' },
    { names: ['npc', 'npc cast'], key: 'npc', label: 'NPC' },
    { names: ['stargazing', 'stargazing mode'], key: 'stargazing', label: 'Stargazing', icon: '⍟︎' },
    { names: ['echo', 'echo chamber'], key: 'echo', label: 'Echo Chamber', icon: '≫︎' },
    { names: ['fog'], key: 'fog', label: 'Fog' },
];

function norm(s: string): string {
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Match the typed line to a castable. `workspaces` is the user's live
 * list (names are user data, matched exactly, checked after the canon
 * spells/modes so a workspace named "fog" can't shadow the spell).
 */
export function matchCast(
    line: string,
    workspaces: ReadonlyArray<{ id: number; name: string }>
): CastTarget | null {
    let q = norm(line);
    if (!q) return null;
    const prefixed = /^cast\s+(.+)$/.exec(q);
    if (prefixed) q = norm(prefixed[1]);
    if (q.length < 3 && q !== 'npc' && q !== 'fog') return null;

    for (const m of MODES) {
        if (m.names.includes(q)) {
            return { kind: 'mode', key: m.key, label: m.label, icon: m.icon };
        }
    }
    for (const spell of SPELLS) {
        // NPC's SPELLS entry is superseded by the hardcoded pill (checked
        // above); Degen sits in its slot in the Book — same here.
        if (spell.id === 'npc') continue;
        if (q === spell.id || q === norm(spell.name)) {
            return { kind: 'spell', spell, label: spell.name, icon: spell.icon };
        }
    }
    for (const ws of workspaces) {
        if (q === norm(ws.name)) {
            return { kind: 'workspace', id: ws.id, label: ws.name };
        }
    }
    return null;
}
