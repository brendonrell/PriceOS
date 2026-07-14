'use client';

/*
 * AboutPdModal
 *
 * The footer "About PD" link — the platform's front-door story: what PD
 * is, the history timeline, the numbers, how it works (SVG diagrams),
 * where to find us, and how to reach us.
 *
 * Chrome is the PriceosModal (changelog) pattern verbatim: .platform-modal
 * shell, rotating ASCII figlet header with the render-time pick + rAF
 * scale-to-fit, .close-hint, and the .collectors-list scroll body. Content
 * classes are apd-* (styles/modal.css, next to the priceos-changelog block).
 *
 * Copy stance (Brendon, 2026-07-13): PD is FILTERED, NOT CURATED — the
 * artist whitelist is a quality floor, not a taste-making gate. Never
 * describe the platform as curated here or anywhere.
 *
 * Stats are computed from the live registries (projects, achievements) so
 * this modal never goes stale as the catalog grows.
 */

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type MouseEvent as ReactMouseEvent,
} from 'react';
import { useModal } from '../lib/state/ModalContext';
import { ABOUT_LOGOS, pickRandomAbout } from '../lib/logos/priceosLogos';
import { allProjects } from '../lib/project/registry';
import { TOTAL_COUNT, MAX_PRICE_SCORE } from '../lib/achievements/catalog';
import { DISCORD_URL } from '../lib/config/discord';

const VS15 = '︎';

/* Social + contact — @pricediscussion everywhere (Brendon, 2026-07-13). */
const SOCIALS: { label: string; handle: string; href: string }[] = [
    { label: 'X',         handle: '@pricediscussion', href: 'https://x.com/pricediscussion' },
    { label: 'INSTAGRAM', handle: '@pricediscussion', href: 'https://instagram.com/pricediscussion' },
    { label: 'YOUTUBE',   handle: '@pricediscussion', href: 'https://youtube.com/@pricediscussion' },
    { label: 'DISCORD',   handle: 'join the server',  href: DISCORD_URL },
];

const CONTACT_EMAIL = 'price@pricediscussion.com';
const SUPPORT_EMAIL = 'support@pricediscussion.com';

/* The story so far — platform history, oldest first. Real dates. */
const TIMELINE: { date: string; title: string; body: string }[] = [
    {
        date: 'NOV 19 2021',
        title: 'THE CHANNEL',
        body: 'It starts as a chat channel: #price-discussion. A room where the point was already the point — people talking about art through its prices.',
    },
    {
        date: 'APR 2026',
        title: 'THE SIM',
        body: 'PD is born as software — one gigantic simulator file, hundreds of changelog entries deep, where nearly every idea the platform has was proven first.',
    },
    {
        date: 'MAY 2026',
        title: 'THE REAL APP',
        body: 'PriceOS becomes a production platform: profiles, artwork pages, PriceSprites, sign-in with your wallet. The sim retires with honors.',
    },
    {
        date: 'MAY 2026',
        title: 'THE CONTRACTS',
        body: 'The on-chain suite is locked: one factory, immutable per-project contracts, and the art itself stored on Ethereum — no server, no pin, no dependency.',
    },
    {
        date: 'JUN 2026',
        title: 'THE LANGUAGE',
        body: 'PD grows its own vocabulary — a fixed glyph iconography, True Names in Glagolitic, a 1,000-achievement economy, the Spell Book, the familiars.',
    },
    {
        date: 'JUL 3 2026',
        title: '$PRICE ON MAINNET',
        body: 'The $PRICE token deploys to Ethereum mainnet — 100,000,000 fixed supply, a memetic artifact with deliberately zero platform utility.',
    },
    {
        date: 'JUL 2026',
        title: 'THE EDGE',
        body: 'The whole platform moves to the edge of the network, and the indexer goes serverless. PD runs light enough to run forever.',
    },
    {
        date: 'JUL 12 2026',
        title: 'THE TOOLS',
        body: `The tools era: The Cartography ◫${VS15} (a living map), The Rewind ◄${VS15} (the whole OS at any day), The Dispatch ▤${VS15} (a morning paper that printed its first edition by itself), Hostile Takeover ⚑${VS15}.`,
    },
    {
        date: 'NEXT',
        title: 'MAINNET',
        body: 'The testnet rehearsal, the final audit, then launch day on Ethereum mainnet — where the genesis project opens the catalog.',
    },
];

