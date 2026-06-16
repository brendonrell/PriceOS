'use client';

/*
 * components/achievements/AchievementsGrid.tsx
 *
 * Presentational achievements grid — the PUBLIC achievements wall shown on a
 * profile's "+ More → Achievements" tab. Pure render: it takes the unlocked
 * set (ids the owner has earned) and paints the FULL catalog
 * (lib/achievements/catalog) grouped by category, each tile locked/unlocked.
 *
 * Tile states (matches the PriceSprite modal rail treatment):
 *   - UNLOCKED ......... solid border, full opacity, real name + points + icon.
 *   - LOCKED (visible) . dim + dashed, shows name + requirement blurb.
 *   - LOCKED + SECRET .. "???" with a generic locked blurb — never reveals the
 *                        name/blurb of an unearned easter egg (Xbox/Steam style).
 *
 * The icon is the catalog's `icon` when present, else a tasteful per-category
 * fallback glyph (CATEGORY_GLYPH). No invented data — every value comes from
 * the catalog + the unlocked set passed in.
 */

import { useMemo } from 'react';
import {
    ACHIEVEMENTS,
    type Achievement,
    type AchievementCategory,
} from '../../lib/achievements/catalog';

const VS15 = '︎';

/* Per-category fallback glyph — used when an achievement has no `icon` yet.
   Legible at tile size, in the spirit of the ASCII PriceSprites. */
const CATEGORY_GLYPH: Record<AchievementCategory, string> = {
    primary: '◍',
    trading: '⊟',
    social: '⊙',
    projects: '⌗',
    anointing: '✢',
    streak: '◈',
    og: '⌖',
    curation: '✦',
    identity: '◉',
    rank: '❂',
    artist: '✺',
    lore: '⁂',
};

/* Section order + human labels for the category headers. Order is deliberate:
   the heavy/primary categories first, lore (easter eggs) last. */
const CATEGORY_ORDER: readonly AchievementCategory[] = [
    'primary',
    'trading',
    'social',
    'projects',
    'anointing',
    'streak',
    'curation',
    'identity',
    'rank',
    'og',
    'artist',
    'lore',
];

const CATEGORY_LABEL: Record<AchievementCategory, string> = {
    primary: 'MINTING',
    trading: 'TRADING',
    social: 'SOCIAL',
    projects: 'PROJECTS',
    anointing: 'ANOINTING',
    streak: 'STREAK',
    og: 'LONGEVITY',
    curation: 'CURATION',
    identity: 'IDENTITY',
    rank: 'RANK',
    artist: 'ARTIST',
    lore: 'EASTER EGGS',
};

/** The glyph shown on a tile — catalog icon if present, else category fallback. */
export function tileGlyph(a: Achievement): string {
    return a.icon && a.icon.trim() ? a.icon : CATEGORY_GLYPH[a.category];
}

export default function AchievementsGrid({
    unlocked,
}: {
    /** The set of achievement ids the profile owner has unlocked. */
    unlocked: ReadonlySet<string>;
}) {
    /* Group the catalog by category once. Stable across renders unless the
       (module-constant) catalog changes — so this is effectively memoised on
       first mount. */
    const groups = useMemo(() => {
        const byCat = new Map<AchievementCategory, Achievement[]>();
        for (const a of ACHIEVEMENTS) {
            const arr = byCat.get(a.category) ?? [];
            arr.push(a);
            byCat.set(a.category, arr);
        }
        return CATEGORY_ORDER.filter((c) => byCat.has(c)).map((c) => ({
            category: c,
            label: CATEGORY_LABEL[c],
            items: byCat.get(c) as Achievement[],
        }));
    }, []);

    return (
        <div className="ach-wall">
            {groups.map(({ category, label, items }) => {
                const earned = items.filter((a) => unlocked.has(a.id)).length;
                return (
                    <section className="ach-group" key={category} aria-label={label}>
                        <div className="ach-group-head">
                            <span className="ach-group-name">{label}</span>
                            <span className="ach-group-count">
                                {earned} / {items.length}
                            </span>
                        </div>
                        <div className="ach-grid">
                            {items.map((a) => {
                                const isUnlocked = unlocked.has(a.id);
                                const hidden = a.secret && !isUnlocked;
                                return (
                                    <div
                                        className={`ach-cell${isUnlocked ? ' unlocked' : ''}${hidden ? ' secret' : ''}`}
                                        key={a.id}
                                    >
                                        <span className="ach-cell-glyph">
                                            {hidden ? `?${VS15}` : `${tileGlyph(a)}${VS15}`}
                                        </span>
                                        <span className="ach-cell-name">
                                            {hidden ? '???' : a.name}
                                        </span>
                                        <span className="ach-cell-blurb">
                                            {hidden ? 'Hidden — keep playing.' : a.blurb}
                                        </span>
                                        <span className="ach-cell-pts">{a.points} PTS</span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
