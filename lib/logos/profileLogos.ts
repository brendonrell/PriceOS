/*
 * profileLogos — the Profile Logo catalog.
 *
 * Profile Logo lets a user pick a custom version of the PD logo bubble. The
 * pick is stored on their account (`users.profile_logo`) and, when ANYONE
 * visits their profile, the site logo (top-left bubble) renders THEIR chosen
 * mark instead of the default — overriding the viewer's own theme, and there's
 * no setting that hides it (it's site chrome).
 *
 * Every option is the SAME speech-bubble outline (the navbar Petey bubble);
 * only the bubble colour and the mark inside it change. The first option,
 * `price`, is the brand classic (the $PRICE per-mille in Hothurt red + yellow).
 * The rest pair an iOS-safe text glyph from the PD glyph vocabulary
 * (docs/GLYPHS.md — all device-verified) with a colour treatment.
 *
 * This module is plain TS (no 'use client', no React) so the /api/me validator
 * can import VALID_PROFILE_LOGO_IDS on the server. The visual renderer is
 * components/profile/ProfileLogoMark.tsx.
 */

export interface ProfileLogoDef {
    /** Stable key persisted to users.profile_logo. */
    id: string;
    /** Human label shown in the picker toast. */
    label: string;
    /** Bubble fill colour. */
    bubble: string;
    /** Colour of the mark inside the bubble. */
    ink: string;
    /** The mark inside the bubble — a per-mille sign or an iOS-safe PD glyph. */
    glyph: string;
    /** Font for the inner mark. The per-mille brand mark renders in Inter (the
     *  logo's typeface); the VS-15 PD glyphs render in Courier (forced text). */
    font: 'inter' | 'courier';
}

const VS = '︎'; // VS-15: force text presentation on the PD glyphs.

/* 18 options to start. The opener is the brand classic; the rest "paint the
 * bubble different colours" with a different mark inside. Glyphs are drawn from
 * the locked, device-verified PD vocabulary (docs/GLYPHS.md). Reserved violet
 * (#C488FF — the genesis project's colour) is deliberately avoided. */
export const PROFILE_LOGOS: readonly ProfileLogoDef[] = [
    { id: 'price',     label: 'Classic',    bubble: '#FF0033', ink: '#FFE600', glyph: '‰',      font: 'inter'   },
    { id: 'ink',       label: 'Ink',        bubble: '#111111', ink: '#FFFFFF', glyph: '‰',      font: 'inter'   },
    { id: 'paper',     label: 'Paper',      bubble: '#F5F5F5', ink: '#111111', glyph: '‰',      font: 'inter'   },
    { id: 'gold',      label: 'Gold',       bubble: '#0A0A0A', ink: '#FFC400', glyph: '‰',      font: 'inter'   },
    { id: 'mint',      label: 'Mint',       bubble: '#00E5A0', ink: '#04221A', glyph: '‰',      font: 'inter'   },
    { id: 'cobalt',    label: 'Cobalt',     bubble: '#2D6CFF', ink: '#EAF1FF', glyph: '‰',      font: 'inter'   },
    { id: 'ember',     label: 'Ember',      bubble: '#FF6B00', ink: '#1A0A00', glyph: '‰',      font: 'inter'   },
    { id: 'nova',      label: 'Nova',       bubble: '#111827', ink: '#FFFFFF', glyph: '✺' + VS, font: 'courier' },
    { id: 'ring',      label: 'Ring',       bubble: '#0E1726', ink: '#7FE7FF', glyph: '◉' + VS, font: 'courier' },
    { id: 'sol',       label: 'Sol',        bubble: '#1A1300', ink: '#FFD000', glyph: '❂' + VS, font: 'courier' },
    { id: 'cartel',    label: 'Cartel',     bubble: '#14060A', ink: '#FF3366', glyph: '⟁' + VS, font: 'courier' },
    { id: 'facet',     label: 'Facet',      bubble: '#101418', ink: '#8AF0FF', glyph: '⬢' + VS, font: 'courier' },
    { id: 'ascend',    label: 'Ascend',     bubble: '#07120C', ink: '#58F08A', glyph: '△' + VS, font: 'courier' },
    { id: 'rarity',    label: 'Rarity',     bubble: '#101010', ink: '#B9C2FF', glyph: '❖' + VS, font: 'courier' },
    { id: 'spark',     label: 'Spark',      bubble: '#1B1B00', ink: '#FFE600', glyph: '✦' + VS, font: 'courier' },
    { id: 'streak',    label: 'Streak',     bubble: '#00131A', ink: '#00D0FF', glyph: '◈' + VS, font: 'courier' },
    { id: 'archetype', label: 'Archetype',  bubble: '#0B0B0B', ink: '#FF8AC2', glyph: '✻' + VS, font: 'courier' },
    { id: 'collector', label: 'Collector',  bubble: '#0A1208', ink: '#C9FF6B', glyph: '☻' + VS, font: 'courier' },
];

/** The first option (the brand classic) is the implicit default. */
export const DEFAULT_PROFILE_LOGO_ID = 'price';

/** Set of valid ids — the /api/me validator's whitelist. */
export const VALID_PROFILE_LOGO_IDS: ReadonlySet<string> = new Set(
    PROFILE_LOGOS.map((l) => l.id),
);

export function getProfileLogo(id: string | null | undefined): ProfileLogoDef | undefined {
    if (!id) return undefined;
    return PROFILE_LOGOS.find((l) => l.id === id);
}
