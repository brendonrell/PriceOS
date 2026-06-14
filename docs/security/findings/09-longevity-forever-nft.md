# 09 — Longevity / "Forever NFT" Permanence Assessment

**Date:** 2026-06-14
**Scope:** Can PD truthfully advertise its art as the "forever NFT project" —
art that outlives the company, the website, and any third party?
**Method:** Read-only review of the deployed contract design
(`pd-contracts/src/PDProject.sol`, `PDLibraryRegistry.sol`, `PDFactory.sol`,
`PDStickers.sol`) + the website art engines (`PriceOS/lib/art/*`), benchmarked
against Art Blocks, fxhash, and SuperRare with cited sources. **No code was
modified.**

---

## 1. VERDICT

**YES — with two honest asterisks. PD's art is genuinely fully on-chain and
self-sufficient TODAY: code + seed + dependency library + preview all live on
Ethereum, and a token can fully regenerate from chain data alone with zero
servers, zero IPFS, zero CDN.** This is architecturally in the same tier as
Art Blocks' on-chain generator and strictly stronger than fxhash or SuperRare.

The two asterisks (neither breaks the core claim, both must be understood before
marketing):

1. **The per-token *preview image* (`image`) is written by a platform key after
   mint.** The canonical, self-contained artwork (`animation_url`) is fully
   on-chain and needs no one — but until the platform's writer key pins a token's
   on-chain WebP thumbnail, the `image` field is an on-chain "PRESERVING PREVIEW"
   placeholder SVG. The art is forever from mint; the *thumbnail* depends on a
   platform action that, if never taken, simply leaves the placeholder forever.
   Marketplaces lean on `image`, so "every token shows its real art on OpenSea
   day one" is **not** guaranteed by the chain alone. The art behind it always is.
2. **The on-chain self-sufficiency is only as good as the artist's script.** PD
   blocks phone-home / non-determinism patterns (`http`, `fetch`, `Math.random`,
   `Date.now`, …) at upload, but the on-chain byte-scan is bypassable
   (obfuscation, chunk-straddle) — the off-chain linter + curation are the real
   enforcement. A determined/sloppy artist *could* slip an external font or
   resource into the render path. Per-token, this is a curation guarantee, not a
   contract guarantee.

**Bottom line for marketing:** "Fully on-chain, self-sufficient generative art —
no IPFS, no servers, renders from Ethereum forever" is **TRUE and defensible
today** for the artwork itself. "Every token's image is permanent on-chain from
the moment you mint" needs the thumbnail caveat. Avoid implying the chain alone
guarantees the curated render is dependency-free — that's a curation promise.

### Contract evidence for the YES

- **Art bytes on-chain:** the generative script is stored in SSTORE2 data
  contracts; `tokenURI` inlines it — `animation_url` is a
  `data:text/html;base64,…` document with the script embedded
  (`PDProject.sol:429-443`, `getScript()` 343-348).
- **Seed on-chain + deterministic:** each token's hash is
  `keccak256(tokenId, entropy, minter)` stored in `tokenHashes`
  (`PDProject.sol:256-257`) and injected into the page as
  `tokenData.hash` (`PDProject.sol:435-437`). Same chain data → same art forever.
- **Dependency library on-chain:** p5.js / three.js etc. live in the
  `PDLibraryRegistry` as SSTORE2 chunks (base64 of gzipped source); the artwork
  page inlines the registry's raw gzip-inflater tool + the library text + a
  bootstrap that decodes and injects it as synchronous script *before* the
  artist's first line (`PDProject.sol:445-463`, `PDLibraryRegistry.sol:207-223`).
  **No CDN in the render path** for library-bound projects.
- **Immutable:** `PDProject` has no admin, no pause, no upgrade, no setter for
  art/seed/supply (`PDProject.sol:32-63`). Registry entries are append-only and
  frozen at `finalize()` forever (`PDLibraryRegistry.sol:167-178`). Each project
  *copies* the inflater id into its own immutable at construction, so a later
  registry re-designation can never reach already-sold art
  (`PDProject.sol:177-190`, registry note 71-77).

So: if every PD server and the website vanish tomorrow, any token still renders
by calling `tokenURI` on an Ethereum node and opening the returned data-URI in a
browser. Nothing off-chain is in the critical path.

---

## 2. COMPARISON TABLE

