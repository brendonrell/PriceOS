# Step 3 — Patch (1 file)

The Step 3 build failed on a single TypeScript error: `AccordionBox`
declared `children` as required, but `TapeBox` doesn't pass any (its
ticker data isn't wired yet). One-line fix: make `children` optional.

| File | Path |
|---|---|
| AccordionBox.tsx | `components/dropdown/AccordionBox.tsx` |

Drag onto `dev`, commit, wait for green. After this the full Step 3
should ship as described in the original Step 3 manifest.

Commit message: `step 3 patch: AccordionBox children optional`
