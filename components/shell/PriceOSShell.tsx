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

import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useModal } from '../../lib/state/ModalContext';
import { useCart } from '../../lib/state/CartContext';
import { useDropdown } from '../../lib/state/DropdownContext';
import { useBodyClass } from '../../lib/hooks/useBodyClass';
import { useFogReveal } from '../../lib/hooks/useFogReveal';
import { useNavFade } from '../../lib/hooks/useNavFade';
import { pickTabstractTitle } from '../../lib/title/tabstract';
import { getProject } from '../../lib/project/registry';
import { mountPtr, unmountPtr } from '../../lib/pwa/ptrEngine';
import { isStandalonePWA } from '../../lib/pwa/openExternal';
import { navSuppressed, clearNavSuppress } from '../../lib/pwa/navSuppress';
import { markPwaUsed, USERSTATE_HYDRATED_EVENT } from '../../lib/state/userState';
// Side-effect: start capturing Chrome's beforeinstallprompt as early as possible
// so signup Step 3 can fire the native Android install dialog.
import '../../lib/pwa/installPrompt';
import { Backgrounds } from './Backgrounds';
import { FaviconEngine } from './FaviconEngine';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import AmbientStrip from './AmbientStrip';
import PreviewHealer from './PreviewHealer';
import { ErrorBoundary } from './ErrorBoundary';
import ActionToast from '../ActionToast';
import TodoReminders from '../todos/TodoReminders';
import WorkflowWatcher from '../workflows/WorkflowWatcher';
import OutputPreview from '../OutputPreview';
import CollectorsModal from '../CollectorsModal';
import FollowersModal from '../FollowersModal';
import ProjectsProModal from '../ProjectsProModal';
import PriceosModal from '../PriceosModal';
import AboutPdModal from '../AboutPdModal';
import SupportModal from '../SupportModal';
import FamiliarModal from '../FamiliarModal';
import PriceSpriteModal from '../PriceSpriteModal';
import LeaderboardModal from '../LeaderboardModal';
import GolfLeaderboardModal from '../GolfLeaderboardModal';
import GasTrackerModal from '../GasTrackerModal';
import StickersModal from '../StickersModal';
import SpiteBookModal from '../SpiteBookModal';
import TarotSpreadModal from '../TarotSpreadModal';
import GnomeWalletModal from '../GnomeWalletModal';
import OfferShieldCast from '../OfferShieldCast';
import PanopticonConfirmModal from '../PanopticonConfirmModal';
import CartographyModal from '../CartographyModal';
import ComposerModal from '../composer/ComposerModal';
import SigilForgeModal from '../SigilForgeModal';
import RewindBar from './RewindBar';
import TakeoverCastModal from '../takeover/TakeoverCastModal';
import PanopticonOverlay from './PanopticonOverlay';
import CartPanel from '../CartPanel';
import MarketSheets from '../market/MarketSheets';
import ExchangeModal from '../exchange/ExchangeModal';
import TheWatch from './TheWatch';
import BenchDock from '../BenchDock';
import CommandStone from '../stone/CommandStone';
import FmBar from '../fm/FmBar';
import NativePingsFirstRun from './NativePingsFirstRun';