| Dimension | **PD (Price Discussion)** | Art Blocks | fxhash | SuperRare |
|---|---|---|---|---|
| Where art bytes live | **On Ethereum** (SSTORE2 script chunks) | On Ethereum (script stored on-chain) | **IPFS** (html/js bundle) | **IPFS / off-chain media** |
| Where render code lives | **On-chain HTML in `animation_url`, assembled by `tokenURI`** | On-chain, assembled by On-Chain Generator | IPFS bundle + fxhash snippet | N/A (static media file) |
| Where dependency libs live | **On-chain** (PDLibraryRegistry, gzip+SSTORE2) | **On-chain** (Dependency Registry, gzip) for ~90% of flagship; ~10% name a CDN | IPFS (ONCHFS content-addressed) / pinning | N/A |
| Seed / determinism | **On-chain `keccak` token hash, injected into page** | On-chain token hash | On-chain hash (Tezos), injected | N/A (1/1, no seed) |
| What's needed to re-render in 100 yrs | **An Ethereum node + a browser. Nothing else.** | Ethereum node + browser (for the on-chain ~90%) | A *surviving IPFS pin* + browser | A surviving IPFS/host pin |
| Single points of failure | Thumbnail writer key (preview only); curation (per-token script purity); Ethereum itself | Ethereum; the ~10% CDN-dependent projects | **IPFS pinning** (file gone if all nodes unpin); pinning-service solvency | **IPFS/host pinning + marketplace** — weakest |
| Honest "forever" grade | **A−** | A | C+ | D |

*Grades: PD = A− (art self-sufficient on-chain; docked for the off-chain thumbnail
writer + curation-not-contract script purity). Art Blocks = A (the on-chain
reference standard; ~10% CDN-dependent projects are the only gap). fxhash = C+
(decentralized but pinning-dependent — content disappears if unpinned). SuperRare
= D (centralized/IPFS media; "exists on-chain but points to nothing" if a pin
drops).*

PD sits beside Art Blocks and the fully-on-chain SVG cohort (Nouns, Chain
Runners, OnChainMonkey), all of which render from chain data with no IPFS and no
servers — and well above the IPFS-dependent platforms (fxhash, SuperRare).

---

## 3. PD-SPECIFIC LONGEVITY RISKS / SPOFs

| # | Risk | Severity to "forever" | Reality |
|---|---|---|---|
| R1 | **Off-chain thumbnail writer key** — `image` is a placeholder SVG until a platform key pins the on-chain WebP (`PDProject.sol:287-325`). If PD never pins, marketplaces show the placeholder forever. | Medium (cosmetic, not the art) | The *art* (`animation_url`) is always fully on-chain; only the preview image waits on a platform action. Write-once + size-capped, so once pinned it is permanent and not even the writer can alter it. |
| R2 | **Curation, not contract, guarantees script purity** — the on-chain byte-scan (`PDFactory.sol:387-399`) is bypassable (obfuscation, chunk-straddle, missed APIs like `crypto.getRandomValues`). | Medium (per-token) | A bad/sloppy artist could embed an external font/resource, making *that token* depend on an off-chain host. Off-chain linter + whitelist are the real gate. Platform-level claim holds; per-token it's a curation promise. |
| R3 | **Hand-rolled assembly in the read path** — `PDProject._reclaim` (483-497, deliberately not memory-safe) and `PDLibraryRegistry.readLibrary` (207-223). If wrong, `tokenURI` could return corrupt bytes — and the deploy is immutable. | Low (verified) but high-blast-radius | Audit 06 re-confirmed both correct against current call sites + Solady v0.1.26 layout. README's external-firm + byte-equivalence proof before mainnet still stands — this is the right last gate. |
| R4 | **Registry completeness / availability** — a library-bound project reads its frozen registry entry at `tokenURI` time. The bytes are immutable, but the project must point at a *finalized* entry (enforced at construction, `PDProject.sol:181-190`). | Low | Entries are append-only and frozen forever; the inflater id is copied into each project's immutable, so re-designation can't reach sold art. Self-contained once minted. |
| R5 | **No admin can alter art** — confirmed. Admin reach ends at fee wallets, the storage-fee dial (bounded corridor), and the thumbnail writer key. Admin cannot touch supply, ownership, seed, or the script. (`PDFactory.sol:14-42`, `PDProject.sol:32-63`) | None | This is a genuine strength — most "on-chain" projects retain an upgrade/metadata admin. PD does not. |
| R6 | **Storage-fee centralization** — minting requires a live fee read from the factory; fee goes to a platform wallet. | None to existing art | Affects *future mints* only, never minted tokens. Fee is bounded by an immutable corridor; no oracle, nothing off-platform can halt minting. Existing art is untouched. |
| R7 | **PDStickers has no metadata escaping** — `uri()` emits admin-supplied name + raw SVG with no JSON/SVG escaping (`PDStickers.sol:230-249`). | Low (admin-only, self-inflicted) | A stray `"` in a sticker name breaks that token's JSON. Admin-only input; stickers are a side collection, not the core "forever art" claim. |

---

## 4. THE LEVER — making "forever" honestly advertisable

### Marketing-SAFE to claim TODAY (no code change needed)
- "Fully on-chain generative art — the code, the seed, and the dependency
  library all live on Ethereum. No IPFS, no servers, no CDN in the render path."
- "Every artwork regenerates from the blockchain alone, forever — if our website
  and company disappear, your token still renders."
- "Immutable by design — no admin, no upgrade, no pause can ever change the art,
  the supply, or who owns it."
- "On par with the on-chain standard set by Art Blocks; beyond IPFS-dependent
  platforms where art can vanish if a file is unpinned." (Cite the contrast,
  don't name-bash.)

