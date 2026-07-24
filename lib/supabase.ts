import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PriceSpriteVibe } from './sprites/vibes';
import type { ResolvedSprite } from './sprites/composer';
import type { TodoItem } from './todos/types';

// ─────────────────────────────────────────────────────────────────────────────
// Database row types — mirror the Postgres schema exactly.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Per-user persisted state shapes (jsonb columns on `users`).
//
// These are the typed contracts for the "log in anywhere, exactly as you left
// it" feature: the server row is the single source of truth and the client
// caches mirror it. Keep these in sync with the migration that seeds the column
// defaults — the CHECK on `showcase` enforces exactly 6 slots in Postgres.
// ─────────────────────────────────────────────────────────────────────────────

/** Active colorway key. Mirrors ColorwayKey in lib/state/ColorwayContext, minus
 *  'hashsyn' (never persisted — it needs live canvases per session). */
export type PersistedColorway =
  | 'custom'
  | 'light'
  | 'dark'
  | 'orange'
  | 'blue'
  | 'red'
  | 'hothurt'
  | 'attention'
  | 'bblue'
  | 'kiki'
  | 'cookies'
  | 'precog'
  | 'haze'
  | null;

export interface PersistedHaze {
  /** Saved haze base hex (was localStorage `pd_haze_color`). */
  color: string | null;
  /** Saved haze variation (was localStorage `pd_haze_variation`). */
  variation: 'pure' | 'tint' | 'drift' | 'pulse' | 'chromatic' | null;
}

/** The `settings` jsonb envelope. Small scalar/boolean prefs fold in here;
 *  larger first-class state (showcase, calendar, workspaces, setup_codes) has
 *  its own dedicated column. Every field is optional so partial PATCHes merge
 *  cleanly and old rows ({}) read as all-defaults. */
