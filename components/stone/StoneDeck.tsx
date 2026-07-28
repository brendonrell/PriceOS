'use client';

/*
 * THE WIDGET DECK — stage 4 of the Command Stone, the presentation pass
 * (docs/briefs/command-stone.md ⛔ STAGE 4 ADDENDUM).
 *
 * "Magic tablet meets Spotlight meets TARS meets watchOS; Raycast is a
 * big inspo" — watchOS as the REFERENCE, not the blueprint (Brendon,
 * 2026-07-20). The tab's contents are CUSTOM BLACK WIDGETS: big type,
 * real data, glanceable cards, in PD's own language (Courier · square
 * corners inside the vessel · the canon glyphs).
 *
 * Two halves, both rendered inside CommandStone's tab:
 *   · WidgetDeck — the summoned hands (calendar · priceday · calc ·
 *     dossier · gallery · matrix · wallet ascii · docs), each riding
 *     the REAL feature it fronts (Rule #0): /api/calendar + todoStore,
 *     usePriceDay, the CalcSheet rate card, /api/search stats, the art
 *     engines via paintOutput, the docs search index + scoring.
 *   · SearchDeck — GO/FIND re-presented: answers as TARS lines (terse,
 *     confident, large), results as glanceable cards — the borrowed
 *     .gsr search-row anatomy is retired inside the stone.
 */

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
    type MouseEvent,
} from 'react';
import SpriteFace from '../SpriteFace';
import { projectSpriteFace } from '../../lib/project/projectSprite';
import { useSpriteFace } from '../../lib/hooks/useSpriteFace';
import { fmtFollowers } from '../../lib/social/useArtistSocial';
import { formatEth } from '../../lib/format/eth';
import { paintOutput } from '../../lib/state/ProjectContext';
import { paintAsciiStandin } from '../../lib/art/asciiStandin';
import { parseQuery } from '../../lib/search/parse';
import { loadIntel } from '../../lib/familiar/intel';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { usePings } from '../../lib/state/PingsContext';
import { projectsByArtist, getProject, allProjects } from '../../lib/project/registry';
import { pdRarityRank } from '../../lib/output/rarity';
import { usePriceDay } from '../../lib/priceday/usePriceDay';
import { formatPriceDate } from '../../lib/priceday/priceday';
import { CAL_TODAY } from '../../lib/calendar/data';
import { dateKey } from '../../lib/calendar/utils';
import { getTodos, subscribeTodos, datedTodosByDay, type TodoItem } from '../../lib/todos/todoStore';
import { buildWalletMark } from '../../lib/stone/mark';
import { commitEtch } from '../../lib/stone/etch';
import { formatMathValue, pdNumberNote } from '../../lib/stone/mathEval';
import { working, loreAnswer, eightballVerdict, fortuneReading, JOKES, pickJoke } from '../../lib/stone/voice';
import { subscribeFm, getFm, fmPlay, fmToggle, fmNext } from '../../lib/fm/fmBus';
import { formatStoneDate, formatDaysAway, todoPhrase, type StoneDate } from '../../lib/stone/dates';
import { MOODS, MARKET_MOODS, type MoodDef, type MarketMoodDef } from '../../lib/stone/moods';
import { TOKENS } from '../../lib/stone/tokens';
import { PerMilleMark } from '../shell/PerMilleMark';
import type { StoneTokenResponse } from '../../app/api/stone/token/route';
import type {
    OracleFirstMintResponse,
    OracleReleaseResponse,
    OracleRankResponse,
    OracleRankRow,
    OracleHoldersResponse,
    OraclePaceResponse,
    OracleMutualsResponse,
} from '../../app/api/stone/oracle/route';
import type { TagMembersResponse } from '../../app/api/tags/members/route';
import {
    pdRarity,
    primaryTrait,
    traitRarity,
    fateRarity,
    colorRarity,
    popCount,
} from '../../lib/output/rarity';
import { readOutputFate } from '../../lib/project/fate';
import { outputColorBucket } from '../../lib/art/outputColor';
import { convertValue, convertAll, formatUnit, formatResult, formatSource } from '../../lib/fx/convert';
import { useFxRates } from '../../lib/fx/rates';
import { useFiat, FIAT_OPTIONS } from '../../lib/state/FiatContext';
import type { WidgetPlan } from '../../lib/stone/widgets';
import type { StoneTrendResponse } from '../../app/api/stone/trend/route';
import type { StoneWrappedResponse } from '../../app/api/stone/wrapped/route';
import { CALC_ROYALTY_PCT, CALC_GAS_ESTIMATE_ETH } from '../CalcSheet';
import { searchIndex, hrefFor, type Hit } from '../docs/DocsSearch';
import type { SearchEntry } from '../../lib/docs/search';
import { pieceName } from '../dropdown/GlobalSearchBar';
import type {
    SearchResponse,
    SearchProjectResult,
    SearchUserResult,
    SearchArtworkResult,
    SearchTraitResult,
} from '../../app/api/search/route';
import { shortAddress } from '../../lib/project/projectAddress';

const VS15 = '︎';

type GoFn = (e: MouseEvent | null, href: string) => void;

/* ── shared plumbing ─────────────────────────────────────────────────── */

/** Session-cached /api/search reads for the widgets that speak live
    numbers (calc · matrix · dossier · gallery). One door (Rule #0). */
const searchCache = new Map<string, Promise<SearchResponse | null>>();
function fetchSearch(q: string): Promise<SearchResponse | null> {
    const key = q.toLowerCase();
    let p = searchCache.get(key);
    if (!p) {
        p = fetch(`/api/search?q=${encodeURIComponent(q)}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);
        searchCache.set(key, p);
    }
    return p;
}

/** The docs corpus — fetched once per session, shared with nothing else
    (the docs pages ship their own copy of the same build-time index). */
let docsIndexP: Promise<SearchEntry[] | null> | null = null;
function fetchDocsIndex(): Promise<SearchEntry[] | null> {
    if (!docsIndexP) {
        docsIndexP = fetch('/docs/search-index.json')
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => {
                docsIndexP = null;
                return null;
            });
    }
    return docsIndexP;
}

/** "◊ 0.42" — the stone's ETH figure (◊ is the canon secondary mark). */
function eth(n: number | null | undefined): string {
    return n == null || !Number.isFinite(n) ? '—' : `◊${formatEth(n)}`;
}

/** Widget title row — every card leads with its name, 12px bold caps. */
function SwTitle({ glyph, label, sub }: { glyph?: string; label: string; sub?: string }) {
    return (
        <div className="sw-title">
            {glyph && <span className="sw-title-glyph">{glyph}</span>}
            <span className="sw-title-label">{label}</span>
            {sub && <span className="sw-title-sub">{sub}</span>}
        </div>
    );
}

/** The TARS voice — a terse, confident, large line. */
function SwSay({ children, lead, onClick }: {
    children: React.ReactNode; lead?: boolean; onClick?: () => void;
}) {
    return (
        <div
            className={`sw-say${lead ? ' sw-say--lead' : ''}${onClick ? ' sw-tap' : ''}`}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onClick={onClick}
            onKeyDown={onClick ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
            } : undefined}
        >
            {children}
        </div>
    );
}

/** Usage hint when a summon needs more words — the stone teaching its
    own grammar, one line. */
function SwHint({ text }: { text: string }) {
    return <div className="sw-hint">{text}</div>;
}

type ActFn = (toast: string) => void;

/** THE FOOTER ACT (the bubble-anatomy pass, Brendon 2026-07-28) — every
    response's one obvious lever is the bubble's FOOTER button, always in
    the same place. A widget registers its act; the vessel renders it as
    the bubble's last row. Null = no act, no footer. */
export interface FooterAct {
    label: string;
    run: () => void;
}
export type FooterFn = (act: FooterAct | null) => void;
/* (The old per-card ActChip is gone — the footer IS the act now.) */

/** Register a card's footer act with the vessel for as long as the card
    is mounted (clears itself on unmount / when the act changes). */
function useFooterAct(onFooter: FooterFn, act: FooterAct | null) {
    const label = act?.label ?? null;
    const runRef = useRef(act?.run);
    runRef.current = act?.run;
    useEffect(() => {
        if (label == null) {
            onFooter(null);
            return;
        }
        onFooter({ label, run: () => runRef.current?.() });
        return () => onFooter(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [label, onFooter]);
}

/** A glanceable art thumb at stone scale — ArtThumb's exact ascii/degen
    manners (components/dropdown/GlobalSearchBar) at a bigger size. */
function SwThumb({ slug, id, size }: { slug: string; id: string | number; size: number }) {
    const ref = useRef<HTMLCanvasElement | null>(null);
    const { notifs } = usePdNotifs();
    const ascii = notifs.asciiArt;
    const degen = notifs.degen;
    useEffect(() => {
        if (degen) return;
        const canvas = ref.current;
        if (!canvas) return;
        const paintNormal = () => {
            try { paintOutput(canvas, slug, Number(id), size); } catch { /* unknown slug */ }
        };
        if (ascii) {
            paintAsciiStandin(canvas, slug, Number(id), size * 2)
                .then((ok) => { if (!ok) paintNormal(); })
                .catch(paintNormal);
            return;
        }
        paintNormal();
    }, [slug, id, ascii, degen, size]);
    if (degen) return <span className="sw-thumb sw-thumb--degen" style={{ width: size, height: size }} aria-hidden="true" />;
    return (
        <canvas
            ref={ref}
            className="sw-thumb"
            width={size}
            height={size}
            style={{ width: size, height: size }}
            aria-hidden="true"
        />
    );
}

/* ══ THE HANDS ═════════════════════════════════════════════════════════ */

/* ── ▦ CALENDAR — the week, real events + to-dos (the TopBarCalendar
      read: /api/calendar merged by day + datedTodosByDay) ── */

interface CalApiItem {
    scope: 'personal' | 'global' | 'auto';
    time?: string | null;
    title: string;
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
const MONTH_WORDS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;
const DAY_WORDS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

function CalendarWidget() {
    const [selDay, setSelDay] = useState({ y: CAL_TODAY.y, m: CAL_TODAY.m, d: CAL_TODAY.d });
    const [calItems, setCalItems] = useState<Record<string, CalApiItem[]>>({});
    const [todoMap, setTodoMap] = useState<Record<string, TodoItem[]>>({});

    useEffect(() => {
        const read = () => setTodoMap(datedTodosByDay(getTodos()));
        read();
        return subscribeTodos(read);
    }, []);

    useEffect(() => {
        const start = new Date(CAL_TODAY.y, CAL_TODAY.m, CAL_TODAY.d);
        start.setDate(start.getDate() - start.getDay());
        const months = new Map<string, { y: number; m: number }>();
        for (let i = 0; i < 7; i++) {
            const dt = new Date(start);
            dt.setDate(start.getDate() + i);
            months.set(`${dt.getFullYear()}-${dt.getMonth()}`, { y: dt.getFullYear(), m: dt.getMonth() });
        }
        let cancelled = false;
        Promise.all(
            Array.from(months.values()).map(({ y, m }) =>
                fetch(`/api/calendar?year=${y}&month=${m + 1}`, { cache: 'no-store' })
                    .then((r) => (r.ok ? r.json() : null))
                    .then((d) => (d?.days as Record<string, CalApiItem[]>) ?? {})
                    .catch(() => ({} as Record<string, CalApiItem[]>)),
            ),
        ).then((results) => {
            if (cancelled) return;
            const merged: Record<string, CalApiItem[]> = {};
            for (const days of results) {
                for (const k of Object.keys(days)) merged[k] = (merged[k] || []).concat(days[k]);
            }
            setCalItems(merged);
        });
        return () => { cancelled = true; };
    }, []);

    const weekStart = new Date(CAL_TODAY.y, CAL_TODAY.m, CAL_TODAY.d);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const cells = Array.from({ length: 7 }, (_, i) => {
        const dt = new Date(weekStart);
        dt.setDate(weekStart.getDate() + i);
        const y = dt.getFullYear(); const m = dt.getMonth(); const d = dt.getDate();
        const key = dateKey(y, m, d);
        return {
            y, m, d,
            letter: DAY_LETTERS[i],
            count: (calItems[key] || []).length,
            hasTodo: !!(todoMap[key] && todoMap[key].length),
            isToday: y === CAL_TODAY.y && m === CAL_TODAY.m && d === CAL_TODAY.d,
        };
    });

    const selKey = dateKey(selDay.y, selDay.m, selDay.d);
    const selDate = new Date(selDay.y, selDay.m, selDay.d);
    const events = calItems[selKey] || [];
    const todos = todoMap[selKey] || [];

    return (
        <div className="stone-widget sw-card">
            <SwTitle
                glyph={`▦${VS15}`}
                label="CALENDAR"
                sub={`${DAY_WORDS[selDate.getDay()]} ${MONTH_WORDS[selDay.m]} ${selDay.d}`}
            />
            <div className="sw-cal-strip">
                {cells.map((c, i) => {
                    const sel = c.y === selDay.y && c.m === selDay.m && c.d === selDay.d;
                    return (
                        <span
                            key={i}
                            className={`sw-cal-cell${sel ? ' sw-cal-cell--sel' : ''}${c.isToday ? ' sw-cal-cell--today' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelDay({ y: c.y, m: c.m, d: c.d })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setSelDay({ y: c.y, m: c.m, d: c.d });
                                }
                            }}
                        >
                            <span className="sw-cal-letter">{c.letter}</span>
                            <span className="sw-cal-num">{c.d}</span>
                            <span className="sw-cal-count">
                                {c.hasTodo && <span className="sw-cal-tododot" />}
                                {c.count}
                            </span>
                        </span>
                    );
                })}
            </div>
            <div className="sw-cal-list">
                {events.length === 0 && todos.length === 0 && (
                    <SwSay>NOTHING SCHEDULED.</SwSay>
                )}
                {todos.map((t, i) => (
                    <div key={`t${i}`} className="sw-cal-item">
                        <span className="sw-cal-ic">{`❍${VS15}`}</span>
                        <span className="sw-cal-text">{t.text}</span>
                    </div>
                ))}
                {events.map((ev, i) => (
                    <div key={`e${i}`} className="sw-cal-item">
                        <span className="sw-cal-time">{ev.time || 'ALL DAY'}</span>
                        <span className="sw-cal-text">{ev.title}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── ✶ PRICEDAY — today's almanac, the big number (usePriceDay: seeded
      placeholder instantly, the real day swaps in) ── */

function PriceDayWidget() {
    const day = usePriceDay();
    return (
        <div className="stone-widget sw-card">
            <SwTitle glyph={`✶${VS15}`} label="PRICEDAY" sub={formatPriceDate()} />
            <div className="sw-pd-number">{day.number}</div>
            {day.flavor && <SwSay lead>{day.flavor}</SwSay>}
            <div className="sw-rows">
                {day.minted.map((r, i) => (
                    <div key={`m${i}`} className="sw-row-line">
                        <span className="sw-row-l">{`✶${VS15} ${r.label}`}</span>
                        <span className="sw-row-r">{r.value}</span>
                    </div>
                ))}
                {day.uploaded.map((r, i) => (
                    <div key={`u${i}`} className="sw-row-line">
                        <span className="sw-row-l">{`✧${VS15} ${r.label}`}</span>
                        <span className="sw-row-r">{r.value}</span>
                    </div>
                ))}
                {day.biggestSale && (
                    <div className="sw-row-line">
                        <span className="sw-row-l">{`⟠${VS15} ${day.biggestSale.label}`}</span>
                        <span className="sw-row-r">{day.biggestSale.value}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── ƒ CALC — the P&L ladder vs the live floor (the CalcSheet's exact
      rate card: 5% royalty + the gas figure) ── */

function CalcWidget({ plan, onAct, onFooter }: {
    plan: Extract<WidgetPlan, { kind: 'calc' }>; onAct: ActFn; onFooter: FooterFn;
}) {
    const [floor, setFloor] = useState<number | null | 'loading'>('loading');
    const { slug, title } = plan;

    useEffect(() => {
        if (!slug || !title) return;
        let cancelled = false;
        setFloor('loading');
        fetchSearch(title).then((r) => {
            if (cancelled) return;
            const proj = r?.projects.find((p) => p.id === slug) ?? r?.projects[0] ?? null;
            setFloor(proj?.floor_eth ?? null);
        });
        return () => { cancelled = true; };
    }, [slug, title]);

    const ready = !!slug && !!title && floor !== 'loading' && floor != null;
    const buy = ready ? (plan.price ?? (floor as number)) : 0;
    /* answer AND act — the footer carves the buy as a Sentinel-armed to-do */
    useFooterAct(onFooter, ready ? {
        label: `❍${VS15} BUY · ${title} · ◊${formatEth(buy)} — etch?`,
        run: () => onAct(commitEtch({
            kind: 'todo-raw',
            input: { text: `buy ${title}`, priceEth: buy },
            chip: '',
        })),
    } : null);

    if (!slug || !title) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`ƒ${VS15}`} label="CALC" />
                <SwHint text="calc <project> <price> — buy at price, flip at floor." />
            </div>
        );
    }
    if (floor === 'loading') {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`ƒ${VS15}`} label="CALC" sub={title.toUpperCase()} />
                <SwSay>{working('floor')}</SwSay>
            </div>
        );
    }
    if (floor == null) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`ƒ${VS15}`} label="CALC" sub={title.toUpperCase()} />
                <SwSay>{`${title.toUpperCase()} HAS NO FLOOR YET.`}</SwSay>
            </div>
        );
    }

    const royalty = floor * CALC_ROYALTY_PCT;
    const takehome = floor - royalty - CALC_GAS_ESTIMATE_ETH;
    const net = takehome - buy;
    const pct = buy > 0 ? (net / buy) * 100 : null;
    const sign = net >= 0 ? '+' : '−';
    return (
        <div className="stone-widget sw-card">
            <SwTitle glyph={`ƒ${VS15}`} label="CALC" sub={title.toUpperCase()} />
            <SwSay lead>
                {`NET ${sign}${formatEth(Math.abs(net))}${pct != null ? ` (${sign}${Math.abs(pct).toFixed(1)}%)` : ''}`}
            </SwSay>
            <div className="sw-rows">
                <div className="sw-row-line"><span className="sw-row-l">BUY</span><span className="sw-row-r">{eth(buy)}</span></div>
                <div className="sw-row-line"><span className="sw-row-l">FLIP AT FLOOR</span><span className="sw-row-r">{eth(floor)}</span></div>
                <div className="sw-row-line"><span className="sw-row-l">− ROYALTY 5%</span><span className="sw-row-r">{eth(royalty)}</span></div>
                <div className="sw-row-line"><span className="sw-row-l">− GAS</span><span className="sw-row-r">{eth(CALC_GAS_ESTIMATE_ETH)}</span></div>
                <div className="sw-row-line"><span className="sw-row-l">TAKEHOME</span><span className="sw-row-r">{eth(takehome)}</span></div>
            </div>
        </div>
    );
}

