/*
 * buildProjectAttributes — the Project's "character sheet", in the SAME grouped
 * tile shape as an Output's (lib/output/attributes). Lets the Project ▸ + More ▸
 * Attributes tab render through the shared AttrWall, identical to outputs
 * (Brendon, 2026-06-24).
 */

import type { AttrGroup, AttrTile } from '../output/attributes';
import { getProject, projectTrueName } from './registry';
import { projectFateReading } from './fate';
import { natalChart } from './natal';
import { golfScore } from './golfScore';
import { birthWeekday, birthTimeOfDay, birthSeason, lunarPhase, lunarGlyph, lunarIllumination } from '../output/derive';
import { PROJECT_MILESTONES, FEED_LIFECYCLE } from '../home/milestones';

/** A project's earned milestone badges, in the order they're crossed, each with
    its own dedicated feed icon. A project accrues these as its mint count grows;
    only earned ones show (Brendon, 2026-06-25). The highest earned is flagged as
    the current standing. Returns null when there's nothing to show. */
export function buildMilestoneGroup(mintedCount: number, maxSupply: number): AttrGroup | null {
    const tiles: AttrTile[] = [];
    // UPLOADED — every live project has launched.
    tiles.push({ glyph: FEED_LIFECYCLE.upload.glyph, label: FEED_LIFECYCLE.upload.label, value: 'Launched' });
    for (const m of PROJECT_MILESTONES) {
        if (mintedCount < m.count) continue;
        // GRADUATED (18) sits between FIRST BLOOD (1) and LUCKY 22 (22).
        if (m.count > 18 && mintedCount >= 18 && !tiles.some((t) => t.label === FEED_LIFECYCLE.graduated.label)) {
            tiles.push({ glyph: FEED_LIFECYCLE.graduated.glyph, label: FEED_LIFECYCLE.graduated.label, value: '18 mints' });
        }
        tiles.push({ glyph: m.glyph, label: m.label, value: m.count === 1 ? '1st mint' : `${m.count} mints` });
    }
    // GRADUATED when between 18 and the next count milestone (22) — the loop above
    // only injects it once a higher milestone lands, so cover the gap here.
    if (mintedCount >= 18 && !tiles.some((t) => t.label === FEED_LIFECYCLE.graduated.label)) {
        const firstBlood = tiles.findIndex((t) => t.label === 'FIRST BLOOD');
        const grad: AttrTile = { glyph: FEED_LIFECYCLE.graduated.glyph, label: FEED_LIFECYCLE.graduated.label, value: '18 mints' };
        if (firstBlood >= 0) tiles.splice(firstBlood + 1, 0, grad); else tiles.push(grad);
    }
    // ASCENSION — sold out (last).
    if (maxSupply > 0 && mintedCount >= maxSupply) {
        tiles.push({ glyph: FEED_LIFECYCLE.ascension.glyph, label: FEED_LIFECYCLE.ascension.label, value: 'Sold out' });
    }
    if (!tiles.length) return null;
    tiles[tiles.length - 1].rare = true; // current standing = highest earned
    return { key: 'milestones', label: 'Milestones', tiles };
}

export function buildProjectAttributes(
    slug: string,
    uploadedAt: number | null,
    opts?: { mintedCount?: number; maxSupply?: number; projectNo?: number | null },
): AttrGroup[] {
    const project = getProject(slug);
    if (!project) return [];
    const groups: AttrGroup[] = [];

    /* ── Identity ─────────────────────────────────────────────────────── */
    const identity: AttrTile[] = [
        { glyph: '◈', label: 'Project', value: project.displayName },
        // PROJECT ID — the platform-wide upload-order number, unique per
        // project (Brendon, 2026-07-06). ⌗ = the projects glyph (GLYPHS §4).
        ...(opts?.projectNo != null
            ? [{ glyph: '⌗', label: 'Project ID', value: `#${opts.projectNo}` } as AttrTile]
            : []),
        { glyph: '✺', label: 'Artist', value: `@${project.artistHandle}` },
        { glyph: '⬚', label: 'Supply', value: `${project.outputs}` },
    ];
    if (project.mintPriceEth != null) identity.push({ glyph: '◊', label: 'Mint Price', value: `${project.mintPriceEth} ETH` });
    if (project.colorway) identity.push({ glyph: '◉', label: 'Colorway', value: project.colorway.toUpperCase(), swatch: project.colorway });
    if (project.soundtrack) identity.push({ glyph: '♫', label: 'Soundtrack', value: project.soundtrack.label });
    // True Name sits LAST in Identity (Brendon 2026-06-26).
    identity.push({ glyph: '✶', label: 'True Name', value: projectTrueName(slug) });
    groups.push({ key: 'identity', label: 'Identity', tiles: identity });

    /* ── Milestones (earned badges, each with its dedicated feed icon) ──── */
    if (opts?.mintedCount != null) {
        const ms = buildMilestoneGroup(opts.mintedCount, opts.maxSupply ?? project.outputs);
        if (ms) groups.push(ms);
    }

    /* ── Sky (natal chart at the upload moment) ───────────────────────── */
    const chart = natalChart(uploadedAt ?? Date.now());
    groups.push({
        key: 'sky',
        label: 'Sky',
        tiles: [
            { glyph: '☉', label: 'Sun', value: chart.sun },
            { glyph: '☽', label: 'Moon', value: chart.moon },
            { glyph: '↑', label: 'Rising', value: chart.rising },
        ],
    });

    /* ── Almanac (the project's birth moment — its upload) ────────────── */
    const birthMs = uploadedAt ?? Date.now();
    groups.push({
        key: 'almanac',
        label: 'Almanac',
        tiles: [
            { glyph: '✲', label: 'Weekday', value: birthWeekday(birthMs) },
            { glyph: '◷', label: 'Born', value: birthTimeOfDay(birthMs) },
            { glyph: '❅', label: 'Season', value: birthSeason(birthMs) },
            {
                glyph: lunarGlyph(birthMs), label: 'Lunar Phase', value: lunarPhase(birthMs),
                sub: `${Math.round(lunarIllumination(birthMs) * 100)}% lit`,
            },
        ],
    });

    /* ── Oracle (Fate) ────────────────────────────────────────────────── */
    const fate = projectFateReading(slug);
    groups.push({
        key: 'oracle',
        label: 'Oracle',
        tiles: [{ glyph: fate.glyph, label: 'Fate', value: fate.fate }],
    });

    /* ── Lab (Golf Score — engine efficiency, ranked across projects) ──── */
    const golf = golfScore(slug);
    if (golf) {
        groups.push({
            key: 'lab',
            label: 'Lab',
            tiles: [{
                glyph: '◴', label: 'Golf Score', value: `${golf.bytes.toLocaleString()} B`,
                sub: `#${golf.rank} of ${golf.total} · smallest engine wins`,
                rare: golf.rank === 1,
            }],
        });
    }

    return groups;
}
