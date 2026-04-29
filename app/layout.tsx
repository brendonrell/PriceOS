import type { Metadata } from 'next';
import './globals.css';
import { PdNotifsProvider } from '../lib/state/PdNotifsContext';
import { ThemeProvider } from '../lib/state/ThemeContext';
import { ModalProvider } from '../lib/state/ModalContext';
import { DropdownProvider } from '../lib/state/DropdownContext';
import { PriceOSShell } from '../components/shell/PriceOSShell';

export const metadata: Metadata = {
    title: 'Price Discussion',
    description:
        'A web3 social platform where the community discussing secondary prices is the product. Browse collections, track grail pins, and explore generative art.',
    icons: {
        icon: '/favicon.ico',
        apple: '/icon-180px.png',
    },
};

/*
 * Pre-hydration script.
 *
 * Runs synchronously before React mounts so the page paints with the
 * user's saved theme and body-class flags rather than the server-rendered
 * defaults flashing first.
 *
 * Reads:
 *   pd_settings_theme  → { mode, bgColor, textColor }
 *   pd_settings_notifs → { tape, notes, todos, tapeOpen, spell_*, ... }
 *
 * Writes:
 *   document.documentElement.style.setProperty('--bg-color', ...)
 *   document.documentElement.style.setProperty('--text-color', ...)
 *   document.body.classList.add(...)  for each active flag
 */
const PREHYDRATION_SCRIPT = `
(function () {
    try {
        var theme = JSON.parse(localStorage.getItem('pd_settings_theme') || 'null');
        if (theme) {
            if (theme.bgColor)   document.documentElement.style.setProperty('--bg-color', theme.bgColor);
            if (theme.textColor) document.documentElement.style.setProperty('--text-color', theme.textColor);
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
                if (notifs.spell_stargazing) classList.add('stargazing-mode');
                if (notifs.spell_hammer)     classList.add('hammer-mode');
                if (notifs.spell_pricelens)  classList.add('pricelens-mode');
                if (notifs.fogMode)          classList.add('fog-mode');
                if (notifs.zenMode)          classList.add('zen-mode');
                if (notifs.sentimentOn)      classList.add('sentiment-on');
                if (notifs.redactedMode)     classList.add('redacted-mode');
            }
        }
    } catch (e) {
        // Swallow — corrupted localStorage shouldn't take down the app.
    }
})();
`.trim();

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
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
                <meta name="theme-color" content="#FF0055" />
            </head>
            <body>
                <script dangerouslySetInnerHTML={{ __html: PREHYDRATION_SCRIPT }} />
                <ThemeProvider>
                    <PdNotifsProvider>
                        <ModalProvider>
                            <DropdownProvider>
                                <PriceOSShell>{children}</PriceOSShell>
                            </DropdownProvider>
                        </ModalProvider>
                    </PdNotifsProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