/* ── ☻/✺ DOSSIER — the read on any collector or artist (search's live
      circle stats + the registry's body of work) ── */

/** The dossier's act — FOLLOW, riding the profile button's exact wire
    (/api/follows, same statuses, same toast strings). */
function FollowKey({ me, target, handle, onAct }: {
    me: string; target: string; handle: string | null; onAct: ActFn;
}) {
    const [following, setFollowing] = useState(false);
    const [busy, setBusy] = useState(false);
    const self = me.toLowerCase() === target.toLowerCase();
    const label = handle ? `@${handle}` : 'wallet';

    useEffect(() => {
        if (self) return;
        let cancelled = false;
        fetch(`/api/follows/${target.toLowerCase()}?viewer=${me.toLowerCase()}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (!cancelled && d) setFollowing(!!d.i_follow); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [me, target, self]);

    if (self) return null;

    const toggle = async () => {
        setBusy(true);
        try {
            if (following) {
                const r = await fetch(`/api/follows?target=${target.toLowerCase()}`, { method: 'DELETE' });
                if (r.ok) {
                    setFollowing(false);
                    onAct(`${label}: UNFOLLOWED`);
                    window.dispatchEvent(new Event('pd:follows-changed'));
                } else onAct('Unfollow: FAILED');
            } else {
                const r = await fetch('/api/follows', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ target: target.toLowerCase() }),
                });
                if (r.status === 201 || r.status === 200) {
                    setFollowing(true);
                    onAct(`${label}: FOLLOWED`);
                    window.dispatchEvent(new Event('pd:follows-changed'));
                } else if (r.status === 204) onAct(`${label}: NO @NAME YET`);
                else onAct('Follow: FAILED');
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <button type="button" className="sw-key sw-key--word" onClick={toggle} disabled={busy}>
            {busy ? '…' : following ? 'FOLLOWING' : 'FOLLOW'}
        </button>
    );
}

function DossierWidget({ name, me, onGo, onAct }: { name: string; me: string; onGo: GoFn; onAct: ActFn }) {
    const [user, setUser] = useState<SearchUserResult | null | 'loading'>('loading');

    useEffect(() => {
        let cancelled = false;
        setUser('loading');
        fetchSearch(name).then((r) => {
            if (cancelled) return;
            const users = r?.users ?? [];
            const exact = users.find((u) => (u.handle ?? '').toLowerCase() === name.toLowerCase());
            setUser(exact ?? users[0] ?? null);
        });
        return () => { cancelled = true; };
    }, [name]);

    const handle = user !== 'loading' && user ? user.handle : null;
    const face = useSpriteFace(handle ?? '');

    if (user === 'loading') {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`☻${VS15}`} label="DOSSIER" />
                <SwSay>{`PULLING THE FILE ON ${name.toUpperCase()}…`}</SwSay>
            </div>
        );
    }
    if (!user) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`☻${VS15}`} label="DOSSIER" />
                <SwSay>{`THE STONE KNOWS NO ${name.toUpperCase()}.`}</SwSay>
            </div>
        );
    }

    const display = user.handle ? `@${user.handle}` : user.ens_name ?? shortAddress(user.address);
    const dest = `/${user.handle ?? user.address}`;
    const works = user.is_artist && user.handle ? projectsByArtist(user.handle) : [];
    return (
        <div className="stone-widget sw-card">
            <SwTitle
                glyph={user.is_artist ? `✺${VS15}` : `☻${VS15}`}
                label="DOSSIER"
                sub={user.is_artist ? 'ARTIST' : 'COLLECTOR'}
            />
            <div className="sw-id">
                <span className="sw-id-tap sw-tap" role="button" tabIndex={0} onClick={(e) => onGo(e, dest)}>
                    {face && <SpriteFace className="sw-id-face" face={face} />}
                    <span className="sw-id-name">{display}</span>
                </span>
                <FollowKey me={me} target={user.address} handle={user.handle} onAct={onAct} />
            </div>
            <div className="sw-stats">
                <div className="sw-stat">
                    <span className="sw-stat-v">{user.collected}</span>
                    <span className="sw-stat-l">{`⬚${VS15} COLLECTED`}</span>
                </div>
                <div className="sw-stat">
                    <span className="sw-stat-v">{`⟠${VS15} ${user.spent_eth.toFixed(2)}`}</span>
                    <span className="sw-stat-l">SPENT</span>
                </div>
                <div className="sw-stat">
                    <span className="sw-stat-v">{fmtFollowers(user.followers)}</span>
                    <span className="sw-stat-l">{`⚬${VS15} FOLLOWERS`}</span>
                </div>
            </div>
            {works.length > 0 && (
                <div className="sw-rows">
                    <div className="sw-rows-head">BODY OF WORK</div>
                    {works.map((p) => (
                        <div
                            key={p.slug}
                            className="sw-row-line sw-tap"
                            role="button"
                            tabIndex={0}
                            onClick={(e) => onGo(e, `/art/${p.slug}`)}
                        >
                            <span className="sw-row-l">{`⬚${VS15} ${p.displayName}`}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── ⬚ MINI GALLERY — ‹ › through a project's pieces, art at card scale ── */

function GalleryWidget({ slug, title, onGo, onAct, onFooter }: {
    slug: string | null; title: string | null; onGo: GoFn; onAct: ActFn; onFooter: FooterFn;
}) {
    const [id, setId] = useState(1);
    const [minted, setMinted] = useState<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    /* THE RARITY WALK (stage 5) — minted ids in rarest-first order, from
       the real computed rarity engine (lib/output/rarity, the Vault's
       read). Supplies cap in the hundreds; the sort is cheap + memoised. */
    const rarityOrder = useMemo(() => {
        if (!slug || !minted || minted <= 0) return null;
        const ids = Array.from({ length: minted }, (_, i) => i + 1);
        const rankOf = new Map<number, number>();
        for (const tid of ids) {
            rankOf.set(tid, pdRarityRank(slug, tid)?.rank ?? Number.MAX_SAFE_INTEGER);
        }
        return ids.sort((a, b) => (rankOf.get(a)! - rankOf.get(b)!) || (a - b));
    }, [slug, minted]);

    useEffect(() => { setId(1); }, [slug]);

    useEffect(() => {
        if (!slug || !title) return;
        let cancelled = false;
        fetchSearch(title).then((r) => {
            if (cancelled) return;
            const proj = r?.projects.find((p) => p.id === slug);
            setMinted(proj ? proj.minted_count : null);
        });
        return () => { cancelled = true; };
    }, [slug, title]);

    useEffect(() => {
        if (!slug) return;
        const cv = canvasRef.current;
        if (!cv) return;
        try { paintOutput(cv, slug, id, 640); } catch { /* unknown slug */ }
    }, [slug, id, minted]);

    /* answer AND act — the footer wishlists the piece on the stage */
    const galleryReady = !!slug && !!title && !(minted != null && minted <= 0);
    useFooterAct(onFooter, galleryReady ? {
        label: `✛${VS15} WISHLIST · ${pieceName(title as string, id)} — etch?`,
        run: () => onAct(commitEtch({
            kind: 'wishlist', slug: slug as string, tokenId: id, title: title as string, chip: '',
        })),
    } : null);

    if (!slug || !title) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`⬚${VS15}`} label="GALLERY" />
                <SwHint text="gallery <project> — walk the pieces." />
            </div>
        );
    }
    if (minted != null && minted <= 0) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`⬚${VS15}`} label="GALLERY" sub={title.toUpperCase()} />
                <SwSay>NOTHING MINTED YET.</SwSay>
            </div>
        );
    }

    const max = minted ?? 1;
    const step = (dir: 1 | -1) => setId((cur) => ((cur - 1 + dir + max) % max) + 1);
    /* ❖ — step the rarity ladder: next-rarest after the current piece's
       position in the rarest-first order (wraps to the rarest). */
    const stepRarity = () => {
        if (!rarityOrder) return;
        setId((cur) => {
            const at = rarityOrder.indexOf(cur);
            return rarityOrder[(at + 1) % rarityOrder.length];
        });
    };
    const rank = minted != null ? pdRarityRank(slug, id) : null;
    return (
        <div className="stone-widget sw-card">
            <SwTitle glyph={`⬚${VS15}`} label="GALLERY" sub={title.toUpperCase()} />
            <canvas
                ref={canvasRef}
                className="sw-gallery-art"
                role="button"
                tabIndex={0}
                onClick={(e) => onGo(e, `/art/${slug}/${id}`)}
            />
            <div className="sw-gallery-bar">
                <button type="button" className="sw-key" onClick={() => step(-1)} aria-label="Previous piece">‹</button>
                <span className="sw-gallery-name">
                    {pieceName(title, id)}
                    <span className="sw-gallery-count">
                        {minted != null ? ` · ${id} / ${minted}` : ''}
                        {rank ? ` · ❖${VS15} ${rank.rank}` : ''}
                    </span>
                </span>
                {rarityOrder && (
                    <button type="button" className="sw-key" onClick={stepRarity} aria-label="Next rarest piece" title="Walk the rarity ladder">
                        {`❖${VS15}`}
                    </button>
                )}
                <button type="button" className="sw-key" onClick={() => step(1)} aria-label="Next piece">›</button>
            </div>
        </div>
    );
}

/* ── MATRIX — the mini table maker: projects × live ledger stats ── */

interface MatrixCol { title: string; proj: SearchProjectResult | null }

function MatrixWidget({ names, onAct, onFooter }: { names: string[]; onAct: ActFn; onFooter: FooterFn }) {
    const [cols, setCols] = useState<MatrixCol[] | 'loading'>('loading');

    useEffect(() => {
        if (names.length < 2) return;
        let cancelled = false;
        setCols('loading');
        Promise.all(
            names.map((n) =>
                fetchSearch(n).then((r) => ({
                    title: n,
                    proj: r?.projects[0] ?? null,
                })),
            ),
        ).then((out) => { if (!cancelled) setCols(out); });
        return () => { cancelled = true; };
    }, [names.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

    /* answer AND act — the footer anchors the cheapest floor on the table */
    const cheapest = cols !== 'loading'
        ? cols
            .map((c) => c.proj)
            .filter((p): p is SearchProjectResult => !!p && p.floor_eth != null)
            .sort((a, b) => (a.floor_eth as number) - (b.floor_eth as number))[0] ?? null
        : null;
    useFooterAct(onFooter, cheapest ? {
        label: `↧${VS15} ANCHOR · ${cheapest.title} · ◊${formatEth(cheapest.floor_eth as number)} — etch?`,
        run: () => onAct(commitEtch({
            kind: 'anchor',
            title: cheapest.title,
            price: cheapest.floor_eth as number,
            chip: '',
        })),
    } : null);

    if (names.length < 2) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle label="MATRIX" />
                <SwHint text="matrix <a> vs <b> — up to three, side by side." />
            </div>
        );
    }
    if (cols === 'loading') {
        return (
            <div className="stone-widget sw-card">
                <SwTitle label="MATRIX" />
                <SwSay>{working('table')}</SwSay>
            </div>
        );
    }

    const rows: Array<{ label: string; pick: (p: SearchProjectResult) => string }> = [
        { label: 'FLOOR', pick: (p) => eth(p.floor_eth) },
        { label: 'VOLUME', pick: (p) => eth(p.volume_eth) },
        { label: 'ATH', pick: (p) => eth(p.ath_eth) },
        { label: 'MINTED', pick: (p) => `${p.minted_count}/${p.max_supply}` },
    ];
    return (
        <div className="stone-widget sw-card">
            <SwTitle label="MATRIX" />
            <div className="sw-matrix" style={{ gridTemplateColumns: `auto repeat(${cols.length}, 1fr)` }}>
                <span className="sw-matrix-corner" />
                {cols.map((c, i) => (
                    <span key={`h${i}`} className="sw-matrix-head">
                        {(c.proj?.title ?? c.title).toUpperCase()}
                    </span>
                ))}
                {rows.map((row) => (
                    <MatrixRow key={row.label} label={row.label} cols={cols} pick={row.pick} />
                ))}
            </div>
        </div>
    );
}

function MatrixRow({ label, cols, pick }: {
    label: string; cols: MatrixCol[]; pick: (p: SearchProjectResult) => string;
}) {
    return (
        <>
            <span className="sw-matrix-label">{label}</span>
            {cols.map((c, i) => (
                <span key={i} className="sw-matrix-cell">{c.proj ? pick(c.proj) : '—'}</span>
            ))}
        </>
    );
}

/* ── ⍢ WALLET ASCII — the deterministic gen-art mark of the signed-in
      wallet (lib/stone/mark — same wallet, same mark, forever) ── */

function AsciiWidget({ address }: { address: string }) {
    const mark = useMemo(() => buildWalletMark(address), [address]);
    return (
        <div className="stone-widget sw-card">
            <SwTitle glyph={`⍢${VS15}`} label="WALLET ASCII" sub={shortAddress(address)} />
            <pre className="sw-mark" style={{ color: `hsl(${mark.hue} 55% 72%)` }} aria-hidden="true">
                {mark.lines.join('\n')}
            </pre>
        </div>
    );
}

/* ── DOCS — search inside the published docs (the build-time index +
      the docs' own scoring, exported from DocsSearch) ── */

function DocsWidget({ query, onGo }: { query: string; onGo: GoFn }) {
    const [index, setIndex] = useState<SearchEntry[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetchDocsIndex().then((idx) => { if (!cancelled) setIndex(idx); });
        return () => { cancelled = true; };
    }, []);

    if (!query.trim()) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle label="DOCS" />
                <SwHint text="docs <anything> — search the published docs." />
            </div>
        );
    }
    if (!index) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle label="DOCS" sub={query.toUpperCase()} />
                <SwSay>{working('books')}</SwSay>
            </div>
        );
    }

    const hits = searchIndex(index, query).slice(0, 5);
    return (
        <div className="stone-widget sw-card">
            <SwTitle label="DOCS" sub={query.toUpperCase()} />
            {hits.length === 0 && <SwSay>THE DOCS ARE SILENT ON THAT.</SwSay>}
            {hits.map((hit: Hit) => (
                <div
                    key={hit.entry.slug + (hit.heading?.id ?? '')}
                    className="sw-doc-hit sw-tap"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => onGo(e, hrefFor(hit))}
                >
                    <span className="sw-doc-title">
                        {hit.entry.title}
                        {hit.heading && <span className="sw-doc-heading">{` § ${hit.heading.text}`}</span>}
                    </span>
                    <span className="sw-doc-section">{hit.entry.section}</span>
                    {hit.snippet && (
                        <span className="sw-doc-snippet">
                            {hit.snippet.pre}<mark>{hit.snippet.hit}</mark>{hit.snippet.post}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}

/* ── TREND — the ledger's last N days carved in Courier (stage 5):
      real SALE medians per Montreal day off /api/stone/trend ── */

const SPARK_BLOCKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'] as const;

function sparkline(series: (number | null)[]): string {
    const vals = series.filter((v): v is number => v != null);
    if (vals.length === 0) return '';
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    return series
        .map((v) => {
            if (v == null) return '·';
            if (max === min) return SPARK_BLOCKS[3];
            return SPARK_BLOCKS[Math.round(((v - min) / (max - min)) * 7)];
        })
        .join('');
}

function TrendWidget({ plan }: { plan: Extract<WidgetPlan, { kind: 'trend' }> }) {
    const [data, setData] = useState<StoneTrendResponse | null | 'loading'>('loading');
    const { slug, title, days } = plan;

    useEffect(() => {
        let cancelled = false;
        setData('loading');
        fetch(`/api/stone/trend?slug=${encodeURIComponent(slug)}&days=${days}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => { if (!cancelled) setData(j); })
            .catch(() => { if (!cancelled) setData(null); });
        return () => { cancelled = true; };
    }, [slug, days]);

    if (data === 'loading') {
        return (
            <div className="stone-widget sw-card">
                <SwTitle label="TREND" sub={`${title.toUpperCase()} · ${days}D`} />
                <SwSay>{working('ledger')}</SwSay>
            </div>
        );
    }
    if (!data || data.sales === 0) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle label="TREND" sub={`${title.toUpperCase()} · ${data?.days ?? days}D`} />
                <SwSay>{`NO SALES IN ${data?.days ?? days} DAYS.`}</SwSay>
                {data?.floor_eth != null && (
                    <div className="sw-rows">
                        <div className="sw-row-line"><span className="sw-row-l">FLOOR NOW</span><span className="sw-row-r">{eth(data.floor_eth)}</span></div>
                    </div>
                )}
            </div>
        );
    }

    const vals = data.series.filter((v): v is number => v != null);
    const first = vals[0];
    const last = vals[vals.length - 1];
    const delta = first > 0 ? ((last - first) / first) * 100 : null;
    const sign = delta != null && delta >= 0 ? '+' : '−';
    const spark = sparkline(data.series);
    return (
        <div className="stone-widget sw-card">
            <SwTitle label="TREND" sub={`${title.toUpperCase()} · ${data.days}D`} />
            <SwSay lead>
                {`SALES ${eth(last)}${delta != null ? ` (${sign}${Math.abs(delta).toFixed(1)}%)` : ''}`}
            </SwSay>
            <div className="sw-spark" aria-hidden="true">
                {data.series.map((v, i) => (
                    <span key={i} className={`sw-spark-c${v == null ? ' sw-spark-c--quiet' : ''}`}>
                        {spark[i]}
                    </span>
                ))}
            </div>
            <div className="sw-rows">
                <div className="sw-row-line"><span className="sw-row-l">{`${data.sales} SALE${data.sales === 1 ? '' : 'S'} · MEDIAN PER DAY`}</span><span className="sw-row-r">{data.floor_eth != null ? `FLOOR ${eth(data.floor_eth)}` : ''}</span></div>
            </div>
        </div>
    );
}

