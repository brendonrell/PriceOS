'use client';

/*
 * canvasVirtualizer — Build 35 / BET-06
 *
 * IntersectionObserver-driven lazy canvas mounting for the project
 * gallery. Ports sim's renderFeed observer pattern (sim 8215-8270) into a
 * module-scoped service the React port can register cards against, with
 * one extension on top: an LRU cap that evicts the least-recently-visible
 * canvas when the active set exceeds CANVAS_LRU_CAP.
 *
 * Why this exists:
 *   ArtworkCard mounts a 400px canvas per Output. With 222+ cards on
 *   Portals (and 333 incoming on Strata in B39), mobile Safari hits the
 *   GPU texture cap and crashes once enough wrappers come into view.
 *   Sim sidesteps this by lazy-rendering canvases only as wrappers
 *   intersect the viewport, then leaves them mounted forever
 *   (one-shot reveal — sim unobserves on first hit).
 *
 * Where this differs from sim:
 *   Sim's "render once, never again" model holds at 222 Outputs because
 *   the gallery list is bounded. At 555+ Outputs on a Safari mobile
 *   session that browses the whole grid, even sim would OOM. The LRU
 *   cap (60 active canvases) caps GPU pressure regardless of how far
 *   the user scrolls. Eviction releases the GPU buffer by setting
 *   canvas.width/height to 1; re-intersection re-queues the canvas
 *   for a fresh render.
 *
 * Pattern preserved from sim:
 *   - rootMargin '400px 300px' — start prefetching ~one viewport before the
 *     card enters view vertically, and a couple of tiles' worth before it
 *     scrolls into view horizontally in a carousel (2026-08-12 — this used to
 *     be vertical-only, so carousels leaned on a second, separate per-track
 *     observer for the horizontal case; folded in here instead, one system).
 *   - requestIdleCallback drainer with batch size 4 — keeps frame budget
 *     during scroll. Falls back to setTimeout(16ms) on browsers without
 *     requestIdleCallback (Safari < 17 throughout the cohort).
 *   - .visible class on the canvas + wrapper bg → transparent — drives
 *     the opacity 0 → 1 fade-in (matches sim 2366-2367).
 *
 * Stats surface:
 *   window.__pdCanvas exposes { active, cap, rendered, queued, registered }
 *   for dev/QA inspection. BET-06 verification spec: "scroll through 333
 *   Strata Outputs on mobile without crash. Render counter visible in
 *   dev/debug mode." The full debug panel (forces UI states) lands in
 *   Build 37 — this is the minimal hook.
 */

import { hashSynNotifyCanvasPaint } from '../engines/hashSynEngine';

const CANVAS_LRU_CAP = 60;
/* Hard ceiling on paints per rAF tick — a safety bound so a runaway queue
   can't loop forever in one frame. The REAL throttle is FRAME_BUDGET_MS
   below: we paint until the frame budget is spent, then yield. Cheap engines
   (gradient placeholders, Prisms) land a full screenful in one tick; a heavy
   engine (Avalanche's sandpile) paints as few as one per frame so the main
   thread never locks. */
const RENDER_BATCH_SIZE = 12;
/* Per-frame paint budget. Once a drain pass has spent this long painting, it
   stops and reschedules the rest for the next frame — keeping each frame
   inside one 60fps slice regardless of how expensive an individual Output's
   render closure is. This is what lets the UI stay responsive while heavy
   projects paint (Brendon, 2026-06-13). */
const FRAME_BUDGET_MS = 8;
/* While the first screenful (eager) cards register during React's commit,
   they paint synchronously for instant "just there" art — but only until this
   cumulative budget is spent in the burst. Past it, the remaining eager cards
   fall back to the priority queue (painted front-of-line on the next frames),
   so a heavy-engine page mounts without a multi-second freeze instead of
   blocking on N synchronous sandpile solves. */
const EAGER_SYNC_BUDGET_MS = 24;
const ROOT_MARGIN = '400px 300px';

type RegisteredCard = {
    /* Globally-unique key (project slug + token id). Token ids are NOT
       unique across projects, and the home page mounts many projects'
       galleries at once — so keying by the bare id let one project's card
       block every other project's same-numbered card from painting. The
       composite key scopes each card to its project. */
    key: string;
    id: number;
    wrapper: HTMLElement;
    canvas: HTMLCanvasElement;
    /* Closure that performs the actual draw. ArtworkCard captures id +
       canvas ref + draws into the canvas; the virtualizer only decides
       WHEN to invoke it. */
    render: () => void;
    /* Above-the-fold cards register with eager=true and paint SYNCHRONOUSLY
       at registration — no observer wait, no idle/rAF deferral, no fade.
       This is the "just there on load" path: the first screenful of art is
       painted before the browser has a chance to show an empty tile. The
       lazy IntersectionObserver path below only carries the deep-scroll
       tail (the OOM crash-guard that this virtualizer exists for). */
    eager?: boolean;
};

