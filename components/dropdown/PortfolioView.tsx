'use client';

/*
 * PortfolioView
 *
 * Sim parity: portfolioPanel (sim line 4799-4863) + renderPortfolio family.
 *
 * Layout (top → bottom):
 *   ←  back arrow
 *   BUDGETS                                  (settings-header)
 *   [ Real Budget ] [ Dream Budget ] [ + Add ]   (settings-ens-row of pills)
 *   ──── divider ────
 *   PORTFOLIOS                               (settings-header)
 *   EST. 0.00 ETH                            (grand total — visibility-toggled)
 *   [ ☀ Main ] [ ◐ Shadow ] [ $ ]            (portfolio-pills-row)
 *   ┌────────────────────────────────────┐
 *   │ ▾ LONG-FORM  (5)                   │
 *   │   ▾ @claude  (1)                   │
 *   │     ▾ Strata  ·  0.015E floor      │
 *   │       #1  #2  #3  #22  #67  …       │
 *   │   ▸ @snowfro                        │
 *   │   ▸ …                               │
 *   │ ▸ STICKER                          │
 *   │ ▸ ENS                              │
 *   └────────────────────────────────────┘
 *   [ type to filter ]
 *   [ Long-Form ] [ Stickers ] [ ENS ]      (filter pills)
 *
 * Behavior:
 *   - Tabs: 'portfolio' (Main, default active) | 'shadow' | $ ($ toggles
 *     the dollar-est visibility — the grand total + per-collection floor
 *     subtotals get visibility:hidden when off, layout preserved).
 *   - Expand/collapse: click a category, artist, or collection row to
 *     expand its children. State held in expanded-keys Set.
 *   - Token chips: click a token chip to fire showToast('Token coming
 *     soon — Strata #67') as a placeholder until token modal lands.
 *   - Filters: pill toggles the category visibility; multiple chips
 *     OR within their group; if no chips active, show all categories.
 *     Search narrows by case-insensitive substring on artist or
 *     collection name (sim's filterPortfolio behaviour).
 *
 * Budgets section (sim parity, line 11183 + 11887):
 *   - State shape: { list: { name, eth }[], activeIdx: number (-1 = none) }
 *   - Persisted to localStorage 'pd_budgets'
 *   - No presets — list starts empty; user adds budgets via "+ Add"
 *   - "+ Add" opens ValuePrompt (NEW BUDGET — name + ETH)
 *   - On add, the new budget auto-activates (sim line 11903)
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

function formatEth(v: number): string {
    if (v >= 100) return v.toFixed(0);
    if (v >= 10) return v.toFixed(1);
    return v.toFixed(3);
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

    // Track expanded keys. Top-level cats default expanded; artists +
    // collections start collapsed. Keys: 'cat:LONG-FORM', 'art:LONG-FORM:@claude',
    // 'col:LONG-FORM:@claude:Strata'.
    const [expanded, setExpanded] = useState<Set<string>>(
        () => new Set(['cat:LONG-FORM', 'cat:STICKER', 'cat:ENS'])
    );
    const isExpanded = (k: string) => expanded.has(k);
    const toggleExpand = (k: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(k)) next.delete(k);
            else next.add(k);
            return next;
        });
    };

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
                    const title = `${b.name} — ${formatEth(b.eth)} ETH`;
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
                EST. {formatEth(grandTotal)} ETH
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
            <div id="portfolioList" className="portfolio-list-container">
                {visibleCats.length === 0 ? (
                    <div
                        style={{
                            padding: '15px 10px',
                            fontSize: 12,
                            opacity: 0.5,
                            textAlign: 'center',
                        }}
                    >
                        No matches found.
                    </div>
                ) : (
                    visibleCats.map((cat) => {
                        const catKey = `cat:${cat.name}`;
                        const catOpen = isExpanded(catKey);
                        const catCount =
                            cat.type === 'tree'
                                ? cat.artists.reduce(
                                      (s, a) =>
                                          s + a.collections.reduce((ss, c) => ss + c.tokens.length, 0),
                                      0
                                  )
                                : cat.names.length;
                        return (
                            <div key={cat.name} className="pf-cat">
                                <div
                                    className="pf-cat-row"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => toggleExpand(catKey)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            toggleExpand(catKey);
                                        }
                                    }}
                                >
                                    <span className="pf-caret">
                                        {catOpen ? '\u25BE\uFE0E' : '\u25B8\uFE0E'}
                                    </span>
                                    <span className="pf-cat-name">{cat.name}</span>
                                    <span className="pf-cat-count">({catCount})</span>
                                </div>
                                {catOpen && cat.type === 'tree' && (
                                    <div className="pf-cat-body">
                                        {cat.artists.map((art) => {
                                            const artKey = `art:${cat.name}:${art.name}`;
                                            const artOpen = isExpanded(artKey);
                                            const artCount = art.collections.reduce(
                                                (s, c) => s + c.tokens.length,
                                                0
                                            );
                                            return (
                                                <div key={art.name} className="pf-art">
                                                    <div
                                                        className="pf-art-row"
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => toggleExpand(artKey)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                toggleExpand(artKey);
                                                            }
                                                        }}
                                                    >
                                                        <span className="pf-caret">
                                                            {artOpen
                                                                ? '\u25BE\uFE0E'
                                                                : '\u25B8\uFE0E'}
                                                        </span>
                                                        <span className="pf-art-name">
                                                            {art.name}
                                                        </span>
                                                        <span className="pf-art-count">
                                                            ({artCount})
                                                        </span>
                                                    </div>
                                                    {artOpen && (
                                                        <div className="pf-art-body">
                                                            {art.collections.map((col) => {
                                                                const colKey = `col:${cat.name}:${art.name}:${col.name}`;
                                                                const colOpen = isExpanded(colKey);
                                                                return (
                                                                    <div
                                                                        key={col.name}
                                                                        className="pf-col"
                                                                    >
                                                                        <div
                                                                            className="pf-col-row"
                                                                            role="button"
                                                                            tabIndex={0}
                                                                            onClick={() =>
                                                                                toggleExpand(colKey)
                                                                            }
                                                                            onKeyDown={(e) => {
                                                                                if (
                                                                                    e.key === 'Enter' ||
                                                                                    e.key === ' '
                                                                                ) {
                                                                                    e.preventDefault();
                                                                                    toggleExpand(colKey);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <span className="pf-caret">
                                                                                {colOpen
                                                                                    ? '\u25BE\uFE0E'
                                                                                    : '\u25B8\uFE0E'}
                                                                            </span>
                                                                            <span className="pf-col-name">
                                                                                {col.name}
                                                                            </span>
                                                                            <span
                                                                                className="pf-col-floor"
                                                                                style={{
                                                                                    visibility: showDollar
                                                                                        ? 'visible'
                                                                                        : 'hidden',
                                                                                }}
                                                                            >
                                                                                {' · '}
                                                                                {formatEth(col.floor)}E floor
                                                                            </span>
                                                                            <span className="pf-col-count">
                                                                                ({col.tokens.length})
                                                                            </span>
                                                                        </div>
                                                                        {colOpen && (
                                                                            <div className="pf-tokens">
                                                                                {col.tokens.map((t) => (
                                                                                    <span
                                                                                        key={t}
                                                                                        className="pf-token-chip"
                                                                                        role="button"
                                                                                        tabIndex={0}
                                                                                        onClick={() =>
                                                                                            showToast(
                                                                                                `Token coming soon — ${col.name} #${t}`
                                                                                            )
                                                                                        }
                                                                                        onKeyDown={(e) => {
                                                                                            if (
                                                                                                e.key === 'Enter' ||
                                                                                                e.key === ' '
                                                                                            ) {
                                                                                                e.preventDefault();
                                                                                                showToast(
                                                                                                    `Token coming soon — ${col.name} #${t}`
                                                                                                );
                                                                                            }
                                                                                        }}
                                                                                    >
                                                                                        #{t}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {catOpen && cat.type === 'flat' && (
                                    <div className="pf-cat-body">
                                        {cat.names.map((n) => (
                                            <div
                                                key={n.label}
                                                className="pf-ens-row"
                                                role="button"
                                                tabIndex={0}
                                                onClick={() =>
                                                    showToast(`ENS coming soon — ${n.label}`)
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        showToast(`ENS coming soon — ${n.label}`);
                                                    }
                                                }}
                                            >
                                                <span className="pf-ens-label">{n.label}</span>
                                                <span
                                                    className="pf-ens-price"
                                                    style={{
                                                        visibility: showDollar ? 'visible' : 'hidden',
                                                    }}
                                                >
                                                    {formatEth(n.price)}E
                                                </span>
                                            </div>
                                        ))}
                                    </div>
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
