'use client';

/*
 * useBodyClass
 *
 * Reads pdNotifs and applies the matching body class flags whenever
 * the state changes. The pre-hydration script in layout.tsx applies
 * the same classes synchronously before React mounts; this hook keeps
 * them in sync as state changes during the session.
 *
 * Source of truth for the flag mapping is duplicated between this hook
 * and the pre-hydration script. They MUST stay in lockstep — when a
 * new flag is added, update both.
 *
 * Build 23 — fog-mode is now driven by SortContext (sort === 'fog'),
 * not by a pdNotifs flag. Sim 8334-8338 toggles `body.fog-mode` exactly
 * when `currentSort === 'fog'`. The DefaultSortRow already wires that
 * sort key, so flipping body.fog-mode from `useSort()` here is the
 * single sim-faithful source. The dormant `notifs.fogMode` flag stays
 * in PdNotifs (no state-shape change) but is no longer consulted.
 *
 * Build 24 — feed-mode joins fog-mode as a sort-driven body class.
 * Sim 8342 + 9927 toggle `body.feed-mode` when
 * `currentSort.startsWith('feed')` — for our 'id' | 'price' | 'feed'
 * | 'fog' union that collapses to `sort === 'feed'`. globals.css 2954
 * already had `body.feed-mode .price-memory-ghost { display: none }`
 * waiting for a consumer; this wires it up. anon-mode joins as a
 * pdNotifs-driven flag (sim 9499 + 13033) — `notifs.anon` is new in
 * Build 24 and lights up sim's ascii-sprite font swap (sim 925-936)
 * plus info-line / follow-badge / follower-count / network pill /
 * artists rel pill hides (sim 3872-3879).
 *
 * Build 28 — degen-mode + zero-context-mode body classes.
 *   Sim 9330-9331 (`window._applyDegenMode` toggles `body.degen-mode`)
 *   and sim 9363-9364 (`window._applyZeroContextMode` toggles
 *   `body.zero-context-mode`) drive a stack of CSS rules that were
 *   already ported (sim 1009-1010 for degen; sim 1483, 1525-1537,
 *   3307, 3403 for zero-context) but had no React-side toggle. Both
 *   are flipped from settings rows that write `notifs.degen` /
 *   `notifs.zerocontext` (already on the PdNotifs interface since
 *   Build 26 for Setup Code roundtrip), so this hook just wires the
 *   class follow-through. Sim 9535 + 9536 + 13095 + 13036 confirm
 *   the boolean→class mapping is the entire surface.
 *
 *   Build 28 also adds the zen-mode Escape handler missing since
 *   the initial port. Sim 9519-9532: when `body.zen-mode` is active
 *   the sim attaches a window-level keydown listener that flips zen
 *   off on Escape, removes itself, and shows the "Zen Mode OFF"
 *   toast. We mirror the listener + cleanup; the body class removal
 *   and localStorage sync ride along automatically (this hook clears
 *   the class on the next render; PdNotifsContext persists zenMode
 *   on every change). The toast is owned by D28 (audit pass) and is
 *   intentionally not added here.
 *
 * Mounted once in PriceOSShell.
 */

import { useEffect } from 'react';
import { usePdNotifs } from '../state/PdNotifsContext';
import { useSort } from '../state/SortContext';
import { useToast } from '../state/ToastContext';

const TAPE_CLASS_MAP: Record<number, string | null> = {
    0: 'tape-off',
    1: 'tape-faded',
    /* Brendon list item 9 — sim 13348 lists 'tape-standard' as one of
       the 5 MODE_CLASSES; sim 13360 always adds the active one. The
       class has no CSS rules of its own (sim 1492 — "STANDARD: baseline
       CSS above; no overrides needed") but parity demands the body
       class flips on regardless so any rule that gates on
       `body.tape-standard` reads correctly. Earlier ports treated this
       slot as null because no CSS rule referenced it; that left desktop
       Standard as a no-class state, off-by-one against sim. */
    2: 'tape-standard',
    3: 'tape-bold',
    4: 'tape-framed',
};

const ALL_TAPE_CLASSES = ['tape-off', 'tape-faded', 'tape-standard', 'tape-bold', 'tape-framed'];

