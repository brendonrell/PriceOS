'use client';

/*
 * Ticker (The Tape)
 *
 * Persistent ambient activity ticker that flex-fills the space between
 * the Petey logo and the user-menu buttons. Visibility and presentation
 * are entirely CSS-driven via body.tape-* classes:
 *   - body.tape-off:    display none
 *   - body.tape-faded:  partially transparent
 *   - body.tape-bold:   weight 700
 *   - body.tape-framed: filled bar, inverted colors
 *   - default:          standard
 *
 * F52 / BUG-17 — populate the rail and subscribe to the shared tape
 * engine for rAF-driven horizontal scroll. Sim 13314-13345 renders +
 * animates the top rail.
 *
 * Rail content is REAL: useTapeFeed pulls the live events ledger
 * (/api/feed) — the same stream the menu tape (TapeBox) shows — and the
 * rows render twice with an outer separator between, so the engine's
 * modulo-`scrollWidth/2` translate reads as a seamless loop
 * (sim 13317-13318). Rendered unshuffled for deterministic SSR/CSR
 * alignment.
 */

import { Fragment, useEffect, useRef, useState } from 'react';
import type { TapeFeedItem } from '../../lib/data/tapeEvents';
import { useTapeFeed } from '../../lib/feed/useTapeFeed';
import { subscribeTapeRail } from '../../lib/engines/tapeEngine';
import { useFaction } from '../../lib/factions/useFaction';
import { factionByKey } from '../../lib/factions/factions';

/* Null state — when no real activity has accrued yet, the rail still scrolls a
   quiet placeholder so the tape reads as alive instead of an empty bar. */
const NULL_PHRASE = 'nothing happening right now';
const NULL_REPEAT = 8;

/* One event, read as a tight sentence: WHO did WHAT to WHICH piece, for HOW
   MUCH — e.g. "@brendon minted PRISMS #18 · 0.16 ETH". The collection wears
   caps so the eye catches the piece; the price (when present) is the only
   inner "·"-separated field. Events are delimited from each other by the
   diamond in the rail below, so a price never butts against the next name. */
function RailItem({ item }: { item: TapeFeedItem }) {
    const boldClass = item.type === 'mint' ? ' bold' : '';
    if (item.war) {
        /* War lines fly the faction's colour on the glyph + the ground. */
        return (
            <span className="tape-item bold">
                <span className="tape-sigil" style={{ color: item.war.hue }}>{item.war.glyph}</span>{' '}
                {item.war.line}
            </span>
        );
    }
    if (item.follow || item.unfollow) {
        return (
            <span className="tape-item bold">
                <span className="tape-coll">{item.coll.toUpperCase()}</span>{' '}
                {item.follow ? 'started following' : 'unfollowed'} {item.name}
            </span>
        );
    }
    return (
        <span className={`tape-item${boldClass}`}>
            {item.name && (
                <>
                    <b>{item.name}</b>
                    {item.sigil && (
                        <span className="tape-sigil" style={item.sigilHex ? { color: item.sigilHex } : undefined}>{item.sigil}</span>
                    )}
                    {' '}
                </>
            )}
            {item.verb}{' '}
            <span className="tape-coll">{item.coll.toUpperCase()}</span>{' '}#{item.id}
            {item.price && (
                <>
                    {' '}
                    <span className="tape-sep-inner">·</span>
                    {' '}
                    {item.price}
                </>
            )}
        </span>
    );
}

/** Book kinds → tape treatment (glyphs per docs/GLYPHS.md §13). */
const WAR_TAPE: Record<string, { glyph: string; word: string }> = {
    SIEGE_RAISED: { glyph: '▞︎', word: 'Siege: RAISED' },
    SIEGE_REPELLED: { glyph: '▞︎', word: 'Siege: REPELLED' },
    CONQUEST: { glyph: '⚐︎', word: 'CONQUEST' },
    STRONGHOLD: { glyph: '▟︎', word: 'Stronghold: RAISED' },
    STONE_STRUCK: { glyph: '‡︎', word: 'Stone: STRUCK' },
    RELIC_SEALED: { glyph: '≣︎', word: 'Relic: SEALED' },
};
const WAR_TAPE_WINDOW_MS = 48 * 3600_000;
const WAR_TAPE_MAX = 6;

export function Ticker() {
    const railRef = useRef<HTMLDivElement | null>(null);
    const feed = useTapeFeed();
    const faction = useFaction();
    const [warItems, setWarItems] = useState<TapeFeedItem[]>([]);

    /* War lines ride the tape for ENLISTED viewers only (IYKYK — civilians'
       tape is exactly yesterday's tape). Recent Book entries, capped. */
    useEffect(() => {
        if (!faction) { setWarItems([]); return; }
        let cancelled = false;
        void fetch('/api/war')
            .then((r) => (r.ok ? r.json() : null))
            .then((d: { book?: { kind: string; project: string | null; faction: string | null; ts: string }[] } | null) => {
                if (cancelled || !d?.book) return;
                const now = Date.now();
                const lines: TapeFeedItem[] = [];
                for (const b of d.book) {
                    if (lines.length >= WAR_TAPE_MAX) break;
                    const t = WAR_TAPE[b.kind];
                    if (!t) continue;
                    if (now - Date.parse(b.ts) > WAR_TAPE_WINDOW_MS) continue;
                    const hue = factionByKey(b.faction)?.hex ?? '#FFE600';
                    const ground = b.project ? ` · ${b.project.toUpperCase()}` : '';
                    const who = b.kind === 'CONQUEST' || b.kind === 'STRONGHOLD' ? ` · ${b.faction ?? ''}` : '';
                    lines.push({
                        type: 'mint', name: null, sigil: '', verb: '', coll: '', id: 0, price: null,
                        war: { line: `${t.word}${who}${ground}`, glyph: t.glyph, hue },
                    });
                }
                setWarItems(lines);
            })
            .catch(() => { /* tape stays civilian */ });
        return () => { cancelled = true; };
    }, [faction]);

    const items = warItems.length > 0 ? [...warItems, ...feed] : feed;

    useEffect(() => {
        const rail = railRef.current;
        if (!rail) return;
        // Re-bind when the rail content changes so the scroll loop re-measures
        // once our live events land (the rail starts empty, fills async).
        const unsubscribe = subscribeTapeRail(rail);
        return unsubscribe;
    }, [items]);

    return (
        <div className="tape-wrap" id="tapeWrap" aria-hidden="true">
            <div className="tape-rail" id="tapeRail" ref={railRef}>
                {/* Every event is followed by a diamond delimiter, and the whole
                    run is doubled — so the engine's modulo-halfWidth translate
                    reads as a seamless loop AND no two events ever run together.
                    With no real activity yet, the same doubled structure scrolls
                    a quiet "nothing happening right now" placeholder instead. */}
                {items.length > 0
                    ? (['a', 'b'] as const).map((run) =>
                          items.map((item, i) => (
                              <Fragment key={`${run}-${i}`}>
                                  <RailItem item={item} />
                                  <span className="tape-sep-outer" aria-hidden="true">◆</span>
                              </Fragment>
                          )),
                      )
                    : (['a', 'b'] as const).map((run) =>
                          Array.from({ length: NULL_REPEAT }, (_, i) => (
                              <Fragment key={`null-${run}-${i}`}>
                                  <span className="tape-item tape-item-null">{NULL_PHRASE}</span>
                                  <span className="tape-sep-outer" aria-hidden="true">◆</span>
                              </Fragment>
                          )),
                      )}
            </div>
        </div>
    );
}
