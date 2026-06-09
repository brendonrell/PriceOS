import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PriceSpriteVibe } from './sprites/vibes';
import type { ResolvedSprite } from './sprites/composer';

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
export type ShowcaseStyle = 'static' | 'generative';

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

  // ── Per-user persisted state (the user-state feature) ───────────────────────
  /** The user's PROFILE COLORWAY colour — the colour the profile owner picked
   *  for their own profile. Cached client-side at `pd_profile_hex`. Distinct
   *  from the "Custom" colorway (`pd_custom_color`) and "Haze Mode"
   *  (`pd_haze_color`) — never alias them together. */
  profile_hex: string | null;
  price_rank: number;
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
}

/** The subset of columns a user may write to their own row via
 *  PATCH /api/me. ens_name (user-chosen display ENS) is writable here.
 *  Hard identity columns (address, handle, created_at), curve columns
 *  (account_level, price_rank), and price_sprite stay excluded — they
 *  mutate through their own dedicated paths. */
export interface UserStatePatch {
  ens_name?: string | null;
  profile_hex?: string | null;
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

export type NotificationType =
  | 'FOLLOW'
  | 'MINT'
  | 'LIST'
  | 'SALE'
  | 'XFER';

export interface NotificationRow {
  id: string;
  recipient_address: string;
  event_id: string;
  type: NotificationType;
  read: boolean;
  created_at: string;
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

export type Database = {
  public: {
    Tables: {
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
      notifications: {
        Row: NotificationRow;
        Insert: Omit<NotificationRow, 'id' | 'created_at'> &
          Partial<Pick<NotificationRow, 'id' | 'created_at'>>;
        Update: Partial<NotificationRow>;
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

/** Columns of `users` the public (anon) key is allowed to read — must stay in
 *  sync with the column-level GRANT to anon/authenticated in the database.
 *  Public profile reads select THIS instead of '*', otherwise Postgres refuses
 *  the whole query (anon has no table-level SELECT, only these columns). */
export const PUBLIC_USER_COLUMNS =
  'address, ens_name, handle, price_sprite, price_sprite_resolved, account_level, price_rank, profile_hex, showcase, showcase_style, discord_id, discord_username, created_at';

export function getSupabaseAnon(): SupabaseClient<Database> {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
  return createClient<Database>(url(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getSupabaseService(): SupabaseClient<Database> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return createClient<Database>(url(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