### Must change / qualify FIRST (before stronger claims)
1. **Thumbnail permanence.** Either (a) commit operationally to pinning every
   token's on-chain WebP at mint (so `image` is real art on-chain immediately),
   or (b) market the placeholder honestly as "preview generates on-chain; full
   image pinned on-chain shortly after mint." Do **not** claim "your image is
   permanent on-chain from mint" until pinning is guaranteed. *This is the single
   gap between "A−" and "A."*
2. **Per-token purity claim.** Advertise self-sufficiency at the *platform/
   curation* level, not as a per-token contract guarantee, until the off-chain
   linter is hardened (catch `crypto.getRandomValues`, `performance.now`,
   `Date.parse`, chunk-straddle, base64-embedded URLs). Closing R2 lets you say
   "every token is dependency-free" as a near-guarantee instead of a promise.
3. **External assembly proof.** Get the external-firm audit + byte-equivalence /
   symbolic proof of the two hand-rolled assembly blocks (R3) before mainnet.
   Until then, "renders forever" rests on an internal verification; after, it's
   provable. This is already on record as the final pre-mainnet gate.
4. **(Optional, strengthens the story) Document the manual re-render path** —
   publish the one-paragraph "how to render any PD token from an Ethereum node
   with no PD involvement" recipe. It turns "trust us, it's on-chain" into
   "here's how anyone proves it." Pure docs, zero code risk.

---

## 5. LONGEVITY BEYOND THE ART

**Contract immutability — A.** `PDProject`, `PDFactory`, and `PDLibraryRegistry`
have no upgrade proxy and no art/supply/ownership mutability. Registry entries
freeze at finalize. The only live dials are fee plumbing (bounded) and the
thumbnail writer — none can rewrite history. This is genuinely rare and is PD's
strongest permanence asset.

**What degrades gracefully vs hard-fails if the off-chain stack rots:**

| Component | If it vanishes | Result |
|---|---|---|
| PD website / Next.js app | Gone | **Degrades gracefully** — art still renders from `tokenURI` on any node + browser. Discovery/UX lost, art preserved. |
| Supabase / API / indexer | Gone | **Degrades gracefully** — these are social/index layers, never in the art's critical path (on-chain = source of truth per CLAUDE.md §2). |
| The website art engines (`lib/art/*`, prisms/oracle/ai) | Gone | **No effect on minted art.** These are the *off-chain preview/gallery* renderers, NOT the canonical render. The canonical render is the artist's on-chain script. (Confirmed: `prismsCore.ts` etc. are website-side; the chain inlines a separate artist script.) |
| Thumbnail writer key | Lost | Unpinned tokens keep the placeholder SVG forever; art unaffected. **Soft-fails** (cosmetic). |
| Platform/storage fee wallets | Dead contract | Halts **future minting** platform-wide (push-payment trade-off, L1 in audit 06). **Does not touch minted art.** |
| IPFS / Arweave | N/A | **PD does not depend on either for the art.** ("storageFeeWriter" name is a vestige of an old Arweave design; the bytes are on Ethereum now.) |

**The honest one-liner:** PD's *art* is forever in the strong sense — it
hard-fails on nothing short of Ethereum itself disappearing. The *platform around
it* (discovery, social, future minting) depends on the usual off-chain stack, but
every one of those failures degrades gracefully and leaves already-minted art
fully intact and self-rendering.

---

## Sources

- Art Blocks — on-chain storage & Dependency Registry (p5.js/three.js on-chain,
  gzip, ~90% flagship fully on-chain, ~10% CDN):
  https://docs.artblocks.io/protocol/on-chain-storage/ ·
  https://www.artblocks.io/articles/true-on-chain-preservation-a-four-year-journey ·
  https://docs.artblocks.io/protocol/overview/
- fxhash — IPFS-stored html/js, on-chain hash injection, pinning dependency,
  ONCHFS content-addressed deps:
  https://docs.fxhash.xyz/fxh/protocol-overview ·
  https://docs.fxhash.xyz/knowledge-base/quickstart/web3-storage/onchfs
- SuperRare / IPFS permanence weakness ("exists on-chain but points to nothing"
  if unpinned; pinning-service solvency risk):
  https://www.coindesk.com/opinion/2022/01/20/ipfs-filecoin-and-the-long-term-risks-of-storing-nfts ·
  https://thespotlite.net/ipfs-vs-centralized-nft-storage-which-one-actually-keeps-your-digital-art-safe
- Fully-on-chain SVG gold standard (Nouns, Chain Runners, OnChainMonkey — no
  IPFS, render from `tokenURI`):
  https://opensea.io/blog/articles/how-chain-runners-sparked-300-onchain-nft-collections ·
  https://www.fullyonchain.art/articles/why-fully-on-chain
- Internal corroboration: `docs/security/findings/06-contracts.md` (assembly
  blocks verified; L1/L2/L3 trade-offs; admin scope).
