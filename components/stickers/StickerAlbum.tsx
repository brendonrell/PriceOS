'use client';

/*
 * StickerAlbum — MY STICKER ALBUM (named so it never collides with the app's
 * Albums feature). The completionist face of the Sticker Exchange: every
 * sheet is an album page of slots — stickers you hold print full-strength,
 * missing ones sit as dimmed outlines in their slot. Per-sheet tallies, a
 * COMPLETE ✓ when a page is done, and the total at the top. Got/need at a
 * glance is what sends people to the MKT view for the ones they're missing.
 */

import { useMemo } from 'react';
import { SHEETS, stickersForSheet } from '../../lib/stickers/catalog';
import { useOwnedStickerIds } from '../../lib/stickers/owned';
import { StickerArt } from './StickerArt';

const VS15 = '︎';

export default function StickerAlbum() {
    const ownedIds = useOwnedStickerIds();
    const owned = useMemo(() => new Set(ownedIds), [ownedIds]);

    const pages = SHEETS.map((sheet) => {
        const slots = stickersForSheet(sheet.id);
        const got = slots.filter((s) => owned.has(s.id)).length;
        return { sheet, slots, got, total: slots.length, complete: got === slots.length && slots.length > 0 };
    });
    const gotAll = pages.reduce((n, p) => n + p.got, 0);
    const totalAll = pages.reduce((n, p) => n + p.total, 0);

    return (
        <div className="skm-wrap alb-wrap">
            <div className="skm-book-head">
                <span className="skm-book-title">MY STICKER ALBUM</span>
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
            <div className="ss-foot">missing something? the MKT view has the singles market</div>
        </div>
    );
}
