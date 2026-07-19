/*
 * CAST matcher — the Command Stone's spell/workspace name matching
 * (lib/stone/cast). Pure: exact names cast, everything else falls
 * through to GO/FIND, and the ETCH verbs can never collide.
 */

import { describe, expect, it } from 'vitest';
import { matchCast } from '../lib/stone/cast';

const WS = [
    { id: 1, name: 'Main' },
    { id: 4, name: 'Appraiser' },
    { id: 9, name: 'fog' }, // adversarial: user-named workspace shadowing a mode
];

describe('matchCast — spells + modes', () => {
    it('matches a spell by name and by id', () => {
        expect(matchCast('gossip protocol', WS)?.kind).toBe('spell');
        expect(matchCast('gossip', WS)?.kind).toBe('spell');
    });
    it('matches hardcoded modes (degen · fog · the watch · echo)', () => {
        expect(matchCast('degen', WS)?.kind).toBe('mode');
        expect(matchCast('fog', WS)?.kind).toBe('mode'); // canon beats the workspace named "fog"
        expect(matchCast('the watch', WS)?.kind).toBe('mode');
        expect(matchCast('echo chamber', WS)?.kind).toBe('mode');
    });
    it('accepts the explicit cast prefix', () => {
        expect(matchCast('cast degen', WS)?.kind).toBe('mode');
        expect(matchCast('cast sybil net', WS)?.kind).toBe('spell');
    });
    it('is case/space-insensitive but never prefix-guesses', () => {
        expect(matchCast('  GOSSIP  PROTOCOL ', WS)?.kind).toBe('spell');
        expect(matchCast('goss', WS)).toBeNull();
        expect(matchCast('spite', WS)).toBeNull();
    });
});

describe('matchCast — workspaces', () => {
    it('matches a workspace by exact name', () => {
        const hit = matchCast('appraiser', WS);
        expect(hit?.kind).toBe('workspace');
        if (hit?.kind === 'workspace') expect(hit.id).toBe(4);
    });
});

describe('matchCast — boundaries', () => {
    it('never matches ETCH verb lines or search queries', () => {
        expect(matchCast('watch prisms', WS)).toBeNull();
        expect(matchCast('todo: buy prisms 22', WS)).toBeNull();
        expect(matchCast('prisms', WS)).toBeNull();
        expect(matchCast('@brendon', WS)).toBeNull();
    });
});
