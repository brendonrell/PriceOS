'use client';

/*
 * budgetEngine — F57 (BUG-10).
 *
 * Module-singleton port of sim's Budget engine (sim 11183-11459 + 11887-11910).
 * The Budget feature is a per-user numeric preference: enter an ETH cap once,
 * every .edition-card whose listed price ≤ cap gets `.in-budget`; out-of-budget
 * cards recede via opacity 0.22 (body.budget-active rule). When sort is
 * price-ascending AND a budget is active, a stepped cutoff line draws across
 * the grid tracing the boundary between in-budget and out-of-budget regions.
 *
 * Why a module store and not a React context:
 *   PortfolioView renders the pill row, every ArtworkCard needs to know the
 *   active budget for its own .in-budget class, and the collection page
 *   useLayoutEffect runs the step-line algorithm. Threading a context through
 *   every parent works but adds noise; a small subscribe-on-mount module-
 *   singleton matches the pattern already used by grailStore / sentimentEngine
 *   / priceSpriteEngine / hashSynEngine / familiarEngine.
 *
 * State shape:
 *   { list: { name, eth }[], activeIdx: number }   activeIdx = -1 means none
 *
 * The body.budget-active toggle is owned here too — emit() flips it on every
 * state change. Nothing else competes for that class.
 *
 * Step-line:
 *   The .budget-step-l / .budget-step-r class assignments and the
 *   .budget-step-v-overlay div injection are layout-dependent (offsetTop,
 *   offsetLeft, offsetWidth). They MUST be applied imperatively after layout
 *   settles. The collection page calls applyStepLine() inside a useLayoutEffect
 *   gated on (budget state, sort, visible card count). The engine attaches a
 *   debounced resize listener once on first subscribe so the step re-traces
 *   on viewport changes (mirrors sim 6076-6078).
 *
 * Persistence: localStorage key `pd_budgets` (sim 11185 / 11202). Lazy hydrate
 * on first read or subscribe. SSR-safe via `typeof window` guards.
 *
 * Sim refs:
 *   sim.html 11183-11203   state + persistence
 *   sim.html 11208-11214   _getActiveBudgetEth
 *   sim.html 11225-11235   applyBudget (body class + per-card .in-budget)
 *   sim.html 11237-11320   _updateBudgetStepLine (full algorithm)
 *   sim.html 11887-11910   addBudget (delegates to openValuePrompt)
 *   sim.html 11919-11933   budget pill click / long-press delete
 *   sim.html 6071-6079     resize listener (debounced step-line redraw)
 *   sim.html 3952-4043     CSS surface (body.budget-active dim + step-line)
 *
 * Design deviations from sim:
 *   - Toast text ("Budget: NAME", "Budget OFF", "Budget added: NAME",
 *     "Budget deleted") lives in the caller because showToast is React
 *     context. Engine returns simple result discriminators where useful.
 *   - .in-budget class on each card is applied via React (ArtworkCard
 *     subscribes + conditionally adds the class) so React's reconciler
 *     doesn't wipe the class on re-render. Sim uses classList.toggle in
 *     applyBudget(), but React would clobber that on the next render of
 *     the card. The end state is identical — class on every in-budget card.
 *   - Step-line classes (.budget-step-l/-r) and the overlay div are still
 *     applied imperatively (they're layout-dependent so React can't compute
 *     them) but they live on cards independently of ArtworkCard's className
 *     prop. The page-level useLayoutEffect re-applies them after every
 *     React render that could move cards around.
 */

const STORAGE_KEY = 'pd_budgets';

export interface BudgetEntry {
    name: string;
    eth: number;
}

export interface BudgetsState {
    list: BudgetEntry[];
    activeIdx: number;
}

const DEFAULT_STATE: BudgetsState = { list: [], activeIdx: -1 };

type Listener = (state: BudgetsState) => void;

let state: BudgetsState = DEFAULT_STATE;
let hydrated = false;
const listeners = new Set<Listener>();

/* Resize listener installed lazily on first subscribe. Calls every
   currently-subscribed step-line callback (registered separately so the
   engine doesn't have to know about React render cycles). */
let resizeAttached = false;
let resizeTimer: number | null = null;
const stepLineCallbacks = new Set<() => void>();

function hydrate(): void {
    if (hydrated) return;
    hydrated = true;
    if (typeof window === 'undefined') return;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (
            parsed &&
            typeof parsed === 'object' &&
            Array.isArray(parsed.list) &&
            typeof parsed.activeIdx === 'number'
        ) {
            // Filter junk entries — defensive against partial writes / hand-edits
            const list = parsed.list.filter(
                (e: unknown): e is BudgetEntry =>
                    !!e &&
                    typeof e === 'object' &&
                    typeof (e as BudgetEntry).name === 'string' &&
                    typeof (e as BudgetEntry).eth === 'number' &&
                    isFinite((e as BudgetEntry).eth)
            );
            const activeIdx =
                parsed.activeIdx >= 0 && parsed.activeIdx < list.length
                    ? parsed.activeIdx
                    : -1;
            state = { list, activeIdx };
        }
    } catch {
        /* bad JSON — keep default empty state */
    }
}

