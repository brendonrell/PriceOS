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
 *   │     Strata                    1.50 │   .pf-project
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
 *     project name (sim's filterPortfolio behaviour).
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

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { formatEth } from '../../lib/format/eth';
import { useDropdown } from '../../lib/state/DropdownContext';
import { useToast } from '../../lib/state/ToastContext';
import { useValuePrompt } from '../../lib/state/ValuePromptContext';
import type { ValuePromptField } from '../../lib/state/ValuePromptContext';
import { useLocalStorage } from '../../lib/hooks/useLocalStorage';
import {
    type PortfolioTab,
    type PortfolioCategory,
    type PortfolioProject,
} from '../../lib/portfolio/types';
import {
    buildLivePortfolio,
    emptyPortfolio,
    sumPortfolioCats,
    type PortfolioHolding,
    type PortfolioValueMode,
} from '../../lib/portfolio/livePortfolio';
import { useAuth } from '../../lib/state/AuthContext';
import {
    addBudget as engineAddBudget,
    deleteBudget as engineDeleteBudget,
    updateBudget as engineUpdateBudget,
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

/* The $-button cycle (Brendon 2026-06-25): tap advances the per-piece valuation
   floor → last sold → 10-sale avg → ATH (for fun) → mint → off → floor.
   'off' hides the value readouts (the old $-toggle's off state). */
const PRICE_MODES: PortfolioValueMode[] = ['floor', 'last', 'avg10', 'ath', 'mint', 'off'];
const PRICE_MODE_LABEL: Record<PortfolioValueMode, string> = {
    floor: 'FLOOR',
    last:  'LAST SOLD',
    avg10: '10-SALE AVG',
    ath:   'ATH',
    mint:  'MINT PRICE',
    off:   'OFF',
};

/* ETH amount for the grand total + every .pf-est slot. The numeric value
   follows the site's 4-digit ETH display rule (formatEth); always suffixed
   with " ETH". */
function pfFmtEth(eth: number): string {
    return formatEth(eth) + ' ETH';
}

export function PortfolioView() {
    const { setView } = useDropdown();
    const { showToast } = useToast();
    const { openValuePrompt } = useValuePrompt();

    const [tab, setTab] = useState<PortfolioTab>('portfolio');
    /* $-button value mode (persisted). 'off' = hide values — equivalent to the
       old $-toggle's off state, so every existing `showDollar` gate is driven
       off this one derived flag. */
    const [priceMode, setPriceMode] = useLocalStorage<PortfolioValueMode>(
        'pd_portfolio_price_mode',
        'floor'
    );
    const showDollar = priceMode !== 'off';

    /* Grouping toggle beside the $ button (Brendon 2026-06-25): the artist
       badge (✺) = group by artist → project → pieces (the current/default
       view); the project square (⬚) = a flat A–Z list of projects. Exactly
       one is active. Glyphs are the canonical gallery grouping glyphs (GLYPHS
       §4). */
    const [groupMode, setGroupMode] = useLocalStorage<'artist' | 'project'>(
        'pd_portfolio_group_mode',
        'artist'
    );

    /* Live portfolio — the logged-in wallet's REAL holdings + ENS, replacing the
       mock (Brendon, 2026-06-25). Works for any logged-in user (their own
       wallet). Holdings via the same outputs route the profile grid uses; ENS
       name off the user row. Shadow tab has no real dataset → empty. */
    const { siweAddress } = useAuth();
    const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
    const [ensName, setEnsName] = useState<string | null>(null);
    useEffect(() => {
        const addr = siweAddress?.toLowerCase();
        if (!addr) { setHoldings([]); setEnsName(null); return; }
        let cancelled = false;
        fetch(`/api/user/${addr}/outputs`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (cancelled || !Array.isArray(d?.holdings)) return;
                setHoldings(d.holdings.map((h: { slug: string; token_id: number }) => ({ slug: h.slug, token_id: h.token_id })));
            })
            .catch(() => {});
        fetch(`/api/user/${addr}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (!cancelled) setEnsName(d?.ens_name ?? null); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [siweAddress]);
    const liveCats = useMemo<PortfolioCategory[]>(
        () => (tab === 'portfolio' ? buildLivePortfolio(holdings, ensName, priceMode) : emptyPortfolio()),
        [tab, holdings, ensName, priceMode],
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

    /* Budget row expand/collapse — same 2-row scroll system as ENS. */
    const [budgetsExpanded, setBudgetsExpanded] = useState(false);
    /* Show …more when there are more than 2 budget pills (+ Add takes
       one slot in the collapsed 3-item cap, so 2 budget pills fill rows). */
    const showBudgetMore = budgets.list.length > 2;
    /* Collapsed: first 2 budget pills (+ Add is always prepended below). */
    const collapsedBudgets = budgets.list.slice(0, 2);
    /* Expanded split: ceil(N/2) to row 1, rest to row 2. */
    const budgetSplitIndex = Math.ceil(budgets.list.length / 2);
    const budgetPillsRow1 = budgets.list.slice(0, budgetSplitIndex);
    const budgetPillsRow2 = budgets.list.slice(budgetSplitIndex);
    const [search, setSearch] = useState('');
    const [activeCats, setActiveCats] = useState<Set<CategoryFilter>>(new Set());
    const [portfolioHidden, setPortfolioHidden] = useLocalStorage<boolean>(
        'pd_portfolio_hidden',
        false
    );

    // Sim has no expand/collapse — the entire tree renders flat. F58
    // dropped the expanded-keys Set and toggleExpand callback that the
    // pre-F58 port carried over from a tree-widget pattern that didn't
    // exist in sim. See sim 10927-11030 — every artist + project +
    // artwork is emitted unconditionally.

    /* When portfolio is hidden, replace financial values with stars.
       Structure (categories, artists, project names, token IDs) stays
       visible — only numbers and budget names are starred (phase 1). */
    const pfHide = (val: string) => (portfolioHidden ? '***' : val);

    const grandTotal = useMemo(() => sumPortfolioCats(liveCats), [liveCats]);

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
            showToast(isActive ? 'Budget: OFF' : `Budget: ${label}`);
        },
        [budgets, showToast]
    );

    const deleteBudget = useCallback(
        (idx: number) => {
            const label = budgets.list[idx]?.name ?? '';
            openValuePrompt({
                title: `Delete budget <em>${label}</em>?`,
                fields: [] as ValuePromptField[],
                submit: 'Delete',
                onSubmit: (vals) => {
                    if (!vals) return; // cancelled
                    engineDeleteBudget(idx);
                    showToast(`"${label}" Budget: DELETED`);
                },
            });
        },
        [budgets, openValuePrompt, showToast]
    );

    const editBudget = useCallback(
        (idx: number) => {
            const b = budgets.list[idx];
            if (!b) return;
            openValuePrompt({
                title: 'EDIT BUDGET',
                help: 'Update the name or ETH cap for this budget.',
                fields: [
                    { label: 'NAME', placeholder: 'e.g. Real Budget', value: b.name },
                    { label: 'ETH', placeholder: '0.25', inputmode: 'decimal', value: String(b.eth) },
                ],
                submit: 'Save',
                onSubmit: (vals) => {
                    if (!vals) return;
                    const name = (vals[0] || '').trim();
                    if (!name) { showToast('Name: REQUIRED'); return; }
                    const v = parseFloat(vals[1] || '');
                    if (!(v > 0) || !isFinite(v)) { showToast('ETH Amount: INVALID'); return; }
                    engineUpdateBudget(idx, name, v);
                    showToast(`Budget Updated: ${name}`);
                },
            });
        },
        [budgets, openValuePrompt, showToast]
    );

    /**
     * Open the value-prompt to add a new budget. Title + help + fields
     * mirror sim 11888-11899 verbatim. On submit, validate (non-empty name
     * + positive finite ETH), engine appends + auto-activates (sim 11903).
     */
    const addBudget = useCallback(() => {
        openValuePrompt({
            title: 'NEW BUDGET',
            help: 'Set an ETH cap. Listings at or below this price get a subtle in-reach treatment across every project.',
            fields: [
                { label: 'NAME', placeholder: 'e.g. Real Budget' },
                { label: 'ETH', placeholder: '0.25', inputmode: 'decimal' },
            ],
            submit: 'Add',
            onSubmit: (vals) => {
                if (!vals) return;
                const name = (vals[0] || '').trim();
                if (!name) {
                    showToast('Name: REQUIRED');
                    return;
                }
                const v = parseFloat(vals[1] || '');
                if (!(v > 0) || !isFinite(v)) {
                    showToast('ETH Amount: INVALID');
                    return;
                }
                engineAddBudget(name, v);
                showToast(`Budget Added: ${name}`);
            },
        });
    }, [openValuePrompt, showToast]);

    /* Advance the $-button through floor → last → avg10 → ATH → mint → off.
       Toast names the new mode (the changed thing gets the ALLCAPS). */
    const cyclePriceMode = useCallback(() => {
        const idx = PRICE_MODES.indexOf(priceMode);
        const next = PRICE_MODES[(idx + 1) % PRICE_MODES.length];
        setPriceMode(next);
        showToast('Estimates: ' + PRICE_MODE_LABEL[next]);
    }, [priceMode, setPriceMode, showToast]);

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
        const cats = liveCats;
        const searchLower = search.toLowerCase();
        return cats
            .filter((cat) => activeCats.size === 0 || activeCats.has(cat.name as CategoryFilter))
            .map((cat) => {
                if (!searchLower) return cat;
                if (cat.type === 'tree') {
                    const filteredArtists = cat.artists
                        .map((a) => ({
                            ...a,
                            projects: a.projects.filter((c) =>
                                c.name.toLowerCase().includes(searchLower) ||
                                a.name.toLowerCase().includes(searchLower)
                            ),
                        }))
                        .filter((a) => a.projects.length > 0);
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
    }, [liveCats, search, activeCats]);

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
            <div
                className={`settings-ens-row${budgetsExpanded ? ' ens-expanded' : ''}`}
                id="budgetsRow"
                style={{ flexShrink: 0 }}
            >
                {budgetsExpanded ? (
                    <>
                        <div className="ens-scroll-viewport">
                            <div className="ens-scroll-stack">
                                <div className="ens-scroll-row">
                                    {/* + Add always leads row 1 in expanded state */}
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
                                    {budgetPillsRow1.map((b, i) => {
                                        const isActive = i === budgets.activeIdx;
                                        return (
                                            <div
                                                key={`${b.name}-${i}`}
                                                className={`pill-ens pill-budget${isActive ? ' active' : ''}`}
                                                role="button"
                                                tabIndex={0}
                                                title={`${pfHide(b.name)} — ${pfHide(pfFmtEth(b.eth))}`}
                                                onClick={() => toggleBudget(i)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        toggleBudget(i);
                                                    }
                                                }}
                                            >
                                                {pfHide(b.name)}
                                                <span className="pill-budget-eth">{pfHide(pfFmtEth(b.eth))}</span>
                                                <span
                                                    className="pill-budget-edit"
                                                    title="Edit budget"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        editBudget(i);
                                                    }}
                                                >{'\u270e\ufe0e'}</span>
                                                <span
                                                    className="pill-budget-delete"
                                                    title="Delete budget"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteBudget(i);
                                                    }}
                                                >×</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="ens-scroll-row">
                                    {budgetPillsRow2.map((b, i) => {
                                        const realIdx = budgetSplitIndex + i;
                                        const isActive = realIdx === budgets.activeIdx;
                                        return (
                                            <div
                                                key={`${b.name}-${realIdx}`}
                                                className={`pill-ens pill-budget${isActive ? ' active' : ''}`}
                                                role="button"
                                                tabIndex={0}
                                                title={`${pfHide(b.name)} — ${pfHide(pfFmtEth(b.eth))}`}
                                                onClick={() => toggleBudget(realIdx)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        toggleBudget(realIdx);
                                                    }
                                                }}
                                            >
                                                {pfHide(b.name)}
                                                <span className="pill-budget-eth">{pfHide(pfFmtEth(b.eth))}</span>
                                                <span
                                                    className="pill-budget-edit"
                                                    title="Edit budget"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        editBudget(realIdx);
                                                    }}
                                                >{'\u270e\ufe0e'}</span>
                                                <span
                                                    className="pill-budget-delete"
                                                    title="Delete budget"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteBudget(realIdx);
                                                    }}
                                                >×</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        {showBudgetMore && (
                            <button
                                type="button"
                                className="ens-more-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setBudgetsExpanded(false);
                                }}
                                title="Collapse budget list"
                            >
                                …hide
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        {/* + Add always pinned first */}
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
                        {collapsedBudgets.map((b, i) => {
                            const isActive = i === budgets.activeIdx;
                            return (
                                <div
                                    key={`${b.name}-${i}`}
                                    className={`pill-ens pill-budget${isActive ? ' active' : ''}`}
                                    role="button"
                                    tabIndex={0}
                                    title={`${pfHide(b.name)} — ${pfHide(pfFmtEth(b.eth))}`}
                                    onClick={() => toggleBudget(i)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            toggleBudget(i);
                                        }
                                    }}
                                >
                                    {pfHide(b.name)}
                                    <span className="pill-budget-eth">{pfHide(pfFmtEth(b.eth))}</span>
                                    <span
                                        className="pill-budget-edit"
                                        title="Edit budget"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            editBudget(i);
                                        }}
                                    >{'\u270e\ufe0e'}</span>
                                    <span
                                        className="pill-budget-delete"
                                        title="Delete budget"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteBudget(i);
                                        }}
                                    >×</span>
                                </div>
                            );
                        })}
                        {showBudgetMore && (
                            <button
                                type="button"
                                className="ens-more-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setBudgetsExpanded(true);
                                }}
                                title="Show all budgets"
                            >
                                …more
                            </button>
                        )}
                    </>
                )}
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
                EST. {pfHide(pfFmtEth(grandTotal))}
            </div>

            <div className="portfolio-pills-row">
                <div
                    className={`portfolio-main-pill${tab === 'portfolio' ? ' active' : ''}`}
                    id="portfolioMainPill"
                    role="button"
                    tabIndex={0}
                    onClick={() => { if (tab !== 'portfolio') { setTab('portfolio'); showToast('Main Portfolio: ON'); } }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (tab !== 'portfolio') { setTab('portfolio'); showToast('Main Portfolio: ON'); }
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
                    onClick={() => { if (tab !== 'shadow') { setTab('shadow'); showToast('Shadow Portfolio: ON'); } }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (tab !== 'shadow') { setTab('shadow'); showToast('Shadow Portfolio: ON'); }
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
                    onClick={() => { cyclePriceMode(); }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            cyclePriceMode();
                        }
                    }}
                    title="Cycle value estimate (floor · last · 10-sale avg · ATH · mint · off)"
                >
                    $
                </div>
                <div
                    className={`portfolio-group-toggle${groupMode === 'artist' ? ' active' : ''}`}
                    id="portfolioGroupArtist"
                    role="button"
                    tabIndex={0}
                    onClick={() => { if (groupMode !== 'artist') { setGroupMode('artist'); showToast('Group: ARTIST'); } }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (groupMode !== 'artist') { setGroupMode('artist'); showToast('Group: ARTIST'); }
                        }
                    }}
                    title="Group by artist"
                >
                    {'✺︎'}
                </div>
                <div
                    className={`portfolio-group-toggle${groupMode === 'project' ? ' active' : ''}`}
                    id="portfolioGroupProject"
                    role="button"
                    tabIndex={0}
                    onClick={() => { if (groupMode !== 'project') { setGroupMode('project'); showToast('Group: PROJECT'); } }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (groupMode !== 'project') { setGroupMode('project'); showToast('Group: PROJECT'); }
                        }
                    }}
                    title="Group by project (A–Z)"
                >
                    {'⬚︎'}
                </div>
            </div>

            {/* ── TREE ──────────────────────────────────────────── */}
            {/* Sim 10927-11030 verbatim port. Flat full render — no
               expand/collapse. .pf-cat header is .pf-cat-head (➔ glyph +
               .pf-label) plus optional .pf-est (when showDollar). Tree
               cats emit .pf-artist → .pf-project → .pf-artwork rows.
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
                                          a.projects.reduce(
                                              (ss, c) => ss + (c.floor || 0) * c.tokens.length,
                                              0
                                          ),
                                      0
                                  )
                                : cat.names.reduce((s, n) => s + (n.price || 0), 0);
                        /* Brendon-list-2 chat I item 8 — DOM structure fix.
                           Sim 10985 closes the .pf-cat div BEFORE emitting
                           .pf-artist / .pf-project / .pf-artwork rows;
                           those rows are flat siblings inside #portfolioList,
                           NOT children of .pf-cat. The pre-chat-I port
                           wrapped them inside .pf-cat — but .pf-cat is
                           `display: flex` (sim 1892-1898), so the artist /
                           project / artwork rows became flex CHILDREN of
                           the cat-head row and laid out HORIZONTALLY,
                           overlapping each other (visible in Brendon's
                           "portfolio entirely broken" screenshot).
                           Restructure: the .pf-cat div now contains ONLY
                           .pf-cat-head + optional .pf-est. Children render
                           as siblings via React.Fragment. */
                        return (
                            <Fragment key={cat.name}>
                                <div className="pf-cat">
                                    <span className="pf-cat-head">
                                        <span className="pf-cat-glyph">{'\u2794\uFE0E'}</span>
                                        <span className="pf-label">{catLabel}</span>
                                    </span>
                                    {showDollar && (
                                        <span className="pf-est" style={{ marginLeft: 'auto' }}>
                                            {pfHide(pfFmtEth(catEst))}
                                        </span>
                                    )}
                                </div>
                                {cat.type === 'tree' ? (
                                    groupMode === 'project' ? (
                                        // Project view — flat A–Z list of projects, no
                                        // artist headers (Brendon 2026-06-25).
                                        cat.artists
                                            .flatMap((a) => a.projects)
                                            .sort((a, b) => a.name.localeCompare(b.name))
                                            .map((coll) => (
                                                <PortfolioProjectRows
                                                    key={coll.name}
                                                    coll={coll}
                                                    showDollar={showDollar}
                                                    portfolioHidden={portfolioHidden}
                                                />
                                            ))
                                    ) : (
                                        cat.artists.map((art) => {
                                            // Sim 11005-11009: artistSum = sum of floor*tokens.
                                            const artistSum = art.projects.reduce(
                                                (s, c) => s + (c.floor || 0) * c.tokens.length,
                                                0
                                            );
                                            return (
                                                <PortfolioArtistRows
                                                    key={art.name}
                                                    artistName={art.name}
                                                    artistSum={artistSum}
                                                    showDollar={showDollar}
                                                    portfolioHidden={portfolioHidden}
                                                    projects={art.projects}
                                                />
                                            );
                                        })
                                    )
                                ) : (
                                    cat.names.map((n) => (
                                        <div key={n.label} className="pf-ens-row">
                                            <span className="pf-label">{n.label}</span>
                                            <span className="pf-leader" />
                                            {showDollar && (
                                                <span className="pf-est">
                                                    {pfHide(pfFmtEth(n.price))}
                                                </span>
                                            )}
                                        </div>
                                    ))
                                )}
                            </Fragment>
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
                    {/* Bare hide-all icon — no pill, tucked to right edge. */}
                    <span
                        className="portfolio-hide-icon"
                        role="button"
                        tabIndex={0}
                        title={portfolioHidden ? 'Show portfolio' : 'Hide portfolio'}
                        onClick={() => {
                            const next = !portfolioHidden;
                            setPortfolioHidden(next);
                            showToast(next ? 'Portfolio: HIDDEN' : 'Portfolio: SHOWN');
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                const next = !portfolioHidden;
                                setPortfolioHidden(next);
                                showToast(next ? 'Portfolio: HIDDEN' : 'Portfolio: SHOWN');
                            }
                        }}
                    >
                        {portfolioHidden ? '⊙\uFE0E' : '⊘\uFE0E'}
                    </span>
                </div>
            </div>
        </div>
    );
}

/**
 * Renders one artist's full subtree per sim 10996-11026: a .pf-artist
 * header row (label + est) followed by all of the artist's .pf-project
 * rows, each followed by all of that project's .pf-artwork rows. No
 * expand/collapse — sim emits everything unconditionally. Pulled out of
 * the parent JSX so the nesting stays readable.
 */
function PortfolioArtistRows({
    artistName,
    artistSum,
    showDollar,
    portfolioHidden,
    projects,
}: {
    artistName: string;
    artistSum: number;
    showDollar: boolean;
    portfolioHidden: boolean;
    projects: PortfolioProject[];
}) {
    const pfHide = (val: string) => (portfolioHidden ? '***' : val);
    return (
        <>
            <div className="pf-artist">
                <span className="pf-label">{artistName}</span>
                {showDollar && (
                    <span className="pf-est" style={{ marginLeft: 'auto' }}>
                        {pfHide(pfFmtEth(artistSum))}
                    </span>
                )}
            </div>
            {projects.map((coll) => (
                <PortfolioProjectRows
                    key={coll.name}
                    coll={coll}
                    showDollar={showDollar}
                    portfolioHidden={portfolioHidden}
                />
            ))}
        </>
    );
}

/**
 * Renders one project: its .pf-project header row (label + est) followed by a
 * .pf-artwork row per token. Shared by the artist view (nested under an artist)
 * and the project view (flat A–Z), so both groupings render pieces identically.
 */
function PortfolioProjectRows({
    coll,
    showDollar,
    portfolioHidden,
}: {
    coll: PortfolioProject;
    showDollar: boolean;
    portfolioHidden: boolean;
}) {
    const pfHide = (val: string) => (portfolioHidden ? '***' : val);
    // Sim 11011: collSum = floor * tokens.length.
    const collSum = (coll.floor || 0) * coll.tokens.length;
    return (
        <div>
            <div className="pf-project">
                <span className="pf-label">{coll.name}</span>
                {showDollar && (
                    <span className="pf-est" style={{ marginLeft: 'auto' }}>
                        {pfHide(pfFmtEth(collSum))}
                    </span>
                )}
            </div>
            {coll.tokens.map((tid) => (
                <div key={tid} className="pf-artwork">
                    <span className="pf-label">#{tid}</span>
                    <span className="pf-leader" />
                    {showDollar && (
                        <span className="pf-est">
                            {pfHide(pfFmtEth(coll.floor))}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}
