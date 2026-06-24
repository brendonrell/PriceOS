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

export function buildProjectAttributes(slug: string, uploadedAt: number | null): AttrGroup[] {
    const project = getProject(slug);
    if (!project) return [];
    const groups: AttrGroup[] = [];

    /* ── Identity ─────────────────────────────────────────────────────── */
    const identity: AttrTile[] = [
        { glyph: '✶', label: 'True Name', value: projectTrueName(slug) },
        { glyph: '◈', label: 'Project', value: project.displayName },
        { glyph: '✺', label: 'Artist', value: `@${project.artistHandle}` },
        { glyph: '⬚', label: 'Supply', value: `${project.outputs}` },
    ];
    if (project.mintPriceEth != null) identity.push({ glyph: '⟠', label: 'Mint Price', value: `${project.mintPriceEth} ETH` });
    if (project.colorway) identity.push({ glyph: '◉', label: 'Colorway', value: project.colorway.toUpperCase(), swatch: project.colorway });
    if (project.soundtrack) identity.push({ glyph: '♫', label: 'Soundtrack', value: project.soundtrack.label });
    groups.push({ key: 'identity', label: 'Identity', tiles: identity });

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