function persist(): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        /* quota / private mode — ignore */
    }
}

function emit(): void {
    // Body class drive — engine owns budget-active toggle (sim 11227).
    if (typeof document !== 'undefined') {
        document.body.classList.toggle(
            'budget-active',
            getActiveBudgetEth() != null
        );
    }
    const snapshot: BudgetsState = {
        list: state.list.slice(),
        activeIdx: state.activeIdx,
    };
    listeners.forEach((l) => l(snapshot));
}

function attachResizeIfNeeded(): void {
    if (resizeAttached) return;
    if (typeof window === 'undefined') return;
    resizeAttached = true;
    window.addEventListener('resize', () => {
        // Debounced 150ms — same shape as sim 6076-6078's _budgetStepResizeTimer.
        if (resizeTimer != null) window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
            resizeTimer = null;
            stepLineCallbacks.forEach((cb) => {
                try {
                    cb();
                } catch {
                    /* swallow — one bad callback shouldn't break the others */
                }
            });
        }, 150);
    });
}

/* ── Public read API ────────────────────────────────────────────────── */

/** Snapshot of current state. Triggers hydrate on first call. */
export function getBudgets(): BudgetsState {
    hydrate();
    return { list: state.list.slice(), activeIdx: state.activeIdx };
}

/**
 * Active budget ETH cap, or null when none active / invalid. Mirrors
 * sim 11208-11214. Used by ArtworkCard to decide its own .in-budget
 * class and by applyStepLine() to gate step-line drawing.
 */
export function getActiveBudgetEth(): number | null {
    hydrate();
    if (state.activeIdx < 0) return null;
    const b = state.list[state.activeIdx];
    if (!b) return null;
    const v =
        typeof b.eth === 'number' ? b.eth : parseFloat(String(b.eth));
    return isFinite(v) && v > 0 ? v : null;
}

/* ── Public mutation API ────────────────────────────────────────────── */

/**
 * Append a new budget and auto-activate it (sim 11903 — newly added is
 * always selected). Caller is responsible for validating name + eth before
 * calling; engine accepts what it's given. Returns the new index.
 */
export function addBudget(name: string, eth: number): number {
    hydrate();
    state = {
        list: [...state.list, { name, eth }],
        activeIdx: state.list.length, // = new entry's index
    };
    persist();
    emit();
    return state.activeIdx;
}

/**
 * Delete the budget at idx. If it was active, deactivate; if a higher idx
 * was active, decrement so the same budget stays active. Mirrors sim
 * 11923-11933 long-press delete branch.
 */
export function deleteBudget(idx: number): boolean {
    hydrate();
    if (idx < 0 || idx >= state.list.length) return false;
    const list = state.list.slice();
    list.splice(idx, 1);
    let activeIdx = state.activeIdx;
    if (activeIdx === idx) activeIdx = -1;
    else if (activeIdx > idx) activeIdx -= 1;
    state = { list, activeIdx };
    persist();
    emit();
    return true;
}

/**
 * Toggle a pill at idx. If already active, deactivate (-1). Otherwise
 * switch to it. Mirrors sim 11941-11947 budgetPillClick.
 */
export function toggleActiveBudget(idx: number): void {
    hydrate();
    if (idx < 0 || idx >= state.list.length) return;
    const nextIdx = state.activeIdx === idx ? -1 : idx;
    state = { ...state, activeIdx: nextIdx };
    persist();
    emit();
}

/* ── Subscribe ──────────────────────────────────────────────────────── */

/**
 * Subscribe to state changes. Returns unsubscribe. Listener gets a fresh
 * snapshot — never the live state object.
 */
export function subscribeBudgets(cb: Listener): () => void {
    hydrate();
    listeners.add(cb);
    // Also ensure body.budget-active is correctly stamped — first subscriber
    // in a session might be after hydrate so a fresh class flip is required.
    if (typeof document !== 'undefined') {
        document.body.classList.toggle(
            'budget-active',
            getActiveBudgetEth() != null
        );
    }
    return () => {
        listeners.delete(cb);
    };
}

/* ── Step-line algorithm ────────────────────────────────────────────── */

