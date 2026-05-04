'use client';

/*
 * PriceOSShell
 *
 *   <Backgrounds />        starfield + familiar (mounted, gated off)
 *   <Navbar />             sticky top chrome
 *   <main>{children}       page content
 *   <Footer />
 *   <ActionToast />        bottom-fixed toast (shared by every showToast() call)
 *   <ArtworkModal />       sim id #modal — primary artwork inspector
 *   <FamiliarModal />      sim id #familiarModal — Familiar settings placeholder
 *   <PriceSpriteModal />   sim id #priceSpriteModal — Level + score breakdown
 *   <CartPanel />          sim id #cartPanelWrap — bulk-buy slide-up panel
 *
 * All four modal/panel surfaces mount once globally. Their open/close
 * is driven by ModalContext (Familiar/PriceSprite) or CartContext
 * (CartPanel). Any caller — gallery, /token/[id] route, deep links,
 * navbar chrome, settings — opens the same instance via the matching
 * hook.
 *
 * useBodyClass stays mounted at the top so the body className stays
 * in sync with PdNotifs state across the whole app.
 */

import { type ReactNode } from 'react';
import { useBodyClass } from '../../lib/hooks/useBodyClass';
import { Backgrounds } from './Backgrounds';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import ActionToast from '../ActionToast';
import ArtworkModal from '../ArtworkModal';
import FamiliarModal from '../FamiliarModal';
import PriceSpriteModal from '../PriceSpriteModal';
import CartPanel from '../CartPanel';

export function PriceOSShell({ children }: { children: ReactNode }) {
    useBodyClass();
    return (
        <>
            <Backgrounds />
            <Navbar />
            <main>{children}</main>
            <Footer />
            <ActionToast />
            <ArtworkModal />
            <FamiliarModal />
            <PriceSpriteModal />
            <CartPanel />
        </>
    );
}
