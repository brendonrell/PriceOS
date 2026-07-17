import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Rubik_Mono_One, Inter } from 'next/font/google';
/* Imported from '@wagmi/core' — NOT the 'wagmi' react package — on purpose
   (perf batch 2026-06-10). The 'wagmi' entry barrel re-exports every
   'use client' hook module; importing ANYTHING from it in a server
   component makes Next register the entire hook surface as client entries
   for this layout, dragging ~380KB of wagmi/viem core into every page's
   first load. '@wagmi/core' exports the same cookieToInitialState (it's
   where the function actually lives) with zero client modules attached. */
import { cookieToInitialState, type Config as WagmiConfigType } from '@wagmi/core';
import './globals.css';

/*
  Self-hosted fonts via next/font/google — Next.js downloads the font
  files at build time and serves them from our own domain. Zero runtime
  requests to fonts.googleapis.com or fonts.gstatic.com, which keeps the
  site GDPR-clean (no IP-to-Google leak) and removes the need for a
  cookie consent banner. CSS references the variables instead of the
  literal font-family name.
*/
const rubikMono = Rubik_Mono_One({
    weight: '400',
    subsets: ['latin'],
    variable: '--font-rubik-mono',
    display: 'swap',
});

const inter = Inter({
    weight: ['400', '700'],
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});
import { PdNotifsProvider } from '../lib/state/PdNotifsContext';
import { FiatProvider } from '../lib/state/FiatContext';
import { ColorwayProvider } from '../lib/state/ColorwayContext';
import { ModalProvider } from '../lib/state/ModalContext';
import { DropdownProvider } from '../lib/state/DropdownContext';
import { SortProvider } from '../lib/state/SortContext';
import { ToastProvider } from '../lib/state/ToastContext';
import { RewindProvider } from '../lib/state/RewindContext';
import { PingsProvider } from '../lib/state/PingsContext';
import PriceRankSync from '../components/pricerank/PriceRankSync';
import { NotePromptProvider } from '../lib/state/NotePromptContext';
import { ValuePromptProvider } from '../lib/state/ValuePromptContext';
import { CalcSheetProvider } from '../lib/state/CalcSheetContext';
import { ProjectProvider } from '../lib/state/ProjectContext';
import { CartProvider } from '../lib/state/CartContext';
import { MarketSheetProvider } from '../lib/state/MarketSheetContext';
import { BenchProvider } from '../lib/state/BenchContext';
import { PersonaProvider } from '../lib/state/PersonaContext';
import { CalendarProvider } from '../lib/calendar/CalendarContext';
import { WorkspacesProvider } from '../lib/state/WorkspacesContext';
import { PriceOSShell } from '../components/shell/PriceOSShell';
import SwRegistrar from '../components/shell/SwRegistrar';
import { WalletProviders } from '../components/wallet/WalletProviders';
import { DevLoginButton } from '../components/dev/DevLoginButton';
import { getSession } from '../lib/auth/siwe';

/* Canonical origin for absolute share/preview URLs (og:image and friends must
   be absolute or link unfurlers can't fetch them). Set via NEXT_PUBLIC_SITE_URL
   in .env.production; falls back to the live Cloudflare preview. The old
   Vercel-era fallback pointed unfurlers at a dead host — every share embed
   rendered imageless until this (found 2026-07-13, the Discord share bug). */
const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://pricediscussion.pricediscussion.workers.dev';

const SITE_DESCRIPTION =
    'A web3 social platform where the community discussing secondary prices is the product. Browse projects, track grail pins, and explore generative art.';

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: 'Price Discussion',
    description: SITE_DESCRIPTION,
    /* Default share/preview image — the PWA app icon, so the OS share sheet and
       link unfurls show our mark instead of the browser's generic placeholder
       (Brendon, 2026-06-26). */
    openGraph: {
        title: 'Price Discussion',
        description: SITE_DESCRIPTION,
        type: 'website',
        images: [{ url: '/icon-1024px.png', width: 1024, height: 1024, alt: 'Price Discussion' }],
    },
    twitter: {
        card: 'summary',
        title: 'Price Discussion',
        description: SITE_DESCRIPTION,
        images: ['/icon-1024px.png'],
    },
};

/* Next.js App Router canonical way to set the viewport meta tag.
   The manual <meta name="viewport"> tag in JSX causes Next.js to
   emit TWO viewport tags — its own auto-generated one (without
   viewport-fit=cover) plus the manual one. The browser honours
   whichever comes last, which was Next.js's, silently dropping
   viewport-fit=cover and preventing the page from extending behind
   the iOS notch/home-indicator. Exporting `viewport` here lets
   Next.js emit a single canonical tag with all fields correct. */
