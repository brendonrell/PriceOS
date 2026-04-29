# Step 3 — Patch (1 file)

Fixes the bug where clicking Settings / Artists / Portfolio / Calendar
inside the Connect Menu was closing the menu instead of swapping to
the panel.

| File | Path |
|---|---|
| DropdownContext.tsx | `lib/state/DropdownContext.tsx` |

Drag onto `dev`, commit, wait for green ✓, refresh
`https://price-os-git-dev-pricediscussion.vercel.app`.

After this:
- Click connect button → menu opens
- Click Settings (or any of the four sub-panel links) → user-dropdown
  swaps to that panel's placeholder, menu STAYS OPEN
- Click ← Back → swap back to links view, menu still open
- Click outside the menu OR press Esc → menu closes

Commit message: `step 3 patch: fix nav clicks closing menu`

Yes, more is to come — Step 4 fills in those four sub-panels for real
(Settings: wallet/themes/sort/spell book; Calendar: month grid;
Artists: directory; Portfolio: tree). Plus everything else from the
brief.
