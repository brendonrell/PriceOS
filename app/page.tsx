import Link from "next/link";

// D1 PROOF PAGE
// Verifies: Next.js App Router works · Rubik Mono One loaded ·
// Courier New fallback · brand tokens render · Vercel build green.
// Replace with real homepage port in a later sprint.

export default function Home() {
  return (
    <main className="proof">
      <h1 className="proof-logo">
        Price<span className="pm">Discussion</span>
      </h1>

      <p className="proof-status">
        <strong>D1 · Pipeline confirmed.</strong>
        <br />
        If you can read this on Vercel with Rubik Mono One above and the
        brand stripes below, the GitHub → Vercel loop is live. Ready for
        D2 (collection port).
      </p>

      <div className="proof-stripes">
        <div className="stripe stripe-ink">INK &middot; #111111</div>
        <div className="stripe stripe-hothurt">HOTHURT &middot; #FF0055</div>
        <div className="stripe stripe-attention">ATTENTION &middot; #FFE600</div>
        <div className="stripe stripe-paper">PAPER &middot; #E0E0E0</div>
      </div>

      <nav className="proof-routes">
        <div style={{ opacity: 0.5, fontSize: 11, marginBottom: 4 }}>
          ROUTE SHELLS (all empty in D1):
        </div>
        <Link href="/collection/portals">/collection/portals</Link>
        <Link href="/profile/brendon">/profile/brendon</Link>
        <Link href="/token/1">/token/1</Link>
        <Link href="/artist/piterpasma">/artist/piterpasma</Link>
        <Link href="/mint/portals">/mint/portals</Link>
      </nav>
    </main>
  );
}
