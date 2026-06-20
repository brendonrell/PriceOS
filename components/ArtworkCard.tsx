'use client';

/*
 * ArtworkCard
 *
 * Single Output tile in the project gallery. Sim's gallery is
 * built imperatively in renderFeed (sim ~8155) — each card is an
 * <article class="output-card"> wrapping a clickable .output-content
 * with a .canvas-wrapper for the art and a .meta caption row beneath.
 *
 * v0 scope (this build):
 *   - Render sim's flat card structure with sim class names so the
 *     CSS port wires up without touching this component.
 *   - Stable HSL placeholder canvas. Same seeded formula as OutputPreview
 *     (sim seed = id * 2654435761 >>> 0, three hue derivations, linear +
 *     radial gradient + #id stamp). 400px internal resolution matches
 *     sim's THUMB_WIDTH constant — wrapper scales via CSS.
 *   - Show #id and either the listed price or the truncated owner addr,
 *     matching sim's metaIdStr / metaOwnerStr split (sim ~8092). Listed
 *     tokens get .meta-owner.price-trigger; unlisted get .meta-owner.profile-link.
 *   - On click, open the global OutputPreview at this id via
 *     useModal().open('output', id). The handler lives on .output-content
 *     (matches sim's contentInner.onclick at ~8009).
 *
 * Build 22 layers added (gallery card surface gaps):
 *   - data-pct attribute on .meta-owner.price-trigger. Sim 8106 stamps a
 *     floor-relative pct that the body.pricelens-mode CSS swaps in via
 *     ::before content: attr(data-pct). Mock floor = 0.042 ETH (sim 8099).
 *     Format mirrors sim 8103: explicit +/- sign, one decimal, % suffix.
 *   - Per-card Aura vars (sim 8064-8067). --aura-angle = (i*137)%360 deg
 *     (golden-angle spread so cards aren't synchronized); --aura-duration
 *     = (10 + (i*23)%60/10)s (mild rotation-speed variation, 10–16s range).
 *     Read by the body.aura-active .output-card::before conic gradient.
 *   - Hover overlay (sim 8041-8057). 7 icons (Star/Wishlist/Album/Note/
 *     Grail/Cart/Hammer) over a 0.85 black scrim. Cart only for listed
 *     tokens (sim 8050 isListed branch). Note + Hammer hidden by default
 *     (display:none style) — body.notes-mode / body.hammer-mode reveals
 *     them. Click handlers stub to showToast for v1; real wiring (toggleStar,
 *     openNotePrompt, addToCart, etc.) lands when those flows ship.
 *   - Breadcrumb sticker (sim 8072-8082). Small ⬤ dot on the bottom-right
 *     of .canvas-wrapper, mounted only on the 5 ids the page chose for
 *     this session (parent passes isBreadcrumb). Half-on/half-off the
 *     artwork's rounded corner — it's a "recently visited" UI marker, not
 *     part of the art.
 *   - Price Memory ghost (sim 8085-8089). Faded "LAST · {ethVal} Ξ" readout
 *     in the bottom-left of .canvas-wrapper. Always rendered; visible only
 *     when body.pm-active is set (CSS gate). Per-id deterministic seed
 *     mirrors sim verbatim so the readout is stable across reloads.
 *
 * Build 23 layer added (mute overlay):
 *   - Mute overlay (sim 8038-8040). <div class="mute-overlay"><span
 *     class="mute-label">Mute</span></div> always mounted inside
 *     .canvas-wrapper, before .hover-overlay (sim DOM order). CSS gates
 *     visibility on body.hammer-mode — overlay is display:none baseline,
 *     flips to display:flex when hammer-mode is on. The optional `muted`
 *     prop applies the .muted class to the article and swaps the label
 *     to .muted-final ("Muted" boxed-tape glyph) per sim ~2444. No
 *     parent currently passes muted=true — that requires a real toggleMute
 *     handler (sim 7280) which is out of this build's scope. The prop
 *     existing means the toggle wires up later without further markup
 *     changes. Sim 2390-2392: when hammer-mode is OFF, .muted/.hammered
 *     cards vanish from the grid — that rule lands in globals.css this
 *     build too.
 *
 * Build 35 layer added (BET-06 virtualization port):
 *   - Canvas no longer paints on mount. The render closure is registered
 *     with lib/virtualization/canvasVirtualizer, which uses a single
 *     module-scoped IntersectionObserver to lazy-paint canvases as their
 *     wrappers cross the viewport (rootMargin '400px 0px' — sim 8265).
 *     LRU cap of 60 keeps GPU pressure bounded on Strata's 333 Outputs.
 *     The canvas now carries className="output-canvas" so the .visible
 *     class swap drives the opacity 0 → 1 fade-in (sim 2366-2367).
 *     Cleanup unregisters on unmount.
 *
 * Out of v0 scope: fog-mode reveal handler lives in the project page
 * (gallery-wide event delegation per sim 8364-8389), not here.
 */

