# PriceOS · Phase 2 · Step 4 (Settings Panel)

**Branch:** `dev`. Same upload flow.

## What this step adds

Click the connect button → click **Settings** in the dropdown → the full Settings panel appears.

Six sections, top to bottom:

1. **WALLET** — `0x1234...abcd` handle (tap to copy) with copy / incognito / RPC ping icons; ENS pills row showing 3 visible + a `…more` button to expand the rest; balance row showing `17,450.54 PRICE` with an eyeball toggle that hides the number.

2. **MY PD** — header with a setup-code field (`‰ARTS-IDAS`); profile theme color picker row with hex display; two rows of mode toggles (Pure Light, Pure Dark, Price Logo, Anon, Zen, Sticker, Echo Chamber, Zero Context, Price Lens, Sentiment, ASCII-ID, Degen, Redacted, The Tape, Auto-Scroll). Most are wired to `pdNotifs` and persist across reloads.

3. **DEFAULT THEME** — 7 theme pills (Artist, Light, Dark, Orange, HashSyn, Blue, Red). Tap any one to switch the entire site theme — `--bg-color` and `--text-color` flip with YIQ contrast. Selection persists.

4. **DEFAULT SORT** — `# ID` / `$ PRICE` / `FEED` / `FOG`. Single-active radio. Persists. The sort behavior wires to actual gallery rendering once the collection page lands in a later round.

5. **MY PINGS** — 7 toggles: Pingtoasts, Mints, Lists, Offers, Xfers, Mutuals, Silent (night). All persist.

6. **WORKSPACE SWITCHER** — three small dots at the bottom (Default / Work / Play) plus a `+` for adding more. Tap a dot to mark it active. Workspace-driven config swap lands in a later round.

**Triple-tap on the "MY PD" header** swaps the middle of the panel to the **SPELL BOOK** — 21 pills (Digital Familiar, Cartel, Spite Book, Gravity, Celestial Tracker, Tribunal, Panopticon, Invisible, Tarot Spread, Price Ghost, Portal, Solar Flare, Stargazing, Offer Shield, Sybil Net, Gossip Protocol, Aura, Arbitrage Map, Mood Ring, Price Lens, The Hammer). Each pill toggles its `spell_*` flag in `pdNotifs`. Triple-tap "SPELL BOOK" header to swap back. Wallet section + Workspace switcher stay visible across both views.

Also fixed: **mobile navbar margins** now match the sim (15px top, 20px horizontal — was 20px / 16px). The cluster on the right side of the navbar should sit visibly inside the page edges instead of hugging them.

## What's deferred

These render but don't yet do anything:
- Setup-code apply (it's read-only display until the encode/decode roundtrip lands alongside the actual spell behaviors)
- Profile color picker custom hex
- RPC ping latency popover
- Incognito proxy panel
- Pure Light / Pure Dark intensifying the theme bg
- Per-spell behaviors (Familiar visibility, Stargazing background swap, Price Ghost reveal, Hammer overlay etc.) — the toggles persist but each spell's downstream rendering lands when its target component does
- Workspace switching (changing `pdNotifs` to a saved profile)

These come in dedicated rounds:
- **Calendar panel** — month grid + day-events column
- **Artists panel** — A–Z directory with filter pills
- **Portfolio panel** — Main / Shadow / $ tabs + per-collection tree

## Files

| File | Type | Path |
|---|---|---|
| globals.css | **REPLACEMENT** | `app/globals.css` |
| layout.tsx | **REPLACEMENT** | `app/layout.tsx` |
| ThemeContext.tsx | **REPLACEMENT** | `lib/state/ThemeContext.tsx` |
| UserDropdown.tsx | **REPLACEMENT** | `components/dropdown/UserDropdown.tsx` |
| SortContext.tsx | NEW | `lib/state/SortContext.tsx` |
| spells.ts | NEW | `lib/data/spells.ts` |
| SettingsToggle.tsx | NEW | `components/dropdown/settings/SettingsToggle.tsx` |
| SettingsView.tsx | NEW | `components/dropdown/settings/SettingsView.tsx` |
| WalletSection.tsx | NEW | `components/dropdown/settings/WalletSection.tsx` |
| MyPdSection.tsx | NEW | `components/dropdown/settings/MyPdSection.tsx` |
| ThemePicker.tsx | NEW | `components/dropdown/settings/ThemePicker.tsx` |
| DefaultSortRow.tsx | NEW | `components/dropdown/settings/DefaultSortRow.tsx` |
| MyPingsRow.tsx | NEW | `components/dropdown/settings/MyPingsRow.tsx` |
| SpellBookSection.tsx | NEW | `components/dropdown/settings/SpellBookSection.tsx` |
| WorkspaceSwitcher.tsx | NEW | `components/dropdown/settings/WorkspaceSwitcher.tsx` |

15 files. 4 replacements, 11 new.

## Drop instructions

Same flow: download zip, unzip, drag the contents of the unzipped folder onto the upload area on `dev`, commit, wait for the green ✓.

Suggested commit message: `step 4: Settings panel`

After it builds, refresh `https://price-os-git-dev-pricediscussion.vercel.app` and click connect → Settings.

— Opus 4.7
