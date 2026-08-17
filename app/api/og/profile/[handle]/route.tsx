/*
 * app/api/og/profile/[handle]/route.tsx — the wide profile share image.
 *
 * Replaces the old "grab the #1 Showcase piece" og:image (Brendon,
 * 2026-08-16). Nothing is stored or pre-rendered: every request rebuilds the
 * image from the same live data the profile hero itself paints from — the
 * nav logo + wallet badge (both already plain inline SVG paths, lifted
 * verbatim from PeteyLogo.tsx), the title/identity rows, and the profile
 * tags via the same deriveTags() the hero uses.
 *
 * Runs on Cloudflare Workers (OpenNext) — no `fs`. The one asset this needs,
 * Rubik Mono One, is FETCHED from Google Fonts at request time and cached
 * per-isolate, the same way every next/og example on an edge-style runtime
 * loads a font; there is no local font file to read.
 *
 * Old showcase-piece / PD-mark image is now the FALLBACK, not the primary —
 * generateMetadata in app/[slug]/page.tsx only reaches for it if this route
 * 500s or the handle doesn't resolve to a user.
 */

import { ImageResponse } from 'next/og';
import { getUserProfileByHandle } from '@/lib/profile/getUserProfileByHandle';
import { getArtistStatus } from '@/lib/artists/allowlist';
import { artistSignatureColor, projectsByArtist } from '@/lib/project/registry';
import { deriveTags } from '@/lib/tags/derive';
import { shortAddress } from '@/lib/project/projectAddress';

export const runtime = 'nodejs';

const W = 1200;
const H = 630;

/* Mirrors lib/state/ColorwayContext.tsx's resolveTextColor exactly (YIQ
   luminance cut) — duplicated rather than imported since that module is
   'use client' and this route has no React tree to hang it off. */
function resolveTextColor(bgHex: string): string {
    const hex = bgHex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#111111' : '#e0e0e0';
}

/* Petey speech-bubble logo path data — verbatim from components/shell/
   PeteyLogo.tsx's default (non-holo, non-sigil) glyph. */
const PETEY_BUBBLE_PATH =
    'M85.2021 548.561C42.8699 529.988 15.6745 498.753 4.19883 454.463C1.48652 443.995 0.274671 432.855 0.244021 422.019C-0.0236921 327.349 -0.138982 232.675 0.255934 138.005C0.54681 68.2708 52.8591 9.92044 122.093 1.22737C128.083 0.475297 134.204 0.613785 140.264 0.603791C175.854 0.545177 211.443 0.598222 247.032 0.55311C370.084 0.397073 493.136 0.268937 616.187 0.000470443C641.114 -0.0539179 664.926 4.60223 686.744 16.7622C729.923 40.8271 755.566 77.412 759.522 126.875C761.87 156.23 760.704 185.883 760.754 215.403C760.868 282.494 760.87 349.586 760.668 416.677C760.605 437.544 757.771 457.979 748.71 477.184C727.938 521.211 693.705 547.895 645.88 556.789C636.911 558.457 627.619 558.964 618.471 559.006C569.559 559.235 520.645 559.196 471.731 559.083C467.266 559.073 464.145 560.266 461.121 563.704C436.981 591.159 412.59 618.395 388.391 645.798C378.113 657.437 364.265 658.326 353.773 646.799C333.506 624.535 313.712 601.841 293.735 579.312C288.937 573.901 284.484 568.14 279.288 563.147C277.067 561.014 273.355 559.337 270.31 559.321C227.855 559.096 185.396 559.009 142.941 559.297C123.079 559.432 104.097 555.667 85.2021 548.561Z';
