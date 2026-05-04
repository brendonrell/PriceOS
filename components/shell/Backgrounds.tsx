/*
 * Backgrounds
 *
 * Mounts the two "always present, default off" background layers:
 *   1. #starfield — fixed-position canvas-eligible layer for the
 *      Stargazing spell. Default display:none; body.stargazing-mode
 *      flips it on. Empty in step 2 — the actual star generation
 *      lands when the Spell Book is wired in a later step.
 *   2. #digital-familiar — fixed-position bottom-left ASCII entity
 *      for the Familiar spell. Default display:none via the parent
 *      style; spell_familiar toggle reveals it. Empty sprite +
 *      badge + bubble in step 2 — the species + animation logic
 *      (and the dialogue text rendered into #familiarBubble) lands
 *      later. Mirrors sim.html:4265-4269.
 *
 * Build 9 — explicit `enable` prop:
 *   The Vercel preview surfaced an issue where Backgrounds was
 *   suspected of running canvas/animation work on every page load
 *   (heavy enough to interrupt other tab audio). The current React
 *   shell is just two empty <div>s and CSS-gated visibility, so
 *   today there is nothing to "stop" — but once the actual sim
 *   starfield builder + familiar sprite logic ports in, those will
 *   live here. Per Build 9 spec: the layers must NOT mount unless
 *   explicitly enabled. Defaulting to `false` makes opting in a
 *   conscious decision in PriceOSShell (or wherever it's mounted),
 *   which means the future star/familiar JS can never accidentally
 *   auto-run on a route that doesn't want it. CSS still does the
 *   per-spell visibility flip via body.stargazing-mode etc., so
 *   the spell-toggle wiring already in PdNotifsContext continues
 *   to work the same way once `enable` flips on.
 */

interface BackgroundsProps {
    /** Pass `true` to mount the starfield + familiar DOM nodes.
     *  Default `false` — Build 9: no auto-run on page load. */
    enable?: boolean;
}

export function Backgrounds({ enable = false }: BackgroundsProps) {
    if (!enable) return null;
    return (
        <>
            <div id="starfield" aria-hidden="true" />
            <div id="digital-familiar" aria-hidden="true" style={{ display: 'none' }}>
                <span className="familiar-sprite" id="familiarSprite" />
                <span className="familiar-badge" id="familiarBadge" />
                <span className="familiar-bubble" id="familiarBubble" />
            </div>
        </>
    );
}