export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
};

const PREHYDRATION_SCRIPT = `
(function () {
    try {
        // Per-page colorway override (sim deviation). Project pages
        // (/art/*) boot to the custom colorway when the user
        // has NOT picked a global colorway. Profile pages (/{handle}/*)
        // boot to Attention Yellow (#FFE600) — own slot, NOT linked
        // to the custom colorway. If the user has a saved pick,
        // that wins (the picker must work on every page).
        var pathname = (window.location && window.location.pathname) || '';
        var isProjectPage = pathname.indexOf('/art/') === 0;
        var isHomePage = pathname === '/' || pathname === '';
        var isDocsPage = pathname === '/docs' || pathname.indexOf('/docs/') === 0;

        // Profile-page detection mirrors ColorwayContext's first-segment
        // gate: not 'art', not 'api', not all-digits (output namespace),
        // matches the handle shape.
        var firstSeg = '';
        var segMatch = pathname.match(/^\\/([^/]+)/);
        if (segMatch) firstSeg = segMatch[1].toLowerCase();
        var isProfilePage =
            firstSeg.length > 0 &&
            firstSeg !== 'art' &&
            firstSeg !== 'api' &&
            firstSeg !== 'docs' &&
            !/^\d+$/.test(firstSeg) &&
            /^[@a-z0-9_-]+$/i.test(firstSeg);

        var savedTheme = null;
        try { savedTheme = localStorage.getItem('pd_settings_colorway'); } catch (e) { /* ignore */ }
        // Hashsyn never persists — sim 12617-12618.
        if (savedTheme === 'hashsyn') savedTheme = null;

        var colorway = savedTheme;
        // Docs pages: the "page-owner colour" IS Dark Mode (Brendon,
        // 2026-07-10) — no saved pick (or the Custom default) boots the
        // named dark colorway. An explicit light/orange/haze/… pick wins
        // via the normal flow below, same as every page.
        if (isDocsPage && (colorway === null || colorway === 'custom')) colorway = 'dark';
        if (colorway === null && isProjectPage) colorway = 'custom';
        // Non-project, non-profile pages (home, etc.) also default to
        // custom color so the site never cold-starts with Dot defaults.
        if (colorway === null && !isProfilePage) colorway = 'custom';
        var profileBoot = (colorway === null && isProfilePage);

        var COLORWAYS = {
            // Custom has no baked-in hue — it's derived per page (home → Mood
            // Ring below, project/profile → their own color). Dot is the only
            // last-resort fallback (Brendon 2026-06-13).
            custom:  '#111111',
            light:   '#e0e0e0',
            dark:    '#1a1a1a',
            orange:  '#ff6600',
            blue:    '#3D9EFF',
            red:     '#FF0033',
            hashsyn: '#7B2FFF'
        };

        // Helper: write every colorway-derived CSS var so the FOH matches
        // applyBgHex post-hydration. Without this, --mint-bg / --pill-l1-bg
        // / --modal-bg etc. fall through to the static globals.css
        // defaults (mint = #111111 / e0e0e0) → the hero CTA flashes black
        // until ColorwayContext's useEffect runs.
        function paintVars(bg, text, key) {
            var root = document.documentElement;
            var hex = bg.replace('#', '');
            var rr = parseInt(hex.substr(0, 2), 16) || 0;
            var gg = parseInt(hex.substr(2, 2), 16) || 0;
            var bb = parseInt(hex.substr(4, 2), 16) || 0;
            var isLight = text === '#111111';

            root.style.setProperty('--bg-color', bg);
            root.style.setProperty('--text-color', text);
            root.style.setProperty('--accent', text);
            root.style.setProperty('--border-color',
                isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)');
            root.style.setProperty('--stat-bg',
                isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.18)');
            root.style.setProperty('--stat-active-bg',
                isLight ? '#000000' : '#e0e0e0');
            root.style.setProperty('--stat-active-text',
                isLight ? '#e0e0e0' : '#000000');
            root.style.setProperty('--modal-bg',
                'rgba(' + rr + ',' + gg + ',' + bb + ',0.98)');
            root.style.setProperty('--btn-user-hover',
                isLight ? '#ffffff' : '#888888');

            var mintBg = '#111111', mintText = '#e0e0e0', mintBorder = '#111111';
            var mintBgImg = 'none';
            var pillL1Bg = text, pillL1Text = bg, pillL1Border = text;
            var pillL1BgImg = 'none', pillL1ActiveBgImg = 'none';

            if (key === 'dark') {
                mintBg = '#e0e0e0'; mintText = '#111111'; mintBorder = '#e0e0e0';
                pillL1Bg = '#111111'; pillL1Text = '#e0e0e0'; pillL1Border = '#e0e0e0';
                pillL1BgImg = 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(224,224,224,0.15) 2px, rgba(224,224,224,0.15) 4px)';
                pillL1ActiveBgImg = 'repeating-linear-gradient(45deg, transparent, transparent 1px, rgba(224,224,224,0.55) 1px, rgba(224,224,224,0.55) 2px)';
            }

            root.style.setProperty('--mint-bg', mintBg);
            root.style.setProperty('--mint-text', mintText);
            root.style.setProperty('--mint-border', mintBorder);
            root.style.setProperty('--mint-bg-img', mintBgImg);
            root.style.setProperty('--pill-l1-bg', pillL1Bg);
            root.style.setProperty('--pill-l1-text', pillL1Text);
            root.style.setProperty('--pill-l1-border', pillL1Border);
            root.style.setProperty('--pill-l1-bg-img', pillL1BgImg);
            root.style.setProperty('--pill-l1-active-bg-img', pillL1ActiveBgImg);

            // Sync Safari browser chrome color to the live bg — sim line 6859.
            // Without this Safari latches onto the static #111111 and repaints
            // its URL-bar/status-bar with a visible delay after the loader exits.
            var tcm = document.getElementById('theme-color-meta');
            if (tcm) tcm.setAttribute('content', bg);
            // iOS Safari reads the TOP status-bar tint from theme-color at LOAD
            // (it ignores later live changes — that's why only the bottom bar
            // darkened). So if Ambient Light is dimming in a browser tab, paint
            // the chrome dark right here at boot. No live toggling = no
            // regression risk; the live code keeps the bottom in lockstep.
            try {
                if (tcm) {
                    var ambN = JSON.parse(localStorage.getItem('pd_settings_notifs') || '{}');
                    var ambO = JSON.parse(localStorage.getItem('pd_ambient_opts') || '{}');
                    var ambD = ambO ? ambO.dim : 0;
                    var dimOn = ambD && ambD !== 'off' && ambD !== 0;
                    var standalone = (navigator.standalone === true) ||
                        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
                    if (ambN && ambN.ambientStrip && dimOn && !standalone) {
                        tcm.setAttribute('content', '#03020a');
                    }
                }
            } catch (e) { /* ignore */ }
        }

        if (profileBoot) {
            // Profile-page boot (viewer on the default/Custom colorway). The
            // profile OWNER's colour is per-profile server data the prehydration
            // script can't see, so paint the default here; ColorwayContext
            // repaints with the owner's real profile_hex once React mounts. The
            // default profile theme is brand matrix white (#E0E0E0) — an
            // un-themed profile reads blank (Brendon 2026-06-13).
            var pBg = '#E0E0E0';
            var pText = '#111111';
            paintVars(pBg, pText, null);
        } else if (colorway && COLORWAYS[colorway]) {
            var bg = COLORWAYS[colorway];

            // When colorway is 'custom' (project-page boot default OR user
            // pick), read the user's saved custom hex from
            // pd_custom_color so the page paints the picked color
            // instead of the static COLORWAYS.custom fallback.
            if (colorway === 'custom') {
                if (isHomePage) {
                    // Home's custom colour = the MOOD RING (Brendon,
                    // 2026-06-12): a new generative colour every PriceDay.
                    // This MUST mirror lib/mood/mood.ts draw-for-draw —
                    // hue jitter, sat, light, in that order off the same
                    // mulberry32 stream — or boot and hydration paint two
                    // different colours and home flashes on every load.
                    // (Replaced the fixed Attention Yellow boot fill.)
                    bg = (function () {
                        var EPOCH = Date.UTC(2026, 5, 12); // PRICEDAY_EPOCH
                        // Mood day flips at MIDNIGHT IN MONTREAL (lib/mood
                        // montrealDayNumber — keep these two in lockstep).
                        var ymd = new Intl.DateTimeFormat('en-CA', {
                            timeZone: 'America/Montreal',
                            year: 'numeric', month: '2-digit', day: '2-digit'
                        }).format(new Date());
                        var p = ymd.split('-');
                        var mid = Date.UTC(+p[0], +p[1] - 1, +p[2]);
                        var day = Math.max(1, Math.floor((mid - EPOCH) / 86400000) + 1);
                        var a = (day * 2654435761) >>> 0;
                        function rnd() {
                            a |= 0; a = (a + 0x6d2b79f5) | 0;
                            var t = Math.imul(a ^ (a >>> 15), 1 | a);
                            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                        }
                        // 55 = HUE_SALT, 62/38 sat + 40/20 light = the VIVID
                        // band (lib/mood) — keep all three in lockstep.
                        var hue = (day * 137.508 + 55 + rnd() * 24) % 360;
                        var sat = 62 + rnd() * 38;
                        var light = 40 + rnd() * 20;
                        var s = sat / 100, l = light / 100;
                        var k = s * Math.min(l, 1 - l);
                        function f(n) {
                            var x = (n + hue / 30) % 12;
                            var c = l - k * Math.max(-1, Math.min(x - 3, Math.min(9 - x, 1)));
                            return Math.round(255 * c).toString(16).padStart(2, '0');
                        }
                        return ('#' + f(0) + f(8) + f(4)).toUpperCase();
                    })();
                } else {
                    try {
                        var savedArtistColor = localStorage.getItem('pd_custom_color');
                        if (savedArtistColor && /^#[0-9A-F]{6}$/i.test(savedArtistColor)) {
                            bg = savedArtistColor.toUpperCase();
                        }
                    } catch (e) { /* ignore */ }
                }
            }

            // Pure Light / Pure Dark mode override (sim 6798-6803). Project
            // pages bypass this because colorway is forced to 'custom' above
            // when there's no saved pick — if the user explicitly picked
            // light/dark on /art/*, the override still applies.
            var notifs = null;
            try {
                notifs = JSON.parse(localStorage.getItem('pd_settings_notifs') || 'null');
            } catch (e) { /* ignore */ }
            if (notifs && colorway === 'light' && notifs.pure_light) bg = '#ffffff';
            if (notifs && colorway === 'dark'  && notifs.pure_dark)  bg = '#000000';

            var hex = bg.replace('#', '');
            var r = parseInt(hex.substr(0, 2), 16) || 0;
            var g = parseInt(hex.substr(2, 2), 16) || 0;
            var b = parseInt(hex.substr(4, 2), 16) || 0;
            var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
            var text = yiq >= 128 ? '#111111' : '#e0e0e0';

            paintVars(bg, text, colorway);

            if (document.body) {
                document.body.classList.add('colorway-' + colorway);
                if (r > g + 40 && r > b + 40 && r > 100) {
                    document.body.classList.add('bg-is-red');
                }
            }
        }

        var notifs2 = null;
        try {
            notifs2 = JSON.parse(localStorage.getItem('pd_settings_notifs') || 'null');
        } catch (e) { /* ignore */ }

        if (notifs2) {
            var classList = document.body && document.body.classList;
            if (classList) {
                var tapeMap = ['tape-off', 'tape-faded', 'tape-standard', 'tape-bold', 'tape-framed'];
                var tapeClass = tapeMap[notifs2.tape];
                if (tapeClass) classList.add(tapeClass);

                if (notifs2.notes)            classList.add('notes-mode');
                if (notifs2.spell_aura)       classList.add('aura-active');
                if (notifs2.spell_priceghost) classList.add('pm-active');
                if (notifs2.stargazing)       classList.add('stargazing-mode');
                if (notifs2.spell_hammer)     classList.add('hammer-mode');
                if (notifs2.spell_pricelens)  classList.add('pricelens-mode');
                if (notifs2.zenMode)          classList.add('zen-mode');
                if (notifs2.sentimentOn)      classList.add('sentiment-on');
                if (notifs2.redactedMode)     classList.add('redacted-mode');
                if (notifs2.anon)             classList.add('anon-mode');
                if (notifs2.sticker)          classList.add('sticker-mode');
                if (notifs2.degen)            classList.add('degen-mode');
                if (notifs2.zerocontext)      classList.add('zero-context-mode');
                if (notifs2.asciiId)          classList.add('ascii-id-mode');
                if (notifs2.echo)             classList.add('echo-mode');
            }
        }

        var sort = localStorage.getItem('pd_settings_sort');
        if (document.body) {
            if (sort === 'fog')  document.body.classList.add('fog-mode');
            if (sort === 'feed') document.body.classList.add('feed-mode');
        }

        var persona = localStorage.getItem('pd_debug_persona');
        if (persona === 'default' && document.body) {
            document.body.classList.add('persona-default');
        }
    } catch (e) {
        // Swallow — corrupted localStorage shouldn't take down the app.
    }
})();
`.trim();

