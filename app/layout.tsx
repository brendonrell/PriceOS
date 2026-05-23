import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Rubik_Mono_One, Inter } from 'next/font/google';
import { cookieToInitialState, type Config as WagmiConfigType } from 'wagmi';
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
import { ThemeProvider } from '../lib/state/ThemeContext';
import { ModalProvider } from '../lib/state/ModalContext';
import { DropdownProvider } from '../lib/state/DropdownContext';
import { SortProvider } from '../lib/state/SortContext';
import { ToastProvider } from '../lib/state/ToastContext';
import { NotePromptProvider } from '../lib/state/NotePromptContext';
import { ValuePromptProvider } from '../lib/state/ValuePromptContext';
import { CalcSheetProvider } from '../lib/state/CalcSheetContext';
import { ProjectProvider } from '../lib/state/ProjectContext';
import { CartProvider } from '../lib/state/CartContext';
import { PersonaProvider } from '../lib/state/PersonaContext';
import { CalendarProvider } from '../lib/calendar/CalendarContext';
import { WorkspacesProvider } from '../lib/state/WorkspacesContext';
import { PriceOSShell } from '../components/shell/PriceOSShell';
import { WalletProviders } from '../components/wallet/WalletProviders';
import { getSession } from '../lib/auth/siwe';

export const metadata: Metadata = {
    title: 'Price Discussion',
    description:
        'A web3 social platform where the community discussing secondary prices is the product. Browse projects, track grail pins, and explore generative art.',
};

