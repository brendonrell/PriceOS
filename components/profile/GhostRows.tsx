/*
 * GhostRows — empty/private-state stand-ins for the profile row lists.
 *
 * NOT generic skeletons (Brendon 2026-06-10): each ghost row replicates
 * the REAL populated row 1:1 — it rides the real .starred-row class so
 * padding, gap, and divider come from the same CSS the live rows use,
 * and the right-side elements match the list it stands in for:
 *   starred  → fate slot + the star glyph
 *   wishlist → price slot + the Add-to-Cart button shape
 * Stepped opacity down the stack implies the list continuing. No copy.
 */

const FADES = [1, 0.65, 0.35];

export default function GhostRows({
    variant,
}: {
    variant: 'starred' | 'wishlist';
}) {
    return (
        <>
            {FADES.map((fade, i) => (
                <div
                    className="starred-row ghost-row"
                    style={{ opacity: fade }}
                    key={i}
                    aria-hidden="true"
                >
                    <div className="ghost-row-thumb" />
                    <div className="starred-row-meta">
                        <div className="ghost-row-bar ghost-row-bar-id" />
                        <div className="ghost-row-bar ghost-row-bar-sub" />
                    </div>
                    {variant === 'starred' ? (
                        <>
                            <div className="ghost-row-bar ghost-row-bar-fate" />
                            <span className="starred-row-unstar ghost-row-icon">
                                ☆&#xFE0E;
                            </span>
                        </>
                    ) : (
                        <>
                            <div className="ghost-row-bar ghost-row-bar-price" />
                            <div className="ghost-row-cart" />
                        </>
                    )}
                </div>
            ))}
        </>
    );
}