const registry = new Map<string, RegisteredCard>();
/* Map preserves insertion order — re-inserting an entry (delete+set)
   moves it to the end, so the iteration order IS the LRU order: oldest
   first. active.keys().next().value gives the eviction candidate. */
const active = new Map<string, RegisteredCard>();
/* Keys currently intersecting the viewport (+rootMargin). A tile in here is
   ON SCREEN and must never be evicted to honour the LRU cap — doing so is the
   "top carousels go grey" bug on the home page, where two-dozen galleries
   mount at once and later rows painting would otherwise blank the visible
   top rows. */
const intersecting = new Set<string>();
const renderQueue: RegisteredCard[] = [];
let renderScheduled = false;
let observer: IntersectionObserver | null = null;
let renderCounter = 0;
/* Tracks the running cost of the current synchronous eager-register burst.
   null between bursts; set to performance.now() on the first eager paint of a
   burst and cleared on the next microtask (after React's commit finishes). */
let eagerBurstStart: number | null = null;
let eagerResetQueued = false;

function nowMs(): number {
    return typeof performance !== 'undefined' && performance.now
        ? performance.now()
        : Date.now();
}

function ensureObserver(): void {
    if (observer || typeof window === 'undefined') return;
    observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                const wrapper = entry.target as HTMLElement;
                const key = wrapper.dataset.vkey;
                if (!key) return;
                if (!entry.isIntersecting) {
                    /* Off screen now — drop the eviction shield so the LRU
                       cap can reclaim its GPU buffer on deep scrolls. */
                    intersecting.delete(key);
                    return;
                }
                intersecting.add(key);
                const reg = registry.get(key);
                if (!reg) return;
                /* Already-active canvas re-entering view: bump its
                   position in the LRU so it survives the next eviction
                   pass. delete + set re-inserts at the tail. */
                if (active.has(key)) {
                    active.delete(key);
                    active.set(key, reg);
                    return;
                }
                /* Not active — queue for render. Sim unobserves here;
                   we don't, because LRU eviction can re-blank a canvas
                   later and we need the next intersection to retrigger. */
                renderQueue.push(reg);
                scheduleDrain();
            });
        },
        { rootMargin: ROOT_MARGIN }
    );
}

function scheduleDrain(): void {
    if (renderScheduled) return;
    renderScheduled = true;
    /* Next-frame, not next-idle. The old requestIdleCallback(timeout 200)
       was the "trickle" — lazy canvases could sit unpainted for up to
       200ms before their idle slot came up, painting 4 at a time. rAF
       lands the paint on the very next frame (~16ms), so deep-scroll art
       keeps pace with the scroll instead of lagging behind it. */
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame !== 'undefined') {
        window.requestAnimationFrame(drainQueue);
    } else {
        setTimeout(drainQueue, 16);
    }
}

/* Paint a single registered card right now: draw, reveal, count, enforce
   the LRU cap. Shared by the eager (synchronous, at-register) path and the
   lazy (observer → rAF drain) path so both reveal identically. */
function paintNow(reg: RegisteredCard): void {
    if (!registry.has(reg.key)) return;
    if (active.has(reg.key)) return;
    try {
        reg.render();
    } catch {
        return;
    }
    reg.canvas.classList.add('visible');
    reg.wrapper.style.background = 'transparent';
    active.set(reg.key, reg);
    renderCounter++;
    /* Brendon list item 14 — sim 8230-8234. Notify the hashsyn
       engine so it can debounce a resample once the new canvas
       pixels are paintable. No-op when hashsyn isn't the active
       colorway — engine bails on null _onApplyHex. */
    hashSynNotifyCanvasPaint();
    enforceLruCap();
}

function drainQueue(): void {
    renderScheduled = false;
    /* Paint until the frame budget is spent OR the per-tick cap is hit,
       whichever comes first — but always paint at least one so the queue
       can't stall. Cheap engines blow through the cap; heavy ones bail on
       the time budget after a paint or two and pick up next frame. */
    const start = nowMs();
    let painted = 0;
    while (renderQueue.length > 0 && painted < RENDER_BATCH_SIZE) {
        const reg = renderQueue.shift();
        if (reg) paintNow(reg);
        painted++;
        if (nowMs() - start >= FRAME_BUDGET_MS) break;
    }
    publishStats();
    if (renderQueue.length > 0) scheduleDrain();
}

function enforceLruCap(): void {
    if (active.size <= CANVAS_LRU_CAP) return;
    /* Evict oldest-first, but SKIP anything currently on screen. Off-screen
       tiles get released so the GPU stays bounded on deep single-project
       scrolls; if everything over the cap is genuinely visible (a tall home
       page of carousels), we let the active set sit above the cap rather than
       grey out art the user is looking at. */
    for (const key of [...active.keys()]) {
        if (active.size <= CANVAS_LRU_CAP) break;
        if (intersecting.has(key)) continue;
        const reg = active.get(key);
        if (reg) evictCanvas(reg);
        active.delete(key);
    }
}