/* ── PD WRAPPED — your own story over a period, straight from the ledger
      (2026-07-20; cadence-agnostic — `wrapped` = 30d, `wrapped 90d` picks).
      Real events only: a quiet period reads honestly quiet. ── */

function WrappedWidget({ plan, address }: { plan: Extract<WidgetPlan, { kind: 'wrapped' }>; address: string }) {
    const [data, setData] = useState<StoneWrappedResponse | null | 'loading'>('loading');
    const { days } = plan;

    useEffect(() => {
        let cancelled = false;
        setData('loading');
        fetch(`/api/stone/wrapped?me=${encodeURIComponent(address.toLowerCase())}&days=${days}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => { if (!cancelled) setData(j); })
            .catch(() => { if (!cancelled) setData(null); });
        return () => { cancelled = true; };
    }, [address, days]);

    if (data === 'loading') {
        return (
            <div className="stone-widget sw-card">
                <SwTitle label="WRAPPED" sub={`${days}D`} />
                <SwSay>{working('you')}</SwSay>
            </div>
        );
    }
    if (!data) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle label="WRAPPED" sub={`${days}D`} />
                <SwSay>THE LEDGER ISN&apos;T ANSWERING.</SwSay>
            </div>
        );
    }
    const quiet = data.collected === 0 && data.sold === 0 && data.trades === 0;
    const sign = data.net_eth >= 0 ? '+' : '−';
    const flipTitle = data.flip
        ? `${(getProject(data.flip.project_id)?.displayName ?? data.flip.project_id).toUpperCase()}${data.flip.token_id != null ? ` #${data.flip.token_id}` : ''}`
        : null;
    const callTitle = data.best_call
        ? (getProject(data.best_call.project_id)?.displayName ?? data.best_call.project_id).toUpperCase()
        : null;
    return (
        <div className="stone-widget sw-card">
            <SwTitle label="WRAPPED" sub={`YOUR ${data.days} DAYS`} />
            {quiet ? (
                <SwSay>{`A QUIET ${data.days} DAYS. THE LEDGER WAITS.`}</SwSay>
            ) : (
                <SwSay lead>{`${data.collected} PIECE${data.collected === 1 ? '' : 'S'} IN · ${data.sold} OUT · ${sign}◊${Math.abs(data.net_eth)}`}</SwSay>
            )}
            <div className="sw-rows">
                {data.minted > 0 && (
                    <div className="sw-row-line"><span className="sw-row-l">{`✶${VS15} MINTED`}</span><span className="sw-row-r">{data.minted}</span></div>
                )}
                {data.bought > 0 && (
                    <div className="sw-row-line"><span className="sw-row-l">{`✸${VS15} BOUGHT`}</span><span className="sw-row-r">{`${data.bought} · ${eth(data.spent_eth)}`}</span></div>
                )}
                {data.sold > 0 && (
                    <div className="sw-row-line"><span className="sw-row-l">{`✹${VS15} SOLD`}</span><span className="sw-row-r">{`${data.sold} · ${eth(data.earned_eth)}`}</span></div>
                )}
                {data.trades > 0 && (
                    <div className="sw-row-line"><span className="sw-row-l">{`⇌${VS15} TRADES`}</span><span className="sw-row-r">{data.trades}</span></div>
                )}
                {data.flip && flipTitle && (
                    <div className="sw-row-line"><span className="sw-row-l">BIGGEST FLIP · {flipTitle}</span><span className="sw-row-r">{`${data.flip.profit_eth >= 0 ? '+' : '−'}◊${Math.abs(data.flip.profit_eth)}`}</span></div>
                )}
                {data.best_call && callTitle && (
                    <div className="sw-row-line"><span className="sw-row-l">BEST CALL · {callTitle}</span><span className="sw-row-r">{`${Math.abs(data.best_call.gap_pct)}% OFF`}</span></div>
                )}
                {data.top_counterparty && (
                    <div className="sw-row-line"><span className="sw-row-l">TOP COUNTERPARTY</span><span className="sw-row-r">{`${data.top_counterparty.handle ? '@' + data.top_counterparty.handle : shortAddress(data.top_counterparty.address)} · ${data.top_counterparty.deals}`}</span></div>
                )}
            </div>
        </div>
    );
}

/* ── THE GLANCE — the composed morning card (stage 5): the day, your
      schedule, your pings, your held floors — one boot readout ── */

function GlanceWidget({ address }: { address: string }) {
    const day = usePriceDay();
    const { state: pings } = usePings();
    const unreadCount = pings.unreadCount;
    const [todayItems, setTodayItems] = useState<number | null>(null);
    const [todayTodos, setTodayTodos] = useState(0);
    const [floors, setFloors] = useState<Array<{ title: string; floor: number | null }> | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/calendar?year=${CAL_TODAY.y}&month=${CAL_TODAY.m + 1}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (cancelled) return;
                const key = dateKey(CAL_TODAY.y, CAL_TODAY.m, CAL_TODAY.d);
                setTodayItems(((d?.days as Record<string, unknown[]>) ?? {})[key]?.length ?? 0);
            })
            .catch(() => { if (!cancelled) setTodayItems(0); });
        const readTodos = () => {
            const key = dateKey(CAL_TODAY.y, CAL_TODAY.m, CAL_TODAY.d);
            setTodayTodos(datedTodosByDay(getTodos())[key]?.length ?? 0);
        };
        readTodos();
        const unsub = subscribeTodos(readTodos);
        return () => { cancelled = true; unsub(); };
    }, []);

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/user/${address.toLowerCase()}/owned-projects`)
            .then((r) => (r.ok ? r.json() : null))
            .then(async (d) => {
                const slugs: string[] = (d?.slugs ?? []).slice(0, 3);
                const out: Array<{ title: string; floor: number | null }> = [];
                for (const s of slugs) {
                    const p = getProject(s);
                    if (!p) continue;
                    const r = await fetchSearch(p.displayName);
                    const hit = r?.projects.find((x) => x.id === s);
                    out.push({ title: p.displayName, floor: hit?.floor_eth ?? null });
                }
                if (!cancelled) setFloors(out);
            })
            .catch(() => { if (!cancelled) setFloors([]); });
        return () => { cancelled = true; };
    }, [address]);

    return (
        <div className="stone-widget sw-card sw-glance">
            <SwTitle glyph={`⌘${VS15}`} label="THE GLANCE" sub={formatPriceDate()} />
            <div className="sw-glance-line"><span className="sw-glance-l">PRICEDAY</span><span className="sw-glance-r"><span className="sw-disc sw-disc--blue">{day.number}</span></span></div>
            <div className="sw-glance-line">
                <span className="sw-glance-l">TODAY</span>
                <span className="sw-glance-r">
                    {todayItems == null ? '…' : `${todayItems} SCHEDULED · ${todayTodos} TO-DO${todayTodos === 1 ? '' : 'S'}`}
                </span>
            </div>
            <div className="sw-glance-line">
                <span className="sw-glance-l">PINGS</span>
                <span className="sw-glance-r">
                    {unreadCount > 0
                        ? <><span className="sw-disc sw-disc--red">{unreadCount}</span> UNREAD</>
                        : 'ALL READ'}
                </span>
            </div>
            {floors && floors.length > 0 && (
                <>
                    <div className="sw-rows-head">YOUR FLOORS</div>
                    {floors.map((f) => (
                        <div key={f.title} className="sw-glance-line">
                            <span className="sw-glance-l">{f.title.toUpperCase()}</span>
                            <span className="sw-glance-r">{eth(f.floor)}</span>
                        </div>
                    ))}
                </>
            )}
            {floors && floors.length === 0 && (
                <div className="sw-glance-line"><span className="sw-glance-l">HOLDINGS</span><span className="sw-glance-r">NONE YET</span></div>
            )}
            {day.flavor && <SwSay>{day.flavor}</SwSay>}
        </div>
    );
}

