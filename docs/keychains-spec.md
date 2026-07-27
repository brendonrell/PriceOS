# PD KEYCHAINS — the capsule machine (system spec)

> Locked with Brendon 2026-07-27 ("Let's build it!!!"). Contracts SHIPPED on
> `pd-contracts` branch `claude/nft-generative-keychains-044gz5` (PDKeychains ·
> PDKeychainRenderer · PDKeychainShapes/Faces, 23 tests, suite 372/372).
> App-side build is QUEUED — **waiting on Brendon's doors** (his words: "I need
> to figure out the doors"). Nothing gets wired into the app until he names
> them (CLAUDE.md Rule #-0.4).

## What it is

The second collectible tier beside Stickers — but every Keychain is a
**one-of-one generative charm on its own ERC-721** (Brendon: "maybe not
ERC-1155 this time"). Little y2k hard-plastic/hard-rubber characters with
googly faces, rubber-hose arms, white gloves, chunky shoes, hanging from a
keyring. **The art is drawn entirely by the contract** — no stored images, no
IPFS/Arweave, transparent background so charms sit on any PD surface. They
swing on the ring and blink (CSS inside the SVG itself).

Reference: Brendon's pink-card photo of the two heart characters (2026-07-27)
+ Graphix Artiste googly-eye vector language. THE look.

## The living layer (the innovation)

- **THE CHAIN IS THE STREAK** — "don't break the chain," literal. Bare CORD →
  4 links at 7d → 6 at 30d → 8 at 60d (FORGED) → 10 at 100d (HEAVY) → 12
  GOLD links at 365d → CHROME chain at 1000d.
- **THE FINISH IS THE RANK** — PriceRank tier recasts the toy: base → GLOSS
  (t3) → GLITTER (t5) → GOLD (t7) → CHROME (t9+).
- **POLISH** — the sync ritual. The app signs the keeper's current
  PriceStreak + PriceRank (EIP-712, **factory settlement key** — no new key
  infra); the keeper submits; the charm updates. Keeper pays pennies of gas;
  the platform pays $0, forever. Nonce + deadline; values are
  signature-bound (inflated claims revert — tested).
- **BONDED** — every hand-to-hand transfer wipes the polish (shine = the
  keeper's life, not a purchasable state). A maxed keychain can't be bought,
  only lived.
- **CHRISTEN** — name the charm once, ever (2–12 chars, A–Z 0–9 space);
  engraved on a white tag on the ring. The name is the charm's OWN identity
  and survives transfers.

## Genes (rolled at crank, frozen forever)

12 shapes (HEART 16% … ALIEN 2% — the chase pull) · 12 palettes (BUBBLEGUM …
STATIC) · material PLASTIC 70 / RUBBER 30 (the miniplayer domed gradient,
ported verbatim; rubber = flattened dome, no glint) · 9 eye styles (GOOGLY,
ROUND, WINK, SLEEPY, STARRY, HEARTS, SPIRAL, X X, VISOR) · 7 mouths · 3 brow
states · 5 poses (PEACE 40% — one hand up, fingers splayed, thumb folded
horizontal on the INSIDE; WAVE; CHEER; HIPS; CHILL) · 6 accessories (NONE,
BOW, HALO, CROWN, ANTENNA, WINGS) · boots/sneakers · socks · blush.

**Eye upgrade round is QUEUED** (Brendon: "we can def improve the eyes, or
add even more detailed options") — candidates on his desk when he wants
them: dizzy, lasers, sunglasses, 3D glasses, lashes, teary, iris colors.

## Money (settled)

- **Paid, not free** — the capsule-machine crank: insert ~$22 in ETH (price
  admin-tunable like sticker sheets), a random charm drops. One per crank.
  EOA-only (no bundle-reroll sniping), Project-mint entropy recipe.
- **Open edition** (Brendon approved) — no supply cap; machine has an on/off
  switch. Prestige comes from the living layer, not scarcity.
- Split verbatim from the sticker shop: **5% platform (live factory read) +
  95% admin**, pushed inside the purchase tx, nothing rests in the contract.
  **5% ERC-2981 royalty** to the shared vault. Secondary trades on PD's book.
- Renderer is swappable by admin until `lockRenderer()` — then the art is
  frozen forever (art-bugfix window; Brendon calls the lock).

## App side — QUEUED on Brendon's doors

Decided concept, placement TBD by Brendon:
1. **The capsule machine** (store surface — where you crank). Door: TBD.
2. **The equipped mini charm** — keeper picks ONE keychain to wear; it
   renders as a mini charm **at the end of the profile tags** (his idea —
   the flex loop). Nothing shows until the keeper equips one (default-off
   law). Tap → the full charm. Exact treatment TBD with him.
3. **POLISH button** on the keychain view + the signing endpoint
   (settlement key already lives app-side). Door: TBD.
4. Test-phase note: runs on sim-ETH in-app like the sticker store until the
   mainnet cutover; the contract is the mainnet machine.

## Facts future sessions need

- Contracts repo branch `claude/nft-generative-keychains-044gz5`:
  `src/PDKeychains.sol` (machine · polish · christen · bond),
  `src/PDKeychainRenderer.sol` (genes + assembly + attributes),
  `src/PDKeychainParts.sol` (shapes + faces part stores — EIP-170 split; the
  three are one artist, referenced immutably).
- `charmSVG(tokenId)` exists specifically for app surfaces (mini charm etc.).
- SVG ids are suffixed per-token (`#f{id}`, `#c{id}`) so multiple charms can
  inline on one page without gradient/clip collisions.
- JS twin of the renderer + preview harness lives in the session scratchpad
  (`keychains/engine.mjs`) — art iteration happens there, then ports.
- Deploy order: Shapes → Faces → Renderer(shapes, faces) →
  PDKeychains(factory, renderer, royaltyVault, priceWei) → `setActive(true)`.
  On-chain deploys are Brendon's (Remix, ship gate §4).