const PETEY_GLYPH_PATH =
    'M564.413 318.773C555.823 317.223 547.291 315.061 538.632 314.244C517.392 312.239 498.825 318.448 484.023 334.217C481.368 337.046 479.939 336.415 477.387 334.249C472.203 329.851 467.097 325.037 461.162 321.904C440.592 311.044 418.923 311.324 397.503 318.615C376.076 325.909 360.791 340.458 354.626 362.568C349.523 380.87 349.701 399.887 353.682 418.343C359.769 446.564 381.205 464.964 410.61 469.341C436.248 473.158 459.824 470.164 478.296 449.641C481.259 446.349 483.009 448.684 484.929 450.646C491.699 457.565 499.109 463.403 508.531 466.482C522.601 471.081 536.778 471.095 551.349 469.393C577.445 466.344 601.157 447.291 606.842 421.584C609.543 409.373 609.216 396.409 609.52 383.768C610.225 354.439 593.273 329.264 564.413 318.773ZM293.97 270.436C304.87 263.703 313.412 254.807 319.121 243.255C330.605 220.02 328.412 195.353 326.627 170.769C326.335 166.735 325.16 162.689 323.888 158.815C315.53 133.362 298.551 116.884 272.121 111.537C253.092 107.687 233.884 107.554 216.063 116.838C194.33 128.16 180.8 146.181 178.048 170.566C176.374 185.406 176.917 200.617 177.739 215.591C178.943 237.537 188.442 255.882 207.135 267.713C234.885 285.275 263.982 284.555 293.97 270.436ZM348.806 312.356C391.815 248.872 435.897 186.106 477.553 120.908C465.934 119.774 454.846 120.106 443.791 119.639C438.018 119.394 434.67 121.278 431.414 126.12C396.717 177.729 361.947 229.292 326.806 280.599C285.48 340.934 243.763 401.002 202.245 461.206C201.337 462.524 200.775 464.08 199.579 466.468C214.173 466.468 227.617 466.599 241.052 466.298C242.692 466.261 244.713 464.196 245.83 462.571C280.051 412.77 314.181 362.906 348.806 312.356Z';
const PETEY_DOT_RIGHT_PATH =
    'M507.266 410.237C506.947 398.666 505.667 387.443 506.861 376.489C508.487 361.575 520.49 353.604 537.53 354.185C550.555 354.63 561.421 364.77 562.428 378.491C563.126 388.011 563.056 397.654 562.449 407.186C561.691 419.107 553.013 427.626 540.709 429.728C523.198 432.721 513.649 427.265 507.266 410.237Z';
const PETEY_DOT_LEFT_PATH =
    'M444.737 425.35C434.349 431.954 423.524 432.537 413.125 427.669C402.753 422.813 398.864 413.051 398.51 402.069C398.259 394.282 398.135 386.396 399.052 378.685C400.753 364.387 411.955 354.729 425.125 354.126C443.139 353.301 452.558 363.567 454.084 378.15C455.187 388.693 454.813 399.608 453.342 410.111C452.604 415.382 447.949 420.103 444.737 425.35Z';
const PETEY_DOT_TOP_PATH =
    'M278.519 194.495C277.378 204.322 277.17 213.805 274.859 222.745C272.113 233.368 264.783 237.631 253.212 237.735C240.318 237.852 233.177 233.613 229.29 223.142C224.817 211.096 225.515 198.537 226.23 186.048C226.518 181.002 227.018 175.882 228.217 170.99C231.199 158.815 238.713 153.213 251.95 152.618C264.255 152.064 271.812 156.478 275.274 168.588C277.587 176.677 277.522 185.446 278.519 194.495Z';

/* Cloudflare Workers has no filesystem to read a local .ttf from, so the
   font is fetched from Google Fonts (the same family next/font/google
   pulls at build time for the rest of the site) and its bytes cached on the
   isolate for the life of that isolate — one fetch per cold start, not one
   per request. */
