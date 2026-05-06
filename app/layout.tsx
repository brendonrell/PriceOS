import type { Metadata } from 'next';
import './globals.css';
import { PdNotifsProvider } from '../lib/state/PdNotifsContext';
import { ThemeProvider } from '../lib/state/ThemeContext';
import { ModalProvider } from '../lib/state/ModalContext';
import { DropdownProvider } from '../lib/state/DropdownContext';
import { SortProvider } from '../lib/state/SortContext';
import { ToastProvider } from '../lib/state/ToastContext';
import { NotePromptProvider } from '../lib/state/NotePromptContext';
import { ValuePromptProvider } from '../lib/state/ValuePromptContext';
import { CalcSheetProvider } from '../lib/state/CalcSheetContext';
import { CollectionProvider } from '../lib/state/CollectionContext';
import { CartProvider } from '../lib/state/CartContext';
import { PersonaProvider } from '../lib/state/PersonaContext';
import { CalendarProvider } from '../lib/calendar/CalendarContext';
import { WorkspacesProvider } from '../lib/state/WorkspacesContext';
import { PriceOSShell } from '../components/shell/PriceOSShell';

export const metadata: Metadata = {
    title: 'Price Discussion',
    description:
        'A web3 social platform where the community discussing secondary prices is the product. Browse collections, track grail pins, and explore generative art.',
};

const PREHYDRATION_SCRIPT = `
(function () {
    try {
        var theme = localStorage.getItem('pd_settings_theme');
        var THEMES = {
            artist:  '#FFE600',
            light:   '#e0e0e0',
            dark:    '#1a1a1a',
            orange:  '#ff6600',
            blue:    '#3D9EFF',
            red:     '#FF0033',
            hashsyn: '#7B2FFF'
        };
        if (theme && THEMES[theme]) {
            var bg = THEMES[theme];
            var hex = bg.replace('#', '');
            var r = parseInt(hex.substr(0, 2), 16) || 0;
            var g = parseInt(hex.substr(2, 2), 16) || 0;
            var b = parseInt(hex.substr(4, 2), 16) || 0;
            var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
            var text = yiq >= 128 ? '#111111' : '#e0e0e0';
            document.documentElement.style.setProperty('--bg-color', bg);
            document.documentElement.style.setProperty('--text-color', text);
            if (document.body) {
                document.body.classList.add('theme-' + theme);
                if (r > g + 40 && r > b + 40 && r > 100) {
                    document.body.classList.add('bg-is-red');
                }
            }
        }

        var notifs = JSON.parse(localStorage.getItem('pd_settings_notifs') || 'null');
        if (notifs) {
            var classList = document.body && document.body.classList;
            if (classList) {
                var tapeMap = ['tape-off', 'tape-faded', null, 'tape-bold', 'tape-framed'];
                var tapeClass = tapeMap[notifs.tape];
                if (tapeClass) classList.add(tapeClass);

                if (notifs.notes)            classList.add('notes-mode');
                if (notifs.spell_aura)       classList.add('aura-active');
                if (notifs.spell_priceghost) classList.add('pm-active');
                if (notifs.stargazing)       classList.add('stargazing-mode');
                if (notifs.spell_hammer)     classList.add('hammer-mode');
                if (notifs.spell_pricelens)  classList.add('pricelens-mode');
                if (notifs.zenMode)          classList.add('zen-mode');
                if (notifs.sentimentOn)      classList.add('sentiment-on');
                if (notifs.redactedMode)     classList.add('redacted-mode');
                // Build 24 — anon-mode (sim 13033).
                if (notifs.anon)             classList.add('anon-mode');
                // Build 32 D20 — sticker-mode (sim 887 + 891). Drives
                // .sticker-strike opacity fade via globals.css. Backticks
                // omitted on purpose — the prehydration script is itself a
                // template literal, so any backtick inside (even in a
                // comment) closes it early and turns the rest of the
                // string into a TS expression. Build 33 shipped that bug;
                // Build 34 hotfix removes the backticks.
                if (notifs.sticker)          classList.add('sticker-mode');
                if (notifs.degen)            classList.add('degen-mode');
                if (notifs.zerocontext)      classList.add('zero-context-mode');
                // F55 (BUG-22) — sim 9959. Boot with sprite+badge hidden
                // for returning users who had ASCII-ID on at last unload.
                if (notifs.asciiId)          classList.add('ascii-id-mode');
            }
        }

        // Build 23 — fog-mode follows SortContext (sim 8334-8338),
        // not the dormant notifs.fogMode flag.
        // Build 24 — feed-mode joins fog-mode as a sort-driven body
        // class (sim 8342 + 9927).
        var sort = localStorage.getItem('pd_settings_sort');
        if (document.body) {
            if (sort === 'fog')  document.body.classList.add('fog-mode');
            if (sort === 'feed') document.body.classList.add('feed-mode');
        }

        // Build 23 — persona-default mirrors sim's debugPersona flow
        // (sim 12015 + 12035). Default ('pd') leaves the class off; only
        // 'default' adds it. PersonaContext takes ownership post-hydration.
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
 */
export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
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
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin="anonymous"
                />
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Rubik+Mono+One&family=Inter:wght@400;700&display=swap"
                />
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
            </head>
            <body>
                <script dangerouslySetInnerHTML={{ __html: PREHYDRATION_SCRIPT }} />
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
                                                            <CollectionProvider>
                                                                <CartProvider>
                                                                    <WorkspacesProvider>
                                                                        <PriceOSShell>{children}</PriceOSShell>
                                                                    </WorkspacesProvider>
                                                                </CartProvider>
                                                            </CollectionProvider>
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
            </body>
        </html>
    );
}