export interface UserSettings {
  /** was localStorage `pd_settings_colorway`. */
  colorway?: PersistedColorway;
  /** was localStorage `pd_haze_color` + `pd_haze_variation`. */
  haze?: PersistedHaze;
  /** was localStorage `pd_settings_sort` (family key only). */
  sort?: string | null;
  /** was localStorage `pd_settings_notifs` (incl. pure_light / pure_dark). */
  notifs?: Record<string, unknown>;
  /** Starred Outputs — PRIVATE bookmarks, keyed `${slug}:${id}`. Lives in the
   *  settings envelope (never returned by the public profile read) so a visitor
   *  can't see your stars. Was localStorage `pd_starred` (device-only). */
  starred?: string[];
  /** Wishlisted Outputs — PRIVATE "want to buy" list, keyed `${slug}:${id}`.
   *  Same envelope + privacy as `starred`. */
  wishlist?: string[];
  /** Albums — named, ordered collections of Outputs (keys `${slug}:${id}`).
   *  Same envelope + privacy as `starred` until album sharing ships. */
  albums?: AlbumRecord[];
  /** Recently-viewed Outputs trail — most-recent-first visits. Each visit is
   *  `{ k: "${slug}:${id}", t: epochMs }` (t drives History's day grouping);
   *  legacy rows may hold bare `${slug}:${id}` strings. PRIVATE (owner-only),
   *  same envelope as `starred`. Account-backed so the trail follows the viewer
   *  across devices (Brendon, 2026-06-13/24). */
  breadcrumbs?: Array<string | { k: string; t: number }>;
  /** History recording paused by the user (the "Recording" L3 toggle). When
   *  true, no visits are recorded until resumed. PRIVATE. */
  breadcrumbsPaused?: boolean;
  /** To-Dos — the user's private task list (raw + output-bound). Same envelope +
   *  privacy as `starred`; account-backed so it follows the viewer across
   *  devices. Read + written by lib/todos/todoStore. */
  todos?: TodoItem[];
  /** Starred (pinned) artists — ordered list of artist names. PRIVATE, same
   *  envelope as `starred`. Account-backed so starred artists follow the viewer
   *  across devices (Brendon, 2026-06-13). Was localStorage `pd_artist_pinned`. */
  artistStars?: string[];
  /** Starred Traits — PRIVATE favourites of a (Project, category, value) tuple,
   *  keyed `${slug}|${category}|${value}`. Same envelope + privacy as `starred`. */
  traitStars?: string[];
  /** Starred Soundtracks — PRIVATE favourites of a Project's soundtrack, keyed
   *  `${slug}|${playlistId}|${title}`. Same envelope + privacy as `starred`. */
  soundtrackStars?: string[];
  /** Starred Projects — PRIVATE favourited Project slugs. Same envelope. */
  projectStars?: string[];
  /** Starred Tx — PRIVATE favourited on-chain activity events (simulated for
   *  now). Each entry is a JSON blob of the event's display essentials, keyed by
   *  event id. Same envelope + privacy as `starred`. */
  txStars?: string[];
  /** Grail Pins — the top-bar pinned set (any starred kind; GrailPin blobs,
   *  internal shape owned by lib/pins/grailStore). PRIVATE, same envelope as
   *  `starred`. Account-backed 2026-07-06 (was device-only). */
  grails?: Array<Record<string, unknown>>;
  /** Muted Outputs (the hammer), keyed `${slug}:${id}`. PRIVATE, same
   *  envelope as `starred`. Account-backed 2026-07-06 (was device-only). */
  mutes?: string[];
  /** Spite Book slots — 72-slot array, null = empty line, position preserved.
   *  PRIVATE, same envelope as `starred`. Account-backed 2026-07-06. */
  spite?: Array<string | null>;
  /** Per-user, per-page LAST-VIEWED tab. Account-backed so the viewer's tab
   *  choice on each project / profile follows them across devices and overrides
   *  the content-aware default (Brendon, 2026-06-16). Keyed by lowercased
   *  project slug / profile handle; value is that surface's tab id. */
  tabMemory?: {
    /** project slug → ProjectTab ('project-showcase' | 'artworks' | 'albums'). */
    project?: Record<string, string>;
    /** profile handle → ProfileTab ('showcase' | 'collected' | 'more'). */
    profile?: Record<string, string>;
    /** home surface → HomeTab ('minting' | 'new' | 'shuffle'). Single key. */
    home?: Record<string, string>;
  };
  /** Per-user, per-page LAST-USED grid grouping (Brendon, 2026-07-12) — same
   *  contract as tabMemory: a grouping picked inside a project stays with that
   *  project across visits and devices, and never bleeds into the next one.
   *  Keyed by lowercased project slug / profile address; value is a GroupKey. */
  groupMemory?: {
    /** project slug → GroupKey. */
    project?: Record<string, string>;
    /** profile address → GroupKey (that profile's Collected grid). */
    profile?: Record<string, string>;
  };
  /** The user's chosen Digital Familiar species name (one of the live
   *  BitDaemons). Account-backed so the companion choice follows the viewer
   *  across devices; re-pickable any time from the Familiar modal (Brendon,
   *  2026-06-16). Absent = never chosen (engine rolls a random one). */
  familiarSpecies?: string;
  /** Omniscience — whether the Familiar may weave in facts pulled live from
   *  your own account record + activity (hold times, sold-at-a-loss, streak,
   *  collections…). ON by default; flip off to keep the companion to its
   *  personality + generic chatter only (Brendon, 2026-06-22). Account-backed
   *  so the choice follows you across devices. Absent = on. */
  familiarOmniscience?: boolean;
  /** Familiar outline preference: 'off' (no outline), 'random' (the loved
   *  ~25%-chance random palette outline — the default when absent), or a hex
   *  colour string (always outline in that colour). Account-backed
   *  (Brendon, 2026-06-22). */
  familiarOutline?: string;
  /** Familiar energy / movement mood: 'chill' (default — stays in the corner),
   *  'active' (scurries the bottom, sometimes clipping off-edge and back),
   *  'hyped' | 'greed' | 'fear' | 'ngmi' (mood-tuned pace + skittishness).
   *  Account-backed (Brendon, 2026-06-22). Absent = chill. */
  familiarEnergy?: string;
  /** Ambient Light options (palette / pattern / speed / page-dim). Account-backed
   *  so the LED bar "just works" across devices (Brendon, 2026-06-16). */
  ambient?: {
    palette?: string;
    pattern?: string;
    speed?: string;
    /** Page-dim level. Number (0–100 slider) on current writes; legacy rows may
     *  still hold the old preset string ('off' | 'low' | … | 'pitch'). */
    dim?: number | string;
  };
  /** PWA conversion tracking (first-party). Stamped the first time a SIGNED-IN
   *  session runs as the installed app (standalone), then refreshed each app
   *  launch. `converted_at` = the conversion event; `last_used_at` = recency,
   *  for spotting drop-off. Query server-side via settings->'pwa'. */
  pwa?: {
    converted_at?: string;
    last_used_at?: string;
    /** Step 3 prompt funnel (best-effort): when it was shown, and what the user
     *  did — 'added'/'accepted' (took it), 'declined'/'dismissed' (skipped), or
     *  'instructed' (shown the manual Share steps). */
    prompt_seen_at?: string;
    prompt_result?: 'added' | 'accepted' | 'declined' | 'dismissed' | 'instructed';
    prompt_result_at?: string;
  };
  /** Workflows — the power-user automations (iOS-Shortcuts style). PRIVATE,
   *  same envelope + privacy as `starred`. Shape owned by lib/workflows/store. */
  workflows?: WorkflowRecord[];
  /** Notes — every private note the viewer writes, LINK-AWARE (Brendon,
   *  2026-07-10): each record says what it's attached to (an Output in a
   *  specific Project, an artist, a calendar day) — or nothing (`kind: 'free'`,
   *  the Thoughts & Memories kind, supported here ahead of its front end).
   *  Same envelope + privacy as `starred`. Shape owned by lib/notes/notesSync. */
  notes?: NoteRecord[];
  /** SOUND LAYER on/off (the ⚟ key in the workspace dots row). Account-backed
   *  so it stops resetting each session (Brendon, 2026-07-21). Was device-only
   *  localStorage `pd_sound_on`. Absent = never set (default OFF). */
  sound?: boolean;
  /** miniplayer display face ('deck' | 'signal' | 'disc'; `signal` shows as "Tab").
   *  Account-backed so the chosen face follows the viewer (Brendon, 2026-07-21).
   *  Was device-only localStorage `pd_fm_display`. Absent = deck. */
  fmDisplay?: string;
  /** COMMAND STONE stealth style — accent hex + forced stage. Account-backed so
   *  the recolour/stage survives across sessions + devices (Brendon,
   *  2026-07-21). Was device-only localStorage `pd_stone_style`. */
  stoneStyle?: { accent?: string; stage?: 'white' | 'black' };
  /** COMMAND STONE last line — the query that was up in the bubble last time,
   *  so re-opening the stone brings the same speech bubble back (Brendon,
   *  2026-07-22). Account-backed; mirror localStorage `pd_stone_last_line`. */
  stoneLastLine?: string | null;
  /** PROFILE TAGS the owner switched OFF (Brendon, 2026-07-22) — any tag, CEO
   *  included, can be hidden and tapped back on. Mirror `pd_hidden_tags`. */
  hiddenTags?: string[];
}

