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
import { usePathname } from 'next/navigation';
import { useBodyClass } from '../../lib/hooks/useBodyClass';
import { useNavFade } from '../../lib/hooks/useNavFade';
import { pickTabstractTitle } from '../../lib/title/tabstract';
import { getProject } from '../../lib/project/registry';
import { mountPtr, unmountPtr } from '../../lib/pwa/ptrEngine';
import { isStandalonePWA } from '../../lib/pwa/openExternal';
import { Backgrounds } from './Backgrounds';
import { FaviconEngine } from './FaviconEngine';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import AmbientStrip from './AmbientStrip';
import { ErrorBoundary } from './ErrorBoundary';
import ActionToast from '../ActionToast';
import OutputPreview from '../OutputPreview';
import CollectorsModal from '../CollectorsModal';
import FollowersModal from '../FollowersModal';
import PriceosModal from '../PriceosModal';
import FamiliarModal from '../FamiliarModal';
import PriceSpriteModal from '../PriceSpriteModal';
import GasTrackerModal from '../GasTrackerModal';
import StickersModal from '../StickersModal';
import CartPanel from '../CartPanel';
import BenchPanel from '../BenchPanel';
import BenchDragLayer from '../BenchDragLayer';

export function PriceOSShell({ children }: { children: ReactNode }) {
    useBodyClass();
    useNavFade();
    const pathname = usePathname();

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const loader = document.getElementById('pd-loader');
        if (!loader) return;
        setTimeout(() => {
            loader.animate(
                [{ opacity: 1 }, { opacity: 0 }],
                { duration: 350, easing: 'ease-out', fill: 'forwards' }
            ).onfinish = () => loader.remove();
        }, 600);
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
       page load, so the rotation has to land in a client effect.
       2026-06-12 (Brendon): the tab now LEADS with what's in it —
       project name on /art/* pages, @handle on profile pages — then
       "Price Discussion", then the tabstract. Keyed to the pathname so
       client-side navigation retitles too. */
    useEffect(() => {
        if (typeof document === 'undefined') return;
        const segs = (pathname || '/').split('/').filter(Boolean);
        let context: string | null = null;
        if (segs[0] === 'art' && segs[1]) {
            context = getProject(segs[1])?.displayName ?? segs[1].toUpperCase();
        } else if (segs.length >= 1 && !['artists', 'offline', 'api'].includes(segs[0])) {
            context = `@${segs[0].toLowerCase()}`;
        }
        document.title = pickTabstractTitle(context);
    }, [pathname]);

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

    /* External links → real Safari, never the in-app browser (Brendon,
       2026-06-13, iOS 26 PWA). In an installed PWA, any external link (whether
       a plain `target="_blank"` anchor or one with its own window.open handler)
       opens an in-app sheet that covers the app. We intercept every external
       anchor click in capture phase and hand the URL to Safari via a top-level
       navigation — iOS keeps the standalone app put and opens Safari. Capture +
       stopPropagation also blocks any element's own window.open handler from
       ALSO firing. Only active in standalone, so desktop/mobile-web new-tab
       behaviour is untouched. Same-origin links (in-app routing) pass through. */
    useEffect(() => {
        if (!isStandalonePWA()) return;
        const onClick = (e: MouseEvent) => {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
            const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as
                | HTMLAnchorElement
                | null;
            if (!a) return;
            const href = a.href;
            if (!/^https?:\/\//i.test(href)) return; // leave mailto:, tel:, in-app schemes
            if (a.origin === window.location.origin) return; // in-app routing
            e.preventDefault();
            e.stopPropagation();
            window.location.href = href;
        };
        document.addEventListener('click', onClick, true);
        return () => document.removeEventListener('click', onClick, true);
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

    /* Each globally-mounted island is wrapped in its own ErrorBoundary so a
       render-phase crash in any ONE surface (a modal, the backgrounds layer,
       the navbar, …) is contained to that surface instead of white-screening
       the whole app — the deep cause of the "half our features crash the
       site" pain (Brendon, 2026-06-13). Chrome/overlays fall back to nothing
       (a dead modal simply doesn't appear); the routed page below is covered
       separately by app/error.tsx, which keeps this shell alive and offers a
       retry, so `children` is deliberately NOT wrapped here. */
    return (
        <>
            <ErrorBoundary name="Backgrounds">
                <Backgrounds />
            </ErrorBoundary>
            <ErrorBoundary name="FaviconEngine">
                <FaviconEngine />
            </ErrorBoundary>
            <ErrorBoundary name="Navbar">
                <Navbar />
            </ErrorBoundary>
            <ErrorBoundary name="AmbientStrip">
                <AmbientStrip />
            </ErrorBoundary>
            <main>{children}</main>
            <ErrorBoundary name="Footer">
                <Footer />
            </ErrorBoundary>
            <ErrorBoundary name="ActionToast">
                <ActionToast />
            </ErrorBoundary>
            <ErrorBoundary name="OutputPreview">
                <OutputPreview />
            </ErrorBoundary>
            <ErrorBoundary name="CollectorsModal">
                <CollectorsModal />
            </ErrorBoundary>
            <ErrorBoundary name="FollowersModal">
                <FollowersModal />
            </ErrorBoundary>
            <ErrorBoundary name="PriceosModal">
                <PriceosModal />
            </ErrorBoundary>
            <ErrorBoundary name="FamiliarModal">
                <FamiliarModal />
            </ErrorBoundary>
            <ErrorBoundary name="PriceSpriteModal">
                <PriceSpriteModal />
            </ErrorBoundary>
            <ErrorBoundary name="GasTrackerModal">
                <GasTrackerModal />
            </ErrorBoundary>
            <ErrorBoundary name="StickersModal">
                <StickersModal />
            </ErrorBoundary>
            <ErrorBoundary name="CartPanel">
                <CartPanel />
            </ErrorBoundary>
            <ErrorBoundary name="BenchPanel">
                <BenchPanel />
            </ErrorBoundary>
            <ErrorBoundary name="BenchDragLayer">
                <BenchDragLayer />
            </ErrorBoundary>
        </>
    );
}