const LOADER_SVG_PATHS = [
    'M85.2021 548.561C42.8699 529.988 15.6745 498.753 4.19883 454.463C1.48652 443.995 0.274671 432.855 0.244021 422.019C-0.0236921 327.349 -0.138982 232.675 0.255934 138.005C0.54681 68.2708 52.8591 9.92044 122.093 1.22737C128.083 0.475297 134.204 0.613785 140.264 0.603791C175.854 0.545177 211.443 0.598222 247.032 0.55311C370.084 0.397073 493.136 0.268937 616.187 0.000470443C641.114 -0.0539179 664.926 4.60223 686.744 16.7622C729.923 40.8271 755.566 77.412 759.522 126.875C761.87 156.23 760.704 185.883 760.754 215.403C760.868 282.494 760.87 349.586 760.668 416.677C760.605 437.544 757.771 457.979 748.71 477.184C727.938 521.211 693.705 547.895 645.88 556.789C636.911 558.457 627.619 558.964 618.471 559.006C569.559 559.235 520.645 559.196 471.731 559.083C467.266 559.073 464.145 560.266 461.121 563.704C436.981 591.159 412.59 618.395 388.391 645.798C378.113 657.437 364.265 658.326 353.773 646.799C333.506 624.535 313.712 601.841 293.735 579.312C288.937 573.901 284.484 568.14 279.288 563.147C277.067 561.014 273.355 559.337 270.31 559.321C227.855 559.096 185.396 559.009 142.941 559.297C123.079 559.432 104.097 555.667 85.2021 548.561Z',
    'M564.413 318.773C555.823 317.223 547.291 315.061 538.632 314.244C517.392 312.239 498.825 318.448 484.023 334.217C481.368 337.046 479.939 336.415 477.387 334.249C472.203 329.851 467.097 325.037 461.162 321.904C440.592 311.044 418.923 311.324 397.503 318.615C376.076 325.909 360.791 340.458 354.626 362.568C349.523 380.87 349.701 399.887 353.682 418.343C359.769 446.564 381.205 464.964 410.61 469.341C436.248 473.158 459.824 470.164 478.296 449.641C481.259 446.349 483.009 448.684 484.929 450.646C491.699 457.565 499.109 463.403 508.531 466.482C522.601 471.081 536.778 471.095 551.349 469.393C577.445 466.344 601.157 447.291 606.842 421.584C609.543 409.373 609.216 396.409 609.52 383.768C610.225 354.439 593.273 329.264 564.413 318.773ZM293.97 270.436C304.87 263.703 313.412 254.807 319.121 243.255C330.605 220.02 328.412 195.353 326.627 170.769C326.335 166.735 325.16 162.689 323.888 158.815C315.53 133.362 298.551 116.884 272.121 111.537C253.092 107.687 233.884 107.554 216.063 116.838C194.33 128.16 180.8 146.181 178.048 170.566C176.374 185.406 176.917 200.617 177.739 215.591C178.943 237.537 188.442 255.882 207.135 267.713C234.885 285.275 263.982 284.555 293.97 270.436ZM348.806 312.356C391.815 248.872 435.897 186.106 477.553 120.908C465.934 119.774 454.846 120.106 443.791 119.639C438.018 119.394 434.67 121.278 431.414 126.12C396.717 177.729 361.947 229.292 326.806 280.599C285.48 340.934 243.763 401.002 202.245 461.206C201.337 462.524 200.775 464.08 199.579 466.468C214.173 466.468 227.617 466.599 241.052 466.298C242.692 466.261 244.713 464.196 245.83 462.571C280.051 412.77 314.181 362.906 348.806 312.356Z',
    'M507.266 410.237C506.947 398.666 505.667 387.443 506.861 376.489C508.487 361.575 520.49 353.604 537.53 354.185C550.555 354.63 561.421 364.77 562.428 378.491C563.126 388.011 563.056 397.654 562.449 407.186C561.691 419.107 553.013 427.626 540.709 429.728C523.198 432.721 513.649 427.265 507.266 410.237Z',
    'M444.737 425.35C434.349 431.954 423.524 432.537 413.125 427.669C402.753 422.813 398.864 413.051 398.51 402.069C398.259 394.282 398.135 386.396 399.052 378.685C400.753 364.387 411.955 354.729 425.125 354.126C443.139 353.301 452.558 363.567 454.084 378.15C455.187 388.693 454.813 399.608 453.342 410.111C452.604 415.382 447.949 420.103 444.737 425.35Z',
    'M278.519 194.495C277.378 204.322 277.17 213.805 274.859 222.745C272.113 233.368 264.783 237.631 253.212 237.735C240.318 237.852 233.177 233.613 229.29 223.142C224.817 211.096 225.515 198.537 226.23 186.048C226.518 181.002 227.018 175.882 228.217 170.99C231.199 158.815 238.713 153.213 251.95 152.618C264.255 152.064 271.812 156.478 275.274 168.588C277.587 176.677 277.522 185.447 278.519 194.495Z',
];

