# BRIEF — Split the giants (12k-line stylesheet + the 800-line club)

**For a fresh Opus 4.8 chat. Read `CLAUDE.md` first and obey all of it.
Origin: hardening item 14 (deferred) + Architect Report round 2 §3.4.
Pure-risk mechanical refactor: zero behaviour change is the entire spec.
One giant per PR, each independently approved.**

## Why (the bug class, not aesthetics)

`app/globals.css` is 12,098 lines and still growing (+500 in four days).
The albums-grid class collision — two surfaces silently sharing one class —
burned a full session, and that bug class scales with the file. The page
bodies (ProfilePageBody 2,057 · CartographyModal 1,658 · StarredList 1,624 ·
ArtworkPageBody 1,372 · HomePageBody 1,156 · 43 files >800 lines) are a
context tax on every future session and a collision surface.

## Method — CSS (the load-bearing part)

1. Carve `globals.css` into `styles/{surface}.css` files (the convention
   newer features already follow), imported in EXACTLY the original source
   order — CSS cascade order is meaning; a reordered split is a rewrite.
2. **Proof = built-CSS diff**: `npm run build` before and after; the
   compiled stylesheet output must be byte-identical (or, if the bundler
   re-chunks files, concatenate the emitted css in link order and diff
   that). Any diff = stop and reconcile. No "it looks the same."
3. NO renames, NO dedupe, NO dead-rule deletion in the split PRs. While in
   there, UPDATE `docs/dead-css-candidates.md` findings — flag only;
   deletions are their own later approval (no-amputation rule).

## Method — the page bodies

Carve per-tab/per-section children with identical rendered output: props
threaded verbatim, no state reshuffling, no hook reordering beyond what the
extraction forces (and where extraction WOULD force a behaviour-relevant
change, leave that chunk in place and note it). Verify each against the
live preview surface-by-surface. Registry stays untouched here
(`engine-code-splitting.md` owns it).

## Order

globals.css (2–3 PRs by surface group) → ProfilePageBody → StarredList →
ArtworkPageBody → HomePageBody → CartographyModal. Stop wherever the
session ends cleanly; this brief survives partial completion (tick progress
here in the file).

## Done when

globals.css under ~3k lines of true globals (tokens, resets, shared
chrome) · the five page bodies each under ~800 · every PR carried its
byte-identical/rendered-identical proof · dead-css candidates flagged, not
deleted · brief deleted in the final PR.
