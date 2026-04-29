/**
 * Phase 1 homepage placeholder.
 *
 * Server-rendered, force-dynamic so the gradient regenerates on every
 * request rather than being baked at build time. Brendon's noted
 * affinity for the random-gradient placeholder aesthetic during
 * prototyping — putting it in the foundation as a low-stakes brand
 * presence until / becomes the global feed in Phase 5.
 *
 * Replaces the D1 "pipeline confirmed" proof page.
 */

export const dynamic = 'force-dynamic';

// Curated palette pool — bright, saturated, on-McDonalds2050-brand.
// Every gradient draws two colours from this pool; pairs that include
// Hothurt or Attention surface those brand colours organically.
const HUES = [
    '#FF0055', // hothurt
    '#FFE600', // attention
    '#6366F1', // PRISMS indigo (current prototype default)
    '#FF8A3D', // orange (Brendon's permanent personal mode)
    '#0d0618', // stargazing dark
    '#c5a8f0', // stargazing accent
    '#00C896', // PD modal-bg green
    '#FF3D7F',
    '#3DD9FF',
    '#A2FF3D',
    '#FF3D3D',
    '#3D6BFF',
];

const ANGLES = [0, 22, 38, 45, 90, 135, 180, 225, 270, 315];

function pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]!;
}

function pickPair<T>(arr: readonly T[]): [T, T] {
    const a = pick(arr);
    let b = pick(arr);
    while (b === a) b = pick(arr);
    return [a, b];
}

export default function Page() {
    const [c1, c2] = pickPair(HUES);
    const [c3, c4] = pickPair(HUES);
    const angle = pick(ANGLES);

    // Layered gradient: a primary linear gradient with a soft radial
    // overlay for atmosphere. Inline style so each request gets fresh
    // values — CSS variables would require a re-render mechanism we
    // don't need yet.
    const gradStyle: React.CSSProperties = {
        backgroundImage: `
            radial-gradient(circle at 30% 20%, ${c3}55 0%, transparent 55%),
            radial-gradient(circle at 75% 80%, ${c4}40 0%, transparent 60%),
            linear-gradient(${angle}deg, ${c1} 0%, ${c2} 100%)
        `,
    };

    return (
        <main className="p1-shell">
            <div className="p1-grad" style={gradStyle} aria-hidden="true" />
            <div className="p1-content">
                <h1 className="p1-wordmark">
                    <span className="price">Price</span>
                    <span className="discussion">Discussion</span>
                </h1>
                <div className="p1-status">
                    <b>PriceOS · Phase 1.</b> Foundation laid. Token system,
                    routing architecture, and design language wired. The
                    Collection page port lands next.
                </div>
                <div className="p1-foot">
                    pricediscussion.com — porting in public
                </div>
            </div>
        </main>
    );
}
