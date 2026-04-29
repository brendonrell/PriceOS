import type { Metadata, Viewport } from 'next';
import Layout from '@/components/chrome/Layout';
import './globals.css';

/**
 * Root layout for PriceOS.
 *
 * Meta tags, font loading, and PWA settings mirror the source HTML
 * <head> (sim__1_.html lines 4-24). Fonts are loaded via the plain
 * Google Fonts <link> rather than next/font/google — this was a
 * deliberate D1 decision to keep builds offline-safe on Brendon's
 * library-machine workflow (no node_modules font fetching at build
 * time). Inter is included because it's used in exactly one place
 * (the ‰ glyph in the Price Logo settings toggle); single inline
 * use, but real, so we keep the import.
 */

export const metadata: Metadata = {
    title: 'Price Discussion',
    description:
        'A web3 social platform where the community discussing secondary prices is the product. Browse collections, track grail pins, and explore generative art.',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Price Discussion',
    },
    manifest: '/manifest.json',
    icons: {
        apple: '/icon-180px.png',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
    themeColor: '#6366F1', // Phase 2 makes this dynamic via the theme engine
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                {/* Google Fonts — preconnect + stylesheet. Plain <link>, not
                    next/font/google, deliberately. Rubik Mono One = display;
                    Inter weights 400/700 for the single ‰ glyph use. */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin=""
                />
                <link
                    href="https://fonts.googleapis.com/css2?family=Rubik+Mono+One&family=Inter:wght@400;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                <Layout>{children}</Layout>
            </body>
        </html>
    );
}
