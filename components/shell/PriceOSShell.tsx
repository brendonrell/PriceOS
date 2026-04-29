'use client';

/*
 * PriceOSShell
 *
 * Step 2 fills out the shell:
 *   <Backgrounds />     starfield + familiar (mounted, gated off)
 *   <Navbar />          sticky top chrome
 *   <main>{children}    page content
 *   <Footer />
 *
 * useBodyClass stays mounted at the top so the body className stays
 * in sync with PdNotifs state across the whole app.
 *
 * The ModalStack and overlay layer (toasts, slide sheets) get added
 * to this composition in Step 7 once the artwork modal lands.
 */

import { type ReactNode } from 'react';
import { useBodyClass } from '../../lib/hooks/useBodyClass';
import { Backgrounds } from './Backgrounds';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export function PriceOSShell({ children }: { children: ReactNode }) {
    useBodyClass();
    return (
        <>
            <Backgrounds />
            <Navbar />
            <main>{children}</main>
            <Footer />
        </>
    );
}