export function PriceOSShell({ children }: { children: ReactNode }) {
    useBodyClass();
    useNavFade();
    /* Fog-mode tap-to-reveal — document-level so fog works on EVERY grid
       (home carousels, profile, project), not just #gallery (2026-07-17). */
    useFogReveal();
    const pathname = usePathname();
    const router = useRouter();
    const { close: closeModal } = useModal();
    const { closePanel: closeCart } = useCart();
    const { reset: resetDropdown } = useDropdown();

    /* Close any open overlay when the route actually changes. With full-page
       reloads every nav wiped the screen, so a modal / cart panel / menu left
       open could never bleed onto the next page; with in-app routing the shell
       persists, so we close them ourselves on navigation. Closers are read
       through a ref so this fires ONLY on a real pathname change — never on an
       unrelated re-render that would otherwise yank a just-opened overlay shut.
       The initial mount is skipped so a deep link that opens an overlay on load
       isn't immediately closed. */
    const overlayCloseRef = useRef<() => void>(() => {});
    overlayCloseRef.current = () => { closeModal(); closeCart(); resetDropdown(); };
    const navStartedRef = useRef(false);
    useEffect(() => {
        if (!navStartedRef.current) { navStartedRef.current = true; return; }
        overlayCloseRef.current();
    }, [pathname]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const loader = document.getElementById('pd-loader');
        if (!loader) return;
        setTimeout(() => {
            loader.animate(
                [{ opacity: 1 }, { opacity: 0 }],
                { duration: 350, easing: 'ease-out', fill: 'forwards' }
            ).onfinish = () => {
                loader.remove();
                /* Boot is over — stamp the dismissal so a React re-injection
                   of the loader markup (see the layout's #pd-loader notes)
                   stays invisible and inert for the rest of the session. */
                document.documentElement.setAttribute('data-pd-loader-done', '');
            };
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
        const standalone = iosStandalone || displayMode;
        if (standalone) {
            document.body.classList.add('is-pwa');
            mountPtr();
        }
        if (!standalone) {
            return () => { unmountPtr(); };
        }
        /* PWA conversion stamp (first-party): this session is running as the
           installed app. markPwaUsed no-ops until the account snapshot has
           hydrated, so stamp on the hydrate event (and once now in case it's
           already in). Records converted_at once + last_used_at each launch. */
        markPwaUsed();
        window.addEventListener(USERSTATE_HYDRATED_EVENT, markPwaUsed);
        return () => {
            window.removeEventListener(USERSTATE_HYDRATED_EVENT, markPwaUsed);
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
        /* EVERY page opens AT ITS TOP (Brendon, 2026-07-13 — the Studio
           "loads slightly scrolled down" bug applies sitewide). pageshow
           alone missed the revisit paths where the browser restores a prior
           visit's position before our manual scrollRestoration takes hold,
           so the document also pins itself once at hydration, and again next
           frame to beat late restores. Hash deep-links keep their jump; a
           modal scroll-lock is never fought. */
        if (!window.location.hash && !document.body.classList.contains('modal-open')) {
            window.scrollTo(0, 0);
            requestAnimationFrame(() => {
                if (!window.location.hash && !document.body.classList.contains('modal-open')) {
                    window.scrollTo(0, 0);
                }
            });
        }
        return () => window.removeEventListener('pageshow', onPageShow);
    }, []);

    /* BUG (recurring, since launch) — returning to PD from another tab/app
       left the page nudged a few px off where it was. iOS recomputes the
       dynamic viewport height (address bar show/hide) the moment the tab is
       shown again, and the browser compensates by shifting scroll. The
       pageshow reset above only catches a full bfcache restore (e.g. swipe-
       back); the common "tab stayed alive" return fires no pageshow, so the
       nudge stuck. We can't stop the recompute, so we pin scroll when the tab
       hides and restore it the instant it's shown. Dormant for swipe-back
       (that never hides the tab) and skipped while a modal owns the scroll
       lock (position:fixed). (Brendon, 2026-06-16) */
    useEffect(() => {
        if (typeof window === 'undefined') return;
        let savedY = 0;
        const onVisibility = () => {
            if (document.body.classList.contains('modal-open')) return;
            if (document.visibilityState === 'hidden') {
                savedY = window.scrollY;
            } else {
                const target = savedY;
                requestAnimationFrame(() => window.scrollTo(0, target));
            }
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
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
            // A long-press just handled this gesture (e.g. starring a soundtrack)
            // — swallow the trailing synthetic click so it doesn't ALSO navigate.
            if (navSuppressed()) { e.preventDefault(); e.stopPropagation(); clearNavSuppress(); return; }
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

    /* In-app routing — the snappy, native-app feel (Brendon, 2026-06-25).
       Every page-to-page link in the app is a plain <a href>, so each tap tore
       the whole page down and rebuilt it from the server — the lag, and the
       black-flash-then-repaint of the theme colour (the page goes blank before
       the colour loads). We catch same-origin link taps and route them IN-APP
       instead: the shell, providers and painted background stay mounted, only
       the page body swaps, and the theme colour follows the URL change (already
       wired in ColorwayContext via usePathname) — so the background slides old
       → new instead of flashing through blank. URL, back/forward, refresh and
       share all behave exactly as before.

       Capture phase (see the registration note below): a deeper element that
       stops the click (cards, output rows, modal bodies) must NOT force the link
       into a full reload — capturing at the document means we route every
       same-origin link in-app first. Guards below leave every NON-in-app case to
       the browser untouched: new-tab modifier clicks, middle-click, target=_blank,
       downloads, rel=external, external origins, mailto:/tel:/in-app schemes, pure
       same-page #hash jumps, and an explicit data-native-nav escape hatch for any
       link that must hard-load. */
    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (e.defaultPrevented) return;
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as
                | HTMLAnchorElement
                | null;
            if (!a) return;
            // A long-press already handled this gesture (e.g. starring a
            // soundtrack) — swallow the trailing synthetic click, don't route.
            if (navSuppressed()) { e.preventDefault(); clearNavSuppress(); return; }
            if (a.dataset.nativeNav !== undefined) return;     // explicit opt-out
            if (a.target && a.target !== '_self') return;       // _blank etc.
            if (a.hasAttribute('download')) return;
            if ((a.getAttribute('rel') || '').toLowerCase().includes('external')) return;
            if (!/^https?:\/\//i.test(a.href)) return;          // mailto:, tel:, schemes
            if (a.origin !== window.location.origin) return;     // external → leave it
            // Pure same-page #hash jump (same path+query, only the hash differs)
            // → let the browser do its native in-page scroll, don't re-route.
            const here = window.location.pathname + window.location.search;
            if (a.hash && a.pathname + a.search === here) return;
            e.preventDefault();
            // Tapping a link to the page you're already on must NOT stack a
            // duplicate history entry — those duplicates are why Back seemed
            // to do nothing / loop (each press "went back" to the same URL;
            // Brendon, 2026-07-06). Same destination → stay put.
            if (a.pathname + a.search + a.hash === here + window.location.hash) return;
            router.push(a.pathname + a.search + a.hash);
        };
        // CAPTURE phase (Brendon, 2026-06-25 — the "random reload" fix). On the
        // bubble phase, any ancestor that calls stopPropagation on the click
        // (cards, output rows, the full-screen links below an output, modal
        // bodies) stops the event before it reaches the document, so that link
        // fell through to a full-page reload. Capturing at the document means we
        // see EVERY same-origin link first and route it in-app regardless. The
        // explicit opt-outs above still hold (data-native-nav, target, download,
        // rel=external, cross-origin, #hash); a link that must hard-load uses
        // data-native-nav.
        document.addEventListener('click', onClick, true);
        return () => document.removeEventListener('click', onClick, true);
    }, [router]);

    /* Prefetch on PRESS (Brendon, 2026-06-25 — part 2 of the link-lag fix). The
       in-app swap is smooth, but the routed pages are force-dynamic, so each tap
       still waits on the server to build the page: the remaining lag. Warm the
       destination the instant a link is pressed, so the fetch is already in
       flight by the time the tap completes — the press→tap gap becomes the head
       start. pointerdown fires ONCE per press, never on hover or during a
       scroll, so there's no prefetch storm (that storm — hover/scroll firing on
       every link — is what choked the server last time). Read-only + deduped;
       same guards as the click router. */
    useEffect(() => {
        const seen = new Set<string>();
        const warm = (e: Event) => {
            const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as
                | HTMLAnchorElement
                | null;
            if (!a) return;
            if (a.dataset.nativeNav !== undefined) return;
            if (a.target && a.target !== '_self') return;
            if (a.hasAttribute('download')) return;
            if ((a.getAttribute('rel') || '').toLowerCase().includes('external')) return;
            if (!/^https?:\/\//i.test(a.href)) return;
            if (a.origin !== window.location.origin) return;
            const url = a.pathname + a.search;
            if (url === window.location.pathname + window.location.search) return;
            if (seen.has(url)) return;
            seen.add(url);
            try { router.prefetch(url); } catch { /* ignore */ }
        };
        document.addEventListener('pointerdown', warm, { passive: true });
        return () => document.removeEventListener('pointerdown', warm);
    }, [router]);

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
    /* PD-Docs (/docs/*) is its own reading surface — the docs layout carries
       its own header, nav, and footer, so the app chrome (navbar, tape,
       footer, modal/overlay islands) stays off it. Providers and the
       colorway paint still apply (the docs mount the ColorwayPicker), and
       the loader-exit effect above has already run.
       ⛔ The Command Stone AND the miniplayer are the exception: they live
       ABOVE realms and must persist ACROSS the docs boundary (Brendon,
       2026-07-22: "keep the player in docs — can always × it out"). So they
       are rendered ONCE in the shared tail below, at a stable position, and
       NEVER inside the docs-only branch — mounting a second copy would be a
       different React instance and would cut the audio on entering docs. */
    const isDocs = pathname === '/docs' || pathname?.startsWith('/docs/');

    return (
        <>
            {!isDocs && (
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
            <ErrorBoundary name="PreviewHealer">
                <PreviewHealer />
            </ErrorBoundary>
            </>
            )}
            {/* Key the page body on the path so each route mounts a FRESH
                subtree — matching the old full-reload semantics exactly, so no
                page that assumed a reload keeps stale per-route state. The shell,
                providers and painted background live OUTSIDE <main>, so they
                persist across the swap (the native-app feel); only the page
                content remounts. Keyed on pathname only (not query/hash), so an
                in-page #hash jump or a query tweak never forces a remount. */}
            <main key={pathname}>{children}</main>
            {!isDocs && (
            <>
            <ErrorBoundary name="Footer">
                <Footer />
            </ErrorBoundary>
            <ErrorBoundary name="ActionToast">
                <ActionToast />
            </ErrorBoundary>
            <ErrorBoundary name="TodoReminders">
                <TodoReminders />
            </ErrorBoundary>
            <ErrorBoundary name="WorkflowWatcher">
                <WorkflowWatcher />
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
            <ErrorBoundary name="ProjectsProModal">
                <ProjectsProModal />
            </ErrorBoundary>
            <ErrorBoundary name="PriceosModal">
                <PriceosModal />
            </ErrorBoundary>
            <ErrorBoundary name="AboutPdModal">
                <AboutPdModal />
            </ErrorBoundary>
            <ErrorBoundary name="SupportModal">
                <SupportModal />
            </ErrorBoundary>
            <ErrorBoundary name="FamiliarModal">
                <FamiliarModal />
            </ErrorBoundary>
            <ErrorBoundary name="PriceSpriteModal">
                <PriceSpriteModal />
            </ErrorBoundary>
            <ErrorBoundary name="LeaderboardModal">
                <LeaderboardModal />
            </ErrorBoundary>
            <ErrorBoundary name="GolfLeaderboardModal">
                <GolfLeaderboardModal />
            </ErrorBoundary>
            <ErrorBoundary name="GasTrackerModal">
                <GasTrackerModal />
            </ErrorBoundary>
            <ErrorBoundary name="StickersModal">
                <StickersModal />
            </ErrorBoundary>
            <ErrorBoundary name="SpiteBookModal">
                <SpiteBookModal />
            </ErrorBoundary>
            <ErrorBoundary name="TarotSpreadModal">
                <TarotSpreadModal />
            </ErrorBoundary>
            <ErrorBoundary name="GnomeWalletModal">
                <GnomeWalletModal />
            </ErrorBoundary>
            <ErrorBoundary name="OfferShieldCast">
                <OfferShieldCast />
            </ErrorBoundary>
            <ErrorBoundary name="PanopticonConfirmModal">
                <PanopticonConfirmModal />
            </ErrorBoundary>
            <ErrorBoundary name="CartographyModal">
                <CartographyModal />
            </ErrorBoundary>
            <ErrorBoundary name="ComposerModal">
                <ComposerModal />
            </ErrorBoundary>
            <ErrorBoundary name="SigilForgeModal">
                <SigilForgeModal />
            </ErrorBoundary>
            <ErrorBoundary name="RewindBar">
                <RewindBar />
            </ErrorBoundary>
            <ErrorBoundary name="TakeoverCastModal">
                <TakeoverCastModal />
            </ErrorBoundary>
            <ErrorBoundary name="PanopticonOverlay">
                <PanopticonOverlay />
            </ErrorBoundary>
            <ErrorBoundary name="CartPanel">
                <CartPanel />
            </ErrorBoundary>
            <ErrorBoundary name="MarketSheets">
                <MarketSheets />
            </ErrorBoundary>
            <ErrorBoundary name="ExchangeModal">
                <ExchangeModal />
            </ErrorBoundary>
            <ErrorBoundary name="TheWatch">
                <TheWatch />
            </ErrorBoundary>
            <ErrorBoundary name="BenchDock">
                <BenchDock />
            </ErrorBoundary>
            <ErrorBoundary name="NativePingsFirstRun">
                <NativePingsFirstRun />
            </ErrorBoundary>
            </>
            )}
            {/* ── ABOVE REALMS — mounted ONCE, on every surface including docs,
                at a stable position so navigating in/out of docs never remounts
                them (the miniplayer's audio survives; the Stone stays summonable
                everywhere). Brendon, 2026-07-22. ── */}
            <ErrorBoundary name="CommandStone">
                <CommandStone />
            </ErrorBoundary>
            <ErrorBoundary name="FmBar">
                <FmBar />
            </ErrorBoundary>
        </>
    );
}
