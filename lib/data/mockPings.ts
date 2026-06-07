/*
 * Mock Pings — 8 entries matching the sim's notif-list defaults.
 * Real pings will come from the indexer + Supabase Realtime once
 * those are wired. Until then this is the demo data shown in the
 * Pings accordion of the Connect Menu.
 */

export interface PingItem {
    id: string;
    icon: string;       // VS-15 enforced glyph
    handle: string;     // @-prefix included
    action: string;     // "collected #14", "listed #22", etc.
}

export const MOCK_PINGS: PingItem[] = [
    { id: 'p1', icon: '✶\uFE0E', handle: '@matty',      action: 'collected #14' },
    { id: 'p2', icon: '✹\uFE0E', handle: '@atlasforge', action: 'listed #22' },
    { id: 'p3', icon: '✦\uFE0E', handle: '@Darold',     action: 'offered 0.5 ETH' },
    { id: 'p4', icon: '✸\uFE0E', handle: '@trinity',    action: 'transferred #12' },
    { id: 'p5', icon: '✶\uFE0E', handle: '@gmoney',     action: 'collected #88' },
    { id: 'p6', icon: '✹\uFE0E', handle: '@snowfro',    action: 'listed #1' },
    { id: 'p7', icon: '✦\uFE0E', handle: '@cspok',      action: 'offered 1.2 ETH' },
    { id: 'p8', icon: '✸\uFE0E', handle: '@XCOPY',      action: 'transferred #42' },
];
