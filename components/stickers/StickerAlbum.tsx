'use client';

/*
 * StickerAlbum — MY STICKER BINDER (user-facing word is Binder, Brendon
 * 2026-07-16, so it never collides with the app's Albums feature; internal
 * names keep the album- prefix). The completionist face of the Sticker
 * Exchange: every sheet is a binder page of slots — held stickers print
 * full-strength,
 * missing ones sit as dimmed outlines in their slot. Per-sheet tallies, a
 * COMPLETE ✓ when a page is done, and the total at the top. Got/need at a
 * glance is what sends people to the MKT view for the ones they're missing.
 */

import { useMemo } from 'react';
import { SHEETS, stickersForSheet } from '../../lib/stickers/catalog';
import { useOwnedStickerIds } from '../../lib/stickers/owned';
import { StickerArt } from './StickerArt';

const VS15 = '︎';

export default function StickerAlbum({ compact }: { compact?: boolean }) {
    const ownedIds = useOwnedStickerIds();
    const owned = useMemo(() => new Set(ownedIds), [ownedIds]);

    const pages = SHEETS.map((sheet) => {
        const slots = stickersForSheet(sheet.id);
        const got = slots.filter((s) => owned.has(s.id)).length;
        return { sheet, slots, got, total: slots.length, complete: got === slots.length && slots.length > 0 };
    });
    const gotAll = pages.reduce((n, p) => n + p.got, 0);
    const totalAll = pages.reduce((n, p) => n + p.total, 0);

    /* Compact — a swipeable rail of mini progress cards, one per sheet
       (Brendon, 2026-08-30). Tap scrolls the full page stack into view
       via an anchor, same as tapping a page normally would just show it. */
    if (compact) {
        return (
            <>
            <div className="skm-book-head alb-compact-head">
                <span className="skm-book-title">MY STICKER BINDER</span>
                <span className="skm-book-pos">{gotAll}/{totalAll} collected</span>
            </div>
            <div className="ss-rail alb-rail">
                {pages.map(({ sheet, got, total, complete }) => {
                    const pct = total ? Math.round((got / total) * 100) : 0;
                    return (
                        <div className="alb-card" key={sheet.id}>
                            <div className="alb-card-name">{sheet.name}</div>
                            <div className="alb-progress alb-card-bar" aria-hidden="true">
                                <span style={{ width: `${pct}%` }} />
                            </div>
                            <div className={`alb-card-tally${complete ? ' is-complete' : ''}`}>
                                {complete ? `COMPLETE ✓${VS15}` : `${got}/${total}`}
                            </div>
                            <div className="alb-card-dots" aria-hidden="true">
                                {Array.from({ length: total }, (_, i) => (
                                    <span key={i} className={`alb-card-dot${i < got ? ' is-got' : ''}`} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="ss-foot">missing something? the MKT view has the singles market</div>
            </>
        );
    }

    return (
        <>
        <div className="skm-wrap alb-wrap">
            <div className="skm-book-head">
                <span className="skm-book-title">MY STICKER BINDER</span>
                <span className="skm-book-pos">{gotAll}/{totalAll} collected</span>
            </div>
            <div className="alb-progress alb-progress-all" aria-hidden="true">
                <span style={{ width: `${totalAll ? Math.round((gotAll / totalAll) * 100) : 0}%` }} />
            </div>
            {pages.map(({ sheet, slots, got, total, complete }) => (
                <div className="alb-page" key={sheet.id}>
                    <div className="cpl-month-head">
                        <span className="cpl-month-name">{sheet.name}</span>
                        <span className={`cpl-month-tally${complete ? ' is-complete' : ''}`}>
                            {complete ? `COMPLETE ✓${VS15}` : `${got}/${total}`}
                        </span>
                    </div>
                    <div className="alb-progress" aria-hidden="true">
                        <span style={{ width: `${total ? Math.round((got / total) * 100) : 0}%` }} />
                    </div>
                    <div className="alb-slots">
                        {slots.map((s) => (
                            <span
                                key={s.id}
                                className={`alb-slot${owned.has(s.id) ? ' is-got' : ''}`}
                                title={owned.has(s.id) ? s.name : `${s.name} — needed`}
                            >
                                <StickerArt sticker={s} size={34} />
                            </span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
        <div className="ss-foot">missing something? the MKT view has the singles market</div>
        </>
    );
}
