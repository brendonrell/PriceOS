import type { Metadata } from 'next';
import './globals.css';
import { PdNotifsProvider } from '../lib/state/PdNotifsContext';
import { ThemeProvider } from '../lib/state/ThemeContext';
import { ModalProvider } from '../lib/state/ModalContext';
import { DropdownProvider } from '../lib/state/DropdownContext';
import { SortProvider } from '../lib/state/SortContext';
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
                        <SortProvider>
                            <ModalProvider>
                                <DropdownProvider>
                                    <PriceOSShell>{children}</PriceOSShell>
                                </DropdownProvider>
                            </ModalProvider>
                        </SortProvider>
                    </PdNotifsProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
