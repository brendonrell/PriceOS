'use client';

/*
 * PriceOSShell
 *
 *   <Backgrounds />     starfield + familiar (mounted, gated off)
 *   <Navbar />          sticky top chrome
 *   <main>{children}    page content
 *   <Footer />
 *   <ActionToast />     bottom-fixed toast (shared by every showToast() call)
 *   <ArtworkModal />    sim id #modal — mounted globally so any caller
 *                       (gallery, /token/[id] route, deep links) opens the
 *                       same instance via useModal().open('artwork', id).
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
        </>
    );
}
