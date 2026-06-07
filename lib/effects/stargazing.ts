/*
 * lib/effects/stargazing.ts — pure DOM helpers for Stargazing mode.
 *
 * Sim 9367-9437 (`window._applyStargazingMode`) is the source. The
 * orchestration (capture-prev-colorway + flip body class + seed + restore)
 * lives in components/shell/Backgrounds.tsx; this module is just the
 * imperative DOM bits, kept side-effect-free at module scope so they
 * can be tree-shaken if the spell ever becomes lazy-loaded.
 *
 * Three responsibilities:
 *   1. seedStarfield(el): build 380 .star-dot + 3 .shooting-star into el.
 *      Idempotent — bails if el already has children, so re-mounting
 *      Backgrounds while stargazing is on doesn't double the DOM.
 *      Per-element CSS variables (--sd / --sde / --sop / --ss-dur /
 *      --ss-del / --ss-angle) match sim 9385-9388 and 9400-9401 verbatim.
 *   2. clearStarfield(el): empty el.innerHTML (sim 9434).
 *   3. applyStargazingVars(): write the 11 root custom props + --modal-bg
 *      + theme-color meta (sim 9407-9421 + 9431). The body.stargazing-mode
 *      CSS rule already pins --bg-color and --text-color via !important,
 *      but writing them on root.style is sim-faithful and harmless. The
 *      remaining 9 vars (--border-color, --stat-bg, --stat-active-bg,
 *      --stat-active-text, --mint-bg, --mint-text, --pill-l1-bg,
 *      --pill-l1-text, --pill-l1-border) are NOT covered by any CSS rule
 *      and rely on this JS write to flip the rest of the UI to purple.
 *
 * Restore is intentionally NOT here — calling setColorway(prevKey) from
 * ColorwayContext re-derives every var from the previous colorway in one go,
 * which is exactly what sim 9435 does (`setColorway(_stargazingPrevTheme || 'custom')`).
 */

const STARGAZING_BG = '#0d0618';
const STARGAZING_TEXT = '#c5a8f0';

/* Build the pixel starfield into the host element. No-op if already
   populated — Backgrounds may re-run its effect on hot-reload or when
   the component happens to remount, and we don't want to stack 760
   stars on top of 380. Sim 9375 has the same `sf.children.length === 0`
   guard. */
export function seedStarfield(el: HTMLElement): void {
    if (el.children.length !== 0) return;

    const frag = document.createDocumentFragment();

    /* 380 static pixel stars (sim 9378-9390). Size distribution: 15%
       are 3px, next 40% are 2px, rest are 1px. Opacity 0.3-1.0, pulse
       duration 1.8-5.8s, pulse delay 0-5s — all written as inline CSS
       custom properties consumed by .star-dot's animation rule. */
    for (let s = 0; s < 380; s++) {
        const dot = document.createElement('div');
        dot.className = 'star-dot';
        const size = Math.random() < 0.15 ? 3 : Math.random() < 0.4 ? 2 : 1;
        const opacity = (0.3 + Math.random() * 0.7).toFixed(2);
        const dur = (1.8 + Math.random() * 4).toFixed(1);
        const del = (Math.random() * 5).toFixed(2);
        dot.style.cssText =
            `width:${size}px;height:${size}px;` +
            `left:${(Math.random() * 100).toFixed(2)}%;` +
            `top:${(Math.random() * 100).toFixed(2)}%;` +
            `--sd:${dur}s;--sde:${del}s;--sop:${opacity};`;
        frag.appendChild(dot);
    }

    /* 3 shooting stars (sim 9392-9403). Cycle 35-65s with 22s+ stagger
       between them — the `shoot` keyframe is visible for only ~2% of
       the cycle so they're a genuinely rare event. Angle 28-48deg.
       Start position: 10-80% horizontal, top 0-35%. */
    for (let sh = 0; sh < 3; sh++) {
        const star = document.createElement('div');
        star.className = 'shooting-star';
        const angle = (28 + Math.random() * 20).toFixed(1);
        const dur2 = (35 + Math.random() * 30).toFixed(1);
        const del2 = (sh * 22 + Math.random() * 18).toFixed(1);
        const startX = (10 + Math.random() * 70).toFixed(1);
        const startY = (Math.random() * 35).toFixed(1);
        star.style.cssText =
            `left:${startX}%;top:${startY}%;` +
            `--ss-dur:${dur2}s;--ss-del:${del2}s;--ss-angle:${angle}deg;`;
        frag.appendChild(star);
    }

    el.appendChild(frag);
}

/* Empty the starfield (sim 9434). Used on stargazing OFF and as defensive
   reset before re-seeding if the host element was ever populated by a
   prior spell instance that didn't clean up. */
export function clearStarfield(el: HTMLElement): void {
    el.innerHTML = '';
}

/* Apply the 11 custom props + --modal-bg + theme-color meta (sim 9407-9431).
   Writes to documentElement.style so the current values survive a colorway
   pick — body.stargazing-mode's !important rule keeps --bg-color /
   --text-color pinned regardless. Other 9 vars rely on this write because
   no CSS rule exists for them at body.stargazing-mode level. */
export function applyStargazingVars(): void {
    const root = document.documentElement;
    root.style.setProperty('--bg-color', STARGAZING_BG);
    root.style.setProperty('--text-color', STARGAZING_TEXT);
    root.style.setProperty('--border-color', 'rgba(197,168,240,0.2)');
    root.style.setProperty('--stat-bg', 'rgba(197,168,240,0.12)');
    root.style.setProperty('--stat-active-bg', STARGAZING_TEXT);
    root.style.setProperty('--stat-active-text', STARGAZING_BG);
    root.style.setProperty('--mint-bg', STARGAZING_TEXT);
    root.style.setProperty('--mint-text', STARGAZING_BG);
    root.style.setProperty('--pill-l1-bg', STARGAZING_TEXT);
    root.style.setProperty('--pill-l1-text', STARGAZING_BG);
    root.style.setProperty('--pill-l1-border', STARGAZING_TEXT);
    /* Modal-bg: fully opaque dark purple (sim 9420-9421). Sim also
       clobbers inline backgroundColor on 4 modal elements via
       getElementById; the React port renders modals declaratively
       and never writes inline backgrounds, so the
       body.stargazing-mode .platform-modal !important rule at
       globals.css 1255 is sufficient. */
    root.style.setProperty('--modal-bg', STARGAZING_BG);

    /* PWA theme-color meta (sim 9431). The element is mounted in
       layout.tsx with content="#111111"; we override here on flip-on
       and the ColorwayContext setColorway call on flip-off restores the
       previous colorway's hex. */
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', STARGAZING_BG);
}