let fontPromise: Promise<ArrayBuffer> | null = null;
async function loadFont(): Promise<ArrayBuffer> {
    if (!fontPromise) {
        fontPromise = (async () => {
            const css = await fetch(
                'https://fonts.googleapis.com/css2?family=Rubik+Mono+One&display=swap',
            ).then((r) => r.text());
            const url = css.match(/src: url\(([^)]+)\)/)?.[1];
            if (!url) throw new Error('Rubik Mono One: no font url in Google Fonts CSS');
            return fetch(url).then((r) => r.arrayBuffer());
        })();
    }
    return fontPromise;
}

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ handle: string }> },
) {
    const { handle: rawHandle } = await params;
    try {
        const user = await getUserProfileByHandle(rawHandle);
        if (!user) return new Response('not found', { status: 404 });

        const bg = user.profile_hex ?? artistSignatureColor(rawHandle) ?? '#E0E0E0';
        const text = resolveTextColor(bg);
        const dim = `${text}66`; // ~40% — borders / secondary text

        // Mirrors ProfilePageBody's own isArtist cut exactly — allowlisted
        // AND has at least one uploaded Project (a whitelist row alone
        // doesn't earn the chip).
        const artistStatus = await getArtistStatus(user.address).catch(() => null);
        const isArtist = !!artistStatus && projectsByArtist(user.handle ?? rawHandle).length > 0;

        const tags = deriveTags({
            profileTags: user.profile_tags ?? [],
            grantedTags: user.granted_tags ?? [],
            userNumber: user.user_number,
            isArtist,
            createdAt: user.created_at,
            address: user.address,
            handle: user.handle,
            teamTagStyle: user.team_tag_style,
            priceHoldRank: user.price_hold_rank,
            priceHeld: user.price_held,
            formulas: user.formulas,
            priceScore: user.price_score,
            shownTags: user.shown_tags,
            tagsOff: user.tags_off,
        }).slice(0, 8); // keeps a wide, non-artist-heavy row from overflowing

        const since = user.created_at
            ? new Date(user.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).toUpperCase()
            : null;
        const identity = user.ens_name || shortAddress(user.address);

        const font = await loadFont();

        return new ImageResponse(
            (
                <div
                    style={{
                        width: W,
                        height: H,
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: bg,
                        color: text,
                        padding: '48px 56px',
                        fontFamily: 'Rubik Mono One',
                    }}
                >
                    {/* Top row — the nav logo + wallet badge, exactly like every
                        page's navbar corners. */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <svg width="64" height="55" viewBox="0 0 761 655" fill="none">
                            <path d={PETEY_BUBBLE_PATH} fill={text} />
                            <path d={PETEY_GLYPH_PATH} fill={bg} />
                            <path d={PETEY_DOT_RIGHT_PATH} fill={text} />
                            <path d={PETEY_DOT_LEFT_PATH} fill={text} />
                            <path d={PETEY_DOT_TOP_PATH} fill={text} />
                        </svg>
                        <div
                            style={{
                                display: 'flex',
                                width: 64,
                                height: 64,
                                borderRadius: 14,
                                border: `2px solid ${dim}`,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                                <path d="M13 1 L25 13 L13 25 L1 13 Z" stroke={text} strokeWidth="2" />
                            </svg>
                        </div>
                    </div>

                    {/* Title row — @handle + join date. */}
                    <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 44, gap: 20 }}>
                        <div style={{ fontSize: 64 }}>@{user.handle}</div>
                        {since && <div style={{ fontSize: 26, color: dim }}>{since}</div>}
                    </div>

                    {/* Identity row — ENS or short wallet. */}
                    <div style={{ display: 'flex', fontSize: 24, color: dim, marginTop: 14 }}>
                        {identity}
                    </div>

                    {/* Tags row. */}
                    {tags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 40 }}>
                            {tags.map((t) => (
                                <div
                                    key={t.id}
                                    style={{
                                        display: 'flex',
                                        padding: '10px 18px',
                                        borderRadius: 999,
                                        backgroundColor: t.color,
                                        color: t.textColor ?? resolveTextColor(t.color),
                                        fontSize: 22,
                                    }}
                                >
                                    {t.label}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ),
            {
                width: W,
                height: H,
                fonts: [{ name: 'Rubik Mono One', data: font, style: 'normal' }],
            },
        );
    } catch {
        // Best-effort image — any failure (bad handle, DB hiccup, font fetch)
        // falls through to generateMetadata's own showcase-piece/PD-mark chain.
        return new Response('failed to render', { status: 500 });
    }
}
