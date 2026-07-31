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
import { useModal } from '../../lib/state/ModalContext';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import TailBubble, { anchorFromEvent, type BubbleAnchor } from '../shared/TailBubble';
import {
    chainGeom, chainLinkSvg, chainMetalHex, chainRingSvg, charmBailY, charmChain, charmCropTop,
    charmSVG, type CharmRecord,
} from '../../lib/keychains/engine';
import { useKeychainRack, bustRack } from '../../lib/keychains/rack';
import { gravity, onWake, reducedMotion, requestMotion, resumeMotion, startSway, takeKick } from '../../lib/keychains/sway';

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
        () => charmSVG(charm.seed, `sw${charm.id}`, charm.luck, charm.name, charm.coin),
        [charm.seed, charm.name, charm.id, charm.luck, charm.coin],
    );
    return <span className="dp-charm-mini" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default function EquippedCharm({ address }: { address: string }) {
    const { open } = useModal();
    const { siweAddress } = useAuth();
    const { showToast } = useToast();
    const rack = useKeychainRack(address);
    const charm = rack?.equipped != null
        ? rack.charms.find((c) => c.id === rack.equipped) ?? null
        : null;

    /* YOUR OWN KEYCHAIN IS A SWITCHER, NOT A TRAIT SHEET (Brendon, 2026-07-31).
       Tapping someone else's keychain still opens the charm in full — on theirs
       the traits ARE the point. On your own, the tap is for changing which one
       you're wearing, so it opens the same bubble the showcase's "Replace?"
       card uses, scrolling through your rack. */
    const isMine = !!siweAddress && siweAddress.toLowerCase() === address.toLowerCase();
    const [swapAnchor, setSwapAnchor] = useState<BubbleAnchor | null>(null);
    const [busy, setBusy] = useState(false);
    const dismissSwap = useCallback(() => setSwapAnchor(null), []);

    const equip = async (id: number) => {
        if (!siweAddress || busy) return;
        /* The tilt ask rides the equip (Brendon, 2026-07-29) — fired inside the
           gesture, exactly as the Depanneur's own equip does. */
        void requestMotion();
        setBusy(true);
        try {
            const r = await fetch('/api/keychains/equip', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            if (r.ok) {
                bustRack(siweAddress);
                showToast('Charm: EQUIPPED');
            } else {
                showToast('Charm: FAILED');
            }
        } finally {
            setBusy(false);
            setSwapAnchor(null);
        }
    };

    /* The whole hanging piece, resolved once per charm: the ring, the link
       textures, and the charm art itself (drawn with no chain of its own — the
       chain here is the live one). */
    const art = useMemo(() => {
        if (!charm) return null;
        const luck = charm.luck;
        const chain = charmChain(charm.seed, luck);
        const metal = chainMetalHex(chain.metal);
        const bailY = charmBailY(charm.seed, charm.coin, luck);
        /* Where the charm's own view starts — normally just above the bail, but
           opened up when the pose reaches higher (a raised hand). The box is
           sized off THIS, never a fixed guess, so nothing the charm draws can
           fall outside it. */
        const crop = charmCropTop(charm.seed, charm.coin, luck);
        const geom = chainGeom(bailY, chain.links);
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
            charmSvg: charmSVG(charm.seed, `eq${charm.id}`, luck, '', charm.coin, true),
            charmW: BOX,
            charmH: (1000 - crop) * S,
            /* Where the bail sits inside that box — the point it swings from. */
            bailPx: (bailY - crop) * S,
        };
    }, [charm]);

    const linkRefs = useRef<(HTMLSpanElement | null)[]>([]);
    const charmRef = useRef<HTMLSpanElement | null>(null);
    const hostRef = useRef<HTMLSpanElement | null>(null);

    useEffect(() => {
        if (!art) return;
        resumeMotion();
        const stopSway = startSway();

        const N = art.links;
        const L = art.geom.step;
        /* The charm's own weight hangs below its bail — the chain swings it,
           and it swings on the chain. */
        const comLen = Math.max(140, (940 - art.bailY) * 0.45);
        const len: number[] = [];
        for (let i = 0; i < N; ++i) len.push(L);
        len.push(comLen);

        const n = N + 2;               // 0 = the ring (pinned) … N+1 = the charm's weight
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

        /* The only per-frame writes: one transform per piece. Nothing here
           changes geometry, size or layout, so no vector is ever re-drawn. */
        const draw = () => {
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
                const el = linkRefs.current[i];
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
            if (charmRef.current) {
                charmRef.current.style.transform =
                    `translate3d(${bx.toFixed(2)}px, ${by.toFixed(2)}px, 0) rotate(${cang.toFixed(2)}deg)`;
            }
        };

        /* Reduced motion: hang it straight and leave it alone. */
        if (reducedMotion()) {
            draw();
            return () => { stopSway(); };
        }

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
            const gxa = g.x * GRAV;
            const gya = g.y * GRAV;
            const kxa = k.x * KICK;
            const kya = k.y * KICK;

            let travel = 0;
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
            draw();

            // Settled and nothing shoving it — park until something moves.
            calm = travel < SLEEP ? calm + 1 : 0;
            if (calm > 24) { raf = 0; return; }
            raf = requestAnimationFrame(step);
        };

        const kick = () => {
            if (!onScreen || document.hidden) return;
            calm = 0;
            if (!raf) raf = requestAnimationFrame(step);
        };
        const stopWake = onWake(kick);

        const io = typeof IntersectionObserver !== 'undefined' && hostRef.current
            ? new IntersectionObserver((entries) => {
                const vis = entries[entries.length - 1]?.isIntersecting ?? true;
                if (vis === onScreen) return;
                onScreen = vis;
                hostRef.current?.classList.toggle('is-parked', !vis);
                if (vis) { takeKick(); kick(); }
                else if (raf) { cancelAnimationFrame(raf); raf = 0; }
            }, { rootMargin: '80px' })
            : null;
        io?.observe(hostRef.current!);

        const onVis = () => {
            hostRef.current?.classList.toggle('is-parked', document.hidden || !onScreen);
            if (!document.hidden) { takeKick(); kick(); }
        };
        document.addEventListener('visibilitychange', onVis);

        kick();

        return () => {
            stopWake();
            stopSway();
            io?.disconnect();
            document.removeEventListener('visibilitychange', onVis);
            if (raf) cancelAnimationFrame(raf);
        };
    }, [art]);

    if (!charm || !art) return null;

    const tap = (e: ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (isMine) setSwapAnchor(anchorFromEvent(e));
        else open('keychain', `${address.toLowerCase()}:${charm.id}`);
    };

    return (
        <span
            ref={hostRef}
            className="pd-charm-worn"
            role="button"
            tabIndex={0}
            title={isMine ? 'Swap keychain' : charm.name || 'Keychain'}
            onClick={tap}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') tap(e); }}
        >
            {swapAnchor && rack && (
                <TailBubble anchor={swapAnchor} className="showcase-swap-card charm-swap-card" onDismiss={dismissSwap}>
                    <div className="ms-confirm-question">Wear which one?</div>
                    <div className="showcase-swap-grid charm-swap-grid">
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
                                    if (c.id === rack.equipped) { setSwapAnchor(null); return; }
                                    void equip(c.id);
                                }}
                            >
                                <CharmTile charm={c} />
                                {c.id === rack.equipped && <span className="dp-rack-worn">WORN</span>}
                            </button>
                        ))}
                    </div>
                </TailBubble>
            )}
            <span className="pd-charm-hang">
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
                        ref={(el) => { linkRefs.current[i] = el; }}
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
                    ref={charmRef}
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
        </span>
    );
}
