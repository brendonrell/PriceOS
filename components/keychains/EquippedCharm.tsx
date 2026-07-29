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
 */

import { useEffect, useMemo, useRef } from 'react';
import { useModal } from '../../lib/state/ModalContext';
import {
    chainGeom, chainLinkSvg, chainMetalHex, chainRingSvg, charmBailY, charmChain, charmSVG,
} from '../../lib/keychains/engine';
import { useKeychainRack } from '../../lib/keychains/rack';
import { gravity, onWake, reducedMotion, resumeMotion, startSway, takeKick } from '../../lib/keychains/sway';

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

export default function EquippedCharm({ address }: { address: string }) {
    const { open } = useModal();
    const rack = useKeychainRack(address);
    const charm = rack?.equipped != null
        ? rack.charms.find((c) => c.id === rack.equipped) ?? null
        : null;

    /* The whole hanging piece, resolved once per charm: the ring, the link
       shapes, and the charm art itself (drawn with no chain of its own — the
       chain here is the live one). */
    const art = useMemo(() => {
        if (!charm) return null;
        const luck = charm.luck;
        const chain = charmChain(charm.seed, luck);
        const metal = chainMetalHex(chain.metal);
        const bailY = charmBailY(charm.seed, charm.coin, luck);
        const geom = chainGeom(bailY, chain.links);
        const body = charmSVG(charm.seed, `eq${charm.id}`, luck, '', charm.coin, true);
        return {
            links: chain.links,
            geom,
            bailY,
            ring: chainRingSvg(metal),
            linkArt: Array.from({ length: chain.links }, (_, i) => chainLinkSvg(i, geom.rx, geom.ry, metal)),
            /* The charm rides as a nested frame pinned by its BAIL: the art is
               cropped to 30 units above the bail, so the bail sits at this
               group's own origin and the charm swings from it. */
            charmFrame: body.replace('<svg ', `<svg x="-500" y="-30" width="1000" height="${1000 - (bailY - 30)}" `),
        };
    }, [charm]);

    const linkRefs = useRef<(SVGGElement | null)[]>([]);
    const charmRef = useRef<SVGGElement | null>(null);

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

        const draw = () => {
            for (let i = 0; i < N; ++i) {
                const dx = px[i + 1]! - px[i]!;
                const dy = py[i + 1]! - py[i]!;
                const dist = Math.hypot(dx, dy) || 1e-6;
                const ux = dx / dist;
                const uy = dy / dist;
                // Rotate the link's own down-axis onto the segment.
                const ang = (Math.atan2(-ux, uy) * 180) / Math.PI;
                const cx = px[i]! + ux * art.geom.off;
                const cy = py[i]! + uy * art.geom.off;
                linkRefs.current[i]?.setAttribute(
                    'transform',
                    `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${ang.toFixed(2)})`,
                );
            }
            const bx = px[N]!;
            const by = py[N]!;
            const cdx = px[N + 1]! - bx;
            const cdy = py[N + 1]! - by;
            const cd = Math.hypot(cdx, cdy) || 1e-6;
            const cang = (Math.atan2(-cdx / cd, cdy / cd) * 180) / Math.PI;
            charmRef.current?.setAttribute(
                'transform',
                `translate(${bx.toFixed(2)} ${by.toFixed(2)}) rotate(${cang.toFixed(2)})`,
            );
        };

        /* Reduced motion: hang it straight and leave it alone. */
        if (reducedMotion()) {
            draw();
            return () => { stopSway(); };
        }

        let raf = 0;
        let calm = 0;

        const step = () => {
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

        const kick = () => { calm = 0; if (!raf) raf = requestAnimationFrame(step); };
        const stopWake = onWake(kick);
        kick();

        return () => {
            stopWake();
            stopSway();
            if (raf) cancelAnimationFrame(raf);
        };
    }, [art]);

    if (!charm || !art) return null;
    return (
        <span
            className="pd-charm-worn"
            role="button"
            tabIndex={0}
            title={charm.name || 'Keychain'}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); open('keychain', `${address.toLowerCase()}:${charm.id}`); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); open('keychain', `${address.toLowerCase()}:${charm.id}`); } }}
        >
            <svg className="pd-charm-hang" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
                {/* The ring is the anchor — it is nailed to the end of the row. */}
                <g transform="translate(500 108)" dangerouslySetInnerHTML={{ __html: art.ring }} />
                {art.linkArt.map((d, i) => (
                    <g
                        key={i}
                        ref={(el) => { linkRefs.current[i] = el; }}
                        dangerouslySetInnerHTML={{ __html: d }}
                    />
                ))}
                <g ref={charmRef} dangerouslySetInnerHTML={{ __html: art.charmFrame }} />
            </svg>
        </span>
    );
}