/* ── ⚝ OMNISCIENCE — the familiar's read on YOU, ported to the stone. The
      SAME live account + ledger knowledge the companion emerges over time
      (loadIntel — Rule #0). The familiar drips it out slowly; the stone,
      summoned by name ("me"), lays the whole file down at once. ── */
function OmniWidget({ address }: { address: string }) {
    const [facts, setFacts] = useState<string[] | null>(null);
    useEffect(() => {
        let cancelled = false;
        loadIntel(address)
            .then((f) => { if (!cancelled) setFacts(f); })
            .catch(() => { if (!cancelled) setFacts([]); });
        return () => { cancelled = true; };
    }, [address]);

    if (facts === null) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`⚝${VS15}`} label="OMNISCIENCE" />
                <SwSay>{working('everything')}</SwSay>
            </div>
        );
    }
    if (facts.length === 0) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`⚝${VS15}`} label="OMNISCIENCE" />
                <SwSay>NOTHING ON YOU YET. MAKE A MOVE.</SwSay>
            </div>
        );
    }
    return (
        <div className="stone-widget sw-card">
            <SwTitle glyph={`⚝${VS15}`} label="OMNISCIENCE" sub={`${facts.length} KNOWN`} />
            <div className="sw-rows">
                {facts.map((f, i) => (
                    <div key={i} className="sw-omni-line">{f}</div>
                ))}
            </div>
        </div>
    );
}

/* ── ƒ MATH — the inline calculator: type "3*546", answer instantly, and if
      the result lands on a number PD cares about, the stone says so (the "lol"
      note). Global Search shows the bare answer; this is the fuller card. ── */

function MathWidget({ plan }: { plan: Extract<WidgetPlan, { kind: 'math' }> }) {
    const note = pdNumberNote(plan.value);
    return (
        <div className="stone-widget sw-card">
            <SwTitle glyph={`ƒ${VS15}`} label="MATH" sub={plan.expr} />
            <SwSay lead>{`= ${formatMathValue(plan.value)}`}</SwSay>
            {note && <SwSay>{note}</SwSay>}
        </div>
    );
}

/* ── ⇄ CONVERT — the $0 inline ETH↔fiat converter. The primary result big;
      the stone's "extra" is a few more currencies at a glance (Global Search
      shows only the one line). Rides /api/fx (edge-cached, free forever) and
      works whether or not fiat mode is on. ── */