/*
 * LOADER_HTML — pure black overlay, 28px logo (same size as navbar),
 * breathing opacity animation. No transforms during load = zero jitter.
 * Exit is triggered by PriceOSShell via window.__pdExitLoader():
 *   1. Logo translates to navbar position (magnetic suck, ease-in accel)
 *   2. Overlay fades out
 *   3. Element removed
 */
const LOADER_HTML = `<style>
  @keyframes pdLetterWave {
    0%, 100% { opacity: 0.15; }
    50%       { opacity: 1; }
  }
  #pd-loader {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(22px);
    -webkit-backdrop-filter: blur(22px);
    /* Hoist onto GPU compositor so iOS PWA layout reflows
       (safe-area insets settling, dvh recalc, body growth)
       never reposition this element. */
    transform: translateZ(0);
    will-change: opacity;
  }
  /* The loader is BOOT-ONLY. Once dismissed (either dismissal path stamps
     this attribute), any copy of it is invisible and inert — React 19
     re-injects the innerHTML of this wrapper on the first client-side
     route change when the node was removed BEFORE hydration (the /docs
     parse-time removal below), which resurrected a permanent full-screen
     loader over the docs on every first link tap. The stamp outlives any
     re-injection, so a resurrected loader can never paint or eat taps. */
  html[data-pd-loader-done] #pd-loader {
    display: none !important;
    pointer-events: none !important;
  }
  #pd-loader-panel {
    background: #000;
    height: 28px;
    padding: 0 12px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #pd-loader-text {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    font-weight: bold;
    color: #FFE600;
    letter-spacing: 0.08em;
  }
  #pd-loader-text span {
    display: inline-block;
    animation: pdLetterWave 0.55s ease-in-out infinite;
  }
  #pd-loader-text span:nth-child(1) { animation-delay: 0.0s; }
  #pd-loader-text span:nth-child(2) { animation-delay: 0.07s; }
  #pd-loader-text span:nth-child(3) { animation-delay: 0.14s; }
  #pd-loader-text span:nth-child(4) { animation-delay: 0.21s; }
  #pd-loader-text span:nth-child(5) { animation-delay: 0.28s; }
  #pd-loader-text span:nth-child(6) { animation-delay: 0.35s; }
  #pd-loader-text span:nth-child(7) { animation-delay: 0.42s; }
</style>
<div id="pd-loader">
  <div id="pd-loader-panel">
    <span id="pd-loader-text"><span>L</span><span>o</span><span>a</span><span>d</span><span>i</span><span>n</span><span>g</span></span>
  </div>
</div>
<script>
  /* PD-Docs never shows the loader: the docs pages are prerendered static
     HTML — the content is already fully painted underneath, so holding a
     "Loading" overlay until the app bundle hydrates (the shell removes it
     post-mount) just delays reading, and a stalled hydration strands it
     forever. Runs during document parse, before first paint. The stamp on
     <html> (see the #pd-loader style block) is the part that makes this
     stick: removing the node alone regressed after React 19, which
     re-injects it on the first client-side navigation. */
  if (/^\\/docs(\\/|$)/.test(location.pathname)) {
    document.documentElement.setAttribute('data-pd-loader-done', '');
    var pdl = document.getElementById('pd-loader');
    if (pdl) pdl.remove();
  }
</script>`.trim();

