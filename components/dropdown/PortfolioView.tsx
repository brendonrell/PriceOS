'use client';

/*
 * PortfolioView
 *
 * Sim parity: portfolioPanel (sim 4807-4862) + renderPortfolio family
 * (sim 10927-11030). F58 (BUG-25) — render layer below BUDGETS rewritten
 * to sim's vocabulary verbatim. Flat full render — sim has no expand
 * /collapse, no carets, no count badges, no token chips. The whole tree
 * renders unconditionally; .pf-leader dotted lines fill the space between
 * label and price on leaf rows (.pf-artwork + .pf-ens-row) per sim's
 * book-TOC pattern (sim 1944-1963).
 *
 * Layout (top → bottom):
 *   ←  back arrow
 *   BUDGETS                                  (settings-header)
 *   [ Real Budget ] [ Dream Budget ] [ + Add ]   (settings-ens-row of pills)
 *   ──── divider ────
 *   PORTFOLIOS                               (settings-header)
 *   EST. 0.00 ETH                            (.portfolio-grand-total)
 *   [ ☀ Main ] [ ◐ Shadow ] [ $ ]            (.portfolio-pills-row)
 *   ┌────────────────────────────────────┐
 *   │ ➔ LONG-FORM                  12.50 │   .pf-cat > .pf-cat-head + .pf-est
 *   │   @claude                     1.50 │   .pf-artist
 *   │     Strata                    1.50 │   .pf-collection
 *   │       #1  ··················· 0.015│   .pf-artwork + .pf-leader
 *   │       #2  ··················· 0.015│
 *   │   @snowfro                    8.00 │
 *   │     Squiggle                  8.00 │
 *   │       #56 ··················· 8.00 │
 *   │ ➔ STICKERS                    0.50 │
 *   │   @petey                      0.50 │
 *   │     Stickers                  0.50 │
 *   │       #1  ··················· 0.10 │
 *   │ ➔ ENS                         3.00 │
 *   │   brendon.eth ··············· 1.00 │   .pf-ens-row
 *   │   pricediscussion.eth ······· 2.00 │
 *   └────────────────────────────────────┘
 *   [ type to filter ]
 *   [ Long-Form ] [ Stickers ] [ ENS ]      (filter pills)
 *
 * Behavior:
 *   - Tabs: 'portfolio' (Main, default active) | 'shadow' | $ ($ toggles
 *     the .pf-est visibility globally — when off, sim simply omits the
 *     .pf-est spans from the rendered tree; the grand total uses
 *     visibility:hidden so layout height is preserved).
 *   - No expand/collapse. The whole tree renders flat. Per sim 10927-
 *     11030 — there is no expanded state in sim's renderPortfolio.
 *   - Filters: pill toggles the category visibility; multiple chips
 *     OR within their group; if no chips active, show all categories.
 *     Search narrows by case-insensitive substring on artist or
 *     collection name (sim's filterPortfolio behaviour).
 *
 * Budgets section (F57 — sim 11183 + 11887, untouched by F58):
 *   - State shape: { list: { name, eth }[], activeIdx: number (-1 = none) }
 *   - Persisted to localStorage 'pd_budgets' (engine owns this)
 *   - No presets — list starts empty; user adds budgets via "+ Add"
 *   - "+ Add" opens ValuePrompt (NEW BUDGET — name + ETH)
 *   - On add, the new budget auto-activates (sim 11903)
 *   - Tap an active budget to deactivate; tap a different budget to switch
 *   - Long-press to delete: deferred (not in scope this round)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDropdown } from '../../lib/state/DropdownContext';
import { useToast } from '../../lib/state/ToastContext';
import { useValuePrompt } from '../../lib/state/ValuePromptContext';
import { useLocalStorage } from '../../lib/hooks/useLocalStorage';
import {
    PORTFOLIO_DATA,
    sumPortfolioValue,
    type PortfolioTab,
    type PortfolioCategory,
    type PortfolioCollection,
} from '../../lib/data/mockPortfolio';
import {
    addBudget as engineAddBudget,
    getBudgets,
    subscribeBudgets,
    toggleActiveBudget,
    type BudgetsState,
} from '../../lib/engines/budgetEngine';

type CategoryFilter = 'LONG-FORM' | 'STICKER' | 'ENS';
const FILTER_PILLS: { key: CategoryFilter; label: string }[] = [
    { key: 'LONG-FORM', label: 'Long-Form' },
    { key: 'STICKER',   label: 'Stickers' },
    { key: 'ENS',       label: 'ENS' },
];

/* Sim's _pfFmtEth (sim 10863-10867). >=1 → 2 decimals; <1 → up to 3
   decimals with trailing zeros stripped via parseFloat. Always suffixed
   with " ETH". Used for grand total + every .pf-est slot. */