function ConvertWidget({ plan }: { plan: Extract<WidgetPlan, { kind: 'convert' }> }) {
    const { currency } = useFiat();
    const fx = useFxRates(true);
    const fallback = currency ?? 'USD';
    const conv = plan.conv;
    const primary = convertValue(conv, fx, fallback);

    if (!fx) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`⇄${VS15}`} label="CONVERT" sub={formatSource(conv.amount, conv.from)} />
                <SwSay>{working('rate')}</SwSay>
            </div>
        );
    }
    if (!primary) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`⇄${VS15}`} label="CONVERT" sub={formatSource(conv.amount, conv.from)} />
                <SwSay>NO TRUSTED RATE RIGHT NOW.</SwSay>
            </div>
        );
    }

    /* From ETH with no explicit target → preview EVERY currency in the
       fiat-picker's order (Brendon, 2026-07-23). A targeted or reverse
       conversion stays a single line. */
    if (conv.from === 'ETH' && conv.to == null) {
        const rows = convertAll(conv.amount, FIAT_OPTIONS, fx);
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`⇄${VS15}`} label="CONVERT" sub={formatSource(conv.amount, conv.from)} />
                <div className="sw-rows">
                    {rows.map((x) => (
                        <div key={x.code} className="sw-row-line">
                            <span className="sw-row-l">{x.code}</span>
                            <span className="sw-row-r">{formatUnit(x.value, x.code)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="stone-widget sw-card">
            <SwTitle glyph={`⇄${VS15}`} label="CONVERT" sub={formatSource(conv.amount, conv.from)} />
            <SwSay lead>{`= ${formatResult(primary.value, primary.to)}`}</SwSay>
        </div>
    );
}

/* ── ▦ THE DAY — a natural-language date, resolved and read (the abilities
      pass): "tomorrow" · "next week tuesday" · "in 18 days" · "aug 30".
      That day's slate rides along (the calendar's own reads); the footer
      seeds an etch aimed at the day. ── */

function DateWidget({ date, onSeed, onFooter }: {
    date: StoneDate; onSeed: (text: string) => void; onFooter: FooterFn;
}) {
    const [items, setItems] = useState<CalApiItem[] | null>(null);
    const [todos, setTodos] = useState<TodoItem[]>([]);
    const key = dateKey(date.y, date.m, date.d);

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/calendar?year=${date.y}&month=${date.m + 1}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (cancelled) return;
                setItems((((d?.days ?? {}) as Record<string, CalApiItem[]>)[key]) ?? []);
            })
            .catch(() => { if (!cancelled) setItems([]); });
        const read = () => setTodos(datedTodosByDay(getTodos())[key] ?? []);
        read();
        const unsub = subscribeTodos(read);
        return () => { cancelled = true; unsub(); };
    }, [date.y, date.m, date.d, key]);

    /* the footer seeds the etch grammar aimed at this exact day */
    useFooterAct(onFooter, {
        label: `❍${VS15} ETCH A TO-DO · ${formatStoneDate(date)}`,
        run: () => onSeed(`todo: ${todoPhrase(date)} `),
    });

    return (
        <div className="stone-widget sw-card">
            <SwTitle glyph={`▦${VS15}`} label="THE DAY" sub={formatDaysAway(date.daysAway)} />
            <div className="sw-date-big">{formatStoneDate(date)}</div>
            <div className="sw-cal-list">
                {items != null && items.length === 0 && todos.length === 0 && (
                    <SwSay>NOTHING SCHEDULED. THE DAY IS OPEN.</SwSay>
                )}
                {todos.map((t, i) => (
                    <div key={`t${i}`} className="sw-cal-item">
                        <span className="sw-cal-ic">{`❍${VS15}`}</span>
                        <span className="sw-cal-text">{t.text}</span>
                    </div>
                ))}
                {(items ?? []).map((ev, i) => (
                    <div key={`e${i}`} className="sw-cal-item">
                        <span className="sw-cal-time">{ev.time || 'ALL DAY'}</span>
                        <span className="sw-cal-text">{ev.title}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── ✶ FIRST MINT — the genesis: the platform's first mint ever, or the
      signed-in wallet's own ("my first ever mint"). Real ledger events;
      the piece painted big; times viewer-local. ── */

function FirstMintWidget({ mine, address, onGo, onFooter }: {
    mine: boolean; address: string; onGo: GoFn; onFooter: FooterFn;
}) {
    const [data, setData] = useState<OracleFirstMintResponse | null | 'loading'>('loading');

    useEffect(() => {
        let cancelled = false;
        setData('loading');
        const me = mine ? `&me=${address.toLowerCase()}` : '';
        fetch(`/api/stone/oracle?kind=first-mint${me}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => { if (!cancelled) setData(j); })
            .catch(() => { if (!cancelled) setData(null); });
        return () => { cancelled = true; };
    }, [mine, address]);

    const mint = data !== 'loading' && data ? data.mint : null;
    const title = mint ? (getProject(mint.project_id)?.displayName ?? mint.project_id) : null;
    useFooterAct(onFooter, mint && mint.token_id != null && title ? {
        label: `⬚${VS15} OPEN ${pieceName(title, mint.token_id).toUpperCase()}`,
        run: () => onGo(null, `/art/${mint.project_id}/${mint.token_id}`),
    } : null);

    const label = mine ? 'YOUR FIRST MINT' : 'FIRST MINT';
    if (data === 'loading') {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`✶${VS15}`} label={label} />
                <SwSay>{working('genesis')}</SwSay>
            </div>
        );
    }
    if (!mint || !title) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`✶${VS15}`} label={label} />
                <SwSay>{mine ? 'NO MINTS YET. THE STONE WAITS.' : 'NOTHING MINTED YET. EVER.'}</SwSay>
            </div>
        );
    }
    const at = new Date(mint.timestamp * 1000);
    const who = mint.handle ? `@${mint.handle}` : shortAddress(mint.to_address);
    return (
        <div className="stone-widget sw-card">
            <SwTitle glyph={`✶${VS15}`} label={label} sub={title.toUpperCase()} />
            {mint.token_id != null && (
                <StoneArt slug={mint.project_id} id={mint.token_id} onOpen={() => onGo(null, `/art/${mint.project_id}/${mint.token_id}`)} />
            )}
            <SwSay lead>{mint.token_id != null ? pieceName(title, mint.token_id) : title}</SwSay>
            <div className="sw-rows">
                <div className="sw-row-line">
                    <span className="sw-row-l">{`▦${VS15} WHEN`}</span>
                    <span className="sw-row-r">
                        {`${at.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()} · ${at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`}
                    </span>
                </div>
                <div
                    className="sw-row-line sw-tap"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => onGo(e, `/${mint.handle ?? mint.to_address}`)}
                >
                    <span className="sw-row-l">{`☻${VS15} MINTED BY`}</span>
                    <span className="sw-row-r">{who}</span>
                </div>
                {mint.price_eth != null && mint.price_eth > 0 && (
                    <div className="sw-row-line">
                        <span className="sw-row-l">{`◊${VS15} PRICE`}</span>
                        <span className="sw-row-r">{eth(mint.price_eth)}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── ◷ RELEASE — when a project arrived: its first mint on the ledger,
      viewer-local, plus everything minted since. ── */

function ReleaseWidget({ slug, title, onGo, onFooter }: {
    slug: string; title: string; onGo: GoFn; onFooter: FooterFn;
}) {
    const [data, setData] = useState<OracleReleaseResponse | null | 'loading'>('loading');

    useEffect(() => {
        let cancelled = false;
        setData('loading');
        fetch(`/api/stone/oracle?kind=release&slug=${encodeURIComponent(slug)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => { if (!cancelled) setData(j); })
            .catch(() => { if (!cancelled) setData(null); });
        return () => { cancelled = true; };
    }, [slug]);

    useFooterAct(onFooter, {
        label: `⬚${VS15} OPEN ${title.toUpperCase()}`,
        run: () => onGo(null, `/art/${slug}`),
    });

    if (data === 'loading') {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`◷${VS15}`} label="RELEASE" sub={title.toUpperCase()} />
                <SwSay>{working('ledger')}</SwSay>
            </div>
        );
    }
    if (!data || data.first_ts == null) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`◷${VS15}`} label="RELEASE" sub={title.toUpperCase()} />
                <SwSay>{`${title.toUpperCase()} HAS NOT MINTED YET.`}</SwSay>
            </div>
        );
    }
    const at = new Date(data.first_ts * 1000);
    const daysAgo = Math.max(0, Math.floor((Date.now() - at.getTime()) / 86_400_000));
    return (
        <div className="stone-widget sw-card">
            <SwTitle glyph={`◷${VS15}`} label="RELEASE" sub={title.toUpperCase()} />
            <div className="sw-date-big">
                {at.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
            </div>
            <div className="sw-rows">
                <div className="sw-row-line">
                    <span className="sw-row-l">{`✶${VS15} FIRST MINT`}</span>
                    <span className="sw-row-r">{at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="sw-row-line">
                    <span className="sw-row-l">{`◷${VS15} AGE`}</span>
                    <span className="sw-row-r">{daysAgo === 0 ? 'TODAY' : `${daysAgo} DAY${daysAgo === 1 ? '' : 'S'} AGO`}</span>
                </div>
                <div className="sw-row-line">
                    <span className="sw-row-l">{`⬚${VS15} MINTED SINCE`}</span>
                    <span className="sw-row-r">{String(data.minted)}</span>
                </div>
            </div>
        </div>
    );
}

/* ── ⟠/⚭/⚬ THE STANDINGS — ranked people: "highest spenders on the
      platform top 15" · "top 20 mutuals by volume spent" · "top 50
      followers by wallet age". Podium medals ❶❷❸ per the glossary;
      every row taps through to the profile. ── */

const PODIUM = ['❶', '❷', '❸'] as const;

function RankRow({ row, i, by, onGo }: {
    row: OracleRankRow; i: number; by: 'spent' | 'age'; onGo: GoFn;
}) {
    const face = useSpriteFace(row.handle ?? '');
    const name = row.handle ? `@${row.handle}` : shortAddress(row.address);
    let value = '—';
    if (by === 'spent') {
        value = `⟠${VS15} ${(row.spent_eth ?? 0).toFixed(2)}`;
    } else if (row.created_at) {
        const days = Math.max(0, Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86_400_000));
        value = `◷${VS15} ${days}D`;
    }
    return (
        <div
            className="sw-hit sw-tap"
            role="button"
            tabIndex={0}
            onClick={(e) => onGo(e, `/${row.handle ?? row.address}`)}
        >
            <span className="sw-rank-n">{i < 3 ? `${PODIUM[i]}${VS15}` : String(i + 1)}</span>
            {face && <SpriteFace className="sw-hit-sprite" face={face} />}
            <span className="sw-hit-body">
                <span className="sw-hit-main">{name}</span>
            </span>
            <span className="sw-hit-figures">
                <span className="sw-fig">{value}</span>
            </span>
        </div>
    );
}

function RankWidget({ plan, address, onGo, onFooter }: {
    plan: Extract<WidgetPlan, { kind: 'rank' }>; address: string; onGo: GoFn; onFooter: FooterFn;
}) {
    const [data, setData] = useState<OracleRankResponse | null | 'loading'>('loading');
    const { cohort, by, n, holding } = plan;

    useEffect(() => {
        let cancelled = false;
        setData('loading');
        const hold = holding ? `&holding=${encodeURIComponent(holding.slug)}` : '';
        const url = cohort === 'spenders'
            ? `/api/stone/oracle?kind=spenders&n=${n}${hold}`
            : `/api/stone/oracle?kind=rank&cohort=${cohort}&me=${address.toLowerCase()}&by=${by}&n=${n}${hold}`;
        fetch(url)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => { if (!cancelled) setData(j); })
            .catch(() => { if (!cancelled) setData(null); });
        return () => { cancelled = true; };
    }, [cohort, by, n, address, holding?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

    const rows = data !== 'loading' && data ? data.rows : [];
    const top = rows[0] ?? null;
    useFooterAct(onFooter, top ? {
        label: `☻${VS15} OPEN ❶ ${top.handle ? `@${top.handle}` : shortAddress(top.address)}`,
        run: () => onGo(null, `/${top.handle ?? top.address}`),
    } : null);

    const GLYPH = { spenders: `⟠${VS15}`, mutuals: `⚭${VS15}`, followers: `⚬${VS15}` } as const;
    const label = cohort.toUpperCase();
    const sub = `TOP ${n} · BY ${by === 'spent' ? 'SPENT' : 'WALLET AGE'}${holding ? ` · HOLD ${holding.title.toUpperCase()}` : ''}`;

    if (data === 'loading') {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={GLYPH[cohort]} label={label} sub={sub} />
                <SwSay>{working('standings')}</SwSay>
            </div>
        );
    }
    if (rows.length === 0) {
        const empty = holding
            ? cohort === 'spenders'
                ? `NO ${holding.title.toUpperCase()} HOLDER HAS SPENT YET.`
                : `NONE OF YOUR ${cohort.toUpperCase()} HOLD ${holding.title.toUpperCase()}.`
            : cohort === 'spenders'
                ? 'NO SPEND ON THE LEDGER YET.'
                : cohort === 'mutuals' ? 'NO MUTUALS YET.' : 'NO FOLLOWERS YET.';
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={GLYPH[cohort]} label={label} sub={sub} />
                <SwSay>{empty}</SwSay>
            </div>
        );
    }
    return (
        <div className="stone-widget sw-card">
            <SwTitle glyph={GLYPH[cohort]} label={label} sub={sub} />
            {rows.map((row, i) => (
                <RankRow key={row.address} row={row} i={i} by={by} onGo={onGo} />
            ))}
        </div>
    );
}

/* ── ⌂ THE OVERLAP — a project's holdings sliced by a Profile Tag:
      "all carnivale owned by podcasters". Two real reads crossed: the
      holders ledger × the tag-members roster (shownTags respected — a
      tag its owner keeps dark never surfaces here either). ── */

const COHORT_PREVIEW = 12;

function CohortWidget({ plan, address, onGo, onFooter }: {
    plan: Extract<WidgetPlan, { kind: 'cohort' }>; address: string; onGo: GoFn; onFooter: FooterFn;
}) {
    const [holders, setHolders] = useState<OracleHoldersResponse | null | 'loading'>('loading');
    const [members, setMembers] = useState<Array<{ address: string; handle: string | null }> | null | 'loading'>('loading');
    const [expanded, setExpanded] = useState(false);
    const { slug, title, source, tag, tagLabel } = plan;

    useEffect(() => {
        let cancelled = false;
        setHolders('loading');
        setMembers('loading');
        setExpanded(false);
        fetch(`/api/stone/oracle?kind=holders&slug=${encodeURIComponent(slug)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => { if (!cancelled) setHolders(j); })
            .catch(() => { if (!cancelled) setHolders(null); });
        /* The people side: a Profile Tag's roster — or your mutual circle. */
        const peopleUrl = source === 'mutuals'
            ? `/api/stone/oracle?kind=mutuals&me=${address.toLowerCase()}`
            : `/api/tags/members?tag=${encodeURIComponent(tag)}`;
        fetch(peopleUrl)
            .then((r) => (r.ok ? r.json() : null))
            .then((j: OracleMutualsResponse | TagMembersResponse | null) => {
                if (cancelled) return;
                setMembers(j ? (j.rows as Array<{ address: string; handle: string | null }>) : null);
            })
            .catch(() => { if (!cancelled) setMembers(null); });
        return () => { cancelled = true; };
    }, [slug, tag, source, address]);

    useFooterAct(onFooter, {
        label: `⬚${VS15} OPEN ${title.toUpperCase()}`,
        run: () => onGo(null, `/art/${slug}`),
    });

    const label = 'THE OVERLAP';
    const sub = `${title.toUpperCase()} × ${tagLabel.toUpperCase()}`;
    if (holders === 'loading' || members === 'loading') {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`⌂${VS15}`} label={label} sub={sub} />
                <SwSay>{working('overlap')}</SwSay>
            </div>
        );
    }
    if (!holders || !members) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`⌂${VS15}`} label={label} sub={sub} />
                <SwSay>THE LEDGER ISN&apos;T ANSWERING.</SwSay>
            </div>
        );
    }

    const memberByAddr = new Map(members.map((m) => [m.address.toLowerCase(), m]));
    const matched = holders.rows.filter((h) => memberByAddr.has(h.owner_address));
    if (matched.length === 0) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`⌂${VS15}`} label={label} sub={sub} />
                <SwSay>{`NO ${title.toUpperCase()} IN ${tagLabel.toUpperCase()} HANDS.`}</SwSay>
            </div>
        );
    }
    const owners = new Set(matched.map((h) => h.owner_address)).size;
    const shown = expanded ? matched : matched.slice(0, COHORT_PREVIEW);
    return (
        <div className="stone-widget sw-card">
            <SwTitle glyph={`⌂${VS15}`} label={label} sub={sub} />
            <SwSay lead>
                {`${matched.length} PIECE${matched.length === 1 ? '' : 'S'} · ${owners} ${tagLabel.toUpperCase()}${owners === 1 ? '' : 'S'}`}
            </SwSay>
            {shown.map((h) => {
                const m = memberByAddr.get(h.owner_address);
                return (
                    <div
                        key={`${h.token_id}`}
                        className="sw-hit sw-tap"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => onGo(e, `/art/${slug}/${h.token_id}`)}
                    >
                        <SwThumb slug={slug} id={h.token_id} size={48} />
                        <span className="sw-hit-body">
                            <span className="sw-hit-main">{pieceName(title, h.token_id)}</span>
                            <span className="sw-hit-sub">{`⌂${VS15} ${m?.handle ? `@${m.handle}` : shortAddress(h.owner_address)}`}</span>
                        </span>
                    </div>
                );
            })}
            {!expanded && matched.length > COHORT_PREVIEW && (
                <MoreRow n={matched.length - COHORT_PREVIEW} onClick={() => setExpanded(true)} />
            )}
        </div>
    );
}

/* ── ❖ WHY RARE — the rarity breakdown of one piece: the same provable
      axes the character sheet leads with (primary trait · Fate · colour ·
      POP), each counted across the whole edition. All client-pure. ── */

function WhyWidget({ slug, title, id, onGo, onFooter }: {
    slug: string | null; title: string | null; id: number | null; onGo: GoFn; onFooter: FooterFn;
}) {
    const ready = !!slug && !!title && id != null;
    useFooterAct(onFooter, ready ? {
        label: `⬚${VS15} OPEN ${pieceName(title as string, id as number).toUpperCase()}`,
        run: () => onGo(null, `/art/${slug}/${id}`),
    } : null);

    if (!ready) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`❖${VS15}`} label="WHY RARE" />
                <SwSay>OPEN A PIECE, THEN ASK.</SwSay>
            </div>
        );
    }
    const s = slug as string;
    const t = title as string;
    const n = id as number;
    const r = pdRarity(s, n);
    const rank = pdRarityRank(s, n);
    const pt = primaryTrait(s, n);
    const tf = pt ? traitRarity(s, pt.name, pt.value) : null;
    const fate = readOutputFate(s, n).fate;
    const ff = fateRarity(s, fate);
    const bucket = outputColorBucket(s, n);
    const cf = bucket ? colorRarity(s, bucket) : null;
    const pop = popCount(s, n);

    if (!r || !rank) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`❖${VS15}`} label="WHY RARE" sub={pieceName(t, n).toUpperCase()} />
                <SwSay>THIS EDITION KEEPS NO RARITY AXES.</SwSay>
            </div>
        );
    }
    return (
        <div className="stone-widget sw-card">
            <SwTitle glyph={`❖${VS15}`} label="WHY RARE" sub={pieceName(t, n).toUpperCase()} />
            <SwThumb slug={s} id={n} size={64} />
            <SwSay lead>{`RARITY ${r.score} · #${rank.rank} OF ${rank.total}`}</SwSay>
            <div className="sw-rows">
                {pt && tf && (
                    <div className="sw-row-line">
                        <span className="sw-row-l">{`${pt.name.toUpperCase()} · ${pt.value.toUpperCase()}`}</span>
                        <span className="sw-row-r">{`${tf.count} OF ${tf.total}`}</span>
                    </div>
                )}
                {ff && (
                    <div className="sw-row-line">
                        <span className="sw-row-l">{`FATE · ${fate.toUpperCase()}`}</span>
                        <span className="sw-row-r">{`${ff.count} OF ${ff.total}`}</span>
                    </div>
                )}
                {bucket && cf && (
                    <div className="sw-row-line">
                        <span className="sw-row-l">{`COLOUR · ${bucket.toUpperCase()}`}</span>
                        <span className="sw-row-r">{`${cf.count} OF ${cf.total}`}</span>
                    </div>
                )}
                {pop != null && (
                    <div className="sw-row-line">
                        <span className="sw-row-l">POP — ITS SMALLEST CLUB</span>
                        <span className="sw-row-r">{String(pop)}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── ◊ THE VERDICT — "good price?": the gap read on a project. Floor vs
      all-time high vs the 30-day trend, verdict spoken plainly. ── */

function VerdictWidget({ slug, title, onGo, onAct, onFooter }: {
    slug: string | null; title: string | null; onGo: GoFn; onAct: ActFn; onFooter: FooterFn;
}) {
    const [proj, setProj] = useState<SearchProjectResult | null | 'loading'>('loading');
    const [trend, setTrend] = useState<StoneTrendResponse | null>(null);

    useEffect(() => {
        if (!slug || !title) return;
        let cancelled = false;
        setProj('loading');
        fetchSearch(title).then((r) => {
            if (cancelled) return;
            setProj(r?.projects.find((x) => x.id === slug) ?? r?.projects[0] ?? null);
        });
        fetch(`/api/stone/trend?slug=${encodeURIComponent(slug)}&days=30`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => { if (!cancelled) setTrend(j); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [slug, title]);

    const ready = proj !== 'loading' && proj != null && proj.floor_eth != null;
    useFooterAct(onFooter, ready ? {
        label: `↧${VS15} ANCHOR · ${title} · ◊${formatEth((proj as SearchProjectResult).floor_eth as number)} — etch?`,
        run: () => onAct(commitEtch({
            kind: 'anchor',
            title: title as string,
            price: (proj as SearchProjectResult).floor_eth as number,
            chip: '',
        })),
    } : null);

    if (!slug || !title) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`◊${VS15}`} label="THE VERDICT" />
                <SwSay>OPEN A PROJECT, THEN ASK.</SwSay>
            </div>
        );
    }
    if (proj === 'loading') {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`◊${VS15}`} label="THE VERDICT" sub={title.toUpperCase()} />
                <SwSay>{working('ledger')}</SwSay>
            </div>
        );
    }
    if (!proj || proj.floor_eth == null) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`◊${VS15}`} label="THE VERDICT" sub={title.toUpperCase()} />
                <SwSay>NO FLOOR YET. NO VERDICT.</SwSay>
            </div>
        );
    }

    const floor = proj.floor_eth;
    const ath = proj.ath_eth;
    const pctOfAth = ath && ath > 0 ? (floor / ath) * 100 : null;
    const verdict =
        pctOfAth == null ? 'NO HIGH TO MEASURE AGAINST YET.'
        : pctOfAth < 40 ? `FAR BELOW ITS HIGH — ${Math.round(pctOfAth)}% OF ATH.`
        : pctOfAth < 75 ? `ROOM BELOW THE HIGH — ${Math.round(pctOfAth)}% OF ATH.`
        : pctOfAth < 100 ? `NEAR ITS HIGH — ${Math.round(pctOfAth)}% OF ATH.`
        : 'AT ITS HIGH. THE TOP IS UNPROVEN GROUND.';
    const vals = (trend?.series ?? []).filter((v): v is number => v != null);
    const delta = vals.length >= 2 && vals[0] > 0
        ? ((vals[vals.length - 1] - vals[0]) / vals[0]) * 100
        : null;
    return (
        <div className="stone-widget sw-card">
            <SwTitle glyph={`◊${VS15}`} label="THE VERDICT" sub={title.toUpperCase()} />
            <SwSay lead>{verdict}</SwSay>
            <div className="sw-stats">
                <div className="sw-stat">
                    <span className="sw-stat-v">{eth(floor)}</span>
                    <span className="sw-stat-l">FLOOR</span>
                </div>
                <div className="sw-stat">
                    <span className="sw-stat-v">{eth(ath)}</span>
                    <span className="sw-stat-l">ATH</span>
                </div>
                <div className="sw-stat">
                    <span className="sw-stat-v">
                        {delta == null ? '—' : `${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(0)}%`}
                    </span>
                    <span className="sw-stat-l">30D SALES</span>
                </div>
            </div>
            <div
                className="sw-hit sw-tap"
                role="button"
                tabIndex={0}
                onClick={(e) => onGo(e, `/art/${slug}`)}
            >
                <span className="sw-hit-ic">{`⬚${VS15}`}</span>
                <span className="sw-hit-body">
                    <span className="sw-hit-main">{title}</span>
                    <span className="sw-hit-sub">{`⬚${VS15} ${proj.minted_count}/${proj.max_supply}`}</span>
                </span>
            </div>
        </div>
    );
}

/* ── ✶ PROPHECY — "when will it sell out": remaining supply over the
      trailing-7-day mint rate. Pure arithmetic, spoken like an oracle. ── */

function ProphecyWidget({ slug, title, onGo, onFooter }: {
    slug: string; title: string; onGo: GoFn; onFooter: FooterFn;
}) {
    const [pace, setPace] = useState<OraclePaceResponse | null | 'loading'>('loading');
    const [proj, setProj] = useState<SearchProjectResult | null>(null);

    useEffect(() => {
        let cancelled = false;
        setPace('loading');
        fetch(`/api/stone/oracle?kind=pace&slug=${encodeURIComponent(slug)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => { if (!cancelled) setPace(j); })
            .catch(() => { if (!cancelled) setPace(null); });
        fetchSearch(title).then((r) => {
            if (cancelled) return;
            setProj(r?.projects.find((x) => x.id === slug) ?? null);
        });
        return () => { cancelled = true; };
    }, [slug, title]);

    useFooterAct(onFooter, {
        label: `⬚${VS15} OPEN ${title.toUpperCase()}`,
        run: () => onGo(null, `/art/${slug}`),
    });

    if (pace === 'loading' || (pace && !proj)) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`✶${VS15}`} label="PROPHECY" sub={title.toUpperCase()} />
                <SwSay>{working('prophecy')}</SwSay>
            </div>
        );
    }
    if (!pace || !proj) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`✶${VS15}`} label="PROPHECY" sub={title.toUpperCase()} />
                <SwSay>THE LEDGER ISN&apos;T ANSWERING.</SwSay>
            </div>
        );
    }

    const remaining = Math.max(0, proj.max_supply - proj.minted_count);
    const perDay = pace.last7 / 7;
    const soldOut = remaining === 0;
    const never = !soldOut && perDay <= 0;
    const days = soldOut || never ? null : Math.max(1, Math.ceil(remaining / perDay));
    const eta = days != null ? new Date(Date.now() + days * 86_400_000) : null;
    return (
        <div className="stone-widget sw-card">
            <SwTitle glyph={`✶${VS15}`} label="PROPHECY" sub={title.toUpperCase()} />
            <div className="sw-date-big">
                {soldOut ? 'ALREADY GONE.' : never ? 'AT THIS PACE: NEVER.' : `≈ ${days} DAY${days === 1 ? '' : 'S'}`}
            </div>
            <div className="sw-rows">
                <div className="sw-row-line">
                    <span className="sw-row-l">{`⬚${VS15} MINTED`}</span>
                    <span className="sw-row-r">{`${proj.minted_count}/${proj.max_supply}`}</span>
                </div>
                <div className="sw-row-line">
                    <span className="sw-row-l">{`✶${VS15} PACE · 7 DAYS`}</span>
                    <span className="sw-row-r">{`${pace.last7} MINT${pace.last7 === 1 ? '' : 'S'}`}</span>
                </div>
                {eta && (
                    <div className="sw-row-line">
                        <span className="sw-row-l">{`▦${VS15} SELLS OUT`}</span>
                        <span className="sw-row-r">
                            {`≈ ${eta.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}`}
                        </span>
                    </div>
                )}
                {never && (
                    <div className="sw-row-line">
                        <span className="sw-row-l">NO MINTS IN 7 DAYS</span>
                        <span className="sw-row-r">THE STONE WAITS</span>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── ⇡ THE NEWS — the stone speaks FIRST, with reason: unread pings laid
      out the moment it opens (Brendon, 2026-07-28 — real news only, never
      a party trick). The vessel decides WHEN; this only presents. ── */

export interface NewsItem {
    id: string;
    icon: string;
    handle: string;
    action: string;
    href: string | null;
}

export function NewsDeck({ items, onGo }: { items: NewsItem[]; onGo: GoFn }) {
    return (
        <div className="stone-widget sw-card">
            <SwTitle glyph={`⇡${VS15}`} label="THE NEWS" sub={`${items.length} UNREAD`} />
            {items.slice(0, 5).map((it) => (
                <div
                    key={it.id}
                    className={`sw-hit${it.href ? ' sw-tap' : ''}`}
                    role={it.href ? 'button' : undefined}
                    tabIndex={it.href ? 0 : undefined}
                    onClick={it.href ? (e) => onGo(e, it.href as string) : undefined}
                >
                    <span className="sw-hit-ic">{it.icon}</span>
                    <span className="sw-hit-body">
                        <span className="sw-hit-main">{it.handle || 'PD'}</span>
                        <span className="sw-hit-sub">{it.action}</span>
                    </span>
                </div>
            ))}
        </div>
    );
}

/* ══ THE FUN WAVE (2026-07-28, Brendon: "add them all") ═══════════════ */

/* ── ROAST — the dry verdict on your own real ledger (wrapped, 90 days).
      Templates over real stats: brutal only where the numbers earn it. ── */

function roastLines(d: StoneWrappedResponse): string[] {
    const out: string[] = [];
    const quiet = d.collected === 0 && d.sold === 0 && d.trades === 0;
    if (quiet) {
        out.push('NINETY DAYS. NOTHING. THE LEDGER FORGOT YOUR NAME.');
        out.push('EVEN THE FLOOR MOVES MORE THAN YOU.');
        out.push('COME BACK WHEN THERE IS SOMETHING TO ROAST.');
        return out;
    }
    if (d.net_eth < 0) {
        out.push(`NET ◊${Math.abs(d.net_eth)} OUT THE DOOR IN ${d.days} DAYS. BOLD STRATEGY.`);
    } else if (d.net_eth > 0) {
        out.push(`UP ◊${Math.abs(d.net_eth)} IN ${d.days} DAYS. EVEN A STONE IS MILDLY IMPRESSED.`);
    } else {
        out.push('PERFECTLY BREAK-EVEN. THE MOST FORGETTABLE OUTCOME THERE IS.');
    }
    if (d.sold > d.bought + d.minted) {
        out.push(`${d.sold} OUT, ${d.bought + d.minted} IN. PAPER HANDS LEAVE FINGERPRINTS.`);
    } else if (d.minted + d.bought > 0 && d.sold === 0) {
        out.push(`${d.minted + d.bought} IN, ZERO OUT. DIAMOND HANDS — OR NO BIDS. I KNOW WHICH.`);
    }
    if (d.flip && d.flip.profit_eth < 0) {
        out.push(`YOUR BIGGEST FLIP LOST ◊${Math.abs(d.flip.profit_eth)}. I KEPT THE RECEIPT.`);
    } else if (d.flip && d.flip.profit_eth > 0) {
        out.push(`ONE GOOD FLIP: +◊${d.flip.profit_eth}. FRAME IT. IT MAY BE THE LAST.`);
    }
    if (d.top_counterparty) {
        const who = d.top_counterparty.handle ? `@${d.top_counterparty.handle}` : 'ONE WALLET';
        out.push(`${who} TOOK ${d.top_counterparty.deals} DEALS OFF YOU. SEND THEM A CARD.`);
    }
    return out.slice(0, 4);
}

function RoastWidget({ address, onSeed }: { address: string; onSeed: (t: string) => void }) {
    const [data, setData] = useState<StoneWrappedResponse | null | 'loading'>('loading');
    useEffect(() => {
        let cancelled = false;
        setData('loading');
        fetch(`/api/stone/wrapped?me=${encodeURIComponent(address.toLowerCase())}&days=90`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => { if (!cancelled) setData(j); })
            .catch(() => { if (!cancelled) setData(null); });
        return () => { cancelled = true; };
    }, [address]);

    if (data === 'loading') {
        return (
            <div className="stone-widget sw-card">
                <SwTitle label="THE ROAST" sub="90 DAYS" />
                <SwSay>{working('you')}</SwSay>
            </div>
        );
    }
    if (!data) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle label="THE ROAST" sub="90 DAYS" />
                <SwSay>THE LEDGER ISN&apos;T ANSWERING. LUCKY YOU.</SwSay>
            </div>
        );
    }
    return (
        <div className="stone-widget sw-card">
            <SwTitle label="THE ROAST" sub={`YOUR ${data.days} DAYS`} />
            {roastLines(data).map((l, i) => (
                <SwSay key={i} lead={i === 0}>{l}</SwSay>
            ))}
            <SwSay onClick={() => onSeed('wrapped 90d')}>THE FULL NUMBERS — TAP.</SwSay>
        </div>
    );
}

/* ── THE 8-BALL — "should i buy?": one committed answer, seeded by wallet
      + topic + the day, so asking again changes nothing. ── */

function EightballWidget({ topic, address }: { topic: string | null; address: string }) {
    const day = new Date();
    const seed = `${address.toLowerCase()}·${topic ?? ''}·${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
    return (
        <div className="stone-widget sw-card">
            <SwTitle label="THE 8-BALL" sub={topic ? topic.toUpperCase() : undefined} />
            <SwSay lead>{eightballVerdict(seed)}</SwSay>
            <SwHint text="same question, same day, same answer. the stone commits." />
        </div>
    );
}

/* ── THE FORTUNE — the daily reading: three carved lines + your real
      PriceDay number, re-drawn each day per wallet. ── */

function FortuneWidget({ address }: { address: string }) {
    const day = usePriceDay();
    const now = new Date();
    const seed = `${address.toLowerCase()}·${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    const f = fortuneReading(seed);
    return (
        <div className="stone-widget sw-card">
            <SwTitle glyph={`✶${VS15}`} label="THE FORTUNE" sub={formatPriceDate()} />
            <SwSay lead>{f.omen}</SwSay>
            <SwSay>{f.market}</SwSay>
            <SwSay>{f.advice}</SwSay>
            <div className="sw-rows">
                <div className="sw-row-line">
                    <span className="sw-row-l">{`✶${VS15} YOUR NUMBER TODAY`}</span>
                    <span className="sw-row-r">{day.number}</span>
                </div>
            </div>
        </div>
    );
}

/* ── THE DJ — "play me something": picks from the soundtracks of projects
      you actually hold (any soundtracked project when you hold none), and
      drops it into the one real miniplayer over the bus. ── */

function DjWidget({ address, onAct, onFooter }: {
    address: string; onAct: ActFn; onFooter: FooterFn;
}) {
    const [pool, setPool] = useState<string[] | null>(null);
    const [held, setHeld] = useState(true);
    const fm = useSyncExternalStore(subscribeFm, getFm, getFm);

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/user/${address.toLowerCase()}/owned-projects`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (cancelled) return;
                const mine = ((d?.slugs ?? []) as string[]).filter((s) => getProject(s)?.soundtrack);
                if (mine.length > 0) {
                    setPool(mine);
                    setHeld(true);
                } else {
                    setPool(allProjects().filter((p) => p.soundtrack).map((p) => p.slug));
                    setHeld(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setPool(allProjects().filter((p) => p.soundtrack).map((p) => p.slug));
                    setHeld(false);
                }
            });
        return () => { cancelled = true; };
    }, [address]);

    const dayN = Math.floor(Date.now() / 86_400_000);
    const pickSlug = pool && pool.length > 0 ? pool[dayN % pool.length] : null;
    const pickSt = pickSlug ? getProject(pickSlug)?.soundtrack : null;

    useFooterAct(onFooter, pickSlug && pickSt ? {
        label: `▶${VS15} PLAY · ${pickSt.label}`,
        run: () => {
            fmPlay({ playlistId: pickSt.playlistId, label: pickSt.label, slug: pickSlug });
            onAct('miniplayer: ON AIR');
        },
    } : null);

    if (!pool) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`▶${VS15}`} label="THE DJ" />
                <SwSay>READING YOUR SHELF…</SwSay>
            </div>
        );
    }
    if (!pickSlug || !pickSt) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={`▶${VS15}`} label="THE DJ" />
                <SwSay>NO SOUNDTRACKS ON THE SHELF YET.</SwSay>
            </div>
        );
    }
    return (
        <div className="stone-widget sw-card">
            <SwTitle glyph={`▶${VS15}`} label="THE DJ" sub={held ? 'FROM YOUR SHELF' : 'FROM THE CATALOG'} />
            <SwSay lead>{pickSt.label}</SwSay>
            <SwSay>{`FOR ${getProject(pickSlug)?.displayName.toUpperCase() ?? pickSlug.toUpperCase()}`}</SwSay>
            {fm.status !== 'idle' && fm.station && (
                <div className="stone-fm-transport">
                    <button type="button" className="stone-fm-key" onClick={fmToggle}>
                        {fm.status === 'playing' ? 'PAUSE' : `▶${VS15} PLAY`}
                    </button>
                    <button type="button" className="stone-fm-key" onClick={fmNext}>NEXT</button>
                    <span className="stone-fm-now">{fm.trackTitle || fm.station.label}</span>
                </div>
            )}
        </div>
    );
}

