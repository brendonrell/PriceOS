import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import '../../styles/studio.css';

/*
 * PD Studio (/studio, host-routed from studio.pricediscussion.com). The
 * artist's side of PD: upload → unlimited test runs → publish, plus the
 * artist dashboard. Rides the full app shell (PriceOSShell wraps every
 * non-docs route), so navbar/menus/colorways are the app's own — this
 * layout only carries the stylesheet and metadata.
 */

export const metadata: Metadata = {
    title: 'PD Studio',
    description:
        'The artist’s side of Price Discussion: upload work, test it exhaustively, publish it on-chain, and manage it — from a phone.',
};

export default function StudioLayout({ children }: { children: ReactNode }) {
    return children;
}
