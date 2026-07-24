'use client';

/*
 * PriceosModal
 *
 * Sim id #priceosModal (sim.html 5462–5477). The PriceOS *changelog*
 * dialog — distinct from PriceOS-the-shell. ASCII figlet logo header
 * (one of N rotates on each open) + version-list body.
 *
 * Triggered from the global footer "PriceOS 1.0" link
 * (sim 5338, openPriceosModal). Mounted globally in PriceOSShell so
 * any caller can fire useModal().open('priceos').
 *
 * Mock data only — port of a representative slice of sim's
 * PRICEOS_CHANGELOG (sim 7581) and a curated subset of PRICEOS_LOGOS
 * (sim 7470). Sim's full changelog is several hundred entries; we
 * carry the 10 most-recent v1.0.x bumps for the prototype.
 *
 * Logo rotation: pickLogo() runs on every open, deterministic random
 * pick from the curated set. Sim's _pickPriceosLogo() also applies a
 * scale() transform to fit narrow viewports — that's a CSS-port-time
 * concern (Build 4 scope = mock data only, no CSS port), so we render
 * the <pre> raw and let it overflow scroll if needed. Real fit math
 * lands in a follow-up polish pass.
 *
 * Hooks discipline: all hooks at the top, internals gate on isOpen.
 */

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type MouseEvent as ReactMouseEvent,
} from 'react';
import { useModal, useModalLayer } from '../lib/state/ModalContext';
import { FLAT_LOGOS, pickRandomLogo } from '../lib/logos/priceosLogos';

interface ChangelogEntry {
    v: string;
    date: string;
    items: string[];
}

/* F54 (BUG-06) — full PRICEOS_LOGOS pool now lives in
   lib/logos/priceosLogos.ts (80 figlet renders across common/middle/rare
   tiers, lifted verbatim from sim 7484-7551). Pre-F54 the modal carried
   a hand-curated 6-logo inline subset; the rotation was tiny enough
   that returning users would loop the same figlet within a few opens.
   Picker is the flat-pool equal-probability variant per Brendon's APR
   20 debug-phase request (sim 7553-7555). */

/* 10 most-recent changelog entries from sim 7581, condensed for the
   prototype. Sim ports the full 100+-entry log when the
   live changelog wires to a repo / RSS feed. */
const CHANGELOG: ChangelogEntry[] = [
    {
        v: 'v1.0.46',
        date: 'APR 28 2026',
        items: [
            'Cart button relocated to far-left of the user-menu-wrapper.',
            'Add to Cart hover icon now only renders on listed tokens.',
        ],
    },
    {
        v: 'v1.0.45',
        date: 'APR 28 2026',
        items: [
            'Cart shipped — bulk-buy multiple tokens in one transaction.',
            'Setup Code nomenclature shortened (~22% shorter, brand-glyph versioning).',
        ],
    },
    {
        v: 'v1.0.44',
        date: 'APR 28 2026',
        items: [
            'Setup Code horizontal swipe-scroll fix on iOS (touch-action: pan-x).',
        ],
    },
    {
        v: 'v1.0.43',
        date: 'APR 28 2026',
        items: [
            'Collected By underline fix — single ::after stroke across PriceSprite + handle.',
        ],
    },
    {
        v: 'v1.0.42',
        date: 'APR 28 2026',
        items: [
            'PRISMS replaces STRATA as the placeholder project — radial sectors.',
            'Modal pin nudge bumped +4 → +6px.',
        ],
    },
    {
        v: 'v1.0.41',
        date: 'APR 28 2026',
        items: [
            'Token modal anatomy refactor — Calc relocated, To Do added, Grail relocated, price restored, owner upgraded.',
        ],
    },
    {
        v: 'v1.0.40',
        date: 'APR 28 2026',
        items: [
            'NEW — The Calc ƒ. Slide-up bottom sheet, vs-floor delta + P&L ladder.',
        ],
    },
    {
        v: 'v1.0.39',
        date: 'APR 28 2026',
        items: [
            'Artist color persistence + migration (localStorage.pd_custom_color).',
            'Workspace default migration (_OLD_DEFAULT_CODES).',
        ],
    },
    {
        v: 'v1.0.38',
        date: 'APR 28 2026',
        items: [
            'Workspace switcher menu-close bug — root-caused + e.stopPropagation() fix.',
            'Artist custom default color → Attention Yellow (#FFE600).',
        ],
    },
    {
        v: 'v1.0.37',
        date: 'APR 28 2026',
        items: [
            'Workspace switcher visibility fix (var(--bg-color) for dot fill).',
            'Workspace switcher height fix (16px hit area, 4/6px dot).',
        ],
    },
];

function pickLogo(): string {
    return pickRandomLogo();
}

