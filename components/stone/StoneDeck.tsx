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
    useEffect,
    useMemo,
    useRef,
    useState,
    type MouseEvent,
} from 'react';
import SpriteFace from '../SpriteFace';
import { projectSpriteFace } from '../../lib/project/projectSprite';
import { useSpriteFace } from '../../lib/hooks/useSpriteFace';
import { fmtFollowers } from '../../lib/social/useArtistSocial';
import { formatEth } from '../../lib/format/eth';
import { paintOutput } from '../../lib/state/ProjectContext';
import { paintAsciiStandin } from '../../lib/art/asciiStandin';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { usePings } from '../../lib/state/PingsContext';
import { projectsByArtist, getProject } from '../../lib/project/registry';
import { pdRarityRank } from '../../lib/output/rarity';
import { usePriceDay } from '../../lib/priceday/usePriceDay';
import { formatPriceDate } from '../../lib/priceday/priceday';
import { CAL_TODAY } from '../../lib/calendar/data';
import { dateKey } from '../../lib/calendar/utils';
import { getTodos, subscribeTodos, datedTodosByDay, type TodoItem } from '../../lib/todos/todoStore';
import { buildWalletMark } from '../../lib/stone/mark';
import { commitEtch } from '../../lib/stone/etch';
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

/** Answer AND act (stage 5) — every card offers its one obvious lever,
    the anchor-offer treatment: the etch chip, one tap, undo-free
    because it never fires without the tap. */
function ActChip({ label, onAct }: { label: string; onAct: () => void }) {
    return (
        <div
            className="stone-etch-chip sw-act"
            role="button"
            tabIndex={0}
            onClick={onAct}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAct(); }
            }}
        >
            {label}
        </div>
    );
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

function CalcWidget({ plan, onAct }: { plan: Extract<WidgetPlan, { kind: 'calc' }>; onAct: ActFn }) {
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
                <SwSay>READING THE FLOOR…</SwSay>
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

    const buy = plan.price ?? floor;
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
            {/* answer AND act — carve the buy as a Sentinel-armed to-do */}
            <ActChip
                label={`❍${VS15} BUY · ${title} · ◊${formatEth(buy)} — etch?`}
                onAct={() => onAct(commitEtch({
                    kind: 'todo-raw',
                    input: { text: `buy ${title}`, priceEth: buy },
                    chip: '',
                }))}
            />
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

function GalleryWidget({ slug, title, onGo, onAct }: {
    slug: string | null; title: string | null; onGo: GoFn; onAct: ActFn;
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
            {/* answer AND act — wishlist the piece on the stage */}
            <ActChip
                label={`✛${VS15} WISHLIST · ${pieceName(title, id)} — etch?`}
                onAct={() => onAct(commitEtch({ kind: 'wishlist', slug, tokenId: id, title, chip: '' }))}
            />
        </div>
    );
}

/* ── MATRIX — the mini table maker: projects × live ledger stats ── */

interface MatrixCol { title: string; proj: SearchProjectResult | null }

function MatrixWidget({ names, onAct }: { names: string[]; onAct: ActFn }) {
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
                <SwSay>ASSEMBLING THE TABLE…</SwSay>
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
            {/* answer AND act — anchor the cheapest floor on the table */}
            {(() => {
                const cheapest = cols
                    .map((c) => c.proj)
                    .filter((p): p is SearchProjectResult => !!p && p.floor_eth != null)
                    .sort((a, b) => (a.floor_eth as number) - (b.floor_eth as number))[0];
                return cheapest ? (
                    <ActChip
                        label={`↧${VS15} ANCHOR · ${cheapest.title} · ◊${formatEth(cheapest.floor_eth as number)} — etch?`}
                        onAct={() => onAct(commitEtch({
                            kind: 'anchor',
                            title: cheapest.title,
                            price: cheapest.floor_eth as number,
                            chip: '',
                        }))}
                    />
                ) : null;
            })()}
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
                <SwSay>OPENING THE BOOKS…</SwSay>
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
                <SwSay>READING THE LEDGER…</SwSay>
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
                <SwSay>READING YOUR LEDGER…</SwSay>
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

/* ── the deck router — one summoned plan, one card ── */

export function WidgetDeck({ plan, address, onGo, onAct }: {
    plan: WidgetPlan;
    address: string;
    onGo: GoFn;
    onAct: ActFn;
}) {
    switch (plan.kind) {
        case 'calendar': return <CalendarWidget />;
        case 'priceday': return <PriceDayWidget />;
        case 'calc': return <CalcWidget plan={plan} onAct={onAct} />;
        case 'dossier': return <DossierWidget name={plan.name} me={address} onGo={onGo} onAct={onAct} />;
        case 'gallery': return <GalleryWidget slug={plan.slug} title={plan.title} onGo={onGo} onAct={onAct} />;
        case 'matrix': return <MatrixWidget names={plan.names} onAct={onAct} />;
        case 'ascii': return <AsciiWidget address={address} />;
        case 'docs': return <DocsWidget query={plan.query} onGo={onGo} />;
        case 'glance': return <GlanceWidget address={address} />;
        case 'trend': return <TrendWidget plan={plan} />;
        case 'wrapped': return <WrappedWidget plan={plan} address={address} />;
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

export function SearchDeck({ r, pageHits, anchorOffer, onAnchor, onGo }: {
    r: SearchResponse | null;
    pageHits: Array<{ label: string; to: string }>;
    anchorOffer: { title: string; price: number } | null;
    onAnchor: () => void;
    onGo: GoFn;
}) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    useEffect(() => { setExpanded({}); }, [r, pageHits]);

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
                    {anchorOffer && (
                        <div className="stone-etch-chip stone-offer-chip" role="button" tabIndex={0} onClick={onAnchor}>
                            {`↧${VS15} anchor it at ◊${anchorOffer.price}?`}
                        </div>
                    )}
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

            {r && r.projects.length > 0 && (
                <>
                    <div className="sw-sect">PROJECTS</div>
                    {r.projects.slice(0, expanded.projects ? undefined : PREVIEW).map((p) => (
                        <ProjectCard key={`p:${p.id}`} p={p} onGo={onGo} />
                    ))}
                    {!expanded.projects && r.projects.length > PREVIEW && (
                        <MoreRow n={r.projects.length - PREVIEW} onClick={() => setExpanded((x) => ({ ...x, projects: true }))} />
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

            {r && r.artworks.length > 0 && (
                <>
                    <div className="sw-sect">OUTPUTS</div>
                    {r.artworks.slice(0, expanded.artworks ? undefined : PREVIEW).map((a) => (
                        <ArtCard key={`a:${a.project_id}:${a.token_id}`} a={a} onGo={onGo} />
                    ))}
                    {!expanded.artworks && r.artworks.length > PREVIEW && (
                        <MoreRow n={r.artworks.length - PREVIEW} onClick={() => setExpanded((x) => ({ ...x, artworks: true }))} />
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