const PREHYDRATION_SCRIPT = `
(function () {
    try {
        // Per-page theme override (sim deviation). Project pages
        // (/art/*) boot to the artist's custom colour when the user
        // has NOT picked a global theme. Profile pages (/{handle}/*)
        // boot to Attention Yellow (#FFE600) — own slot, NOT linked
        // to the artist custom colour. If the user has a saved pick,
        // that wins (the picker must work on every page).
        var pathname = (window.location && window.location.pathname) || '';
        var isProjectPage = pathname.indexOf('/art/') === 0;

        // Profile-page detection mirrors ThemeContext's first-segment
        // gate: not 'art', not 'api', not all-digits (output namespace),
        // matches the handle shape.
        var firstSeg = '';
        var segMatch = pathname.match(/^\/([^/]+)/);
        if (segMatch) firstSeg = segMatch[1].toLowerCase();
        var isProfilePage =
            firstSeg.length > 0 &&
            firstSeg !== 'art' &&
            firstSeg !== 'api' &&
            !/^\d+$/.test(firstSeg) &&
            /^[@a-z0-9_-]+$/i.test(firstSeg);

        var savedTheme = null;
        try { savedTheme = localStorage.getItem('pd_settings_theme'); } catch (e) { /* ignore */ }
        // Hashsyn never persists — sim 12617-12618.
        if (savedTheme === 'hashsyn') savedTheme = null;

        var theme = savedTheme;
        if (theme === null && isProjectPage) theme = 'artist';
        // Non-project, non-profile pages (home, etc.) also default to
        // custom colour so the site never cold-starts with Dot defaults.
        if (theme === null && !isProfilePage) theme = 'artist';
        var profileBoot = (theme === null && isProfilePage);

        var THEMES = {
            artist:  '#C488FF',
            light:   '#e0e0e0',
            dark:    '#1a1a1a',
            orange:  '#ff6600',
            blue:    '#3D9EFF',
            red:     '#FF0033',
            hashsyn: '#7B2FFF'
        };

        // Helper: write every theme-derived CSS var so the FOH matches
        // applyBgHex post-hydration. Without this, --mint-bg / --pill-l1-bg
        // / --modal-bg etc. fall through to the static globals.css
        // defaults (mint = #111111 / e0e0e0) → the hero CTA flashes black
        // until ThemeContext's useEffect runs.
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
        }

        if (profileBoot) {
            // Profile-page boot — paint Attention Yellow with no
            // theme-* body class. paintVars receives key=null so it
            // takes the default light-bg branch (yellow is light, YIQ
            // resolves text to #111111).
            var pBg = '#FFE600';
            var pText = '#111111';
            paintVars(pBg, pText, null);
        } else if (theme && THEMES[theme]) {
            var bg = THEMES[theme];

            // When theme is 'artist' (project-page boot default OR user
            // pick), read the user's saved custom hex from
            // pd_artist_color so the page paints the picked colour
            // instead of the static THEMES.artist fallback.
            if (theme === 'artist') {
                try {
                    var savedArtistColor = localStorage.getItem('pd_artist_color');
                    if (savedArtistColor && /^#[0-9A-F]{6}$/i.test(savedArtistColor)) {
                        bg = savedArtistColor.toUpperCase();
                    }
                } catch (e) { /* ignore */ }
            }

            // Pure Light / Pure Dark mode override (sim 6798-6803). Project
            // pages bypass this because theme is forced to 'artist' above
            // when there's no saved pick — if the user explicitly picked
            // light/dark on /art/*, the override still applies.
            var notifs = null;
            try {
                notifs = JSON.parse(localStorage.getItem('pd_settings_notifs') || 'null');
            } catch (e) { /* ignore */ }
            if (notifs && theme === 'light' && notifs.pure_light) bg = '#ffffff';
            if (notifs && theme === 'dark'  && notifs.pure_dark)  bg = '#000000';

            var hex = bg.replace('#', '');
            var r = parseInt(hex.substr(0, 2), 16) || 0;
            var g = parseInt(hex.substr(2, 2), 16) || 0;
            var b = parseInt(hex.substr(4, 2), 16) || 0;
            var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
            var text = yiq >= 128 ? '#111111' : '#e0e0e0';

            paintVars(bg, text, theme);

            if (document.body) {
                document.body.classList.add('theme-' + theme);
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

/*
 * Provider order matters: anything that calls useToast() must be
 * inside <ToastProvider>. NotePromptProvider uses showToast() for
 * day + artist note save/clear messages, so ToastProvider wraps it.
 * NotePromptProvider also depends on CalendarContext, so calendar
 * stays inside it.
 *
 * Build 23 — PersonaProvider mounts at the top of the tree alongside
 * ThemeProvider. Persona has no other context dependencies (it just
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
    const SSR_COOKIE_CONFIG_STUB = {
        storage: { key: 'wagmi' },
    } as unknown as WagmiConfigType;
    const cookieHeader = headers().get('cookie') ?? '';
    const initialState = cookieToInitialState(SSR_COOKIE_CONFIG_STUB, cookieHeader);

    let initialAuth: string | null | undefined;
    try {
        const session = await getSession();
        initialAuth = session.address?.toLowerCase() ?? null;
    } catch {
        initialAuth = undefined;
    }

    return (
        <html lang="en" className={`${rubikMono.variable} ${inter.variable}`}>
            <head>
                {/*
                  Dynamic favicon — sim line 10. FaviconEngine repaints
                  this <link>'s href on every theme change / priceLogo
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
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0, viewport-fit=cover"
                />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta
                    name="apple-mobile-web-app-status-bar-style"
                    content="black-translucent"
                />
                <meta
                    name="apple-mobile-web-app-title"
                    content="Price Discussion"
                />
                <meta name="theme-color" content="#111111" />
                {/*
                  Pre-hydration script — MUST stay in <head> so the browser
                  executes it before first paint. Reads localStorage to apply
                  the correct theme CSS vars and body classes synchronously,
                  eliminating the purple flash + tape-visible flash that occurs
                  when this runs in <body> after SSR HTML has already painted.
                */}
                <script dangerouslySetInnerHTML={{ __html: PREHYDRATION_SCRIPT }} />
            </head>
            <body suppressHydrationWarning>
                <WalletProviders
                    initialState={initialState}
                    initialAuth={initialAuth}
                >
                    <ThemeProvider>
                        <PersonaProvider>
                            <PdNotifsProvider>
                                <SortProvider>
                                    <ModalProvider>
                                        <DropdownProvider>
                                            <ToastProvider>
                                                <CalendarProvider>
                                                    <NotePromptProvider>
                                                        <ValuePromptProvider>
                                                            <CalcSheetProvider>
                                                                <ProjectProvider>
                                                                    <CartProvider>
                                                                        <WorkspacesProvider>
                                                                            <PriceOSShell>{children}</PriceOSShell>
                                                                        </WorkspacesProvider>
                                                                    </CartProvider>
                                                                </ProjectProvider>
                                                            </CalcSheetProvider>
                                                        </ValuePromptProvider>
                                                    </NotePromptProvider>
                                                </CalendarProvider>
                                            </ToastProvider>
                                        </DropdownProvider>
                                    </ModalProvider>
                                </SortProvider>
                            </PdNotifsProvider>
                        </PersonaProvider>
                    </ThemeProvider>
                </WalletProviders>
            </body>
        </html>
    );
}
