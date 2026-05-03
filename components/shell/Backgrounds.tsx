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
 * Both are mounted unconditionally so the spell toggles can simply
 * flip a CSS flag rather than mounting/unmounting React subtrees.
 * That keeps the render path stable when the user toggles spells
 * on and off rapidly.
 */
export function Backgrounds() {
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