/* ── LORE — the stone on itself. Never the same way twice (seeded by the
      day, so its story shifts but never contradicts mid-conversation). ── */

function LoreWidget({ q }: { q: string }) {
    const day = new Date();
    const seed = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
    return (
        <div className="stone-widget sw-card">
            <SwTitle glyph={`⌘${VS15}`} label="THE STONE" />
            <SwSay lead>{loreAnswer(q, seed)}</SwSay>
        </div>
    );
}

/* ── THE FLOOR IS RIGHT — guess a real floor from three choices; the
      ledger scores you; the streak survives in the pocket. ── */

const FIG_STREAK_KEY = 'pd_stone_fig_streak';

function figStreak(): number {
    try { return Number(window.localStorage.getItem(FIG_STREAK_KEY)) || 0; } catch { return 0; }
}
function setFigStreak(n: number) {
    try { window.localStorage.setItem(FIG_STREAK_KEY, String(n)); } catch { /* fine */ }
}

function FloorGameWidget({ onAct }: { onAct: ActFn }) {
    const [round, setRound] = useState(0);
    const [picked, setPicked] = useState<number | null>(null);
    const [proj, setProj] = useState<SearchProjectResult | null | 'loading'>('loading');

    /* Round N's project — walk the soundtracked/major catalog by round. */
    const candidates = useMemo(
        () => allProjects().map((p) => p.slug).sort(),
        [],
    );
    const slug = candidates.length ? candidates[(figStreak() + round) % candidates.length] : null;

    useEffect(() => {
        if (!slug) return;
        let cancelled = false;
        setProj('loading');
        setPicked(null);
        const title = getProject(slug)?.displayName ?? slug;
        fetchSearch(title).then((r) => {
            if (cancelled) return;
            setProj(r?.projects.find((x) => x.id === slug) ?? null);
        });
        return () => { cancelled = true; };
    }, [slug, round]);

    if (!slug || proj === 'loading') {
        return (
            <div className="stone-widget sw-card">
                <SwTitle label="THE FLOOR IS RIGHT" sub={`STREAK ${figStreak()}`} />
                <SwSay>{working('floor')}</SwSay>
            </div>
        );
    }
    if (!proj || proj.floor_eth == null || proj.floor_eth <= 0) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle label="THE FLOOR IS RIGHT" sub={`STREAK ${figStreak()}`} />
                <SwSay>NO LIVE FLOOR FOR THIS ROUND.</SwSay>
                <div className="sw-gallery-bar">
                    <button type="button" className="sw-key sw-key--word" onClick={() => setRound((r) => r + 1)}>NEXT</button>
                </div>
            </div>
        );
    }

    const real = proj.floor_eth;
    /* Deterministic decoys around the truth; order rotates by round. */
    const opts = [real, Math.round(real * 0.55 * 1e4) / 1e4, Math.round(real * 1.7 * 1e4) / 1e4];
    const rot = round % 3;
    const shown = [opts[rot], opts[(rot + 1) % 3], opts[(rot + 2) % 3]];
    const guess = (v: number) => {
        if (picked != null) return;
        setPicked(v);
        if (v === real) {
            const s = figStreak() + 1;
            setFigStreak(s);
            onAct(`The Floor Is Right: STREAK ${s}`);
        } else {
            setFigStreak(0);
            onAct('The Floor Is Right: WRONG');
        }
    };
    return (
        <div className="stone-widget sw-card">
            <SwTitle label="THE FLOOR IS RIGHT" sub={`STREAK ${figStreak()}`} />
            <div className="sw-hit">
                <SpriteFace className="sw-hit-sprite" face={projectSpriteFace(proj.id)} />
                <span className="sw-hit-body">
                    <span className="sw-hit-main">{proj.title}</span>
                    <span className="sw-hit-sub">{`⬚${VS15} ${proj.minted_count}/${proj.max_supply} — NAME THE FLOOR`}</span>
                </span>
            </div>
            <div className="sw-gallery-bar">
                {shown.map((v) => (
                    <button
                        key={v}
                        type="button"
                        className={`sw-key sw-key--word${picked != null && v === real ? ' sw-key--right' : ''}`}
                        onClick={() => guess(v)}
                    >
                        {`◊${v}`}
                    </button>
                ))}
            </div>
            {picked != null && (
                <>
                    <SwSay lead>
                        {picked === real
                            ? 'CORRECT. THE LEDGER NODS.'
                            : `WRONG. THE FLOOR IS ◊${real}.`}
                    </SwSay>
                    <div className="sw-gallery-bar">
                        <button type="button" className="sw-key sw-key--word" onClick={() => setRound((r) => r + 1)}>NEXT ROUND</button>
                    </div>
                </>
            )}
        </div>
    );
}

