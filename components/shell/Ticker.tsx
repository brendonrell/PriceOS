/*
 * Ticker (The Tape)
 *
 * Persistent ambient activity ticker that flex-fills the space between
 * the Petey logo and the user-menu buttons. Visibility and presentation
 * are entirely CSS-driven via body.tape-* classes:
 *   - body.tape-off:    display none
 *   - body.tape-faded:  partially transparent
 *   - body.tape-bold:   weight 700
 *   - body.tape-framed: filled bar, inverted colours
 *   - default:          standard
 *
 * Step 2 ships the wrapper empty. The actual scrolling rail items
 * (sales / lists / offers / xfers events) are populated when the
 * indexer + ticker data wiring lands. Until then the wrap is just
 * transparent space — which is fine, since tape-off is the default
 * mode anyway.
 */
export function Ticker() {
    return (
        <div className="tape-wrap" id="tapeWrap" aria-hidden="true">
            <div className="tape-rail" id="tapeRail" />
        </div>
    );
}