/** One private note in the settings envelope (lib/notes/notesSync owns it). */
export interface NoteRecord {
  /** What the note is linked to. 'free' = linked to nothing at all — the
   *  Thoughts & Memories kind; stored + round-tripped today, rendered when
   *  that front end lands. */
  kind: 'output' | 'artist' | 'day' | 'free';
  /** output kind: Project slug. Null = a legacy note written before notes
   *  were Project-keyed (its Project is unknowable after the fact). */
  slug?: string | null;
  /** output kind: Output id. */
  id?: number;
  /** artist kind: the artist's name. */
  artist?: string;
  /** day kind: calendar day, 'YYYY-MM-DD'. */
  day?: string;
  /** free kind: record id, assigned by the Thoughts & Memories front end. */
  nid?: string;
  text: string;
  /** Last text change, epoch ms — the winner-picker for future merges. */
  t?: number;
}

/** One armed Workflow in the settings envelope (lib/workflows/store owns it). */
export interface WorkflowRecord {
  id: string;
  /** What it waits for. */
  trigger:
    | { kind: 'upload'; artist: string }
    | { kind: 'price'; slug: string; tokenId: number | null; priceEth: number };
  /** What it does when it fires. Notify is always on; the rest are extras. */
  actions: {
    /** Create a to-do describing the intent (rides the To-Dos rails). */
    todo?: boolean;
    /** Mint-attempt count carried into the fired to-do / notification copy. */
    qty?: number;
  };
  armedAt: number;
  /** One-shot: set when it fires; a fired workflow keeps its record. */
  firedAt: number | null;
  /** What it fired ON (project slug), for the deep link + the record row. */
  firedSlug?: string;
}

