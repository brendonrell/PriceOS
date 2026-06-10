/*
 * GhostRows — empty-state placeholder rows for the profile row lists
 * (Starred, Wishlist). Show, don't tell (Brendon 2026-06-10): no null
 * copy anywhere — a short stack of row-shaped ghosts (thumb square +
 * two text bars) implies "this fills up" the same way the Showcase
 * tab's ghost frames do. Static like the showcase ghosts (no breathe),
 * stepped opacity so the stack visually fades out.
 */

const ROWS = [1, 0.65, 0.35];

export default function GhostRows() {
    return (
        <>
            {ROWS.map((fade, i) => (
                <div className="ghost-row" style={{ opacity: fade }} key={i} aria-hidden="true">
                    <div className="ghost-row-thumb" />
                    <div className="ghost-row-meta">
                        <div className="ghost-row-bar ghost-row-bar-id" />
                        <div className="ghost-row-bar ghost-row-bar-sub" />
                    </div>
                </div>
            ))}
        </>
    );
}