const ALL_FLAG_CLASSES = [
    'notes-mode',
    'aura-active',
    'pm-active',
    'stargazing-mode',
    'hammer-mode',
    'pricelens-mode',
    'fog-mode',
    'feed-mode',
    'anon-mode',
    'zen-mode',
    'sentiment-on',
    'redacted-mode',
    // Build 28 — degen + zero-context flags (sim 9330 / 9363).
    'degen-mode',
    'zero-context-mode',
    // Build 32 D20 — sticker-mode drives the .sticker-strike opacity
    // fade on the sn-sticker pill icon (sim 887 + 891).
    'sticker-mode',
    // F55 (BUG-22) — sim 9959 + 12200-12206. When asciiId is on, the
    // sprite + ❹❷ badge inside the user-menu-wrapper get hidden. Sim
    // does it imperatively via _asciiUpdateVisibility; we drive it from
    // the body class so the React port doesn't need a separate runtime
    // hide path. CSS rules in app/globals.css gate display:none on this
    // class.
    'ascii-id-mode',
    // Phase 5 mode batch 3 — echo-mode. Sim 9458-9479 + 9957 + 13039.
    // Sim flips `body.echo-mode` from `_applyEchoMode` and adds two
    // imperative DOM filters (`.notif-item` without `.ico-mutual` →
    // hide; `.artist-row` not `[data-rel="mutual"]` → hide). The React
    // port collapses the imperative walk into CSS rules in globals.css
    // gated on this class, so the only plumbing here is the body-class
    // follow-through. Sim has zero CSS rules referencing `echo-mode`
    // because it does the filter via inline `style.display`; we own
    // the CSS-driven version end-to-end.
    'echo-mode',
];

export function useBodyClass() {
    const { notifs, update } = usePdNotifs();
    const { sort } = useSort();
    const { showToast } = useToast();

    useEffect(() => {
        const cl = document.body.classList;

        // Tape mode — clear all tape classes first, then add the active one.
        ALL_TAPE_CLASSES.forEach((c) => cl.remove(c));
        const tapeClass = TAPE_CLASS_MAP[notifs.tape];
        if (tapeClass) cl.add(tapeClass);

        // Boolean flags — clear all then re-add the active subset.
        ALL_FLAG_CLASSES.forEach((c) => cl.remove(c));
        if (notifs.notes)            cl.add('notes-mode');
        if (notifs.spell_aura)       cl.add('aura-active');
        if (notifs.spell_priceghost) cl.add('pm-active');
        /* F48 — body.stargazing-mode now reads `notifs.stargazing`
           (matches sim 9370 + 9960). The earlier `spell_stargazing`
           field was a port-time slot mismatch — sim never had that key. */
        if (notifs.stargazing)       cl.add('stargazing-mode');
        if (notifs.spell_hammer)     cl.add('hammer-mode');
        if (notifs.spell_pricelens)  cl.add('pricelens-mode');
        // Build 23 — fog-mode follows SortContext, not pdNotifs (sim 8334-8338).
        if (sort === 'fog')          cl.add('fog-mode');
        // Build 24 — feed-mode follows SortContext (sim 8342 + 9927).
        if (sort === 'feed')         cl.add('feed-mode');
        // Build 24 — anon-mode follows pdNotifs.anon (sim 9499 + 13033).
        if (notifs.anon)             cl.add('anon-mode');
        if (notifs.zenMode)          cl.add('zen-mode');
        if (notifs.sentimentOn)      cl.add('sentiment-on');
        if (notifs.redactedMode)     cl.add('redacted-mode');
        // Build 28 — degen + zero-context (sim 9330 / 9363).
        if (notifs.degen)            cl.add('degen-mode');
        if (notifs.zerocontext)      cl.add('zero-context-mode');
        // Build 32 D20 — sticker-mode (sim 887 + 891). The body-class
        // follow-through replaces sim's imperative `.sticker-strike` →
        // `.strikethrough` toggle (sim 9491 / 10471) — body class drives
        // the same opacity fade via globals.css.
        if (notifs.sticker)          cl.add('sticker-mode');
        // F55 (BUG-22) — sim 9959 maps asciiId → 'ascii-id-mode'. CSS
        // hides .ascii-sprite-wrap + .ascii-pfp-badge when this class is
        // present, even with the menu open. Replaces sim's imperative
        // _asciiUpdateVisibility (sim 12200-12206).
        if (notifs.asciiId)          cl.add('ascii-id-mode');
        // Phase 5 mode batch 3 — echo-mode (sim 9460). Sim 9462-9472 also
        // walks `.notif-item` and `.artist-row` and sets inline display
        // styles; the React port replaces that imperative walk with CSS
        // rules in globals.css that gate visibility off this class. Body
        // class is the single source of truth for the filter.
        if (notifs.echo)             cl.add('echo-mode');
    }, [notifs, sort]);

    /* Build 28 — zen-mode Escape handler. Sim 9519-9532 attaches a
       window keydown listener whenever zen flips on; Escape flips zen
       off, removes the listener, removes the body class, and toasts.
       In React the listener is a useEffect keyed on zenMode: mount
       while active, cleanup when it flips off (or the shell unmounts).
       Setting `zenMode: false` via update() triggers the main effect
       above to drop the body class and PdNotifsContext to persist
       to localStorage — same end state as the sim.

       Build 29 D28 — emit `showToast('Zen Mode OFF')` (sim 9526) so
       the Escape path produces the same toast feedback as toggling
       zen off via the MyPdSection pill. The pill route generates the
       same string via `toggleWithToast('zenMode', 'Zen Mode')`, so
       both paths surface identical text. */
    useEffect(() => {
        if (!notifs.zenMode) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                update({ zenMode: false });
                showToast('Zen Mode OFF');
            }
        };
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
        };
    }, [notifs.zenMode, update, showToast]);
}