/** One album in the settings envelope. Shape is owned by lib/pins/albumStore. */
export interface AlbumRecord {
  id: string;
  name: string;
  /** Member Outputs, keyed `${slug}:${id}`, insertion-ordered. */
  keys: string[];
  created_at: number;
  /** Chosen cover key (must be a member); absent = mosaic of the first four. */
  cover?: string;
}

/** Showcase: exactly 6 ordered slots. Slot payload shape is owned by the
 *  showcase grid workstream; null = empty slot. */
export interface Showcase {
  slots: [
    ShowcaseSlot | null,
    ShowcaseSlot | null,
    ShowcaseSlot | null,
    ShowcaseSlot | null,
    ShowcaseSlot | null,
    ShowcaseSlot | null,
  ];
}
export interface ShowcaseSlot {
  project_id: string;
  token_id: string;
}

/** Static (user-ordered) vs generative (randomised each visit). The DB column
 *  defaults to 'grid' on legacy rows; read it as 'static' for back-compat. */
export type ShowcaseStyle = 'static' | 'generative' | 'gen-curated' | 'artist';

export interface UserRow {
  address: string;
  ens_name: string | null;
  handle: string | null;
  price_sprite: PriceSpriteVibe | null;
  /** Frozen sprite resolution — composed once at signup, read on every
      render so the wallet hash is never recomputed. Null only for legacy
      rows predating the freeze (engine falls back to compute for those). */
  price_sprite_resolved: ResolvedSprite | null;
  account_level: number;
  created_at: string;
  /** $PRICE holdings — filled by the price-holdings sweep. `price_held` is the
   *  wallet's balance in whole $PRICE tokens; `price_hold_rank` is its position
   *  among named holders (1 = most), null when it holds none / isn't ranked.
   *  Drive the Top Holders board + the "$PRICE Top N · #r" earned tag. */
  price_held: number;
  price_hold_rank: number | null;