import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useModal } from '../lib/state/ModalContext';
import { useToast } from '../lib/state/ToastContext';
import { useProject, paintOutput } from '../lib/state/ProjectContext';
import { getProject } from '../lib/project/registry';
import { sampleCanvasFingerprint } from '../lib/art/sampleColor';
import { needsColorSample, reportFingerprint, reportTraits } from '../lib/art/colorStore';
import { useOutputMeta } from '../lib/hooks/useOutputMeta';
import {
    registerCanvas,
    unregisterCanvas,
} from '../lib/virtualization/canvasVirtualizer';
import { hashSynApplyHex } from '../lib/engines/hashSynEngine';
import {
    getGrails,
    subscribeGrails,
    togglePin as storeTogglePin,
    type GrailPin,
} from '../lib/pins/grailStore';
import {
    getMutedIds,
    isMuted as storeIsMuted,
    muteOnly as storeMuteOnly,
    subscribeMuted,
    toggleMute as storeToggleMute,
} from '../lib/pins/muteStore';
/* chat #6 D010-star — sim 5536-5551. Toggle star via module-singleton
   store (mirrors grailStore / muteStore pattern). Sim itself toggles
   data-starred + .active-star on the icon span DOM directly; the React
   port replaces that with a Set in starStore, persisted to
   localStorage.pd_starred_ids so virtualization-driven remounts don't
   eat the state. */
import {
    getStarredKeys,
    subscribeStarred,
    toggleStar as storeToggleStar,
} from '../lib/pins/starStore';
import {
    getWishlistKeys,
    subscribeWishlist,
    toggleWishlist as storeToggleWishlist,
} from '../lib/pins/wishlistStore';
import { toggleShowcase as storeToggleShowcase } from '../lib/pins/userShowcaseStore';
import { useCart } from '../lib/state/CartContext';
import { useBench } from '../lib/state/BenchContext';
import { useHoldDrag } from '../lib/hooks/useHoldDrag';
import { usePdNotifs } from '../lib/state/PdNotifsContext';
import { useNotePrompt } from '../lib/state/NotePromptContext';
import { useMultiSelect } from '../lib/state/TraitsContext';
import {
    getActiveBudgetEth,
    subscribeBudgets,
} from '../lib/engines/budgetEngine';
import { publishMarket } from '../lib/home/visibleMarketStore';

interface ArtworkCardProps {
    id: number;
    /* ProjectShowcase tab (sim ~13113-13130). Page picks 6 random ids per
       session as the project showcase and passes this flag down; the card
       wears `.project-showcase-pick` so #gallery.project-showcase-mode CSS
       (globals.css ~3553) shows only picks and hides their .meta.
       Optional + defaults to false so the Artworks tab path is unchanged. */
    projectShowcasePick?: boolean;
    /* Build 22 — sim 8072-8082. Page picks 5 random ids per session as
       "recently visited" breadcrumbs and stamps a ⬤ sticker on each.
       The dot mounts on .canvas-wrapper bottom-right (half-on/half-off
       the rounded corner). Optional + defaults to false. */
    isBreadcrumb?: boolean;
    /* chat #4 — Mute system parity. Card subscribes to muteStore directly,
       same pattern as grailStore above. The legacy `muted` prop on this
       interface (Build 23 placeholder) is removed: no parent ever passed
       it, and the muteStore subscription is the canonical source now.
       sim 7280-7290 toggleMute drives the .muted class via store updates
       → React re-renders the card with `.muted` in articleClass, which
       triggers globals.css 2390 (`body:not(.hammer-mode) .output-card.muted
       { display: none }`) to hide muted cards outside hammer-mode and
       2444-2457 (`.muted-final` boxed-tape label) inside it. */
    /* Above-the-fold flag. The page passes eager=true for the first
       screenful of cards so their canvas paints SYNCHRONOUSLY on mount
       (virtualizer paintNow) instead of waiting for the IntersectionObserver
       + rAF queue. This is the "just there on load" path; the lazy tail
       keeps the OOM crash-guard. Defaults false. */
    eager?: boolean;
    /* Hide the "owned by you" check (Brendon 2026-06-12). The check rides
       every card the viewer owns EXCEPT inside their own Collected tab —
       there everything is owned, so the checks are just noise over the art.
       The Collected grid passes this true. Defaults false. */
    hideOwnedBadge?: boolean;
    /* Profile grids span many projects, so the caption shows the PROJECT NAME
       (Courier) + #ID (Rubik) instead of the owner/price — and never the owner
       (Brendon 2026-06-16). Project/home carousels leave this false. */
    showProjectName?: boolean;
    /* Internal paint resolution. Full grids paint at 400px; surfaces that only
       ever show a TINY tile (home carousels ~120px, shuffle teasers) pass a
       smaller value so the engine paints a fraction of the pixels — the homepage
       mounts dozens of these at once, and the full-res paint is what chokes it
       (Brendon, 2026-06-16). Defaults to 400. */
    renderSize?: number;
}

/* sim 8099 — mock floor used for the Price Lens pct readout. Real
   indexer floor wiring lands later; this is the visual demo. */
const MOCK_FLOOR_ETH = 0.042;