/*
 * Provider order matters: anything that calls useToast() must be
 * inside <ToastProvider>. NotePromptProvider uses showToast() for
 * day + artist note save/clear messages, so ToastProvider wraps it.
 * NotePromptProvider also depends on CalendarContext, so calendar
 * stays inside it.
 *
 * Build 23 — PersonaProvider mounts at the top of the tree alongside
 * ColorwayProvider. Persona has no other context dependencies (it just
 * owns body.persona-default and exposes window.setDebugPersona) so
 * placement is purely organizational.
 *
 * Wallet stack server-side hydration (auth fix-up, post-Build #11):
 *   - `cookieToInitialState(wagmiConfig, cookieHeader)` parses the
 *     wagmi.store cookie into wagmi's State shape, so WagmiProvider
 *     boots already-connected if the cookie says so. Without this the
 *     first paint flashes disconnected before client-side cookie
 *     rehydration runs.
 *   - `getSession()` reads the iron-session cookie on the same
 *     request, so InnerProviders can boot straight to authenticated/
 *     unauthenticated and skip its hydration GET round-trip. The
 *     try/catch falls through to `undefined` if SIWE_SESSION_SECRET
 *     is missing or the cookie can't be decoded — InnerProviders
 *     reads `undefined` as "no server data, do the GET-on-mount" so
 *     the page still renders even if env config is broken.
 */