  // ── Per-user persisted state (the user-state feature) ───────────────────────
  /** The user's PROFILE COLORWAY colour — the colour the profile owner picked
   *  for their own profile. Cached client-side at `pd_profile_hex`. Distinct
   *  from the "Custom" colorway (`pd_custom_color`) and "Haze Mode"
   *  (`pd_haze_color`) — never alias them together. */
  profile_hex: string | null;
  /** The user's PROFILE LOGO pick — the id of a Profile Logo (lib/profile/
   *  profileLogos.ts) the owner chose to decorate the corner logo on their
   *  profile. Shown to every visitor of that profile, overriding the viewer's
   *  own logo setting. null = off (default logo). Cached at `pd_profile_logo`.
   *  Distinct from profile_hex (the colour) — its own slot + event. */
  profile_logo: string | null;
  /** The colour the owner picked for their PriceSprite (a #RRGGBB hex), shown
   *  to every visitor of that profile. null = inherit the colorway text colour
   *  (the default). Distinct from profile_hex/profile_logo — its own slot +
   *  event. Cached at `pd_profile_sprite_hex`. */
  profile_sprite_hex: string | null;
  /** PROFILE TAGS — the persona ids the user self-applied (the pick-your-owns:
   *  collector, trader, curator…). PUBLIC: shown on the profile above the
   *  stickers and used as filters. Self-writable via /api/me. Cached at
   *  `pd_profile_tags`. Earned + granted + id tags are NOT here — earned/id are
   *  derived (lib/tags/derive), granted lives in `granted_tags`. */
  profile_tags: string[] | null;
  /** GRANTED TAGS — tag ids an admin handed out (OG to the newpdogs crew, WTBS,
   *  Team…). PUBLIC, but NOT self-writable — assigned out-of-band, never through
   *  the user's own PATCH. */
  granted_tags: string[] | null;
  /** The user's chosen @name Unicode font id (lib/profile/nameFont). null =
   *  Default (no styling). PUBLIC (the styled @name shows to every visitor); the
   *  real handle underneath is untouched. Cached at `pd_name_font`. */
  name_font: string | null;
  /** The user's all-tags paint (lib/tags/catalog TAG_PAINTS). null = each tag
   *  wears its own colour. PUBLIC — the painted pills show to every visitor.
   *  Cached at `pd_tag_paint`. */
  tag_paint: string | null;
  /** Sequential platform number, assigned by join order (Brendon = #1). Drives
   *  the auto id-tags (#1–22 each their own, then ranges). PUBLIC, read-only —
   *  set once by the signup trigger, never user-writable. */
  user_number: number | null;
  /** Sticker ownership + active-state, synced to the account so a user's
   *  stickers follow them across devices. owned = sticker ids held; offSheets /
   *  offIds = the sheets/stickers the owner switched off. placements = the
   *  owner's hand-placed positions on their profile (id → {x,y,z} in % of the
   *  hero sticker area). compOff = ✕-removed ids scoped to one generative roll's
   *  signature (a reroll lapses them). null = none yet. */
  sticker_state: {
    owned: string[];
    offSheets: string[];
    offIds: string[];
    placements?: Record<string, { x: number; y: number; z: number; r?: number; sc?: number }>;
    placementAspect?: number;
  } | null;
  /** The account's HIDDEN, UNIQUE signature colour — assigned + uniqueness-
   *  checked at signup, surfaced only in the profile-name easter egg. Distinct
   *  from profile_hex (the colour the user actively picked). */
  signature_hex: string | null;
  /** PriceRank = your TIER (0 = unranked). Derived from price_score crossing
   *  the thresholds in lib/achievements/tiers.ts. (Model locked 2026-06-14:
   *  Score is the number, Rank is the tier it unlocks — supersedes the older
   *  "PriceRank is the one number" note.) */
  price_rank: number;
  /** PriceScore = your NUMBER. The sum of unlocked achievement points
   *  (lib/achievements/catalog.ts). The cache lives here; the unlock ledger
   *  is public.user_achievements. */
  price_score: number;
  /** PriceStreak = current consecutive-active-day count. 0 until a qualifying
   *  day; resets to 0 on a missed day (hard break, no grace). */
  price_streak: number;
  /** Longest PriceStreak ever reached — record/display only; does NOT bank
   *  Score (a broken streak still resets the live count to 0). */
  streak_best: number;
  /** Last qualifying-action LOCAL date (YYYY-MM-DD). The streak day boundary
   *  is the user's local midnight. Null until the first qualifying day. */
  streak_last_active: string | null;
  familiar_config: Record<string, unknown> | null;
  showcase: Showcase;
  /** Stored as text; 'grid' on legacy rows maps to 'static' on read. */
  showcase_style: string;
  settings: UserSettings;
  calendar_state: Record<string, unknown>;
  grid_presets: Record<string, unknown>;
  workspaces: Record<string, unknown>;
  setup_codes: Record<string, unknown>;

  // ── Discord link (verified once via Discord, then displayed on the profile) ──
  /** The linked Discord account's numeric user id — the stable key, and what
   *  the profile link points at (discord.com/users/{discord_id}). Null = not
   *  linked. */
  discord_id: string | null;
  /** The linked Discord account's display name, shown on the profile. */
  discord_username: string | null;
  /** The Discord avatar HASH (not the image). The pfp streams from Discord's
   *  CDN: cdn.discordapp.com/avatars/{discord_id}/{discord_avatar}.png — we pay
   *  no image storage. Null = no custom avatar (use the default blob). */
  discord_avatar: string | null;
  /** THE SIGIL — when this wallet forged its personal mark (Factions v3.1
   *  §1). Null = unforged. Set once via the forge (/api/me guarded write);
   *  never cleared — a tattoo. The mark itself is never stored: it's
   *  recomputed from the address (lib/sigil/sigil.ts). */
  sigil_forged_at: string | null;
  /** THE SIGIL — hidden platform-wide when true (the Forge's show/hide toggle).
   *  Suppresses the mark that trails the @name everywhere — the owner's own
   *  connect pill AND every viewer's render of the owner's profile. Default
   *  false (shown). Written via the /api/me guarded route. */
  sigil_hidden: boolean;
  /** The user's chosen Discord profile accent colour, as an integer (0xRRGGBB).
   *  Null = none set. */
  discord_accent_color: number | null;
  /** Whether the linked account is a member of the PD Discord server, snapshotted
   *  at link time. True / false / null (couldn't determine). */
  discord_in_server: boolean | null;
}