function ArtworkCard({
    id,
    projectShowcasePick = false,
    isBreadcrumb = false,
    eager = false,
    hideOwnedBadge = false,
    showProjectName = false,
    renderSize = 400,
}: ArtworkCardProps) {
    const { open } = useModal();
    const { showToast } = useToast();
    const { title: projectTitle, slug } = useProject();
    const { notifs } = usePdNotifs();
    const { openOutputNoteEditor } = useNotePrompt();
    const meta = useOutputMeta(id);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    /* Build 35 — wrapper ref so the virtualizer can observe this card's
       canvas-wrapper directly (data-id is set on the wrapper to match
       sim 8267 + the existing fog-mode delegation handler at page.tsx:288). */
    const wrapperRef = useRef<HTMLDivElement>(null);

    /* F50 (BUG-02) — grail pin state subscribed from lib/pins/grailStore.
       isPinned drives both the article's `.grail-pinned` class (sim
       12397-12399) and the rendered `.grail-badge` glyph inside the
       canvas-wrapper (sim 12401-12409). Each card subscribes once on
       mount; the snapshot is local component state so React re-renders
       when other surfaces toggle the pin (modal pin button, top-bar
       pill `×`). */
    const [pinnedSet, setPinnedSet] = useState<readonly GrailPin[]>(
        () => getGrails()
    );
    useEffect(() => {
        setPinnedSet(getGrails());
        return subscribeGrails((next) => setPinnedSet(next));
    }, []);
    const isPinned = pinnedSet.some((p) => p.slug === slug && p.id === id);

    /* chat #4 — Mute system parity. Same subscription pattern as the
       grail pin subscription above. mutedSet is local component state so
       React re-renders this card whenever toggleMute / muteOnly fires
       from any surface (this card's own mute click, the modal mute tap,
       the legacy hi-hammer icon). sim 7280-7317 updates the global
       _mutedIds Set; the React port replaces the imperative DOM walk
       (sim's _paintMutedState at 7328-7346) with a per-card subscription
       so reconciliation paints the .muted class + label state for free. */
    const [mutedSet, setMutedSet] = useState<ReadonlySet<number>>(
        () => getMutedIds()
    );
    useEffect(() => {
        setMutedSet(getMutedIds());
        return subscribeMuted((next) => setMutedSet(next));
    }, []);
    const muted = mutedSet.has(id);

    /* chat #6 D010-star — sim 5536-5551. Same subscription pattern as
       grailStore + muteStore. starredSet drives the icon's character
       (☆ unstarred / ★ starred) plus the .active-star class on the span
       (CSS at app/globals.css:3218 sets `.hi-icon.active-star { color:
       #fff }`). Sim toggles data-starred + .active-star directly on the
       DOM; the React port subscribes per-card so reconciliation paints
       the active state on every render — survives remount under
       virtualization (Build 35). */
    const [starredKeys, setStarredKeys] = useState<ReadonlySet<string>>(
        () => getStarredKeys()
    );
    useEffect(() => {
        setStarredKeys(getStarredKeys());
        return subscribeStarred((next) => setStarredKeys(next));
    }, []);
    const starred = starredKeys.has(`${slug}:${id}`);

    /* Wishlist — "want to buy". Same Project-exact, account-backed store as
       stars; the heart on the card adds/removes. */
    const [wishlistKeys, setWishlistKeys] = useState<ReadonlySet<string>>(
        () => getWishlistKeys()
    );
    useEffect(() => {
        setWishlistKeys(getWishlistKeys());
        return subscribeWishlist((next) => setWishlistKeys(next));
    }, []);
    const wishlisted = wishlistKeys.has(`${slug}:${id}`);

    /* chat #6 D010-cart — sim 11823-11836. CartContext already owns the
       items Set + persistence; ArtworkCard reads `has` for the duplicate-
       toast branch + `add` for the mutation. Toast strings mirror sim
       11827 (already-in-cart) + 11834 (added) verbatim. */
    const { add: cartAdd, has: cartHas, items: cartItems } = useCart();
    const { multiSelectActive, isSelected: isOutputSelected, toggleSelected } = useMultiSelect();

    /* sim 7295-7310 — when toggleMute flips Mute → MUTED, the label first
       shows ⟙ + .punch-hammer for 700ms (the swing keyframe), then
       settles to MUTED with .muted-final. The Muted → Mute path is
       instantaneous (no animation). React port mirrors with a `swinging`
       state set on the unmute → mute edge; a 700ms timer flips it off
       and the rendered label re-derives from the muted boolean.

       The Mute / MUTED text rendering is derived from `muted` directly
       so it stays in sync if the muteStore is poked from another tab
       (storage event sync isn't wired today, but the derivation pattern
       prevents drift if it's added later). swinging is a one-shot UI
       flag for the animation only. */
    const [swinging, setSwinging] = useState(false);
    const swingTimerRef = useRef<number | null>(null);
    useEffect(() => {
        return () => {
            if (swingTimerRef.current != null) {
                window.clearTimeout(swingTimerRef.current);
            }
        };
    }, []);
    const startSwing = () => {
        if (swingTimerRef.current != null) {
            window.clearTimeout(swingTimerRef.current);
        }
        setSwinging(true);
        swingTimerRef.current = window.setTimeout(() => {
            setSwinging(false);
            swingTimerRef.current = null;
        }, 700);
    };

    /* The actual mute-click runner used by both the in-card content tap
       (when hammer-mode is on, sim 8008-8014) and the legacy hi-hammer
       hover icon (sim 8056). Sim's `hammerItem` shim mutes-only — the
       hover icon never unmutes — but in practice the icon is hidden via
       CSS (sim 2387 `body.hammer-mode .hi-hammer { display: none }` plus
       its own inline style:none baseline) so the unmute branch is dead.
       Kept here for parity. The card content path uses the full toggle. */
    const runMuteToggle = () => {
        const wasMuted = storeIsMuted(id);
        storeToggleMute(id);
        if (!wasMuted) startSwing();
    };
    const runMuteOnly = (e: React.MouseEvent) => {
        e.stopPropagation();
        const did = storeMuteOnly(id);
        if (did) startSwing();
    };

    /* F57 (BUG-10) — sim 11225-11235 applyBudget. Each card subscribes
       to budgetEngine and applies its own .in-budget class via React
       when an active budget exists AND meta.price <= cap. Subscribing
       per-card (vs the engine walking #gallery and classList.toggling)
       avoids React's reconciler clobbering the class on the next render
       — same end state as sim, idiomatic React port. activeEth state
       is the live numeric cap (or null when no budget active); re-mirror
       on every store emit. */
    const [activeBudgetEth, setActiveBudgetEth] = useState<number | null>(
        () => getActiveBudgetEth()
    );
    useEffect(() => {
        setActiveBudgetEth(getActiveBudgetEth());
        return subscribeBudgets(() => setActiveBudgetEth(getActiveBudgetEth()));
    }, []);
    /* parseFloat strips " ETH" suffix — same pattern as the pricelens
       data-pct stamp below. data-price on the article mirrors sim 7993
       so applyStepLine's DOM walk (sim 11280) reads the same numeric
       attr — uses -1 for unlisted tokens to match sim's sentinel. */
    const rawPriceEth =
        meta?.price != null ? parseFloat(meta.price) : null;
    const inBudget =
        activeBudgetEth != null &&
        rawPriceEth != null &&
        rawPriceEth > 0 &&
        rawPriceEth <= activeBudgetEth;
    const dataPriceAttr =
        rawPriceEth != null && rawPriceEth > 0
            ? rawPriceEth.toString()
            : '-1';

    /* Build 35 — virtualization port (BET-06).
       Pre-Build-35: this useEffect drew immediately on mount, so 222+
       canvases all painted on first render → mobile Safari OOM at
       higher Output counts. Now: the closure that draws the placeholder
       art gets registered with the module-scoped virtualizer, which
       lazy-invokes it via IntersectionObserver + requestIdleCallback
       only when the card's wrapper crosses the viewport (rootMargin
       400px so the paint completes before the user sees the card).
       LRU cap 60 ensures even a long Strata scroll never exceeds the
       GPU texture budget. The draw logic itself is unchanged from the
       prior immediate-paint path — same seed math, same gradients,
       same #id stamp at 400px internal resolution (sim THUMB_WIDTH). */
    useEffect(() => {
        const canvas = canvasRef.current;
        const wrapper = wrapperRef.current;
        if (!canvas || !wrapper) return;

        const render = () => {
            /* Per-Project Artwork via the registry engine (deterministic on
               id). Sets canvas width/height and returns the aspect ratio,
               which we mirror onto the wrapper so CSS scales it correctly. */
            const ratio = paintOutput(canvas, slug, id, renderSize);
            if (wrapper) {
                wrapper.style.aspectRatio = String(ratio);
            }
            /* Sample this piece's visual fingerprint once (colour + aspect +
               brightness + saturation + complexity) from its painted pixels and
               persist it (any engine), in one pass. No-op if already sampled this
               session. (Brendon, 2026-06-16 colour; fingerprint 2026-06-20) */
            if (needsColorSample(slug, id)) {
                reportFingerprint(slug, id, sampleCanvasFingerprint(canvas));
            }
            /* Persist the durable platform traits (Artist/Project/PriceDay/Natal/
               Fate + true name) once per token, backfilling as the gallery is
               browsed. Independent of the colour gate, so already-coloured pieces
               still fill their trait columns. (Brendon, 2026-06-20.) */
            reportTraits(slug, id);
        };

        const vkey = `${slug}:${id}`;
        registerCanvas({ key: vkey, id, wrapper, canvas, render, eager });
        return () => {
            unregisterCanvas(vkey);
        };
    }, [id, slug, eager, renderSize]);

    /* sim 8008-8014 — when hammer-mode is on, tapping the card body
       toggles mute on this token rather than opening the modal. Mode
       state is read from PdNotifsContext (`spell_hammer`), which is
       the canonical source for the body class itself (useBodyClass.ts
       L78 + L123). Reading from notifs avoids touching document.body
       in the click path. */
    const handleOpen = () => {
        if (multiSelectActive) {
            toggleSelected(slug, id);
            return;
        }
        if (notifs.spell_hammer) {
            runMuteToggle();
            return;
        }
        open('output', id, slug);
    };

    /* Sim caption split (sim ~8092):
         - listed   → .meta-owner.price-trigger showing the price
         - unlisted → .meta-owner.profile-link showing the owner display
       The price-trigger onClick re-opens the modal in sim; the .output-content
       wrapper already opens it on any card click, so the price span just
       stops propagation to avoid double-firing if the future overlay layer
       intercepts events differently. */
    const listed = meta?.price != null;
    const ownerDisplay = meta?.ownerDisplay ?? '';
    const ownedByBrendon = meta?.isOwnedByBrendon ?? false;
    /* The piece is held by the Project's own artist — shown as a badge in the
       same spot + size as the "owned by you" check. Viewer-independent (everyone
       sees it). If YOU are the artist and own it, both render: check first,
       artist badge second. */
    const projectArtist = (getProject(slug)?.artistHandle ?? '').toLowerCase();
    const ownerIsArtist =
        projectArtist !== '' &&
        ownerDisplay.replace(/^@/, '').toLowerCase() === projectArtist;

    /* The Bench — press-and-hold then drag this piece onto the dock (BENCH
       always; CART when listed). Same gesture on touch and mouse. Disabled in
       multi-select so that mode keeps the long-press. */
    const { add: benchAdd, items: benchItems } = useBench();
    const benchDrag = useHoldDrag({
        slug,
        id,
        listed,
        enabled: !multiSelectActive,
        onDrop: (target) => {
            if (target === 'cart') {
                if (cartHas(slug, id)) {
                    showToast('Cart: ALREADY IN');
                    return;
                }
                cartAdd(slug, id);
                const next = cartItems.length + 1;
                showToast(`Cart: ADDED · ${next}`);
                return;
            }
            const r = benchAdd(slug, id);
            if (r === 'present') showToast('Bench: ALREADY ON IT');
            else if (r === 'full') showToast('Bench: FULL · 2 max');
            else showToast(`Bench: ADDED · ${benchItems.length + 1}`);
        },
    });

    /* Home is the one mixed-ownership zone: while multi-select is active,
       publish this card's live market state (owned / listed / price) to the
       shared visibleMarketStore so the home action bar can split owner vs
       buyer actions per selected piece. Gated on multi-select, so it's inert
       on every normal view and on the project/profile bars (which read their
       own data, not this store). */
    useEffect(() => {
        if (!multiSelectActive) return;
        publishMarket(slug, id, {
            owned: ownedByBrendon,
            listed,
            price: rawPriceEth,
        });
    }, [multiSelectActive, slug, id, ownedByBrendon, listed, rawPriceEth]);

    /* Build 22 — sim 8100-8104. Floor-relative pct stamped as data-pct
       on .meta-owner.price-trigger. Body.pricelens-mode CSS swaps the
       price text for this pct via ::before content: attr(data-pct).
       parseFloat() strips the " ETH" suffix from the formatted price
       string ("0.123 ETH" → 0.123). Sim only computes/stamps for listed
       tokens, and our React only renders data-pct inside the listed
       branch, so the empty-string init is just for the unused path. */
    let pctStr = '';
    if (listed && meta?.price) {
        const rawEth = parseFloat(meta.price);
        const pct = ((rawEth / MOCK_FLOOR_ETH) - 1) * 100;
        pctStr = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
    }

    /* Build 22 — sim 8064-8067. Per-card Aura vars stamped inline on
       .output-card. Without these every card animates at the same
       angle and speed (synchronized halos look mechanical, not
       organic). The body.aura-active .output-card::before conic
       gradient reads them. id (not array index) is used as the seed
       so the variation is stable across reloads + sort/filter changes
       — sim seeds off the loop variable i which equals the token id
       in render order. */
    const auraAngle = (id * 137) % 360;
    const auraDuration = (10 + ((id * 23) % 60) / 10).toFixed(2) + 's';
    const articleStyle: CSSProperties = {
        ['--aura-angle' as string]: auraAngle + 'deg',
        ['--aura-duration' as string]: auraDuration,
    };

    /* Build 22 — sim 8041-8057. Hover overlay icons. v1 wiring stubs to
       showToast; real handlers (toggleStar, openNotePrompt, etc.) wire
       up when those flows ship. event.stopPropagation on every icon —
       otherwise the click bubbles to .output-content and opens the
       modal. Note + Hammer carry display:none inline (sim 8048, 8056);
       body.notes-mode / body.hammer-mode flips them visible via CSS. */
    const stubAction = (label: string) => (e: React.MouseEvent) => {
        e.stopPropagation();
        showToast(label);
    };

    /* F50 (BUG-02) — sim 8049 hover-icon click handler. Pre-F50 this
       was a stubAction toast; now wires through grailStore.togglePin
       so the pill row + modal pin button update in lockstep. Toast
       text mirrors sim 12424 + 12426 + 12428 (project name title-
       cased, "GRAIL PINNED" / "DE-PINNED" / "Grail Pin Limit: 5 max").
       e.stopPropagation prevents the surrounding .output-content
       click from also opening the modal. */
    const handleGrailClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const collName =
            projectTitle.charAt(0) + projectTitle.slice(1).toLowerCase();
        const result = storeTogglePin(slug, id);
        if (result === 'limit') {
            showToast('Grail Pin Limit: 10 max');
            return;
        }
        if (result === 'unpinned') {
            showToast(`${collName} #${id} DE-PINNED`);
            return;
        }
        showToast(`${collName} #${id} GRAIL PINNED`);
    };

    /* chat #6 D010-star — sim 5536-5551. Sim's toggleStar reads
       data-starred + flips .active-star + showToast('STARRED #'+id) /
       'UNSTARRED #'+id. React port routes through starStore.toggleStar
       (the store fires emit() so every other card subscribed to the
       same id gets the snapshot — relevant for cross-surface listings
       once those land). e.stopPropagation prevents the surrounding
       .output-content click from also opening the modal. */
    const handleStarClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const result = storeToggleStar(slug, id);
        if (result === 'starred') {
            showToast('Added to your Starred Outputs List (Private)');
        } else {
            showToast('Removed from your Starred Outputs List');
        }
    };

    /* Wishlist toggle — add/remove this Output from the buy list. */
    const handleWishlistClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const result = storeToggleWishlist(slug, id);
        showToast(result === 'added' ? 'Added to your Wishlist (Private)' : 'Removed from your Wishlist');
    };

    /* Add to / remove from your profile Showcase (account-backed, 6-slot cap).
       Was a stub that toasted but never saved — the actual bug. */
    const handleShowcaseClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const result = storeToggleShowcase(slug, id);
        showToast(
            result === 'full'
                ? 'Showcase: FULL · 6 max'
                : result === 'added'
                    ? 'Showcase: ADDED'
                    : 'Showcase: REMOVED',
        );
    };

    /* chat #6 D010-cart — sim 11823-11836. addToCart's two branches:
       already-in-cart shows "Prisms #22 already in cart" (sim 11827 —
       title-cased project name + ' #' + id + ' already in cart');
       fresh-add shows "Added to cart · N items" (sim 11834 — uses
       _pdCart.size POST-add, with singular/plural). React reads the
       pre-add count from the items array (which is stable in the click
       closure) and computes post-add as items.length + 1. The icon
       only renders for listed tokens (sim 8050 isListed gate, mirrored
       in the JSX `{listed && ...}` block below) so this handler
       cannot fire on an unlisted card. */
    const handleCartClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (cartHas(slug, id)) {
            const collName =
                projectTitle.charAt(0) +
                projectTitle.slice(1).toLowerCase();
            showToast(`${collName} #${id}: ALREADY IN CART`);
            return;
        }
        cartAdd(slug, id);
        const next = cartItems.length + 1;
        showToast(`Added to cart \u00B7 ${next} item${next === 1 ? '' : 's'}`);
    };

    /* Build 22 — sim 8085. Price Memory ghost seed. Deterministic per id
       so the "last sale" readout is stable across reloads + filter / sort
       changes. CSS gates visibility on body.pm-active (sim 3690). */
    const lastSaleEth = (0.04 + ((id * 47 + 13) % 420) / 1000).toFixed(3);

    /* Build 23 — sim 7280-7290 + 2444-2457. When muted, the article
       carries .muted (which hides it outside hammer-mode per sim 2390),
       and the label text flips to "Muted" with .muted-final styling
       (boxed-tape tag, sim 2444-2457). */
    const isSelected = isOutputSelected(slug, id);
    const articleClass =
        'output-card' +
        (muted ? ' muted' : '') +
        /* ProjectShowcase tab (sim ~13128-13130). CSS on
           #gallery.project-showcase-mode hides all cards except those
           wearing this class. Outside project-showcase-mode it is inert. */
        (projectShowcasePick ? ' project-showcase-pick' : '') +
        /* F50 (BUG-02) — sim 12397-12399. The article wears `.grail-pinned`
           whenever this id is in the grail set; downstream CSS (none yet,
           but the class is the contractual hook future styling reads)
           plus the in-wrapper .grail-badge below give the pinned state
           a visible footprint on the card itself. */
        (isPinned ? ' grail-pinned' : '') +
        /* F57 (BUG-10) — sim 11232. `.in-budget` rides whenever an
           active budget exists and this card's listed price ≤ cap.
           body.budget-active CSS keys off the inverse — non-.in-budget
           cards drop to opacity 0.22 (sim 3957-3964). */
        (inBudget ? ' in-budget' : '') +
        (isSelected ? ' ms-selected' : '') +
        (multiSelectActive ? ' ms-eligible' : '');

    return (
        <article
            className={articleClass}
            data-mint-id={id}
            /* F57 (BUG-10) — sim 7993. Numeric ETH price stamp read
               by applyStepLine's #gallery walk (sim 11280). -1 for
               unlisted tokens matches sim's sentinel. */
            data-price={dataPriceAttr}
            style={articleStyle}
        >
            <div
                className="output-content"
                onClick={handleOpen}
                onPointerDown={benchDrag.onPointerDown}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpen();
                    }
                }}
                /* Hash Synesthesia per-card trigger — sim 8800
                   parallel (openModal locks bg to data.palette.c1
                   when hashsyn is active). PointerEnter fires on
                   desktop hover and on first touch on mobile, so
                   the same handler covers both inputs. hashSynApplyHex
                   no-ops when the engine isn't enabled, so this is
                   inert under every other colorway. */
                onPointerEnter={() => hashSynApplyHex(`hsl(${(id * 37) % 360}, 70%, 50%)`)}
            >
                <div
                    ref={wrapperRef}
                    className="canvas-wrapper art-placeholder"
                    data-id={id}
                    /* Virtualizer key — scopes the card to its project so
                       same-numbered tokens from different projects (home
                       page mounts many at once) don't collide. */
                    data-vkey={`${slug}:${id}`}
                    /* Artwork Swap — profile.html 1749 port. Per-token
                       aspect ratio sourced from the same spec the
                       canvas paint uses, so wrapper and canvas intrinsic
                       dims stay locked. Replaces the prior hardcoded
                       3:4 inline style (Brendon-list-2 chat F item 15).
                       Gallery #gallery rule already carries align-items:
                       start / align-content: start so varied heights
                       lay out cleanly with no further CSS work. */
                    style={{}}
                >
                    <canvas
                        ref={canvasRef}
                        className="output-canvas"
                        style={{ width: '100%', height: '100%', display: 'block' }}
                    />
                    {/* Brendon list item 8 — Degen Mode overlay.
                        Sim 9342-9351 + 1015-1031. When body.degen-mode is
                        active, sim hides the canvas (CSS opacity 0) and
                        overlays a 4-block tile: id / 2-cell trait grid /
                        price. Sim's two trait cells are 'gateway' +
                        'spectrum'; the React port stores Layer + Mineral
                        on OutputMeta — same 2-trait pattern, different
                        names per Build 19's pool migration. We render
                        Layer + Mineral here for parity with the sim's
                        2-cell grid shape.

                        Always mounted when degen flag is true; CSS at
                        globals.css gates the visual via body.degen-mode
                        scoping (the .canvas-wrapper itself is what hides
                        the canvas and shows the dashed border). pointer-
                        events: none in CSS so clicks fall through to the
                        output-content button. */}
                    {notifs.degen && (
                        <div className="degen-overlay">
                            <span className="d-id">#{id}</span>
                            <div className="d-grid">
                                <span className="d-cell">
                                    {Object.values(meta?.traits ?? {})[0] || 'NONE'}
                                </span>
                                <span className="d-cell">
                                    {Object.values(meta?.traits ?? {})[1] || 'NONE'}
                                </span>
                            </div>
                            {meta?.price && (
                                <span className="d-price">{meta.price}</span>
                            )}
                        </div>
                    )}
                    {/* Build 23 + chat #4 — sim 8038-8040 mute overlay.
                        Always mounted; CSS gates visibility on body.hammer-
                        mode. Three label states (sim 7295-7310):
                          baseline    : "Mute"
                          mid-swing   : "⟙" + overlay carries .punch-hammer
                                        (700ms hammerSwing animation, sim
                                        2430-2437)
                          settled     : "MUTED" + .muted-final (boxed-tape,
                                        sim 2444-2457)
                        Uppercase MUTED matches sim 7306; the prior placeholder
                        "Muted" titlecase was a Build 23 stub. */}
                    <div
                        className={
                            'mute-overlay' + (swinging ? ' punch-hammer' : '')
                        }
                    >
                        <span
                            className={
                                'mute-label' +
                                (!swinging && muted ? ' muted-final' : '')
                            }
                        >
                            {swinging
                                ? '\u27D9\uFE0E'
                                : muted
                                    ? 'MUTED'
                                    : 'Mute'}
                        </span>
                    </div>
                    {/* Build 22 — sim 8041-8057 hover overlay.
                        Hidden in multi-select mode so the card
                        reads clean and the ms-badge is the only
                        interactive surface. */}
                    <div className={
                        'hover-overlay' +
                        (multiSelectActive ? ' ms-hidden' : '')
                    }>
                        <div className="hover-bg" />
                        <div className="hover-icons">
                            <span
                                className={
                                    'hi-icon' + (starred ? ' active-star' : '')
                                }
                                title="Star"
                                data-starred={starred ? 'true' : 'false'}
                                onClick={handleStarClick}
                            >
                                {starred ? '\u2605\uFE0E' : '\u2606\uFE0E'}
                            </span>
                            {/* chat #6 — sim 8046 has NO onclick on the
                                Wishlist span. Sim never implemented a
                                wishlist handler (grep across sim.html for
                                wishlistSet / toggleWishlist / pd_wishlist
                                = zero hits). Keeping stubAction here is a
                                deliberate sim deviation — sim's no-op
                                would bubble to .output-content and open
                                the modal, which is worse than the toast.
                                Real handler lands when sim adds one. */}
                            <span
                                className={'hi-icon' + (wishlisted ? ' active-star' : '')}
                                title={wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                                onClick={handleWishlistClick}
                            >
                                {'\u271B\uFE0E'}
                            </span>
                            {/* chat #6 — sim 8047 has NO onclick on the
                                Album span. Same finding as Wishlist —
                                sim never implemented an album handler.
                                stubAction preserved for the same
                                e.stopPropagation reason. Real handler
                                lands when sim adds one. */}
                            <span
                                className="hi-icon"
                                title="Add to Album"
                                onClick={stubAction('Added to Album')}
                            >
                                {'\u25F0\uFE0E'}
                            </span>
                            <span
                                className="hi-icon hi-note"
                                title="Add Note"
                                onClick={(e) => {
                                    /* D010-note (chat #5) — sim 8048:
                                       openNotePrompt(event, parseInt(this
                                       .closest('.output-card').dataset
                                       .mintId)). e.stopPropagation prevents
                                       the surrounding .output-content
                                       click from also opening the modal.
                                       Brendon-list-3 chat A item 1a —
                                       always visible (was body.notes-mode
                                       gated, sim deviation). */
                                    e.stopPropagation();
                                    openOutputNoteEditor(id);
                                }}
                            >
                                {'\u229F\uFE0E'}
                            </span>
                            {/* Brendon-list-3 chat A item 1b — Make To-Do
                                icon added to hover row. Icon-only stub for
                                now; functional handler lands when the
                                To-Dos store ships. Glyph ❍ U+274D matches
                                the modal-pill row in OutputPreview.tsx
                                ("Add to To-Do"). e.stopPropagation prevents
                                the outer .output-content click from
                                opening the modal. Sim deviation: sim
                                hover-icons row has no to-do entry. */}
                            <span
                                className="hi-icon hi-todo"
                                title="Make To-Do"
                                onClick={stubAction('Added to To-Dos')}
                            >
                                {'\u274D\uFE0E'}
                            </span>
                            <span
                                className="hi-icon hi-grail"
                                title="Grail Pin"
                                onClick={handleGrailClick}
                            >
                                {'\u27DF\uFE0E'}
                            </span>
                            {listed && !ownedByBrendon && (
                                <span
                                    className="hi-icon hi-cart"
                                    title="Add to Cart"
                                    onClick={handleCartClick}
                                >
                                    {'\u25A2\uFE0E'}
                                </span>
                            )}
                            {ownedByBrendon && (
                                <span
                                    className="hi-icon hi-showcase"
                                    title="Add to Your Showcase"
                                    onClick={handleShowcaseClick}
                                >
                                    {'\u2446\uFE0E'}
                                </span>
                            )}
                            <span
                                className="hi-icon hi-hammer"
                                title="Mute (Hammer)"
                                style={{ display: 'none' }}
                                onClick={runMuteOnly}
                            >
                                {'\u16A6\uFE0E'}
                            </span>
                        </div>
                    </div>
                    {/* Multi-select badge — shown on every card while
                        ms mode is active. ❐ (U+2750) = unselected;
                        ▣ (U+25A3) = selected. Top-right of
                        canvas-wrapper so it aligns with the ❐ icon
                        in the sort bar. */}
                    {multiSelectActive && (
                        <span
                            className={
                                'ms-check-badge' +
                                (isSelected ? ' ms-check-badge--on' : '')
                            }
                            aria-hidden="true"
                        >
                            {isSelected ? '\u25A3\uFE0E' : '\u2750\uFE0E'}
                        </span>
                    )}
                    {/* F50 (BUG-02) — sim 12401-12409. When this token
                        is in the grail set, paint a small ⟟ glyph in the
                        top-right of the canvas-wrapper (.grail-badge CSS
                        in app/globals.css positions absolute, opacity 0.85,
                        text-shadow for legibility against any artwork).
                        Sim builds this DOM node imperatively in
                        renderGrailBar; React port renders it conditionally
                        from the subscribed pin state instead. */}
                    {isPinned && (
                        <span className="grail-badge" aria-hidden="true">
                            {'\u27DF'}
                        </span>
                    )}
                    {/* Build 22 — sim 8077-8081 breadcrumb sticker. ⬤ on
                        bottom-right of .canvas-wrapper for the 5 ids the
                        page picked this session. CSS .canvas-wrapper:has(.breadcrumb-crumb)
                        flips overflow to visible so the dot can bleed past
                        the rounded corner (half-on/half-off). */}
                    {isBreadcrumb && (
                        <span
                            className="breadcrumb-crumb bc-br"
                            title="Breadcrumb · recently visited"
                        >
                            {'\u2B24'}
                        </span>
                    )}
                    {/* Build 22 — sim 8086-8089 price-memory ghost. Always
                        rendered; CSS gates visibility on body.pm-active.
                        Per-id deterministic seed — stable across reloads. */}
                    <span className="price-memory-ghost">
                        LAST · {lastSaleEth} Ξ
                    </span>
                </div>
                {showProjectName ? (
                    /* Profile grid caption — PROJECT NAME (Courier) + #ID
                        (Rubik), no owner/price (Brendon 2026-06-16). */
                    <div className="meta meta-profile">
                        <span className="meta-proj-name">{projectTitle}</span>
                        <span className="meta-proj-id">#{id}</span>
                    </div>
                ) : (
                <div className="meta">
                    {/* "Owned by you" check (Brendon 2026-06-12): rides
                        EVERY card the viewer owns (was a sim placeholder
                        hardcoded to the first 3 ids), hidden only inside the
                        Collected tab where ownership is a given. */}
                    <span className="meta-id">
                        #{id}
                        {ownedByBrendon && !hideOwnedBadge && (
                            <>
                                {' '}
                                <span className="badge-owned" title="Owned by You">
                                    <span className="css-check" />
                                </span>
                            </>
                        )}
                        {ownerIsArtist && !hideOwnedBadge && (
                            <>
                                {' '}
                                <span className="badge-artist" title="Owned by the Artist">
                                    <span className="artist-mark">{'✺︎'}</span>
                                </span>
                            </>
                        )}
                    </span>
                    {listed ? (
                        <span
                            className="meta-owner price-trigger"
                            data-pct={pctStr}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpen();
                            }}
                        >
                            {meta!.price}
                        </span>
                    ) : (
                        <a
                            className="meta-owner profile-link"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {ownerDisplay}
                        </a>
                    )}
                </div>
                )}
            </div>
        </article>
    );
}

/* Memoized so a parent re-render (e.g. a filter-pill tap on a big gallery) skips
   every card whose props are unchanged. Combined with the multi-select context
   split, a pill tap no longer re-renders hundreds of cards. */
export default memo(ArtworkCard);
