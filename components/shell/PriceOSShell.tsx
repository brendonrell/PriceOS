'use client';

/*
 * PriceOSShell
 *
 *   <Backgrounds />        starfield + familiar (mounted, gated off)
 *   <Navbar />             sticky top chrome
 *   <main>{children}       page content
 *   <Footer />
 *   <ActionToast />        bottom-fixed toast (shared by every showToast() call)
 *   <OutputPreview />      sim id #modal — primary output inspector
 *   <CollectorsModal />    sim id #collectorsModal — hero "67 PPL" stat
 *   <FollowersModal />     sim id #followersModal — LinksView ⚬/⚯ stats
 *   <PriceosModal />       sim id #priceosModal — Footer "PriceOS 1.0" link
 *   <FamiliarModal />      sim id #familiarModal — Familiar settings placeholder
 *   <PriceSpriteModal />   sim id #priceSpriteModal — Level + score breakdown
 *   <GasTrackerModal />    S3 — Etherscan-style gwei + ETH/USD modal
 *   <CartPanel />          sim id #cartPanelWrap — bulk-buy slide-up panel
 *
 * All seven modal/panel surfaces mount once globally. Their open/close
 * is driven by ModalContext (output / collectors / followers / priceos
 * / familiar / priceSprite) or CartContext (CartPanel). Any caller —
 * gallery, /[id] output page, deep links, navbar chrome, settings —
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
 *
 * Build 24 — useNavFade mounts alongside useBodyClass to wire the
 * scroll-driven `.nav-faded` class on .pd-logo-wrap + .nav-controls
 * (sim 6746-6757). The CSS rule at sim 92 was already in globals.css
 * but had no consumer until now.
 *
 * Build 28 — is-pwa body class (D18). Sim 5633-5635 sets
 * `body.is-pwa` once on load when `navigator.standalone === true`
 * (iOS) or `matchMedia('(display-mode: standalone)').matches`. The
 * original Layout.tsx scaffold owned this check but was never wired
 * into the React tree — so the class never landed and the
 * `body.is-pwa .navbar` rules in globals.css (149, 158) sat dormant.
 * The check belongs here: PriceOSShell mounts at the top of every
 * route, runs once on hydration, and is colocated with the other
 * body-class side effects (useBodyClass / useNavFade). One-shot
 * effect — display-mode doesn't flip mid-session, so no listener.
 */

import { useEffect, type ReactNode } from 'react';
import { useBodyClass } from '../../lib/hooks/useBodyClass';
import { useNavFade } from '../../lib/hooks/useNavFade';
import { pickTabstractTitle } from '../../lib/title/tabstract';
import { mountPtr, unmountPtr } from '../../lib/pwa/ptrEngine';
import { Backgrounds } from './Backgrounds';
import { FaviconEngine } from './FaviconEngine';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import ActionToast from '../ActionToast';
import OutputPreview from '../OutputPreview';
import CollectorsModal from '../CollectorsModal';
import FollowersModal from '../FollowersModal';
import PriceosModal from '../PriceosModal';
import FamiliarModal from '../FamiliarModal';
import PriceSpriteModal from '../PriceSpriteModal';
import GasTrackerModal from '../GasTrackerModal';
import CartPanel from '../CartPanel';

export function PriceOSShell({ children }: { children: ReactNode }) {
    useBodyClass();
    useNavFade();

    /* Loading screen dismiss — fires as soon as the app is ready (this
       component has mounted). Simple fade-out, no minimum delay, no
       magnetic suck. Browser chrome bar fades in sync via the html
       background transition. */
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const loader = document.getElementById('pd-loader');
        if (!loader) return;

        document.documentElement.style.transition = 'background 350ms ease';
        document.documentElement.style.background = '';
        loader.animate(
            [{ opacity: 1 }, { opacity: 0 }],
            { duration: 350, easing: 'ease-out', fill: 'forwards' }
        ).onfinish = () => {
            loader.remove();
            document.documentElement.style.transition = '';
        };
    }, []);

    /* Build 28 — D18: PWA detection → body.is-pwa. Mirrors sim 5633-5635
       exactly: OR navigator.standalone (iOS-only, ignores display-mode
       media query) with matchMedia('(display-mode: standalone)'). One-shot
       on mount; the standalone state can't change during a session, so
       no listener / cleanup needed. The matching CSS rules already exist
       at globals.css 149 + 158.

       F43 / BUG-05 — PTR engine mount (sim 5637-5699). The PTR check
       guards on the same standalone signal as the body class, so it's
       colocated here. mountPtr() is idempotent + owns its own overlay
       DOM node; cleanup via unmountPtr() runs on shell unmount (route
       teardown / HMR). */
    useEffect(() => {
        if (typeof window === 'undefined') return;
        // @ts-expect-error — non-standard iOS-only API, intentionally accessed
        const iosStandalone = window.navigator?.standalone === true;
        const displayMode = window.matchMedia?.('(display-mode: standalone)')?.matches === true;
        if (iosStandalone || displayMode) {
            document.body.classList.add('is-pwa');
            mountPtr();
        }
        return () => {
            unmountPtr();
        };
    }, []);

    /* F42 / BUG-04 — Tabstract title generator (sim 5510-5526).
       Next.js metadata.title is server-rendered and can't rotate per
       page load, so the rotation has to land in a client-mount effect.
       Runs once per shell mount (per page load). */
    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.title = pickTabstractTitle();
    }, []);

    /* F62 / BUG-32 — bfcache scroll restoration (sim 5488-5497).
       iOS Safari swipe-back restores the prior scroll position by default,
       which lands the user mid-gallery on every back-navigation. Force
       manual control + reset on every pageshow (initial load + bfcache
       restore from another tab). Skip the snap when a modal is open —
       modal-open uses position:fixed scroll-locking (sim 3268), and
       scrolling under it would un-pin the modal scroll-lock. */
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
        const onPageShow = () => {
            if (!document.body.classList.contains('modal-open')) {
                window.scrollTo(0, 0);
            }
        };
        window.addEventListener('pageshow', onPageShow);
        return () => window.removeEventListener('pageshow', onPageShow);
    }, []);

    /* BUG — mobile Safari squish. iOS Safari changes 100dvh when the
       address bar shows/hides. We pin --app-height once on mount and
       update only on orientationchange (genuine layout flip).
       Removed: visualViewport resize + pageshow re-sync. ChatGPT
       identified those as the cause of the tiny scroll offset on load:
       the resize fires after first paint, mutates root geometry, and
       the browser compensates by nudging scroll position — opposite
       direction on desktop vs iOS. orientationchange is safe because
       the user has already lifted their finger and a repaint is expected. */
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const vv = window.visualViewport;
        const set = () => {
            const h = vv ? vv.height : window.innerHeight;
            document.documentElement.style.setProperty('--app-height', `${h}px`);
        };
        set();
        window.addEventListener('orientationchange', set);
        return () => window.removeEventListener('orientationchange', set);
    }, []);

    return (
        <>
            <Backgrounds />
            <FaviconEngine />
            <Navbar />
            <main>{children}</main>
            <Footer />
            <ActionToast />
            <OutputPreview />
            <CollectorsModal />
            <FollowersModal />
            <PriceosModal />
            <FamiliarModal />
            <PriceSpriteModal />
            <GasTrackerModal />
            <CartPanel />
        </>
    );
}