export default function PriceosModal() {
    const { openModal, close } = useModal();
    const { isOpen, isTopStacked } = useModalLayer('priceos');

    const [logo, setLogo] = useState<string>(FLAT_LOGOS[0]);

    /* F54 (BUG-06) — refs for the rAF scale-to-fit pass. Sim 7566-7578
       measures el.scrollWidth against wrap.clientWidth-4 after the
       <pre> commits, then applies a CSS scale transform when the figlet
       overflows. Without this, the larger logos (Big Money-nw, Slant
       Relief, Larry 3D, Henry 3D) overflow the modal width and either
       clip or cause horizontal scroll. The scale also shrinks the wrap
       height so there's no ghost vertical space below the scaled figlet. */
    const preRef = useRef<HTMLPreElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);

    /* Item 16 — Pick a fresh logo on every isOpen false→true transition
       SYNCHRONOUSLY DURING RENDER, not in a post-commit useEffect. Sim's
       _pickPriceosLogo() (sim 7556-7579) runs INSIDE window.openPriceosModal
       (sim 7897-7900) BEFORE `pm.classList.add('active')` makes the modal
       visible — meaning the <pre>'s textContent is already the new logo
       at the moment the modal's opacity transition begins. Sim's <pre>
       is empty in initial DOM (sim 5471), so there's no prior logo to
       flash either.

       The pre-Item-16 React port mirrored this with a useEffect that
       called setLogo(pickLogo()) when isOpen flipped true. useEffect
       runs AFTER commit, so the modal's first paint with .active applied
       still rendered the PREVIOUS logo's state — the user saw the prior
       open's logo for one frame of the 0.3s opacity fade-in (modal.css:39),
       then a re-render swapped in the new pick and the user visibly saw
       the figlet change mid-fade. Brendon's report verbatim: "It briefly
       shows the previous one and you see it change."

       Fix: React's "adjusting state on prop change" pattern (React docs:
       https://react.dev/learn/you-might-not-need-an-effect#adjusting-state-on-prop-change).
       Setting state during render aborts the in-flight render and
       restarts it with the updated state — no commit happens between
       the two renders, so there's no paint with the stale logo. The
       prevIsOpen ref tracks the transition so we only repick on
       false→true edges (not on every re-render while open).

       Result: sim parity. Modal's first paint with .active set already
       carries the new logo. */
    const prevIsOpen = useRef(false);
    if (isOpen && !prevIsOpen.current) {
        prevIsOpen.current = true;
        setLogo(pickLogo());
    } else if (!isOpen && prevIsOpen.current) {
        prevIsOpen.current = false;
    }

    /* F54 — fit the rendered figlet to the wrap. Sim 7561-7578 verbatim:
       reset transform → measure scrollWidth → if it exceeds available,
       compute scale and apply, then shrink the wrap height so it doesn't
       leave dead space below the scaled <pre>. Runs on every logo change
       (modal open) inside requestAnimationFrame so layout has settled.

       2026-07-24 — off-centre clip fix (Brendon). The <pre> is an
       inline-block in a text-align:center wrap, so it only gets centred
       while it FITS. The moment it overflows, the browser parks it flush
       at the wrap's left content edge, which puts the <pre>'s own centre
       (the CSS transform-origin: center top) to the RIGHT of the wrap's
       centre — so scale() shrank the figlet about the wrong axis and the
       result hung past the wrap's right edge and got clipped by
       overflow:hidden. Worst case measured on a 390px viewport: Doh lost
       23px off its right side; 11 of the 211 pool entries were affected,
       three of them already live.

       Fix: scale from the LEFT edge instead, then translate by the exact
       leftover slack so the shrunk block sits dead centre. Because
       s = avail / actual, the scaled width is always exactly `avail`, so
       the slack is the wrap's 4px measuring margin (2px a side) — but it
       is computed rather than hardcoded so it stays correct if that
       margin ever changes. Nothing about the fit maths or the height
       collapse moves; only the anchor point. */
    useEffect(() => {
        if (!isOpen) return;
        const el = preRef.current;
        const wrap = wrapRef.current;
        if (!el || !wrap) return;
        // Reset before measuring so prior transforms don't pollute scrollWidth.
        el.style.transform = '';
        el.style.transformOrigin = '';
        wrap.style.height = '';
        const raf = requestAnimationFrame(() => {
            const avail = wrap.clientWidth - 4;
            const actual = el.scrollWidth;
            if (actual > avail && avail > 0) {
                const s = avail / actual;
                const dx = (wrap.clientWidth - actual * s) / 2;
                el.style.transformOrigin = 'left top';
                el.style.transform = `translateX(${dx}px) scale(${s})`;
                const origH = el.scrollHeight;
                wrap.style.height = `${origH * s}px`;
            }
        });
        return () => cancelAnimationFrame(raf);
    }, [logo, isOpen]);

    const onBackdropClick = useCallback(
        (e: ReactMouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) close();
        },
        [close]
    );

    return (
        <div
            id="priceosModal"
            className={`platform-modal${isOpen ? ' active' : ''}`}
            data-stack-top={isTopStacked || undefined}
            role="dialog"
            aria-modal="true"
            onClick={onBackdropClick}
        >
            <div
                className="close-hint"
                role="button"
                tabIndex={0}
                onClick={close}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        close();
                    }
                }}
                title="Close"
            >
                {'\u00D7'}
                {'\uFE0E'}
            </div>
            <div
                className="modal-info"
                style={{ marginTop: 0, maxWidth: 720, width: '100%' }}
            >
                <div className="priceos-ascii-logo-wrap" ref={wrapRef}>
                    <pre
                        ref={preRef}
                        className="priceos-ascii-logo"
                        id="priceosAsciiLogo"
                        aria-hidden="true"
                    >
                        {logo}
                    </pre>
                </div>
                <div className="priceos-changelog-sep">
                    {'\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'}{' '}
                    CHANGELOG &middot; v1.0{' '}
                    {'\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'}
                </div>
                <div
                    className="collectors-list priceos-changelog-list"
                    id="priceosChangelogWrap"
                    style={{ maxHeight: 360, width: '100%' }}
                >
                    <div id="priceosChangelogList">
                        {CHANGELOG.map((entry) => (
                            <div
                                key={entry.v}
                                className="priceos-changelog-entry"
                            >
                                <div className="cl-version">
                                    <span>{entry.v}</span>
                                    <span className="cl-date">{entry.date}</span>
                                </div>
                                <ul>
                                    {entry.items.map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
