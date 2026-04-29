# PriceOS · Phase 2 · Step 3 (Connect Menu)

**Branch:** `dev`. Same upload flow as before — drag everything onto the upload area, commit, wait for green, screenshot.

## What this step adds

Click the connect button (the small black square top-right). Menu opens.

What you see:

- **Connect button expands** from `⟠` to `⟠ @brendon`
- **PriceSprite + ❹❷ level badge appear** to the left of it (hidden when menu is closed — fixed in step 2.1, fully wired here)
- **Dropdown panel drops down** below the button with:
  - Global Search bar at top (click the "Global Search" label to type)
  - Three icons on the right: `▰` Menu Tape · `⥹` Top Bar Calendar · `▦` Calendar
  - **Profile** row with follower/following counts (`⚬ 850 ⚯ 2.2k`)
  - **Discord** link
  - **Artists** (clicks swap the panel to the Artists view)
  - **Portfolio** (similar)
  - **Settings** (similar) with inline `0.057 gwei ⍞`
  - **Log Out** button at the bottom
- **Three accordions** below the panel:
  - PINGS (8 items, expanded by default)
  - TO-DOS (5 items, click header to expand)
  - NOTES (30 items with markdown — **bold**, _italic_, `code` — click header to expand)
- Click outside or hit Escape to close
- Click any of Artists / Portfolio / Settings / Calendar — the panel swaps in a placeholder for that section. Click the back arrow to return to the main links view.

## What's deferred to step 4

The internals of the four sub-panels (Settings / Calendar / Artists / Portfolio). The navigation works, you reach the panels, but their full content (theme picker, spell book, calendar grid, artist list, portfolio tree) lands in step 4. Each placeholder labels what's coming.

Also deferred: the cart button, sprite click, and level badge click — they're visible chrome but their modals (PriceSprite identity card, cart panel) come with the modal stack in step 7.

## Files

| File | Type | Path |
|---|---|---|
| globals.css | **REPLACEMENT** | `app/globals.css` |
| layout.tsx | **REPLACEMENT** | `app/layout.tsx` |
| PdNotifsContext.tsx | **REPLACEMENT** | `lib/state/PdNotifsContext.tsx` |
| UserMenuButtons.tsx | **REPLACEMENT** | `components/shell/UserMenuButtons.tsx` |
| DropdownContext.tsx | NEW | `lib/state/DropdownContext.tsx` |
| markdown.tsx | NEW | `lib/markdown.tsx` |
| mockPings.ts | NEW | `lib/data/mockPings.ts` |
| mockTodos.ts | NEW | `lib/data/mockTodos.ts` |
| mockNotes.ts | NEW | `lib/data/mockNotes.ts` |
| AccordionBox.tsx | NEW | `components/dropdown/AccordionBox.tsx` |
| DropdownStack.tsx | NEW | `components/dropdown/DropdownStack.tsx` |
| GlobalSearchBar.tsx | NEW | `components/dropdown/GlobalSearchBar.tsx` |
| LinksView.tsx | NEW | `components/dropdown/LinksView.tsx` |
| NotesBox.tsx | NEW | `components/dropdown/NotesBox.tsx` |
| PanelPlaceholder.tsx | NEW | `components/dropdown/PanelPlaceholder.tsx` |
| PingsBox.tsx | NEW | `components/dropdown/PingsBox.tsx` |
| TapeBox.tsx | NEW | `components/dropdown/TapeBox.tsx` |
| TodosBox.tsx | NEW | `components/dropdown/TodosBox.tsx` |
| UserDropdown.tsx | NEW | `components/dropdown/UserDropdown.tsx` |

19 files total. 4 replacements, 15 new.

## Drop instructions

Same as before: download the zip, unzip, drag the contents of the unzipped folder onto the upload area on `dev`, commit, wait for the green check on Vercel, find the latest dev preview URL in the Deployments sidebar.

Suggested commit message: `step 3: Connect Menu — open/close + default view`

## What to look for after deploy

1. Click the small black square top-right of the navbar.
2. It expands to show `⟠ @brendon`. Sprite + ❹❷ appear to its left.
3. The dropdown panel appears below with all the elements listed above.
4. Click PINGS / TO-DOS / NOTES headers — only one expands at a time.
5. Click outside the menu — everything closes.
6. Re-open, click Settings — panel swaps to a labelled placeholder. Click ← Back. You're back at the links view.
7. Hard reload — your menu state shouldn't leak across reloads (no auto-open).

## If the build fails

Send me the Vercel build log. Most likely culprit is still relative import paths if the repo structure differs from what I assume.

— Opus 4.7