export default function AboutPdModal() {
    const { openModal, close } = useModal();
    const isOpen = openModal?.name === 'aboutPd';

    const [logo, setLogo] = useState<string>(ABOUT_LOGOS[0]);

    const preRef = useRef<HTMLPreElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);

    /* Fresh figlet on every open — render-time pick, the PriceosModal
       Item-16 pattern (no stale-logo frame during the fade-in). */
    const prevIsOpen = useRef(false);
    if (isOpen && !prevIsOpen.current) {
        prevIsOpen.current = true;
        setLogo(pickRandomAbout());
    } else if (!isOpen && prevIsOpen.current) {
        prevIsOpen.current = false;
    }

    /* Scale-to-fit the figlet — same rAF measure/transform as PriceosModal. */
    useEffect(() => {
        if (!isOpen) return;
        const el = preRef.current;
        const wrap = wrapRef.current;
        if (!el || !wrap) return;
        el.style.transform = '';
        wrap.style.height = '';
        const raf = requestAnimationFrame(() => {
            const avail = wrap.clientWidth - 4;
            const actual = el.scrollWidth;
            if (actual > avail && avail > 0) {
                const s = avail / actual;
                el.style.transform = `scale(${s})`;
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

    /* Live numbers off the real registries — never hand-maintained. */
    const stats = useMemo(() => {
        const projects = allProjects();
        const artists = new Set(projects.map((p) => p.artistHandle.toLowerCase())).size;
        let minEd = Infinity;
        let maxEd = 0;
        for (const p of projects) {
            if (p.outputs < minEd) minEd = p.outputs;
            if (p.outputs > maxEd) maxEd = p.outputs;
        }
        return { projects: projects.length, artists, minEd, maxEd };
    }, []);

    const sep = (label: string) => (
        <div className="priceos-changelog-sep">
            {'────────'} {label}{' '}
            {'────────'}
        </div>
    );

    return (
        <div
            id="aboutPdModal"
            className={`platform-modal${isOpen ? ' active' : ''}`}
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
                {'×'}
                {VS15}
            </div>
            <div
                className="modal-info"
                style={{ marginTop: 0, maxWidth: 720, width: '100%' }}
            >
                <div className="priceos-ascii-logo-wrap" ref={wrapRef}>
                    <pre
                        ref={preRef}
                        className="priceos-ascii-logo"
                        aria-hidden="true"
                    >
                        {logo}
                    </pre>
                </div>

                <div
                    className="collectors-list priceos-changelog-list apd-body"
                    style={{ maxHeight: 'calc(100dvh - 240px)', width: '100%' }}
                >
                    {sep('ABOUT PD')}
                    <p className="apd-p">
                        <b>Price Discussion</b> is a generative art platform on
                        Ethereum where the community discussing prices IS the
                        product. Artists deploy fully on-chain Projects;
                        collectors mint and trade Outputs; and the platform —
                        PriceOS — reads the resulting price movement as a
                        community talking about art.
                    </p>
                    <pre className="apd-ascii-box" aria-label="The 60-day cooldown">
{`+------------------------------------------+
|   THE 60-DAY COOLDOWN                    |
|   One project per artist per 60 days --  |
|   enforced on-chain by the factory.      |
|   No exceptions, no admin override.      |
+------------------------------------------+`}
                    </pre>
                    <p className="apd-p">
                        The cooldown is PD&apos;s heartbeat. Every artist gets
                        one deployment per 60 days — the clock starts the
                        moment a Project goes on-chain, and the factory
                        physically refuses the next one until day 60. An
                        artist can&apos;t flood the catalog, a release costs
                        its maker two months of silence, and every drop is an
                        event because it has to be worth the wait.
                    </p>
                    <pre className="apd-ascii-box" aria-label="PD is filtered, not curated">
{`+------------------------------------------+
|   PD IS FILTERED, NOT CURATED.           |
|   The artist whitelist is a quality      |
|   floor -- not a taste-making gate.      |
|   What clears the floor is up to you.    |
+------------------------------------------+`}
                    </pre>
                    <p className="apd-p">
                        The art is 100% on Ethereum — every Output renders from
                        chain data alone, with no server, no pinning service,
                        and no company that has to stay in business. A
                        Project&apos;s terms at mint are its terms forever: no
                        admin keys, no pausing, no upgrades.
                    </p>

                    {sep('HOW IT WORKS')}
                    <div className="apd-svg-wrap">
                        <svg
                            className="apd-svg"
                            viewBox="0 0 340 150"
                            role="img"
                            aria-label="The loop: artist deploys through the factory, a Project mints Outputs, the market trades them, and the discussion reads the prices"
                        >
                            <g fill="none" stroke="currentColor" strokeWidth="1.2">
                                <rect x="8"   y="10" width="86" height="30" />
                                <rect x="127" y="10" width="86" height="30" />
                                <rect x="246" y="10" width="86" height="30" />
                                <rect x="246" y="72" width="86" height="30" />
                                <rect x="127" y="72" width="86" height="30" />
                                <rect x="8"   y="72" width="86" height="30" />
                                <path d="M94 25 H121" markerEnd="url(#apdArrow)" />
                                <path d="M213 25 H240" markerEnd="url(#apdArrow)" />
                                <path d="M289 40 V66" markerEnd="url(#apdArrow)" />
                                <path d="M246 87 H219" markerEnd="url(#apdArrow)" />
                                <path d="M127 87 H100" markerEnd="url(#apdArrow)" />
                                <path d="M51 72 V46" markerEnd="url(#apdArrow)" strokeDasharray="3 3" />
                            </g>
                            <defs>
                                <marker id="apdArrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
                                    <path d="M0 0 L8 4 L0 8 z" fill="currentColor" />
                                </marker>
                            </defs>
                            <g
                                fill="currentColor"
                                fontFamily="'Courier New', Courier, monospace"
                                fontSize="9"
                                fontWeight="bold"
                                textAnchor="middle"
                            >
                                <text x="51"  y="29">ARTIST</text>
                                <text x="170" y="29">THE FILTER</text>
                                <text x="289" y="29">PROJECT</text>
                                <text x="289" y="91">OUTPUTS</text>
                                <text x="170" y="91">THE MARKET</text>
                                <text x="51"  y="91">THE TALK</text>
                            </g>
                            <g
                                fill="currentColor"
                                fontFamily="'Courier New', Courier, monospace"
                                fontSize="7"
                                textAnchor="middle"
                            >
                                <text x="108" y="20">submits</text>
                                <text x="227" y="20">deploys</text>
                                <text x="304" y="56">mints</text>
                                <text x="232" y="82">trades</text>
                                <text x="113" y="82">prices</text>
                                <text x="30" y="60">inspires</text>
                                <text x="170" y="128">the community discussing prices is the product</text>
                                <text x="170" y="140">{'╰───────────────────────╯'}</text>
                            </g>
                        </svg>
                    </div>

                    {sep('THE STACK')}
                    <div className="apd-svg-wrap">
                        <svg
                            className="apd-svg"
                            viewBox="0 0 340 120"
                            role="img"
                            aria-label="The stack: PriceOS is the social layer off-chain; Ethereum holds the art layer on-chain. PriceOS reads the chain — the art never needs PriceOS."
                        >
                            <g fill="none" stroke="currentColor" strokeWidth="1.2">
                                <rect x="10" y="8"  width="320" height="38" />
                                <rect x="10" y="74" width="320" height="38" />
                                <path d="M170 74 V50" markerEnd="url(#apdArrow2)" />
                            </g>
                            <defs>
                                <marker id="apdArrow2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
                                    <path d="M0 0 L8 4 L0 8 z" fill="currentColor" />
                                </marker>
                            </defs>
                            <g
                                fill="currentColor"
                                fontFamily="'Courier New', Courier, monospace"
                                fontWeight="bold"
                                textAnchor="middle"
                            >
                                <text x="170" y="23" fontSize="10">PRICEOS {'·'} THE SOCIAL LAYER</text>
                                <text x="170" y="38" fontSize="7" fontWeight="normal">profiles {'·'} pings {'·'} the tape {'·'} the tools {'·'} the talk</text>
                                <text x="170" y="89" fontSize="10">ETHEREUM {'·'} THE ART LAYER</text>
                                <text x="170" y="104" fontSize="7" fontWeight="normal">the factory {'·'} the Projects {'·'} the art itself {'·'} royalties</text>
                                <text x="252" y="64" fontSize="7" fontWeight="normal">PriceOS reads the chain. The art never needs PriceOS.</text>
                            </g>
                        </svg>
                    </div>

                    {sep('THE STORY')}
                    <div className="apd-timeline">
                        {TIMELINE.map((t, i) => (
                            <div className="apd-tl-row" key={t.title}>
                                <span className="apd-tl-date">{t.date}</span>
                                <span className="apd-tl-spine" aria-hidden="true">
                                    {i === TIMELINE.length - 1 ? '└─' : '├─'}
                                </span>
                                <span className="apd-tl-body">
                                    <b>{t.title}</b> {'·'} {t.body}
                                </span>
                            </div>
                        ))}
                    </div>

                    {sep('BY THE NUMBERS')}
                    <div className="apd-stats">
                        <div className="apd-stat"><span className="apd-stat-k">PROJECTS IN THE CATALOG</span><span className="apd-stat-v">{stats.projects}</span></div>
                        <div className="apd-stat"><span className="apd-stat-k">ARTISTS</span><span className="apd-stat-v">{stats.artists}</span></div>
                        <div className="apd-stat"><span className="apd-stat-k">EDITION SIZES</span><span className="apd-stat-v">{stats.minEd}{'–'}{stats.maxEd.toLocaleString('en-US')}</span></div>
                        <div className="apd-stat"><span className="apd-stat-k">ACHIEVEMENTS</span><span className="apd-stat-v">{TOTAL_COUNT.toLocaleString('en-US')}</span></div>
                        <div className="apd-stat"><span className="apd-stat-k">MAX PRICESCORE</span><span className="apd-stat-v">{MAX_PRICE_SCORE.toLocaleString('en-US')}</span></div>
                        <div className="apd-stat"><span className="apd-stat-k">TRUE NAME NAMESPACE</span><span className="apd-stat-v">4,879,681</span></div>
                        <div className="apd-stat"><span className="apd-stat-k">ARTIST COOLDOWN</span><span className="apd-stat-v">60 DAYS</span></div>
                        <div className="apd-stat"><span className="apd-stat-k">ARTIST TAKE AT PRIMARY</span><span className="apd-stat-v">95%</span></div>
                        <div className="apd-stat"><span className="apd-stat-k">ART STORED ON ETHEREUM</span><span className="apd-stat-v">100%</span></div>
                    </div>

                    {sep('FIND US')}
                    <div className="apd-links">
                        {SOCIALS.map((s) => (
                            <a
                                key={s.label}
                                className="apd-link-row"
                                href={s.href}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <span className="apd-link-k">{s.label}</span>
                                <span className="apd-link-v">{s.handle}</span>
                            </a>
                        ))}
                    </div>

                    {sep('CONTACT')}
                    <div className="apd-links">
                        <a className="apd-link-row" href={`mailto:${CONTACT_EMAIL}`}>
                            <span className="apd-link-k">SAY HELLO</span>
                            <span className="apd-link-v">{CONTACT_EMAIL}</span>
                        </a>
                        <a className="apd-link-row" href={`mailto:${SUPPORT_EMAIL}`}>
                            <span className="apd-link-k">SUPPORT</span>
                            <span className="apd-link-v">{SUPPORT_EMAIL}</span>
                        </a>
                    </div>

                    <pre className="apd-signoff" aria-hidden="true">
{`     *     .    *        .       *
  .     PRICE IS THE CONVERSATION.   .
     *       .        *       .    *`}
                    </pre>
                </div>
            </div>
        </div>
    );
}
