'use client';

/*
 * EquippedCharm — the worn keychain, hung off the END of the profile tag row
 * (Brendon, 2026-07-29). The split ring is pinned to the row; the chain drops
 * out of it and the charm hangs from the chain's last link, over whatever is
 * below. Default-off: renders NOTHING unless the owner has equipped a charm
 * in the Depanneur. Tap → the full charm popup (never a nav).
 *
 * IT IS A CHAIN, NOT A BAR (Brendon, 2026-07-29). Every link is its own body
 * on its own segment, solved as a real hanging chain — position-based verlet
 * with the ring pinned, the links length-constrained to each other and the
 * charm swinging off the last one. Tilt the phone and gravity moves, so it
 * hangs toward true down and whips and jangles on the way there; scroll the
 * page and the whole chain lags behind. Reduced motion: it hangs dead still.
 *
 * ⛔ HOW IT IS DRAWN — REBUILT 2026-07-30 (Brendon: "my keychain is at like
 * 10fps"). Every earlier speed-up was a patch on the wrong architecture and
 * each one made it worse, so they are gone. The cause was never the solver —
 * it is a dozen points of arithmetic. It was that the ring, the links and the
 * charm all lived inside ONE <svg>, and moving a group inside an SVG makes the
 * browser re-rasterize that whole vector — clip path, gradient, glitter, face,
 * arms and all — sixty times a second. Promoting the SVG to its own layer did
 * nothing, because the layer's contents were dirty every single frame.
 *
 * The rebuild: each link and the charm is now its OWN element, already
 * rasterized, moved by nothing but a transform. The browser reuses the texture
 * it already has and only re-composites — no vector is re-drawn while the
 * chain swings. The charm keeps its own sway/blink/twinkle, and those now
 * repaint one small charm-sized layer instead of the whole assembly.
 *
 * Nothing about the hang, the weight, the whip or the settle changed.
 */

import {
    useCallback, useEffect, useMemo, useRef, useState,
    type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useModal } from '../../lib/state/ModalContext';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import TailBubble, { anchorFromEvent, type BubbleAnchor } from '../shared/TailBubble';
import {
    chainGeom, chainLinkSvg, chainMetalHex, chainRingSvg, charmBailY, charmChain, charmCropTop,
    charmPalette, charmSVG, type CharmRecord,
} from '../../lib/keychains/engine';
import { useKeychainRack, bustRack } from '../../lib/keychains/rack';
import { useParkOffscreen } from '../../lib/keychains/park';
import { computeOwnedFor, getColourLock, applyColourLock, clearColourLock } from '../../lib/stickers/owned';
import { hueFamilyForHex, swatchOfSticker } from '../stickers/StickerManagerModal';
import { gravity, onWake, reducedMotion, requestMotion, resumeMotion, startSway, takeKick } from '../../lib/keychains/sway';

const VS15 = '︎';

/* Solver constants, in the art's own 1000-wide units. */
/* CALMED DOWN (Brendon, 2026-07-29 — "jumping all over the place"). The chain
   still swings and settles, it just isn't flung by every scroll tick and every
   sensor twitch: the shove is a third of what it was and the links shed speed
   noticeably faster. */
const GRAV = 0.62;   // pull toward wherever down is
const DRAG = 0.938;  // links shed speed — a chain rings, it doesn't rattle
const KICK = 3.6;    // one screen pixel of shove ≈ this many art units
const RELAX = 7;     // constraint passes per frame — more = stiffer links
const SLEEP = 0.6;   // total per-frame travel under this for a while = settled

/* The hanging piece is drawn 91px wide out of the art's 1000 units. */
const BOX = 91;
const S = BOX / 1000;

/** One rasterized piece: a standalone SVG data URI sized to its own art. */
function dataUri(body: string, half: number): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-half} ${-half} ${half * 2} ${half * 2}">${body}</svg>`;
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

/* One charm in the switcher — drawn exactly as the Depanneur's own rack draws
   it, chain and all, so a charm looks the same wherever you meet it. */