function pfFmtEth(eth: number): string {
    if (eth >= 1) return eth.toFixed(2) + ' ETH';
    return parseFloat(eth.toFixed(3)) + ' ETH';
}

export function PortfolioView() {
    const { setView } = useDropdown();
    const { showToast } = useToast();
    const { openValuePrompt } = useValuePrompt();

    const [tab, setTab] = useState<PortfolioTab>('portfolio');
    const [showDollar, setShowDollar] = useLocalStorage<boolean>(
        'pd_portfolio_show_dollar',
        true
    );
    const [budgets, setBudgets] = useState<BudgetsState>(() => getBudgets());
    /* F57 (BUG-10) — subscribe to budgetEngine. The engine owns
       persistence (`pd_budgets` localStorage key), the body.budget-active
       toggle, and the .in-budget per-card class drive (via ArtworkCard
       subscribers). PortfolioView dispatches state changes through engine
       functions; the subscribe-on-mount keeps the pill row in sync if
       another surface (or another tab) mutates the store. */
    useEffect(() => {
        setBudgets(getBudgets());
        return subscribeBudgets((next) => setBudgets(next));
    }, []);
    const [search, setSearch] = useState('');
    const [activeCats, setActiveCats] = useState<Set<CategoryFilter>>(new Set());

    // Sim has no expand/collapse — the entire tree renders flat. F58
    // dropped the expanded-keys Set and toggleExpand callback that the
    // pre-F58 port carried over from a tree-widget pattern that didn't
    // exist in sim. See sim 10927-11030 — every artist + collection +
    // artwork is emitted unconditionally.

    const grandTotal = useMemo(() => sumPortfolioValue(tab), [tab]);

    /**
     * Toggle a budget at index `idx`. If it's already active, deactivate
     * (-1). Otherwise switch to it. Mirrors sim 11941-11947 budgetPillClick.
     * F57 — dispatches through engine; the subscribe effect re-mirrors
     * local state. Toast text matches sim 11947 verbatim.
     */
    const toggleBudget = useCallback(
        (idx: number) => {
            const isActive = budgets.activeIdx === idx;
            const label = budgets.list[idx]?.name ?? '';
            toggleActiveBudget(idx);
            showToast(isActive ? 'Budget OFF' : `Budget: ${label}`);
        },
        [budgets, showToast]
    );

    /**
     * Open the value-prompt to add a new budget. Title + help + fields
     * mirror sim 11888-11899 verbatim. On submit, validate (non-empty name
     * + positive finite ETH), engine appends + auto-activates (sim 11903).
     */
    const addBudget = useCallback(() => {
        openValuePrompt({
            title: 'NEW BUDGET',
            help: 'Set an ETH cap. Listings at or below this price get a subtle in-reach treatment across every collection.',
            fields: [
                { label: 'NAME', placeholder: 'e.g. Real Budget' },
                { label: 'ETH', placeholder: '0.25', inputmode: 'decimal' },
            ],
            submit: 'Add',
            onSubmit: (vals) => {
                if (!vals) return;
                const name = (vals[0] || '').trim();
                if (!name) {
                    showToast('Name required');
                    return;
                }
                const v = parseFloat(vals[1] || '');
                if (!(v > 0) || !isFinite(v)) {
                    showToast('Invalid ETH amount');
                    return;
                }
                engineAddBudget(name, v);
                showToast(`Budget added: ${name}`);
            },
        });
    }, [openValuePrompt, showToast]);

    const toggleCatFilter = useCallback((k: CategoryFilter) => {
        setActiveCats((prev) => {
            const next = new Set(prev);
            if (next.has(k)) next.delete(k);
            else next.add(k);
            return next;
        });
    }, []);

    // Apply filters to categories.
    const visibleCats: PortfolioCategory[] = useMemo(() => {
        const cats = PORTFOLIO_DATA[tab];
        const searchLower = search.toLowerCase();
        return cats
            .filter((cat) => activeCats.size === 0 || activeCats.has(cat.name as CategoryFilter))
            .map((cat) => {
                if (!searchLower) return cat;
                if (cat.type === 'tree') {
                    const filteredArtists = cat.artists
                        .map((a) => ({
                            ...a,
                            collections: a.collections.filter((c) =>
                                c.name.toLowerCase().includes(searchLower) ||
                                a.name.toLowerCase().includes(searchLower)
                            ),
                        }))
                        .filter((a) => a.collections.length > 0);
                    return { ...cat, artists: filteredArtists } as PortfolioCategory;
                }
                return {
                    ...cat,
                    names: cat.names.filter((n) =>
                        n.label.toLowerCase().includes(searchLower)
                    ),
                } as PortfolioCategory;
            })
            .filter((cat) => {
                if (cat.type === 'tree') return cat.artists.length > 0;
                return cat.names.length > 0;
            });
    }, [tab, search, activeCats]);

    return (
        <div
            id="portfolioPanel"
            className="settings-panel"
            style={{ position: 'relative' }}
        >
            <div
                className="scroll-arrow"
                style={{ flexShrink: 0, padding: '4px 10px 0 10px', fontSize: 18 }}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                    e.stopPropagation();
                    setView('links');
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        setView('links');
                    }
                }}
                title="Back"
            >
                {'\u2190\uFE0E'}
            </div>

            {/* ── BUDGETS ─────────────────────────────────────────── */}
            <div className="settings-header" style={{ flexShrink: 0 }}>
                BUDGETS
            </div>
            <div className="settings-ens-row" id="budgetsRow" style={{ flexShrink: 0 }}>
                {budgets.list.map((b, i) => {
                    const isActive = i === budgets.activeIdx;
                    const title = `${b.name} — ${pfFmtEth(b.eth)}`;
                    return (
                        <div
                            key={`${b.name}-${i}`}
                            className={`pill-ens${isActive ? ' active' : ''}`}
                            role="button"
                            tabIndex={0}
                            title={title}
                            onClick={() => toggleBudget(i)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleBudget(i);
                                }
                            }}
                        >
                            {b.name}
                        </div>
                    );
                })}
                <div
                    className="pill-ens pill-budget-add"
                    role="button"
                    tabIndex={0}
                    onClick={addBudget}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            addBudget();
                        }
                    }}
                    title="Add budget"
                >
                    + Add
                </div>
            </div>
            <div className="dropdown-divider" style={{ flexShrink: 0 }} />

            {/* ── PORTFOLIOS ─────────────────────────────────────── */}
            <div
                className="settings-header"
                style={{ flexShrink: 0 }}
                id="portfolioHeaderLabel"
            >
                PORTFOLIOS
            </div>

            <div
                className="portfolio-grand-total"
                id="portfolioGrandTotal"
                style={{
                    visibility: showDollar ? 'visible' : 'hidden',
                }}
            >
                EST. {pfFmtEth(grandTotal)}
            </div>

            <div className="portfolio-pills-row">
                <div
                    className={`portfolio-main-pill${tab === 'portfolio' ? ' active' : ''}`}
                    id="portfolioMainPill"
                    role="button"
                    tabIndex={0}
                    onClick={() => setTab('portfolio')}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setTab('portfolio');
                        }
                    }}
                    title="Main Portfolio"
                >
                    <span className="main-glyph">{'\u2600\uFE0E'}</span>
                    <span>Main</span>
                </div>
                <div
                    className={`portfolio-shadow-pill${tab === 'shadow' ? ' active' : ''}`}
                    id="portfolioShadowPill"
                    role="button"
                    tabIndex={0}
                    onClick={() => setTab('shadow')}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setTab('shadow');
                        }
                    }}
                    title="Shadow Portfolio"
                >
                    <span className="shadow-glyph">{'\u25D0\uFE0E'}</span>
                    <span>Shadow</span>
                </div>
                <div
                    className={`portfolio-dollar-toggle${showDollar ? ' active' : ''}`}
                    id="portfolioDollarToggle"
                    role="button"
                    tabIndex={0}
                    onClick={() => setShowDollar((v) => !v)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setShowDollar((v) => !v);
                        }
                    }}
                    title="Toggle floor-based value estimates"
                >
                    $
                </div>
            </div>

            {/* ── TREE ──────────────────────────────────────────── */}
            {/* Sim 10927-11030 verbatim port. Flat full render — no
               expand/collapse. .pf-cat header is .pf-cat-head (➔ glyph +
               .pf-label) plus optional .pf-est (when showDollar). Tree
               cats emit .pf-artist → .pf-collection → .pf-artwork rows.
               Flat (ENS) cats emit .pf-ens-row. Leaf rows (.pf-artwork +
               .pf-ens-row) carry .pf-leader between label and price for
               the book-TOC dotted line (sim 1944-1963). */}
            <div id="portfolioList" className="portfolio-list-container">
                {visibleCats.length === 0 ? (
                    <div className="pf-empty">
                        {search || activeCats.size > 0 ? 'No matches.' : 'Nothing here yet.'}
                    </div>
                ) : (
                    visibleCats.map((cat) => {
                        // Sim 10984: STICKER renders as STICKERS (plural parity).
                        const catLabel = cat.name === 'STICKER' ? 'STICKERS' : cat.name;
                        // Sim 10913-10926: catSum = floor*tokens for tree, sum of
                        // names[].price for flat.
                        const catEst =
                            cat.type === 'tree'
                                ? cat.artists.reduce(
                                      (s, a) =>
                                          s +
                                          a.collections.reduce(
                                              (ss, c) => ss + (c.floor || 0) * c.tokens.length,
                                              0
                                          ),
                                      0
                                  )
                                : cat.names.reduce((s, n) => s + (n.price || 0), 0);
                        return (
                            <div key={cat.name} className="pf-cat">
                                <span className="pf-cat-head">
                                    <span className="pf-cat-glyph">{'\u2794\uFE0E'}</span>
                                    <span className="pf-label">{catLabel}</span>
                                </span>
                                {showDollar && (
                                    <span className="pf-est" style={{ marginLeft: 'auto' }}>
                                        {pfFmtEth(catEst)}
                                    </span>
                                )}
                                {cat.type === 'tree' ? (
                                    <>
                                        {cat.artists.map((art) => {
                                            // Sim 11005-11009: artistSum = sum of floor*tokens.
                                            const artistSum = art.collections.reduce(
                                                (s, c) => s + (c.floor || 0) * c.tokens.length,
                                                0
                                            );
                                            return (
                                                <PortfolioArtistRows
                                                    key={art.name}
                                                    artistName={art.name}
                                                    artistSum={artistSum}
                                                    showDollar={showDollar}
                                                    collections={art.collections}
                                                />
                                            );
                                        })}
                                    </>
                                ) : (
                                    <>
                                        {cat.names.map((n) => (
                                            <div key={n.label} className="pf-ens-row">
                                                <span className="pf-label">{n.label}</span>
                                                <span className="pf-leader" />
                                                {showDollar && (
                                                    <span className="pf-est">
                                                        {pfFmtEth(n.price)}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* ── FILTERS ──────────────────────────────────────── */}
            <div className="portfolio-filter-sticky">
                <input
                    type="text"
                    id="portfolioSearchInput"
                    placeholder="[ type to filter ]"
                    autoComplete="off"
                    spellCheck={false}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <div className="portfolio-filter-pills">
                    {FILTER_PILLS.map((p) => (
                        <div
                            key={p.key}
                            className={`pill-portfolio-filter${
                                activeCats.has(p.key) ? ' active' : ''
                            }`}
                            data-cat={p.key}
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleCatFilter(p.key)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleCatFilter(p.key);
                                }
                            }}
                        >
                            {p.label}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/**
 * Renders one artist's full subtree per sim 10996-11026: a .pf-artist
 * header row (label + est) followed by all of the artist's .pf-collection
 * rows, each followed by all of that collection's .pf-artwork rows. No
 * expand/collapse — sim emits everything unconditionally. Pulled out of
 * the parent JSX so the nesting stays readable.
 */
function PortfolioArtistRows({
    artistName,
    artistSum,
    showDollar,
    collections,
}: {
    artistName: string;
    artistSum: number;
    showDollar: boolean;
    collections: PortfolioCollection[];
}) {
    return (
        <>
            <div className="pf-artist">
                <span className="pf-label">{artistName}</span>
                {showDollar && (
                    <span className="pf-est" style={{ marginLeft: 'auto' }}>
                        {pfFmtEth(artistSum)}
                    </span>
                )}
            </div>
            {collections.map((coll) => {
                // Sim 11011: collSum = floor * tokens.length.
                const collSum = (coll.floor || 0) * coll.tokens.length;
                return (
                    <div key={coll.name}>
                        <div className="pf-collection">
                            <span className="pf-label">{coll.name}</span>
                            {showDollar && (
                                <span className="pf-est" style={{ marginLeft: 'auto' }}>
                                    {pfFmtEth(collSum)}
                                </span>
                            )}
                        </div>
                        {coll.tokens.map((tid) => (
                            <div key={tid} className="pf-artwork">
                                <span className="pf-label">#{tid}</span>
                                <span className="pf-leader" />
                                {showDollar && (
                                    <span className="pf-est">
                                        {pfFmtEth(coll.floor)}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                );
            })}
        </>
    );
}
