---
title: "Pings — Overview"
description: "PD's notification system in full: what earns a ping, the inbox and its read-by-scroll model, every glyph, and how pings reach your screen, your toasts, and your phone."
category: "pings"
keywords: ["pings", "notifications", "inbox", "unread", "push", "glyphs"]
last_updated: "2026-07-12"
---

# Pings — Overview

Pings are PD's notification primitive — the platform tapping you on the shoulder. They are designed around one promise: **a ping should be worth your attention.** Money aimed at you always is. Things your declared taste cares about usually are. Everything else stays quiet.

This section is the complete manual: this page covers what fires and how the inbox works; [Controls](/docs/pings/controls) covers every switch you own; [Artist Push](/docs/pings/artist-push) covers the artists' once-a-month channel to their holders.

## What earns a ping

**Directed at you** — always in your inbox:

| Ping | Glyph | Fires when |
| --- | --- | --- |
| Offer | ✦ | Someone offers on your piece (rapid offers roll up into one) |
| Offer accepted / countered | ✦ | Your offer resolves, either direction |
| Sold | ✶ | Your listed piece sells |
| Transfer / gift | ✸ | A piece or sticker sheet moves to or from you |
| Wishlist hit | ✛ | A piece on your wishlist gets listed or sells |
| Follow | ⚭ | Someone follows you or your project |
| Achievement | ◍ | You unlock an achievement |
| Streak | ◈ | A streak milestone lands |
| Reminder | ❍ / ▦ | A to-do you dated comes due, or a calendar item's day arrives |
| Artist Push | ✺ | An artist whose work you hold sends their monthly note |

**Your declared taste** — the five interest toggles, each with its own glyph:

| Ping | Glyph | Fires when |
| --- | --- | --- |
| Mutuals | ⚭ | Someone you BOTH follow-and-are-followed-by mints, lists, buys, or sells |
| Artists | ✺ | An artist you starred lists, sells, or drops |
| Projects | ⬚ | A project you starred sees mints, listings, or sales |
| Traits | ⨝ | A piece carrying a trait you starred gets listed or sold |
| Rarity | ❖ | A top-10-rarest piece moves in a project you hold pieces in |

**Your orbit** — the follow feed: activity by people and projects you follow (collected ✶, listed ✹, offers ✦, transfers ✸) interleaves into the same inbox, newest first. It's ambience, and it's treated that way: it never buzzes your phone.

## The inbox

The **PINGS** panel lives in the connect menu. The number beside PINGS is your **unread count** — when it reads (3), three things happened that you genuinely haven't seen. No number means you're caught up.

- **Unread pings stack on top**, full-strength, money first.
- **Seen history sinks below**, struck through, so the past stays scrollable without shouting.
- Market pings deep-link: tap an offer ping and you land on the piece with the offers panel already open — accepting is two taps from the lock screen.

## Read means READ

Opening the menu marks **nothing** as seen. A ping is only marked read once you actually **scroll the pings list** and the ping passes through view — scrolling is the proof of viewing. Stop halfway down and the ones below the fold stay unread, full-strength, still counted. Come back tomorrow and they're exactly where you left them.

## How far a ping reaches

Three escalating layers, all yours to set (detail in [Controls](/docs/pings/controls)):

1. **The inbox** — always. Every ping you haven't filtered out lands here silently.
2. **Pingtoasts** — live in-app toasts while you're browsing.
3. **3D Pingtoasts** — real lock-screen push notifications, opt-in, delivered by your recipient's own PriceSprite.

## The respect policy

Phones are sacred. PD's push rules are fixed, platform-wide, and deliberately conservative:

- **Always pushed:** offers on your work, offers resolving, your sales, gifts, wishlist hits, reminders you set yourself, and Artist Pushes (hard-capped at one per artist per project per month).
- **Budgeted:** interest and social pings (the five taste toggles, follows, mint milestones) push at most **a few times an hour** — anything past the budget lands silently in the inbox instead of buzzing you. Repeats of the same thing collapse into one.
- **Never pushed:** achievements, streaks, and the whole follow feed. You were here when you earned it; you'll see the feed when you visit.
- **Silent Mode** (⏾) mutes everything, everywhere, until you flip it back — pings still record silently.

## Further reading

- [Controls](/docs/pings/controls) — every toggle, and turning your phone on
- [Artist Push](/docs/pings/artist-push) — the artists' channel
- [The Shell](/docs/app/the-shell) — installing PD as an app (required for push on iPhone)