function CharmTile({ charm }: { charm: CharmRecord }) {
    const svg = useMemo(
        () => charmSVG(charm.seed, `sw${charm.id}`, charm.luck, charm.name, charm.coin, false, true),
        [charm.seed, charm.name, charm.id, charm.luck, charm.coin],
    );
    return <span className="dp-charm-mini" dangerouslySetInnerHTML={{ __html: svg }} />;
}

/* How far apart the split rings sit, and how many hang at once. */
const SPREAD = 13;
const SLOTS = 3;
/* ⛔ THREE CHAINS OFF ONE SPOT, EACH A DIFFERENT LENGTH (Brendon, 2026-08-01 —
   the shape agreed from the start). Every charm's chain is the same six links,
   so three hung side by side land at exactly the same height and read as a flat
   row. The RINGS all stay on the tag row; what differs is how far each chain
   RUNS, so the charms sit at three depths — the middle one lowest.
   ⛔ Never move a rig down as a whole: that drops its ring off the row. */
const CHAIN_RUN = [6, 12, 9];
/* A PAIR LEANS APART (Brendon, 2026-08-01). Two hanging straight down just sit
   beside each other; the short one tips OUT so the pair opens up, the way the
   outer ones do in a full three. Degrees off true down — it rides gravity, so
   it still swings and still hangs toward down on a tilt. */
const PAIR_LEAN = [0, 11];
/* A THREE LEANS THE SAME WAY (Brendon, 2026-08-01) — the outer two tip out,
   the long middle one hangs straight down between them. */
const CHAIN_LEAN = [-15, 0, 14];
/* A pair hangs long on the left, short on the right. */
const PAIR_RUN = [12, 6];