/* ── THE MOODS — the whole set dealt as a hand, each row tappable. The
      worn one is marked; a tap flips it live and the deal stays on the
      table so you can wander the weathers (execution lives in the stone —
      onCastMood is castMood + its toast). TWO DECKS in one card (Brendon,
      2026-07-28): THE ROOM paints the place, THE MARKET sets your
      collecting lens — one of each can be worn at once. ── */

function MoodsWidget({ wornKey, wornMarketKey, onCast, onCastMarket }: {
    wornKey: string | null;
    wornMarketKey: string | null;
    onCast: (m: MoodDef) => void;
    onCastMarket: (m: MarketMoodDef) => void;
}) {
    const worn = MOODS.find((m) => m.key === wornKey) ?? null;
    const wornMkt = MARKET_MOODS.find((m) => m.key === wornMarketKey) ?? null;
    const subs = [worn?.label, wornMkt?.label].filter(Boolean).map((s) => s!.toUpperCase());
    return (
        <div className="stone-widget sw-card">
            <SwTitle
                glyph={`☾${VS15}`}
                label="THE MOODS"
                sub={subs.length ? `WEARING ${subs.join(' + ')}` : 'NONE WORN'}
            />
            <SwSay>THE ROOM</SwSay>
            {MOODS.map((m) => (
                <div
                    key={m.key}
                    className="sw-hit sw-tap"
                    role="button"
                    tabIndex={0}
                    onClick={() => onCast(m)}
                >
                    <span className="sw-hit-ic">{`☾${VS15}`}</span>
                    <span className="sw-hit-body">
                        <span className="sw-hit-main">
                            {m.label.toUpperCase()}{m.key === wornKey ? ' · ON' : ''}
                        </span>
                        <span className="sw-hit-sub">{m.recipe}</span>
                    </span>
                </div>
            ))}
            <SwSay>THE MARKET</SwSay>
            {MARKET_MOODS.map((m) => (
                <div
                    key={m.key}
                    className="sw-hit sw-tap"
                    role="button"
                    tabIndex={0}
                    onClick={() => onCastMarket(m)}
                >
                    <span className="sw-hit-ic">{`☾${VS15}`}</span>
                    <span className="sw-hit-body">
                        <span className="sw-hit-main">
                            {m.label.toUpperCase()}{m.key === wornMarketKey ? ' · ON' : ''}
                        </span>
                        <span className="sw-hit-sub">{m.recipe}</span>
                    </span>
                </div>
            ))}
            <SwHint text="one word wears it · the same word lifts it · one of each deck at once" />
        </div>
    );
}

/* ── THE COIN CARD — "$price" · "$eth" · "$fwa": live price with the fiat
      beside it, the trend, the pool depth, the logo, and YOU HOLD for the
      signed-in wallet. All through our own route at $0. $PRICE reads
      $0.00 until the pool exists — honest by construction. ── */

