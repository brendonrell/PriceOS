'use client';

/*
 * PriceOSShell
 *
 * The wrapping layout used by every route. In Step 1 it's a stub:
 * mounts the body-class sync hook and passes children through.
 *
 * Step 2 fills it out with:
 *   <Backgrounds />   — starfield + familiar (gated, off by default)
 *   <Navbar />        — top bar + Petey + ticker + Connect Menu
 *   {children}
 *   <Footer />        — PriceOS 1.0 · Connected · gwei · etc.
 *   <ModalStack />    — all platform modals
 *   <Overlays />      — toasts + prompts + slide sheets
 *
 * Keeping it minimal in Step 1 so the foundation can be deployed and
 * eyeballed before the chrome lands.
 */

import { type ReactNode } from 'react';
import { useBodyClass } from '../../lib/hooks/useBodyClass';

export function PriceOSShell({ children }: { children: ReactNode }) {
    useBodyClass();
    return <>{children}</>;
}