export default function EquippedCharm({ address, handle }: { address: string; handle?: string }) {
    const { open } = useModal();
    const { siweAddress } = useAuth();
    const { showToast } = useToast();
    const rack = useKeychainRack(address);

    /* ⛔ THREE HANG OFF ONE ORIGIN (Brendon, 2026-07-31). The chosen top three
       hang — or, with SHUFFLE on, three drawn at random from everything they
       are wearing, redrawn on every page load. Each one keeps its own chain,
       so they sit at their own heights off the same anchor. */
    const poolKey = (rack?.equipped ?? []).join(',');
    const topKey = (rack?.top ?? []).join(',');
    const hangIds = useMemo(() => {
        if (!rack) return [] as number[];
        if (!rack.shuffle) return rack.top.slice(0, SLOTS);
        const pool = [...rack.equipped];
        const out: number[] = [];
        while (out.length < SLOTS && pool.length > 0) {
            out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]!);
        }
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rack?.address, rack?.shuffle, poolKey, topKey]);

    const charms = useMemo(
        () => hangIds
            .map((id) => rack?.charms.find((c) => c.id === id) ?? null)
            .filter((c): c is CharmRecord => c != null),
        [hangIds, rack],
    );
    /* WHO IS IN FRONT — settled once per page load and left alone. Swapping
       the order while they swing made them flash at rest and pass THROUGH
       each other; a fixed random stack reads as a real bunch (Brendon,
       2026-07-31). */
    const levels = useMemo(() => {
        const order = charms.map((_, i) => i);
        for (let i = order.length - 1; i > 0; --i) {
            const j = Math.floor(Math.random() * (i + 1));
            [order[i], order[j]] = [order[j]!, order[i]!];
        }
        return order;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [charms.map((c) => c.id).join(',')]);
    const charm = charms[0] ?? null;

    /* YOUR OWN KEYCHAIN IS A SWITCHER, NOT A TRAIT SHEET (Brendon, 2026-07-31).
       Tapping someone else's keychain still opens the charm in full — on theirs
       the traits ARE the point. On your own, the tap is for changing which one
       you're wearing, so it opens the same bubble the showcase's "Replace?"
       card uses, scrolling through your rack. */
    const isMine = !!siweAddress && siweAddress.toLowerCase() === address.toLowerCase();
    const [swapAnchor, setSwapAnchor] = useState<BubbleAnchor | null>(null);
    const [busy, setBusy] = useState(false);
    const dismissSwap = useCallback(() => setSwapAnchor(null), []);

    /* The switcher picks WHICH ONES HANG — tapping one takes a hanging slot,
       tapping a hanging one puts it away, and a fourth pick pushes the oldest
       out (Brendon, 2026-07-31). */
    const equip = async (id: number) => {
        if (!siweAddress || busy) return;
        /* The tilt ask rides the equip (Brendon, 2026-07-29) — fired inside the
           gesture, exactly as the Depanneur's own equip does. */
        void requestMotion();
        const wasOn = (rack?.top ?? []).includes(id);
        setBusy(true);
        try {
            const r = await fetch('/api/keychains/equip', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ id, list: 'top' }),
            });
            if (r.ok) {
                bustRack(siweAddress);
                showToast(wasOn ? 'Charm: PUT AWAY' : 'Charm: EQUIPPED');
            } else {
                showToast('Charm: FAILED');
            }
        } finally {
            /* ⛔ THE SWITCHER STAYS OPEN (Brendon, 2026-08-01). Acting inside a
               card is not a reason to shut it — you pick, it updates under your
               finger, you keep picking. */
            setBusy(false);
        }
    };

    /* SHUFFLE — draw the hanging three fresh out of everything you're wearing
       on every page load, instead of the three you picked. */
    const toggleShuffle = async () => {
        if (!siweAddress || busy) return;
        const next = !(rack?.shuffle ?? false);
        setBusy(true);
        try {
            const r = await fetch('/api/keychains/equip', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ shuffle: next }),
            });
            if (r.ok) {
                bustRack(siweAddress);
                showToast(`Shuffle: ${next ? 'ON' : 'OFF'}`);
            } else {
                showToast('Shuffle: FAILED');
            }
        } finally {
            setBusy(false);
        }
    };

    /* ── MATCH MY STICKERS (Brendon, 2026-07-31) ───────────────────────────
       The one-tap colour, run off the keychain you're wearing instead of the
       profile colorway. It narrows your profile to the stickers you ALREADY
       OWN in the charm's hue family — nothing is repainted or bought, because
       a sticker's colour IS its identity. The same button turns it back off.
       Whole family (the light + dark pair), Brendon's call. */
    const [lockLabel, setLockLabel] = useState<string | null>(null);
    const [confirmMatch, setConfirmMatch] = useState(false);
    useEffect(() => {
        if (!isMine || !swapAnchor) return;
        setLockLabel(getColourLock()?.label ?? null);
    }, [isMine, swapAnchor]);

    const matchable = useMemo(() => {
        if (!isMine || !charm) return null;
        const paint = charmPalette(charm.seed, charm.coin, charm.luck);
        const fam = hueFamilyForHex(paint.hex);
        const owned = computeOwnedFor(handle ?? null);
        const keep = owned.filter((s) => fam.hexes.includes(swatchOfSticker(s)));
        return keep.length ? { fam, paint, keepIds: keep.map((s) => s.id), ownedIds: owned.map((s) => s.id) } : null;
    }, [isMine, charm, handle]);

    const runMatch = () => {
        if (!matchable) return;
        applyColourLock(matchable.fam.hexes.length ? `fam:${matchable.fam.hexes.join(',')}` : '', matchable.fam.label, matchable.keepIds, matchable.ownedIds);
        setLockLabel(matchable.fam.label);
        setConfirmMatch(false);
        showToast(`Profile: ${matchable.fam.label}`);
    };

    const undoMatch = () => {
        clearColourLock();
        setLockLabel(null);
        showToast('Stickers: ALL BACK');
    };

    /* The whole hanging piece, resolved once per charm: the ring, the link
       textures, and the charm art itself (drawn with no chain of its own — the
       chain here is the live one). One of these per charm on the row. */
    const arts = useMemo(() => charms.map((charm, slot) => {
        const luck = charm.luck;
        const base = charmChain(charm.seed, luck);
        /* How far THIS one runs. One on its own keeps the chain it has always
           had; a bunch gets its own length per position. */
        const run = charms.length === 2 ? PAIR_RUN : charms.length > 2 ? CHAIN_RUN : null;
        const links = run?.[slot] ?? base.links;
        const lean = charms.length === 2 ? (PAIR_LEAN[slot] ?? 0)
            : charms.length > 2 ? (CHAIN_LEAN[slot] ?? 0)
            : 0;
        const chain = { ...base, links };
        const metal = chainMetalHex(chain.metal);
        const bailY = charmBailY(charm.seed, charm.coin, luck);
        /* Where the charm's own view starts — normally just above the bail, but
           opened up when the pose reaches higher (a raised hand). The box is
           sized off THIS, never a fixed guess, so nothing the charm draws can
           fall outside it. */
        const crop = charmCropTop(charm.seed, charm.coin, luck);
        /* The link SPACING comes off the charm's own six — the extra links just
           carry the chain further down. Sizing it off the new count would only
           make smaller links over the same drop. */
        const geom = chainGeom(bailY, base.links);
        /* Half-extent of a link's own box, with room for its heaviest stroke. */
        const linkHalf = Math.max(geom.rx, geom.ry, Math.trunc((geom.ry * 144) / 200)) + 14;
        return {
            links: chain.links,
            geom,
            bailY,
            /* The ring never moves — it is nailed to the row. */
            ring: dataUri(chainRingSvg(metal), 72),
            ringPx: 72 * 2 * S,
            linkHalf,
            linkPx: linkHalf * 2 * S,
            linkArt: Array.from({ length: chain.links }, (_, i) =>
                dataUri(chainLinkSvg(i, geom.rx, geom.ry, metal), linkHalf)),
            /* The charm stays LIVE markup, not a texture: its sway, blink and
               twinkle have to keep running. */
            charmSvg: charmSVG(charm.seed, `eq${charm.id}`, luck, '', charm.coin, true, true),
            charmW: BOX,
            charmH: (1000 - crop) * S,
            /* Where the bail sits inside that box — the point it swings from. */
            bailPx: (bailY - crop) * S,
            /* Degrees off true down — how far this one splays out of the bunch. */
            lean,
            id: charm.id,
            name: charm.name,
        };
    }), [charms]);

    /* One set of pieces per hanging charm. */
    const linkRefs = useRef<(HTMLSpanElement | null)[][]>([]);
    const charmRefs = useRef<(HTMLSpanElement | null)[]>([]);
    const hostRef = useRef<HTMLSpanElement | null>(null);
    /* The switcher draws the whole rack — only the visible tiles stay alive.
       The count goes to nought while the bubble is shut, so the tiles are
       picked up fresh each time it opens. */
    const swapGridRef = useRef<HTMLDivElement | null>(null);
    useParkOffscreen(swapGridRef, swapAnchor ? (rack?.charms.length ?? 0) : 0);

    useEffect(() => {
        if (!arts.length) return;
        resumeMotion();
        const stopSway = startSway();

        /* One solved chain per hanging charm — same maths as a single one,
           run side by side off the same gravity. */
        const rigs = arts.map((art, r) => {
            const N = art.links;
            const L = art.geom.step;
            /* The charm's own weight hangs below its bail — the chain swings
               it, and it swings on the chain. */
            const comLen = Math.max(140, (940 - art.bailY) * 0.45);
            const len: number[] = [];
            for (let i = 0; i < N; ++i) len.push(L);
            len.push(comLen);

            const n = N + 2;           // 0 = the ring (pinned) … N+1 = the charm's weight
            const px = new Float64Array(n);
            const py = new Float64Array(n);
            const ox = new Float64Array(n);
            const oy = new Float64Array(n);
            for (let i = 0; i < n; ++i) {
                px[i] = 500;
                py[i] = art.geom.top + (i <= N ? L * i : L * N + comLen);
                ox[i] = px[i];
                oy[i] = py[i];
            }
            /* Its own down: true down, tipped by however far it splays out. */
            const th = (art.lean * Math.PI) / 180;
            return { art, r, N, n, len, px, py, ox, oy, cos: Math.cos(th), sin: Math.sin(th) };
        });

        /* The only per-frame writes: one transform per piece. Nothing here
           changes geometry, size or layout, so no vector is ever re-drawn. */
        const draw = () => {
            for (const rig of rigs) {
                const { art, r, N, px, py } = rig;
                for (let i = 0; i < N; ++i) {
                    const dx = px[i + 1]! - px[i]!;
                    const dy = py[i + 1]! - py[i]!;
                    const dist = Math.hypot(dx, dy) || 1e-6;
                    const ux = dx / dist;
                    const uy = dy / dist;
                    // Rotate the link's own down-axis onto the segment.
                    const ang = (Math.atan2(-ux, uy) * 180) / Math.PI;
                    const cx = (px[i]! + ux * art.geom.off) * S;
                    const cy = (py[i]! + uy * art.geom.off) * S;
                    const el = linkRefs.current[r]?.[i];
                    if (el) {
                        el.style.transform =
                            `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0) rotate(${ang.toFixed(2)}deg)`;
                    }
                }
                const bx = px[N]! * S;
                const by = py[N]! * S;
                const cdx = px[N + 1]! - px[N]!;
                const cdy = py[N + 1]! - py[N]!;
                const cd = Math.hypot(cdx, cdy) || 1e-6;
                const cang = (Math.atan2(-cdx / cd, cdy / cd) * 180) / Math.PI;
                const body = charmRefs.current[r];
                if (body) {
                    body.style.transform =
                        `translate3d(${bx.toFixed(2)}px, ${by.toFixed(2)}px, 0) rotate(${cang.toFixed(2)}deg)`;
                }
            }
        };

        /* Reduced motion: hang it straight and leave it alone. */
        if (reducedMotion()) {
            draw();
            return () => { stopSway(); };
        }

        /* ⛔ THE LAYER HINT RIDES THE SWING (Brendon, 2026-08-01 — the profile
           lag). Every link and charm used to be promoted to its own compositor
           layer for the whole life of the page; thirty of those sat over the
           gallery grid doing nothing while the chain hung dead still. The hint
           is what keeps the swing from re-rasterizing, so it goes ON the instant
           the solver starts and comes OFF only once the chain has settled or
           left the screen. Never remove it outright — the swing needs it. */
        const setSwinging = (on: boolean) => {
            hostRef.current?.classList.toggle('is-swinging', on);
        };

        let raf = 0;
        let calm = 0;
        /* It only solves while it is on screen — swinging something nobody can
           see is pure waste. Coming back it drops the shoves it missed and
           carries on; the hang and the bob are untouched. */
        let onScreen = true;

        const step = () => {
            if (!onScreen || document.hidden) { raf = 0; return; }
            const g = gravity();
            const k = takeKick();
            const gx0 = g.x * GRAV;
            const gy0 = g.y * GRAV;
            const kxa = k.x * KICK;
            const kya = k.y * KICK;

            let travel = 0;
            for (const rig of rigs) {
                const { n, len, px, py, ox, oy, cos, sin } = rig;
                /* Down for THIS one — the splay rides gravity, so a leaning
                   charm still swings and still finds true down on a tilt. */
                const gxa = gx0 * cos + gy0 * sin;
                const gya = gy0 * cos - gx0 * sin;
                for (let i = 1; i < n; ++i) {
                    const vx = (px[i]! - ox[i]!) * DRAG;
                    const vy = (py[i]! - oy[i]!) * DRAG;
                    ox[i] = px[i]!;
                    oy[i] = py[i]!;
                    px[i]! += vx + gxa + kxa;
                    py[i]! += vy + gya + kya;
                }

                // The links hold their length to each other; the ring never moves.
                for (let pass = 0; pass < RELAX; ++pass) {
                    for (let i = 0; i < n - 1; ++i) {
                        const dx = px[i + 1]! - px[i]!;
                        const dy = py[i + 1]! - py[i]!;
                        const dist = Math.hypot(dx, dy) || 1e-6;
                        const pull = (dist - len[i]!) / dist;
                        const mx = dx * pull;
                        const my = dy * pull;
                        if (i === 0) {
                            px[1]! -= mx;
                            py[1]! -= my;
                        } else {
                            px[i]! += mx * 0.5;
                            py[i]! += my * 0.5;
                            px[i + 1]! -= mx * 0.5;
                            py[i + 1]! -= my * 0.5;
                        }
                    }
                }

                for (let i = 1; i < n; ++i) travel += Math.abs(px[i]! - ox[i]!) + Math.abs(py[i]! - oy[i]!);
            }
            draw();

            // Settled and nothing shoving it — park until something moves.
            calm = travel < SLEEP ? calm + 1 : 0;
            if (calm > 24) { raf = 0; setSwinging(false); return; }
            raf = requestAnimationFrame(step);
        };

        const kick = () => {
            if (!onScreen || document.hidden) return;
            calm = 0;
            if (!raf) { setSwinging(true); raf = requestAnimationFrame(step); }
        };
        const stopWake = onWake(kick);

        const io = typeof IntersectionObserver !== 'undefined' && hostRef.current
            ? new IntersectionObserver((entries) => {
                const vis = entries[entries.length - 1]?.isIntersecting ?? true;
                if (vis === onScreen) return;
                onScreen = vis;
                hostRef.current?.classList.toggle('is-parked', !vis);
                if (vis) { takeKick(); kick(); }
                else if (raf) { cancelAnimationFrame(raf); raf = 0; setSwinging(false); }
            }, { rootMargin: '80px' })
            : null;
        io?.observe(hostRef.current!);

        const onVis = () => {
            hostRef.current?.classList.toggle('is-parked', document.hidden || !onScreen);
            if (!document.hidden) { takeKick(); kick(); }
            else if (raf) { cancelAnimationFrame(raf); raf = 0; setSwinging(false); }
        };
        document.addEventListener('visibilitychange', onVis);

        kick();

        return () => {
            stopWake();
            stopSway();
            io?.disconnect();
            document.removeEventListener('visibilitychange', onVis);
            if (raf) cancelAnimationFrame(raf);
            setSwinging(false);
        };
    }, [arts]);

    if (!charm || !arts.length) return null;

    /* Tapping one of them: your own row opens the switcher, anyone else's
       opens the charm you actually tapped. */
    const tapCharm = (
        e: ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>,
        id: number,
    ) => {
        e.preventDefault();
        e.stopPropagation();
        if (isMine) setSwapAnchor(anchorFromEvent(e));
        else open('keychain', `${address.toLowerCase()}:${id}`);
    };
    const tap = (e: ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>) =>
        tapCharm(e, charm.id);

    return (
        <span
            ref={hostRef}
            className="pd-charm-worn"
            role="button"
            tabIndex={0}
            /* The slot widens with the bunch so the tag row still spaces
               itself properly; the chains still overflow downward. */
            style={{ width: 12 + (arts.length - 1) * SPREAD }}
            title={isMine ? 'Swap keychain' : charm.name || 'Keychain'}
            onClick={tap}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') tap(e); }}
        >
            {swapAnchor && rack && (
                <TailBubble anchor={swapAnchor} className="showcase-swap-card charm-swap-card" onDismiss={dismissSwap}>
                    <div className="ms-confirm-question">Wear which one?</div>
                    <div className="showcase-swap-grid charm-swap-grid" ref={swapGridRef}>
                        {rack.charms.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                className="showcase-swap-cell charm-swap-cell"
                                disabled={busy}
                                title={c.name || `Charm #${c.id}`}
                                onClick={(ev) => {
                                    ev.preventDefault();
                                    ev.stopPropagation();
                                    void equip(c.id);
                                }}
                            >
                                <CharmTile charm={c} />
                                {rack.top.includes(c.id) && <span className="dp-rack-worn">WORN</span>}
                            </button>
                        ))}
                    </div>
                    {/* SHUFFLE — the three that hang are drawn fresh out of
                        everything you're wearing on every page load, so the
                        row is a different bunch each visit. */}
                    <button
                        type="button"
                        className={`charm-swap-door${rack.shuffle ? ' on' : ''}`}
                        onClick={(ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            void toggleShuffle();
                        }}
                    >
                        {`⟳${VS15}`} {rack.shuffle ? 'SHUFFLE ON' : 'SHUFFLE MY KEYCHAINS'}
                    </button>
                    {/* Match my stickers to this charm — shown only when you
                        actually own stickers in its family, so it is never dead
                        chrome. Lit while the lock is on; the same tap undoes. */}
                    {matchable && (
                        <button
                            type="button"
                            className={`charm-swap-door${lockLabel ? ' on' : ''}`}
                            onClick={(ev) => {
                                ev.preventDefault();
                                ev.stopPropagation();
                                if (lockLabel) { undoMatch(); return; }
                                setConfirmMatch(true);
                            }}
                        >
                            {`⊞${VS15}`} {lockLabel ? 'UNMATCH STICKERS' : 'MATCH MY STICKERS'}
                        </button>
                    )}
                    {/* The way through to the machine — a quiet footer line under
                        the rack, outside the scroll so it is always reachable. */}
                    <button
                        type="button"
                        className="charm-swap-door"
                        onClick={(ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            open('depanneur');
                        }}
                    >
                        {`☯${VS15}`} THE DEPANNEUR
                    </button>
                </TailBubble>
            )}
            {/* The confirm — the site's own centred card, same as unlisting. */}
            {confirmMatch && matchable && typeof document !== 'undefined' && createPortal(
                <div
                    className="starred-confirm-overlay"
                    role="dialog"
                    aria-modal="true"
                    style={{ zIndex: 100001 }}
                    onClick={() => setConfirmMatch(false)}
                >
                    <div className="ms-confirm-card is-centered" onClick={(e) => e.stopPropagation()}>
                        <div className="ms-confirm-question">Match your stickers to {matchable.paint.name}?</div>
                        <div className="ms-confirm-btns">
                            <button type="button" className="ms-confirm-btn ms-confirm-btn--cancel" onClick={() => setConfirmMatch(false)}>Cancel</button>
                            <button type="button" className="ms-confirm-btn ms-confirm-btn--ok" onClick={runMatch}>Match</button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
            {arts.map((art, r) => (
                <span
                    key={art.id}
                    className="pd-charm-hang"
                    /* All the rings sit within a few pixels of each other — one
                       origin, a small bunch — and who is in front was drawn
                       once when the page loaded. */
                    style={{
                        marginLeft: (r - (arts.length - 1) / 2) * SPREAD,
                        zIndex: 5 + (levels[r] ?? r),
                    }}
                >
                    {/* The ring is the anchor — it is nailed to the end of the row
                        and never moves, so it is drawn once and left alone. */}
                    <span
                        className="pd-charm-ring"
                        style={{
                            width: art.ringPx,
                            height: art.ringPx,
                            marginLeft: -art.ringPx / 2,
                            marginTop: -art.ringPx / 2,
                            backgroundImage: art.ring,
                            transform: `translate3d(${(500 * S).toFixed(2)}px, ${(108 * S).toFixed(2)}px, 0)`,
                        }}
                    />
                    {art.linkArt.map((uri, i) => (
                        <span
                            key={i}
                            className="pd-charm-link"
                            ref={(el) => {
                                (linkRefs.current[r] ||= [])[i] = el;
                            }}
                            style={{
                                width: art.linkPx,
                                height: art.linkPx,
                                marginLeft: -art.linkPx / 2,
                                marginTop: -art.linkPx / 2,
                                backgroundImage: uri,
                            }}
                        />
                    ))}
                    <span
                        className="pd-charm-body"
                        ref={(el) => { charmRefs.current[r] = el; }}
                        role="button"
                        tabIndex={-1}
                        title={isMine ? 'Swap keychain' : art.name || 'Keychain'}
                        onClick={(e) => tapCharm(e, art.id)}
                        style={{
                            width: art.charmW,
                            height: art.charmH,
                            marginLeft: -art.charmW / 2,
                            marginTop: -art.bailPx,
                            transformOrigin: `${art.charmW / 2}px ${art.bailPx}px`,
                        }}
                        dangerouslySetInnerHTML={{ __html: art.charmSvg }}
                    />
                </span>
            ))}
        </span>
    );
}
