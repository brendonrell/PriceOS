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
 *   <CollectorsModal />    sim id #collectorsModal — hero "67 PPL" stat
 *   <FollowersModal />     sim id #followersModal — LinksView ⚬/⚯ stats
 *   <PriceosModal />       sim id #priceosModal — Footer "PriceOS 1.0" link
 *   <FamiliarModal />      sim id #familiarModal — Familiar settings placeholder
 *   <PriceSpriteModal />   sim id #priceSpriteModal — Level + score breakdown
 *   <CartPanel />          sim id #cartPanelWrap — bulk-buy slide-up panel
 *
 * All seven modal/panel surfaces mount once globally. Their open/close
 * is driven by ModalContext (artwork / collectors / followers / priceos
 * / familiar / priceSprite) or CartContext (CartPanel). Any caller —
 * gallery, /token/[id] route, deep links, navbar chrome, settings —
 * opens the same instance via the matching hook.
 *
 * Build 7 punch-list pass 2: collectors / followers / priceos were
 * shipped in Build 4 with their open() callers already wired (hero
 * stat, LinksView ⚬/⚯ stats, Footer "PriceOS 1.0") but the modal
 * components themselves were never mounted in this shell. Firing
 * open('collectors' | 'followers' | 'priceos') still flipped
 * body.modal-open (sim 3268: position:fixed; scroll-lock), so the
 * page froze with no modal visible — exit only via Escape. Mounting
 * them here closes that gap.
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
import CollectorsModal from '../CollectorsModal';
import FollowersModal from '../FollowersModal';
import PriceosModal from '../PriceosModal';
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
            <CollectorsModal />
            <FollowersModal />
            <PriceosModal />
            <FamiliarModal />
            <PriceSpriteModal />
            <CartPanel />
        </>
    );
}
