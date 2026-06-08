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
 *   - rootMargin '400px 0px' — start prefetching ~one viewport before
 *     the card actually enters view, so canvases finish painting before
 *     the user sees them.
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
/* Painted per rAF tick. Bumped 4 → 8 with the idle→rAF switch: gradient
   fills are cheap, so a full screenful of tail cards lands within a frame
   or two of scrolling rather than trickling in. */
const RENDER_BATCH_SIZE = 8;
const ROOT_MARGIN = '400px 0px';

type RegisteredCard = {
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

const registry = new Map<number, RegisteredCard>();
/* Map preserves insertion order — re-inserting an entry (delete+set)
   moves it to the end, so the iteration order IS the LRU order: oldest
   first. active.keys().next().value gives the eviction candidate. */
const active = new Map<number, RegisteredCard>();
const renderQueue: RegisteredCard[] = [];
let renderScheduled = false;
let observer: IntersectionObserver | null = null;
let renderCounter = 0;

function ensureObserver(): void {
    if (observer || typeof window === 'undefined') return;
    observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const wrapper = entry.target as HTMLElement;
                const idAttr = wrapper.dataset.id;
                if (!idAttr) return;
                const id = Number(idAttr);
                const reg = registry.get(id);
                if (!reg) return;
                /* Already-active canvas re-entering view: bump its
                   position in the LRU so it survives the next eviction
                   pass. delete + set re-inserts at the tail. */
                if (active.has(id)) {
                    active.delete(id);
                    active.set(id, reg);
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
    if (!registry.has(reg.id)) return;
    if (active.has(reg.id)) return;
    try {
        reg.render();
    } catch {
        return;
    }
    reg.canvas.classList.add('visible');
    reg.wrapper.style.background = 'transparent';
    active.set(reg.id, reg);
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
    const batch = renderQueue.splice(0, RENDER_BATCH_SIZE);
    batch.forEach(paintNow);
    publishStats();
    if (renderQueue.length > 0) scheduleDrain();
}

function enforceLruCap(): void {
    while (active.size > CANVAS_LRU_CAP) {
        const oldestId = active.keys().next().value;
        if (oldestId === undefined) break;
        const reg = active.get(oldestId);
        if (!reg) {
            active.delete(oldestId);
            continue;
        }
        evictCanvas(reg);
        active.delete(oldestId);
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
    const existing = registry.get(reg.id);
    if (existing && existing.wrapper !== reg.wrapper) {
        observer?.unobserve(existing.wrapper);
    }
    registry.set(reg.id, reg);
    observer?.observe(reg.wrapper);
    /* Eager (above-the-fold) cards paint synchronously right here — no
       observer round-trip, no rAF queue. This is what makes the first
       screenful "just there" the instant the page mounts. They stay
       observed so LRU eviction + re-intersection re-paint still apply
       once the user scrolls them far off-screen. */
    if (reg.eager) paintNow(reg);
    publishStats();
}

export function unregisterCanvas(id: number): void {
    const reg = registry.get(id);
    if (reg) observer?.unobserve(reg.wrapper);
    registry.delete(id);
    /* Drop from active LRU too — the canvas DOM node is going away, so
       there's nothing to evict and no reason to count it as active. */
    active.delete(id);
    /* Strip any pending queue entry. splice() in place — single linear
       pass; renderQueue is bounded by visible-set size so this stays
       cheap. */
    for (let i = renderQueue.length - 1; i >= 0; i--) {
        if (renderQueue[i].id === id) renderQueue.splice(i, 1);
    }
    publishStats();
}

/* forceRenderIds — bypass IntersectionObserver for a specific set of ids.
   Used by the project-showcase tab to ensure picked cards are painted
   even if they were never scrolled into view. */
export function forceRenderIds(ids: Set<number>): void {
    if (typeof window === 'undefined') return;
    ids.forEach((id) => {
        const reg = registry.get(id);
        if (!reg) return;
        if (active.has(id)) return; // already painted
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