function evictCanvas(reg: RegisteredCard): void {
    /* Drop the GPU-backed buffer. Setting width/height (even to the
       same value) reallocates; setting to 1 reduces it to negligible.
       On re-intersection, the existing render closure resets width to
       400 and re-paints. */
    try {
        reg.canvas.width = 1;
        reg.canvas.height = 1;
    } catch {
        /* defensive — if the canvas is detached, ignore */
    }
    reg.canvas.classList.remove('visible');
    /* Clearing the inline style restores the CSS default
       (.canvas-wrapper { background: #ccc }) so the unloaded slot
       reads as a placeholder rather than a void. */
    reg.wrapper.style.background = '';
}

function publishStats(): void {
    if (typeof window === 'undefined') return;
    const stats = {
        active: active.size,
        cap: CANVAS_LRU_CAP,
        rendered: renderCounter,
        queued: renderQueue.length,
        registered: registry.size,
    };
    /* Plain object on window for dev-tools inspection. Unobtrusive —
       no UI surface, no console spam. The full debug panel (Build 37)
       can read from this same source. */
    (window as unknown as { __pdCanvas?: typeof stats }).__pdCanvas = stats;
}

export function registerCanvas(reg: RegisteredCard): void {
    if (typeof window === 'undefined') return;
    ensureObserver();
    /* If a card with this id was already registered (e.g. React strict
       mode dev double-mount, or a fast unmount/remount cycle), tear the
       old observation down before re-observing the new wrapper. */
    const existing = registry.get(reg.key);
    if (existing && existing.wrapper !== reg.wrapper) {
        observer?.unobserve(existing.wrapper);
    }
    registry.set(reg.key, reg);
    observer?.observe(reg.wrapper);
    /* Eager (above-the-fold) cards paint synchronously right here — no
       observer round-trip, no rAF queue — so the first screenful is "just
       there" the instant the page mounts. They stay observed so LRU eviction
       + re-intersection re-paint still apply once scrolled far off-screen.

       Guard: a burst of eager registers (React commits all the first
       screenful's cards in one synchronous task) paints sync only until
       EAGER_SYNC_BUDGET_MS of cumulative work is spent. Past that the
       remaining eager cards go to the FRONT of the render queue (ahead of
       lazy tail cards) and paint over the next few frames with the budget
       throttle — so a page of a heavy engine mounts smoothly instead of
       freezing on N synchronous solves. */
    if (reg.eager) {
        if (eagerBurstStart === null) {
            eagerBurstStart = nowMs();
            if (!eagerResetQueued) {
                eagerResetQueued = true;
                const reset = () => {
                    eagerBurstStart = null;
                    eagerResetQueued = false;
                };
                if (typeof queueMicrotask !== 'undefined') queueMicrotask(reset);
                else Promise.resolve().then(reset);
            }
        }
        if (nowMs() - eagerBurstStart < EAGER_SYNC_BUDGET_MS) {
            paintNow(reg);
        } else {
            /* Front of queue: eager deferrals jump ahead of lazy tail. */
            renderQueue.unshift(reg);
            scheduleDrain();
        }
    }
    publishStats();
}

export function unregisterCanvas(key: string): void {
    const reg = registry.get(key);
    if (reg) observer?.unobserve(reg.wrapper);
    registry.delete(key);
    /* Drop from active LRU too — the canvas DOM node is going away, so
       there's nothing to evict and no reason to count it as active. */
    active.delete(key);
    intersecting.delete(key);
    /* Strip any pending queue entry. splice() in place — single linear
       pass; renderQueue is bounded by visible-set size so this stays
       cheap. */
    for (let i = renderQueue.length - 1; i >= 0; i--) {
        if (renderQueue[i].key === key) renderQueue.splice(i, 1);
    }
    publishStats();
}

/* forceRenderKeys — bypass IntersectionObserver for a specific set of
   cards. Used by the project-showcase tab to ensure picked cards are
   painted even if they were never scrolled into view. Keys are the same
   composite (slug:id) the cards register with. */
export function forceRenderKeys(keys: Set<string>): void {
    if (typeof window === 'undefined') return;
    keys.forEach((key) => {
        const reg = registry.get(key);
        if (!reg) return;
        if (active.has(key)) return; // already painted
        renderQueue.push(reg);
    });
    if (renderQueue.length > 0) scheduleDrain();
}

/* Optional dev export — same shape as window.__pdCanvas, callable from
   anywhere in the app (a future debug panel, a test, etc.) without
   reaching for globals. */
export function getCanvasStats() {
    return {
        active: active.size,
        cap: CANVAS_LRU_CAP,
        rendered: renderCounter,
        queued: renderQueue.length,
        registered: registry.size,
    };
}