function fmtUsd(n: number): string {
    if (n === 0) return '$0.00';
    if (n >= 1) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
    return `$${n.toPrecision(4).replace(/0+$/, '').replace(/\.$/, '')}`;
}
function fmtAmount(n: number): string {
    if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (n >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return n.toPrecision(4).replace(/0+$/, '').replace(/\.$/, '');
}
function TrendChip({ label, v }: { label: string; v: number | null }) {
    if (v == null) return null;
    const up = v >= 0;
    return (
        <span className="sw-hit-sub">{`${label} ${up ? '+' : ''}${v.toFixed(1)}% ${up ? '↑' : '↓'}${VS15}`}</span>
    );
}

function TokenWidget({ symbol, address }: { symbol: string; address: string }) {
    const def = TOKENS.find((t) => t.symbol === symbol) ?? null;
    const [card, setCard] = useState<StoneTokenResponse | null>(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        if (!def) return;
        let cancelled = false;
        const holder = address ? `&holder=${address.toLowerCase()}` : '';
        fetch(`/api/stone/token?symbol=${def.symbol}${holder}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (!cancelled) { if (d) setCard(d as StoneTokenResponse); else setFailed(true); } })
            .catch(() => { if (!cancelled) setFailed(true); });
        return () => { cancelled = true; };
    }, [def, address]);
    if (!def) return null;
    const logo = def.logo === 'permille'
        ? <PerMilleMark className="sw-title-glyph" style={{ width: 16, height: 16 }} />
        : def.logo === 'eth'
            ? `◊${VS15}`
            : card?.imageUrl
                ? <img src={card.imageUrl} alt="" width={16} height={16} style={{ borderRadius: 4 }} />
                : `◊${VS15}`;
    if (failed) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={typeof logo === 'string' ? logo : undefined} label={`$${def.symbol}`} sub={def.name.toUpperCase()} />
                <SwSay>THE TICKER IS UNREACHABLE. THE LEDGER ENDURES.</SwSay>
            </div>
        );
    }
    if (!card) {
        return (
            <div className="stone-widget sw-card">
                <SwTitle glyph={typeof logo === 'string' ? logo : undefined} label={`$${def.symbol}`} sub={def.name.toUpperCase()} />
                <SwSay>{working('rate')}</SwSay>
            </div>
        );
    }
    return (
        <div className="stone-widget sw-card">
            <div className="sw-title">
                <span className="sw-title-glyph">{typeof logo === 'string' ? logo : logo}</span>
                <span className="sw-title-label">{`$${card.symbol}`}</span>
                <span className="sw-title-sub">{card.name.toUpperCase()}</span>
            </div>
            <SwSay lead>{fmtUsd(card.priceUsd)}</SwSay>
            {card.hasPool ? (
                <div className="sw-hit">
                    <span className="sw-hit-body">
                        <TrendChip label="1H" v={card.change.h1} />
                        <TrendChip label="6H" v={card.change.h6} />
                        <TrendChip label="24H" v={card.change.h24} />
                    </span>
                </div>
            ) : (
                <SwSay>{card.note ?? 'NO POOL ON THE BOOKS.'}</SwSay>
            )}
            {card.hasPool && card.liquidityUsd != null && (
                <SwSay>{`POOL ${fmtUsd(card.liquidityUsd)}${card.volume24Usd != null ? ` · 24H VOL ${fmtUsd(card.volume24Usd)}` : ''}`}</SwSay>
            )}
            {card.balance != null && card.balance > 0 && (
                <SwSay>{`YOU HOLD ${fmtAmount(card.balance)} $${card.symbol}${card.balanceUsd != null ? ` · ${fmtUsd(card.balanceUsd)}` : ''}`}</SwSay>
            )}
            {card.balance === 0 && <SwHint text="none in the connected wallet" />}
        </div>
    );
}

/* ── THE JOKE — the stone keeps a told-ledger in the pocket, so a joke
      never repeats until the whole bank has been dealt; then it says so
      and honestly starts over. Footer deals ANOTHER ONE. ── */

const JOKES_TOLD_KEY = 'pd_stone_jokes_told';

function readJokesTold(): number[] {
    try {
        const a = JSON.parse(window.localStorage.getItem(JOKES_TOLD_KEY) ?? '[]') as unknown;
        return Array.isArray(a) ? a.filter((n): n is number => typeof n === 'number') : [];
    } catch { return []; }
}
function writeJokesTold(a: number[]) {
    try { window.localStorage.setItem(JOKES_TOLD_KEY, JSON.stringify(a)); } catch { /* fine */ }
}

function JokeWidget({ onFooter }: { onFooter: FooterFn }) {
    const [dealt, setDealt] = useState<{ i: number; exhausted: boolean; left: number } | null>(null);
    const deal = useCallback(() => {
        const prev = readJokesTold();
        const p = pickJoke(new Set(prev), `joke·${prev.length}`);
        const next = p.exhausted ? [p.i] : [...prev, p.i];
        writeJokesTold(next);
        setDealt({ ...p, left: JOKES.length - next.length });
    }, []);
    useEffect(() => { deal(); }, [deal]);
    useFooterAct(onFooter, { label: 'ANOTHER ONE', run: deal });
    if (!dealt) return null;
    return (
        <div className="stone-widget sw-card">
            <SwTitle
                glyph={`⌘${VS15}`}
                label="THE JOKE"
                sub={dealt.exhausted
                    ? 'THE BANK RAN DRY — STARTING OVER'
                    : `${dealt.left} STILL UNTOLD`}
            />
            <SwSay lead>{JOKES[dealt.i]}</SwSay>
        </div>
    );
}

/* ── the deck router — one summoned plan, one card ── */

export function WidgetDeck({ plan, address, onGo, onAct, onFooter, onSeed, wornMoodKey = null, onCastMood, wornMarketMoodKey = null, onCastMarketMood }: {
    plan: WidgetPlan;
    address: string;
    onGo: GoFn;
    onAct: ActFn;
    onFooter: FooterFn;
    onSeed: (text: string) => void;
    wornMoodKey?: string | null;
    onCastMood?: (m: MoodDef) => void;
    wornMarketMoodKey?: string | null;
    onCastMarketMood?: (m: MarketMoodDef) => void;
}) {
    switch (plan.kind) {
        case 'calendar': return <CalendarWidget />;
        case 'priceday': return <PriceDayWidget />;
        case 'math': return <MathWidget plan={plan} />;
        case 'convert': return <ConvertWidget plan={plan} />;
        case 'calc': return <CalcWidget plan={plan} onAct={onAct} onFooter={onFooter} />;
        case 'dossier': return <DossierWidget name={plan.name} me={address} onGo={onGo} onAct={onAct} />;
        case 'gallery': return <GalleryWidget slug={plan.slug} title={plan.title} onGo={onGo} onAct={onAct} onFooter={onFooter} />;
        case 'matrix': return <MatrixWidget names={plan.names} onAct={onAct} onFooter={onFooter} />;
        case 'ascii': return <AsciiWidget address={address} />;
        case 'docs': return <DocsWidget query={plan.query} onGo={onGo} />;
        case 'glance': return <GlanceWidget address={address} />;
        case 'omni': return <OmniWidget address={address} />;
        case 'trend': return <TrendWidget plan={plan} />;
        case 'wrapped': return <WrappedWidget plan={plan} address={address} />;
        case 'date': return <DateWidget date={plan.date} onSeed={onSeed} onFooter={onFooter} />;
        case 'firstmint': return <FirstMintWidget mine={plan.mine} address={address} onGo={onGo} onFooter={onFooter} />;
        case 'release': return <ReleaseWidget slug={plan.slug} title={plan.title} onGo={onGo} onFooter={onFooter} />;
        case 'rank': return <RankWidget plan={plan} address={address} onGo={onGo} onFooter={onFooter} />;
        case 'cohort': return <CohortWidget plan={plan} address={address} onGo={onGo} onFooter={onFooter} />;
        case 'why': return <WhyWidget slug={plan.slug} title={plan.title} id={plan.id} onGo={onGo} onFooter={onFooter} />;
        case 'verdict': return <VerdictWidget slug={plan.slug} title={plan.title} onGo={onGo} onAct={onAct} onFooter={onFooter} />;
        case 'prophecy': return <ProphecyWidget slug={plan.slug} title={plan.title} onGo={onGo} onFooter={onFooter} />;
        case 'roast': return <RoastWidget address={address} onSeed={onSeed} />;
        case 'eightball': return <EightballWidget topic={plan.topic} address={address} />;
        case 'fortune': return <FortuneWidget address={address} />;
        case 'dj': return <DjWidget address={address} onAct={onAct} onFooter={onFooter} />;
        case 'lore': return <LoreWidget q={plan.q} />;
        case 'floorgame': return <FloorGameWidget onAct={onAct} />;
        case 'moods': return (
            <MoodsWidget
                wornKey={wornMoodKey}
                wornMarketKey={wornMarketMoodKey}
                onCast={(m) => onCastMood?.(m)}
                onCastMarket={(m) => onCastMarketMood?.(m)}
            />
        );
        case 'joke': return <JokeWidget onFooter={onFooter} />;
        case 'token': return <TokenWidget symbol={plan.symbol} address={address} />;
    }
}

/* ══ SEARCH, RE-PRESENTED — GO/FIND as glanceable cards ═══════════════ */

const PREVIEW = 4;

function MoreRow({ n, onClick }: { n: number; onClick: () => void }) {
    return (
        <div className="sw-more" role="button" tabIndex={0} onClick={onClick}>
            {`+ ${n} MORE`}
        </div>
    );
}

/* Which output the project hero paints: the exact edition the line named
   ("prisms 7" · "boreal #33" — the SAME parse the search API runs, Rule #0),
   else output #1. Null when nothing is minted yet. */
function projectFocusId(p: SearchProjectResult, query: string): number | null {
    if (p.minted_count <= 0) return null;
    const typed = parseQuery(query).tokenId;
    const n = typed != null ? Number(typed) : NaN;
    if (Number.isInteger(n) && n >= 1 && n <= p.minted_count) return n;
    return 1;
}

/* A real output painted big — the same deterministic engine + ascii/degen
   manners as ArtThumb (Rule #0), at hero scale. Taps through to the piece. */
function StoneArt({ slug, id, onOpen }: { slug: string; id: number; onOpen: () => void }) {
    const ref = useRef<HTMLCanvasElement | null>(null);
    const { notifs } = usePdNotifs();
    const ascii = notifs.asciiArt;
    const degen = notifs.degen;
    useEffect(() => {
        if (degen) return;
        const canvas = ref.current;
        if (!canvas) return;
        const paintNormal = () => {
            try { paintOutput(canvas, slug, id, 512); } catch { /* unknown slug */ }
        };
        if (ascii) {
            paintAsciiStandin(canvas, slug, id, 512)
                .then((ok) => { if (!ok) paintNormal(); })
                .catch(paintNormal);
            return;
        }
        paintNormal();
    }, [slug, id, ascii, degen]);
    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); }
    };
    /* Degen Mode — no art anywhere: the plain no-art square, still tappable. */
    if (degen) {
        return (
            <div
                className="sw-gallery-art sw-thumb--degen sw-tap"
                role="button"
                tabIndex={0}
                onClick={onOpen}
                onKeyDown={onKey}
                style={{ aspectRatio: '1 / 1' }}
                aria-label="open artwork"
            />
        );
    }
    return (
        <canvas
            ref={ref}
            className="sw-gallery-art sw-tap"
            width={512}
            height={512}
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={onKey}
            aria-label="open artwork"
        />
    );
}

/* ── ⬚ PROJECT — the rich read on a searched project (Brendon, 2026-07-21):
      real output painted big (the typed edition, else #1), the project row,
      and the live floor/volume/ath. Retires the thin sprite row for the top
      hit; extra projects still list below. ── */
function ProjectHero({ p, focusId, onGo }: {
    p: SearchProjectResult; focusId: number | null; onGo: GoFn;
}) {
    return (
        <>
            <div className="sw-sect">PROJECT</div>
            {focusId != null && (
                <>
                    <StoneArt slug={p.id} id={focusId} onOpen={() => onGo(null, `/art/${p.id}/${focusId}`)} />
                    <div className="sw-gallery-bar">
                        <span
                            className="sw-gallery-name sw-tap"
                            role="button"
                            tabIndex={0}
                            onClick={(e) => onGo(e, `/art/${p.id}/${focusId}`)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onGo(null, `/art/${p.id}/${focusId}`); }
                            }}
                        >
                            {pieceName(p.title, focusId)}
                        </span>
                    </div>
                </>
            )}
            <div
                className="sw-hit sw-tap"
                role="button"
                tabIndex={0}
                onClick={(e) => onGo(e, `/art/${p.id}`)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onGo(null, `/art/${p.id}`); }
                }}
            >
                <SpriteFace className="sw-hit-sprite" face={projectSpriteFace(p.id)} />
                <span className="sw-hit-body">
                    <span className="sw-hit-main">{p.title}</span>
                    <span className="sw-hit-sub">
                        {`${p.artist_handle ? `@${p.artist_handle} · ` : ''}⬚${VS15} ${p.minted_count}/${p.max_supply}`}
                    </span>
                </span>
            </div>
            <div className="sw-stats">
                <div className="sw-stat">
                    <span className="sw-stat-v">{eth(p.floor_eth)}</span>
                    <span className="sw-stat-l">FLOOR</span>
                </div>
                <div className="sw-stat">
                    <span className="sw-stat-v">{eth(p.volume_eth)}</span>
                    <span className="sw-stat-l">VOLUME</span>
                </div>
                <div className="sw-stat">
                    <span className="sw-stat-v">{eth(p.ath_eth)}</span>
                    <span className="sw-stat-l">ATH</span>
                </div>
            </div>
        </>
    );
}

export function SearchDeck({ r, pageHits, onGo, query }: {
    r: SearchResponse | null;
    pageHits: Array<{ label: string; to: string }>;
    onGo: GoFn;
    query: string;
}) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    useEffect(() => { setExpanded({}); }, [r, pageHits]);

    /* The top project renders as the rich hero (real art + live stats); the
       piece it paints is dropped from the OUTPUTS list so it never doubles. */
    const heroProject = r && r.projects.length > 0 ? r.projects[0] : null;
    const heroFocusId = heroProject ? projectFocusId(heroProject, query) : null;
    const heroKey = heroProject && heroFocusId != null ? `${heroProject.id}:${heroFocusId}` : null;
    const artworks = r
        ? (heroKey ? r.artworks.filter((a) => `${a.project_id}:${a.token_id}` !== heroKey) : r.artworks)
        : [];

    const empty =
        pageHits.length === 0 && r &&
        r.answers.length === 0 && r.projects.length === 0 && r.users.length === 0 &&
        r.artworks.length === 0 && r.soundtracks.length === 0 && r.traits.length === 0;

    return (
        <div className="stone-widget sw-card sw-card--results">
            {/* THE ANSWERS — the TARS voice: terse, confident, large. */}
            {r && r.answers.length > 0 && (
                <div className="sw-answers">
                    {r.answers.map((ans, i) => (
                        <SwSay
                            key={`ans:${i}`}
                            lead={i === 0}
                            onClick={ans.href ? () => onGo(null, ans.href as string) : undefined}
                        >
                            {ans.text}
                        </SwSay>
                    ))}
                </div>
            )}

            {pageHits.length > 0 && (
                <>
                    <div className="sw-sect">PAGES</div>
                    {pageHits.map((p) => (
                        <div key={`pg:${p.label}`} className="sw-hit sw-tap" role="button" tabIndex={0} onClick={(e) => onGo(e, p.to)}>
                            <span className="sw-hit-main">{p.label.toUpperCase()}</span>
                            <span className="sw-hit-sub">PAGE</span>
                        </div>
                    ))}
                </>
            )}

            {heroProject && (
                <>
                    <ProjectHero p={heroProject} focusId={heroFocusId} onGo={onGo} />
                    {r && r.projects.length > 1 && (
                        <>
                            <div className="sw-sect">MORE PROJECTS</div>
                            {r.projects.slice(1, expanded.projects ? undefined : PREVIEW + 1).map((p) => (
                                <ProjectCard key={`p:${p.id}`} p={p} onGo={onGo} />
                            ))}
                            {!expanded.projects && r.projects.length > PREVIEW + 1 && (
                                <MoreRow n={r.projects.length - (PREVIEW + 1)} onClick={() => setExpanded((x) => ({ ...x, projects: true }))} />
                            )}
                        </>
                    )}
                </>
            )}

            {r && r.users.length > 0 && (
                <>
                    <div className="sw-sect">COLLECTORS</div>
                    {r.users.slice(0, expanded.users ? undefined : PREVIEW).map((u) => (
                        <UserCard key={`u:${u.address}`} u={u} onGo={onGo} />
                    ))}
                    {!expanded.users && r.users.length > PREVIEW && (
                        <MoreRow n={r.users.length - PREVIEW} onClick={() => setExpanded((x) => ({ ...x, users: true }))} />
                    )}
                </>
            )}

            {artworks.length > 0 && (
                <>
                    <div className="sw-sect">OUTPUTS</div>
                    {artworks.slice(0, expanded.artworks ? undefined : PREVIEW).map((a) => (
                        <ArtCard key={`a:${a.project_id}:${a.token_id}`} a={a} onGo={onGo} />
                    ))}
                    {!expanded.artworks && artworks.length > PREVIEW && (
                        <MoreRow n={artworks.length - PREVIEW} onClick={() => setExpanded((x) => ({ ...x, artworks: true }))} />
                    )}
                </>
            )}

            {r && r.traits.length > 0 && (
                <>
                    <div className="sw-sect">TRAITS</div>
                    {r.traits.map((t) => (
                        <TraitCard key={`t:${t.project_id}:${t.trait_name}:${t.value}`} t={t} onGo={onGo} />
                    ))}
                </>
            )}

            {empty && <SwSay>{`⌕${VS15} THE STONE IS SILENT.`}</SwSay>}
        </div>
    );
}

function ProjectCard({ p, onGo }: { p: SearchProjectResult; onGo: GoFn }) {
    return (
        <div className="sw-hit sw-tap" role="button" tabIndex={0} onClick={(e) => onGo(e, `/art/${p.id}`)}>
            <SpriteFace className="sw-hit-sprite" face={projectSpriteFace(p.id)} />
            <span className="sw-hit-body">
                <span className="sw-hit-main">{p.title}</span>
                <span className="sw-hit-sub">
                    {p.match ?? `@${p.artist_handle ?? p.handle ?? ''}`}
                </span>
            </span>
            <span className="sw-hit-figures">
                <span className="sw-fig">{`${p.minted_count}/${p.max_supply}`}</span>
                {p.floor_eth != null && <span className="sw-fig sw-fig--sub">{`FLOOR ${eth(p.floor_eth)}`}</span>}
            </span>
        </div>
    );
}

function UserCard({ u, onGo }: { u: SearchUserResult; onGo: GoFn }) {
    const face = useSpriteFace(u.handle ?? '');
    const name = u.handle ? `@${u.handle}` : u.ens_name ?? shortAddress(u.address);
    return (
        <div className="sw-hit sw-tap" role="button" tabIndex={0} onClick={(e) => onGo(e, `/${u.handle ?? u.address}`)}>
            {face && <SpriteFace className="sw-hit-sprite" face={face} />}
            <span className="sw-hit-body">
                <span className="sw-hit-main">
                    {name}
                    {u.is_artist && <span className="sw-hit-badge">{` ✺${VS15}`}</span>}
                </span>
                <span className="sw-hit-sub">
                    {`⬚${VS15} ${u.collected} · ⟠${VS15} ${u.spent_eth.toFixed(2)} · ⚬${VS15} ${fmtFollowers(u.followers)}`}
                </span>
            </span>
        </div>
    );
}

function ArtCard({ a, onGo }: { a: SearchArtworkResult; onGo: GoFn }) {
    return (
        <div className="sw-hit sw-tap" role="button" tabIndex={0} onClick={(e) => onGo(e, `/art/${a.project_id}/${a.token_id}`)}>
            <SwThumb slug={a.project_id} id={a.token_id} size={48} />
            <span className="sw-hit-body">
                <span className="sw-hit-main">{pieceName(a.project_title, a.token_id)}</span>
                <span className="sw-hit-sub">
                    {a.label ? `${a.label} · ⚬${VS15} ${a.followers}` : `⚬${VS15} ${a.followers}`}
                </span>
            </span>
        </div>
    );
}

function TraitCard({ t, onGo }: { t: SearchTraitResult; onGo: GoFn }) {
    return (
        <div className="sw-hit sw-tap" role="button" tabIndex={0} onClick={(e) => onGo(e, `/art/${t.project_id}`)}>
            <span className="sw-hit-ic">{`⨝${VS15}`}</span>
            <span className="sw-hit-body">
                <span className="sw-hit-main">{t.value}</span>
                <span className="sw-hit-sub">{`${t.trait_name} · ${t.project_title}`}</span>
            </span>
        </div>
    );
}