/** The subset of columns a user may write to their own row via
 *  PATCH /api/me. ens_name (user-chosen display ENS) is writable here.
 *  Hard identity columns (address, handle, created_at), curve columns
 *  (account_level, price_rank), and price_sprite stay excluded — they
 *  mutate through their own dedicated paths. */
export interface UserStatePatch {
  ens_name?: string | null;
  profile_hex?: string | null;
  profile_logo?: string | null;
  profile_sprite_hex?: string | null;
  /** The user's picked persona tags (validated against the catalog server-side).
   *  granted_tags / user_number are intentionally absent — not self-writable. */
  profile_tags?: string[] | null;
  /** The user's chosen @name Unicode font id (validated server-side). */
  name_font?: string | null;
  /** The user's all-tags paint id (validated server-side). */
  tag_paint?: string | null;
  sticker_state?: {
    owned: string[];
    offSheets: string[];
    offIds: string[];
    placements?: Record<string, { x: number; y: number; z: number; r?: number; sc?: number }>;
    placementAspect?: number;
  };
  showcase?: Showcase;
  showcase_style?: ShowcaseStyle;
  settings?: UserSettings;
  calendar_state?: Record<string, unknown>;
  grid_presets?: Record<string, unknown>;
  workspaces?: Record<string, unknown>;
  setup_codes?: Record<string, unknown>;
  familiar_config?: Record<string, unknown> | null;
}

export interface FollowRow {
  follower_name: string;
  following_name: string;
  created_at: string;
}

/** Every DIRECTED ping kind. The BROADCAST firehose ("someone you follow did
 *  X") is never stored — it's computed at read time off `events` — so it has no
 *  kind here. Mirrors the CHECK constraint in 20260614_pings.sql exactly. */
export type PingKind =
  | 'PING' // self/system message: to-do + calendar reminders, Artist Push
  | 'FOLLOW'
  | 'PROJECT_FOLLOW'
  | 'OUTPUT_FOLLOW'
  | 'ACHIEVEMENT'
  | 'STREAK'
  | 'MINT'
  | 'SALE'
  | 'OFFER'
  | 'OFFER_ACCEPTED'
  | 'COUNTER'
  | 'XFER'
  | 'WISHLIST_HIT'
  | 'WATCH_HIT'
  | 'TRADE'
  | 'TRADE_ACCEPTED'
  | 'TRADE_DECLINED';

/** One row of the unified `pings` inbox. */
export interface PingRow {
  id: string;
  recipient_address: string;
  kind: PingKind;
  actor_address: string | null;
  actor_name: string | null;
  project_id: string | null;
  token_id: string | null;
  /** Stored numeric in Postgres; surfaced as string to preserve precision. */
  amount_eth: string | null;
  data: Record<string, unknown>;
  group_key: string | null;
  read: boolean;
  created_at: string;
  updated_at: string;
}

/** Per-user broadcast-feed read watermark (unix seconds). */
export interface PingCursorRow {
  user_address: string;
  broadcast_seen_at: number;
  updated_at: string;
}

export type EventType = 'MINT' | 'LIST' | 'SALE' | 'XFER';

export interface EventRow {
  id: string;
  type: EventType;
  project_id: string;
  token_id: string | null;
  from_address: string | null;
  to_address: string | null;
  /** Stored as numeric in Postgres; surfaced as string to preserve precision. */
  price_eth: string | null;
  timestamp: string;
  /** Resolved @handles for the from/to wallets (null when unclaimed). Filled
   *  by the feed routes so the UI can read "@you did X" without a second hop. */
  from_handle?: string | null;
  to_handle?: string | null;
  /** XFER only (2026-07-20): this transfer settled through THE EXCHANGE ⇌
   *  (events.sale_direction = 'TRADE'). Barter moves no sale price, so a
   *  trade NEVER reads as a SALE — surfaces verb it "traded" under ⇌. */
  trade?: boolean;
  /** SALE only: true when the seller now owns ZERO of this project (dumped
   *  their whole bag) — drives the "{PROJECT} unfollowed @seller" tape gag.
   *  Distinct from a project being sold out (Brendon, 2026-06-22). */
  from_zeroed?: boolean;
  /** THE SIGIL — the from/to wallet's forged mark + its faction ink, for the
   *  tape's after-the-@name slot. Null when unforged. Filled by
   *  attachHandles alongside the handles. */
  from_sigil?: { mark: string; hex: string } | null;
  to_sigil?: { mark: string; hex: string } | null;
}

