/*
 * Shared types + tiny formatters for the profile page family
 * (ProfilePageBody + its extracted hooks/components). Split out of the
 * ProfilePageBody monolith 2026-07-06 — pure moves, no behavior change.
 */

/**
 * Format an ISO timestamp (users.created_at) as "MMM DD YYYY" in the hero
 * date slot — e.g. "2026-05-13T..." → "MAY 13 2026". Matches the project
 * page's PriceDay date format (JUL 09 2026).
 */
export function formatMemberSince(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d
        .toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
            timeZone: 'UTC',
        })
        .replace(',', '')
        .toUpperCase();
}

export type ProfileTab = 'showcase' | 'collected' | 'more';
export type ProfileMoreL1 = 'created' | 'starred' | 'wishlists' | 'albums' | 'offers' | 'vault' | 'sigil' | 'loyalty' | 'counterparties' | 'history' | 'achievements' | 'discord' | 'anointed' | 'targets' | 'calls';
/* Artist Showcase (Artist style): 'created' = the now-minting view of the
   projects this artist made; 'regular' = their curated Top 6 grid. */
export type ShowcaseView = 'created' | 'regular';

/* Per-project live stats for an artist's own projects (from /api/artist) —
   feeds the showcase facet bar's birth/Status facets, date sort, and feed. */
export interface ArtistProjStat {
    minted_count: number;
    uploaded_at: number | null;
    reached_at: number | null;
    sold_out_at: number | null;
    milestones: Record<string, number>;
}

/* Artist showcase facets = the home set minus Artist + Project (redundant for a
   single artist); Created · Top 6 lead the row in their place. */
export const ARTIST_SHOWCASE_FACETS = ['PriceDay', 'Sun', 'Moon', 'Rising', 'Status', 'Fate'] as const;

/* A home activity-feed item for the artist showcase Created feed. */
export interface ArtistFeedItem { slug: string; title: string; label: string; glyph: string; cls?: string; ts: number; seq: number }

/* Feed stamps are VIEWER-LOCAL (Brendon, 2026-07-13: displayed clock times
   always render in the user's own zone; the date column tracks the same zone
   so a late-night event's date and time never disagree). */
export function fmtFeedDate(ms: number | null): string {
    if (ms == null) return '—';
    return new Date(ms)
        .toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
        .toUpperCase();
}
export function fmtFeedTime(ms: number | null): string {
    if (ms == null) return '—';
    return new Date(ms)
        .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/* Outputs per artist-project carousel (matches the home carousel: 18). */
export const CAROUSEL_SIZE = 18;

/** One collected Output, from /api/user/[address]/outputs. */
export interface Holding {
    slug: string;
    token_id: number;
    list_price_eth: string | null;
    /** Mint event timestamp (Unix seconds) — source for PriceDay + Natal. */
    mint_ts: number | null;
}