export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    /* cookieToInitialState only reads `config.storage.key` (per its
       implementation in @wagmi/core/utils/cookie.js) to derive the
       cookie name. Importing the real wagmiConfig here would also
       pull in the connector chain — which transitively loads
       @metamask/sdk's browser-only code, crashing static SSR of the
       /_not-found page during `next build`. The stub keeps the
       storage key in sync ('wagmi' is wagmi's default when
       createStorage is called without an explicit `key`) and skips
       all that. If wagmiConfig ever sets a non-default storage key,
       update this stub to match. */
    const hdrs = await headers();

    /* Standalone tool routes (middleware stamps x-pd-bare-route for /deploy):
       render NOTHING but the page — no app wallet stack (whose
       AccountCreateModal fires on any connected wallet without a PD
       account), no SIWE, no loader overlay, no shell chrome. The page
       brings its own self-contained wallet providers. */
    if (hdrs.get('x-pd-bare-route') === '1') {
        return (
            <html lang="en">
                <body suppressHydrationWarning>{children}</body>
            </html>
        );
    }

    const SSR_COOKIE_CONFIG_STUB = {
        storage: { key: 'wagmi' },
    } as unknown as WagmiConfigType;
    const cookieHeader = hdrs.get('cookie') ?? '';
    const initialState = cookieToInitialState(SSR_COOKIE_CONFIG_STUB, cookieHeader);

    let initialAuth: string | null | undefined;
    try {
        const session = await getSession();
        initialAuth = session.address?.toLowerCase() ?? null;
    } catch {
        initialAuth = undefined;
    }

    /* Dev-preview "Login Brendon" shortcut button. Renders ONLY where
       DEV_LOGIN_ENABLED=1 is explicitly set (Cloudflare dev deploy during
       the build phase; localhost via .env.local). The /api/auth/dev-login
       route is gated the same way server-side — that check is the real
       boundary. At launch, deleting the variable removes button and door
       together. (Was keyed off VERCEL_ENV — didn't exist on Cloudflare,
       leaving the door open; caught in the 2026-07-03 wallet review.) */
    const showDevLogin = process.env.DEV_LOGIN_ENABLED === '1';

    return (
        <html lang="en" className={`${rubikMono.variable} ${inter.variable}`}>
            <head>
                {/*
                  Dynamic favicon — sim line 10. FaviconEngine repaints
                  this <link>'s href on every colorway change / priceLogo
                  toggle / alert / ETH ping / rotation event. The static
                  href="/favicon.ico" is the pre-hydration fallback shown
                  before JS runs.
                */}
                <link
                    rel="icon"
                    id="dynamic-favicon"
                    type="image/png"
                    href="/favicon.ico"
                />
                {/*
                  apple-touch-icon — pinned home-screen icon for PWA
                  installs. iOS doesn't run JS for this surface, so it
                  stays a static 180px PNG matching the dynamic engine's
                  default-state mark (speech-bubble + ‰ wordmark).
                */}
                <link rel="apple-touch-icon" href="/icon-180px.png" />
                <link rel="manifest" href="/manifest.json" />

                {/*
                  apple-touch-startup-image — iOS PWA splash screens. iOS
                  ignores the manifest for these: each device class needs its
                  own pixel-exact PNG selected via media query (CSS points ×
                  pixel ratio). All files are generated from
                  /splash-master.png (1320×2868) by scale-and-center-crop —
                  regenerate the whole set from the master if the art changes.
                */}
                {/* iPhone 17 Pro Max / 16 Pro Max — 440×956 @3x */}
                <link rel="apple-touch-startup-image" media="(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash-master.png" />
                {/* iPhone 17 / 17 Pro / 16 Pro — 402×874 @3x */}
                <link rel="apple-touch-startup-image" media="(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash-1206x2622.png" />
                {/* iPhone Air — 420×912 @3x */}
                <link rel="apple-touch-startup-image" media="(device-width: 420px) and (device-height: 912px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash-1260x2736.png" />
                {/* iPhone 16 / 15 / 15 Pro / 14 Pro — 393×852 @3x */}
                <link rel="apple-touch-startup-image" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash-1179x2556.png" />
                {/* iPhone 16 Plus / 15 Plus / 15 Pro Max / 14 Pro Max — 430×932 @3x */}
                <link rel="apple-touch-startup-image" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash-1290x2796.png" />
                {/* iPhone 14 / 13 / 13 Pro / 12 / 12 Pro — 390×844 @3x */}
                <link rel="apple-touch-startup-image" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash-1170x2532.png" />
                {/* iPhone 14 Plus / 13 Pro Max / 12 Pro Max — 428×926 @3x */}
                <link rel="apple-touch-startup-image" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash-1284x2778.png" />
                {/* iPhone 13 mini / 12 mini / 11 Pro / X / XS — 375×812 @3x */}
                <link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash-1125x2436.png" />
                {/* iPhone 11 Pro Max / XS Max — 414×896 @3x */}
                <link rel="apple-touch-startup-image" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash-1242x2688.png" />
                {/* iPhone 11 / XR — 414×896 @2x */}
                <link rel="apple-touch-startup-image" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/splash-828x1792.png" />
                {/* iPhone SE / 8 — 375×667 @2x */}
                <link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/splash-750x1334.png" />
                {/* iPad Pro 12.9" — 1024×1366 @2x */}
                <link rel="apple-touch-startup-image" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/splash-2048x2732.png" />
                {/* iPad Pro 11" / Air — 834×1194 @2x */}
                <link rel="apple-touch-startup-image" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/splash-1668x2388.png" />
                {/* iPad 10.9" — 820×1180 @2x */}
                <link rel="apple-touch-startup-image" media="(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/splash-1640x2360.png" />

                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta
                    name="apple-mobile-web-app-status-bar-style"
                    content="black-translucent"
                />
                <meta
                    name="apple-mobile-web-app-title"
                    content="Price Discussion"
                />
                <meta name="theme-color" id="theme-color-meta" content="#111111" />
                {/*
                  Pre-hydration script — MUST stay in <head> so the browser
                  executes it before first paint. Reads localStorage to apply
                  the correct colorway CSS vars and body classes synchronously,
                  eliminating the purple flash + tape-visible flash that occurs
                  when this runs in <body> after SSR HTML has already painted.
                */}
                <script dangerouslySetInnerHTML={{ __html: PREHYDRATION_SCRIPT }} />
            </head>
            <body suppressHydrationWarning>
                <SwRegistrar />
                <div dangerouslySetInnerHTML={{ __html: LOADER_HTML }} />
                <WalletProviders
                    initialState={initialState}
                    initialAuth={initialAuth}
                >
                    {showDevLogin && <DevLoginButton />}
                    <ColorwayProvider>
                        <PersonaProvider>
                            <PdNotifsProvider>
                                <SortProvider>
                                    <ModalProvider>
                                        <DropdownProvider>
                                            <ToastProvider>
                                              <RewindProvider>
                                              <PingsProvider>
                                                <PriceRankSync />
                                                <CalendarProvider>
                                                    <NotePromptProvider>
                                                        <ValuePromptProvider>
                                                            <CalcSheetProvider>
                                                                <ProjectProvider>
                                                                    <CartProvider>
                                                                      <MarketSheetProvider>
                                                                        <BenchProvider>
                                                                            <WorkspacesProvider>
                                                                                <FiatProvider>
                                                                                    <PriceOSShell>{children}</PriceOSShell>
                                                                                </FiatProvider>
                                                                            </WorkspacesProvider>
                                                                        </BenchProvider>
                                                                      </MarketSheetProvider>
                                                                    </CartProvider>
                                                                </ProjectProvider>
                                                            </CalcSheetProvider>
                                                        </ValuePromptProvider>
                                                    </NotePromptProvider>
                                                </CalendarProvider>
                                              </PingsProvider>
                                              </RewindProvider>
                                            </ToastProvider>
                                        </DropdownProvider>
                                    </ModalProvider>
                                </SortProvider>
                            </PdNotifsProvider>
                        </PersonaProvider>
                    </ColorwayProvider>
                </WalletProviders>
            </body>
        </html>
    );
}