/**
 * Trace the stepped cutoff between in-budget and out-of-budget cards in
 * #gallery. Direct port of sim 11237-11320 _updateBudgetStepLine.
 *
 * Inputs:
 *   priceAscActive — true when current sort is price-ascending. The line
 *     is only meaningful in that sort, because in any other order the
 *     in-budget cards are scattered through the grid and a continuous
 *     line has nothing to trace.
 *
 * Algorithm (sim 11257-11319):
 *   1. Clean prior step marks + remove any v-overlay divs.
 *   2. shouldDraw = activeBudget && priceAscActive. Toggle body class. Bail
 *      if not drawing.
 *   3. Find L = last .in-budget card in DOM order across visible cards.
 *   4. Mark every in-budget card in L's row with .budget-step-l (low
 *      horizontal).
 *   5. hasOOBInRow = at least one out-of-budget card sits in L's row?
 *      hasRowAbove = is there a row above L's row?
 *      Both true ⇒ this is a STEP cutoff:
 *        - Mark cards in row above with .budget-step-r past L's column
 *          (high horizontal).
 *        - Inject a .budget-step-v-overlay div as a child of L (vertical
 *          connector between the two horizontals).
 *      Either false ⇒ flat-line cutoff; just the low horizontal.
 *
 * Cheap — one querySelectorAll + a few O(N) passes; N ≤ 222 in the seed.
 */
export function applyStepLine(priceAscActive: boolean): void {
    if (typeof document === 'undefined') return;

    const gallery = document.getElementById('gallery');
    if (!gallery) return;

    // 1. Clean up prior markings + overlay children. classList.remove alone
    //    won't catch the overlay div — it's a real DOM child.
    gallery
        .querySelectorAll(
            '.edition-card.budget-step-l, .edition-card.budget-step-r'
        )
        .forEach((c) => {
            c.classList.remove('budget-step-l', 'budget-step-r');
        });
    gallery
        .querySelectorAll('.budget-step-v-overlay')
        .forEach((el) => el.remove());

    // 2. Gate
    const budgetActive = getActiveBudgetEth() != null;
    const shouldDraw = budgetActive && priceAscActive;
    document.body.classList.toggle('budget-step-line', shouldDraw);
    if (!shouldDraw) return;

    // 3. Visible card walk — match sim 11280's not(.hidden):not(.search-hidden)
    //    filter. Gives the engine the same DOM order React renders so the
    //    step traces the actually-visible boundary.
    const cards = Array.from(
        gallery.querySelectorAll<HTMLElement>(
            '.edition-card:not(.hidden):not(.search-hidden)'
        )
    );
    if (cards.length === 0) return;

    // Find last .in-budget card in visual order (sim 11286-11290).
    let lastIdx = -1;
    for (let i = cards.length - 1; i >= 0; i--) {
        if (cards[i].classList.contains('in-budget')) {
            lastIdx = i;
            break;
        }
    }
    if (lastIdx < 0) return; // Nothing in budget — no line to draw

    const L = cards[lastIdx];
    const rowY = L.offsetTop;

    // 4. Low horizontal — every in-budget card in L's row (sim 11296-11300).
    for (let i = 0; i <= lastIdx; i++) {
        if (
            cards[i].offsetTop === rowY &&
            cards[i].classList.contains('in-budget')
        ) {
            cards[i].classList.add('budget-step-l');
        }
    }

    // Mid-row cutoff? (sim 11304-11308)
    let hasOOBInRow = false;
    for (let i = lastIdx + 1; i < cards.length; i++) {
        if (cards[i].offsetTop === rowY) {
            hasOOBInRow = true;
            break;
        }
    }

    // Row above index (sim 11311-11313)
    const rowYs = [...new Set(cards.map((c) => c.offsetTop))].sort(
        (a, b) => a - b
    );
    const rowYIdx = rowYs.indexOf(rowY);
    const hasRowAbove = rowYIdx > 0;

    // 5. Step case ⇒ high horizontal + vertical overlay (sim 11316-11335)
    if (hasOOBInRow && hasRowAbove) {
        const prevRowY = rowYs[rowYIdx - 1];
        const lRight = L.offsetLeft + L.offsetWidth;
        cards.forEach((c) => {
            if (c.offsetTop === prevRowY && c.offsetLeft >= lRight - 2) {
                c.classList.add('budget-step-r');
            }
        });
        const overlay = document.createElement('div');
        overlay.className = 'budget-step-v-overlay';
        L.appendChild(overlay);
    }
}

/**
 * Register a step-line redraw callback that fires on debounced resize.
 * Caller (the collection page useLayoutEffect) passes a closure that
 * computes the priceAscActive flag from current sort state and calls
 * applyStepLine. Returns unsubscribe. Resize listener is attached lazily
 * on first registration.
 */
export function registerStepLineRedraw(cb: () => void): () => void {
    attachResizeIfNeeded();
    stepLineCallbacks.add(cb);
    return () => {
        stepLineCallbacks.delete(cb);
    };
}