export interface ProjectRow {
  id: string;
  artist_address: string;
  title: string;
  minted_count: number;
  max_supply: number;
  floor_price_eth: string | null;
  volume_eth: string;
  all_time_high_eth: string | null;
  cooldown_until: string | null;
}

export interface StarRow {
  user_address: string;
  token_id: string;
  project_id: string;
  created_at: string;
}

export interface WishlistRow {
  user_address: string;
  token_id: string;
  project_id: string;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Database type — used to parameterize SupabaseClient<Database>.
// ─────────────────────────────────────────────────────────────────────────────

/** Result envelope returned by the atomic money RPCs (app_mint / app_buy /
 *  app_accept_offer). All fields optional; a set `error` means the operation
 *  was rejected (e.g. 'sold_out', 'insufficient_balance', 'not_listed'). */
export interface MoneyOpResult {
  error?: string;
  ok?: boolean;
  minted?: number[];
  count?: number;
  balance?: number;
  sold_out?: boolean;
  bought?: number;
  sold?: number;
}

/** A piece in a per-user collection — Cart (cart_items) and Bench (bench_items)
 *  share this exact shape (user_address, project_id=slug, token_id). */
export interface CollectionItemRow {
  user_address: string;
  project_id: string;
  token_id: string;
  added_at: string;
}

/** One row of `outputs` — stored per-token metadata (sampled dominant colour
 *  now, rarity later). project_id = slug, token_id stored as text. */
export interface OutputMetaRow {
  project_id: string;
  token_id: string;
  dominant_color: string | null;
  rarity: string | null;
  minted_at: string | null;
  updated_at: string | null;
  // Visual fingerprint (sampled in the same pass as the colour).
  aspect: string | null;
  brightness: number | null;
  saturation: number | null;
  complexity: number | null;
  // Durable platform traits (computed once from the mint moment + registry,
  // then stored; UI computes live as the fallback until filled).
  artist: string | null;
  project_name: string | null;
  true_name: string | null;
  price_day: string | null;
  natal_sun: string | null;
  natal_moon: string | null;
  natal_rising: string | null;
  fate: string | null;
}

/** game_scores — minigame bests (Lane Runner first). */
export type GameScoreDbRow = {
  game: string;
  address: string;
  best: number;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      game_scores: {
        Row: GameScoreDbRow;
        Insert: GameScoreDbRow;
        Update: Partial<GameScoreDbRow>;
        Relationships: [];
      };
      users: {
        Row: UserRow;
        Insert: Partial<UserRow> & { address: string };
        Update: Partial<UserRow>;
        Relationships: [];
      };
      follows: {
        Row: FollowRow;
        Insert: FollowRow;
        Update: Partial<FollowRow>;
        Relationships: [];
      };
      pings: {
        Row: PingRow;
        Insert: Omit<PingRow, 'id' | 'created_at' | 'updated_at'> &
          Partial<Pick<PingRow, 'id' | 'created_at' | 'updated_at'>>;
        Update: Partial<PingRow>;
        Relationships: [];
      };
      ping_cursors: {
        Row: PingCursorRow;
        Insert: Pick<PingCursorRow, 'user_address'> & Partial<PingCursorRow>;
        Update: Partial<PingCursorRow>;
        Relationships: [];
      };
      events: {
        Row: EventRow;
        Insert: EventRow;
        Update: Partial<EventRow>;
        Relationships: [];
      };
      projects: {
        Row: ProjectRow;
        Insert: ProjectRow;
        Update: Partial<ProjectRow>;
        Relationships: [];
      };
      stars: {
        Row: StarRow;
        Insert: StarRow;
        Update: Partial<StarRow>;
        Relationships: [];
      };
      wishlist: {
        Row: WishlistRow;
        Insert: WishlistRow;
        Update: Partial<WishlistRow>;
        Relationships: [];
      };
      cart_items: {
        Row: CollectionItemRow;
        Insert: Omit<CollectionItemRow, 'added_at'> & Partial<Pick<CollectionItemRow, 'added_at'>>;
        Update: Partial<CollectionItemRow>;
        Relationships: [];
      };
      bench_items: {
        Row: CollectionItemRow;
        Insert: Omit<CollectionItemRow, 'added_at'> & Partial<Pick<CollectionItemRow, 'added_at'>>;
        Update: Partial<CollectionItemRow>;
        Relationships: [];
      };
      outputs: {
        Row: OutputMetaRow;
        Insert: Pick<OutputMetaRow, 'project_id' | 'token_id'> & Partial<OutputMetaRow>;
        Update: Partial<OutputMetaRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      app_mint: {
        Args: {
          p_address: string; p_slug: string; p_qty: number;
          p_max_supply: number; p_price: number; p_fee: number;
        };
        Returns: MoneyOpResult;
      };
      app_buy: {
        Args: { p_buyer: string; p_slug: string; p_token: string };
        Returns: MoneyOpResult;
      };
      app_accept_offer: {
        Args: {
          p_owner: string; p_slug: string; p_token: string; p_offer_id: string;
        };
        Returns: MoneyOpResult;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Clients
// ─────────────────────────────────────────────────────────────────────────────
//
// Two clients, kept distinct so write paths can never accidentally use the
// anon key and read paths can never accidentally use the service role:
//
//   • getSupabaseAnon()    — reads only. Subject to RLS. Safe for any handler.
//   • getSupabaseService() — server-side writes. Bypasses RLS. Server only.
//
// Both are constructed lazily so that missing env vars fail at request time
// (not at build time) and only for the route that actually needs them.
// ─────────────────────────────────────────────────────────────────────────────

function url(): string {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!u) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  return u;
}

// Hard ceiling on any single Supabase request. Without this, a stalled
// connection (not an error — just silence) blocks forever. Server-side
// that freezes the whole page render mid-navigation: the click "loads
// forever" until a manual refresh. 8s matches the /api/gas and /api/price
// timeout convention.
const REQUEST_TIMEOUT_MS = 8000;

const timeoutFetch: typeof fetch = (input, init) => {
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const callerSignal = init?.signal ?? null;
  const signal =
    callerSignal && typeof AbortSignal.any === 'function'
      ? AbortSignal.any([callerSignal, timeoutSignal])
      : callerSignal ?? timeoutSignal;
  return fetch(input, { ...init, signal });
};

/** Columns of `users` the public (anon) key is allowed to read — must stay in
 *  sync with the column-level GRANT to anon/authenticated in the database.
 *  Public profile reads select THIS instead of '*', otherwise Postgres refuses
 *  the whole query (anon has no table-level SELECT, only these columns). */
export const PUBLIC_USER_COLUMNS =
  'address, ens_name, handle, price_sprite, price_sprite_resolved, account_level, price_rank, price_score, price_streak, streak_best, price_held, price_hold_rank, profile_hex, profile_logo, profile_sprite_hex, profile_tags, granted_tags, name_font, tag_paint, user_number, sticker_state, signature_hex, showcase, showcase_style, discord_id, discord_username, discord_avatar, discord_accent_color, discord_in_server, sigil_forged_at, sigil_hidden, created_at';

/** Browser-side client (anon key, RLS-bound) — exists for Supabase Realtime
 *  subscriptions from client components. Singleton so the whole app shares ONE
 *  websocket no matter how many surfaces subscribe. The NEXT_PUBLIC_* envs are
 *  inlined into the client bundle at build time; if they're absent this throws
 *  at call time — callers should catch and fall back to polling. */
let browserClient: SupabaseClient<Database> | null = null;
export function getSupabaseBrowser(): SupabaseClient<Database> {
  if (!browserClient) {
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
    browserClient = createClient<Database>(url(), key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return browserClient;
}

export function getSupabaseAnon(): SupabaseClient<Database> {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
  return createClient<Database>(url(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: timeoutFetch },
  });
}

export function getSupabaseService(): SupabaseClient<Database> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return createClient<Database>(url(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: timeoutFetch },
  });
}
