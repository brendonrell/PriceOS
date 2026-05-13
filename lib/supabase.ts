import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PriceSpriteVibe } from './sprites/vibes';

// ─────────────────────────────────────────────────────────────────────────────
// Database row types — mirror the Postgres schema exactly.
// ─────────────────────────────────────────────────────────────────────────────

export interface UserRow {
  address: string;
  ens_name: string | null;
  handle: string | null;
  price_sprite: PriceSpriteVibe | null;
  account_level: number;
  created_at: string;
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
  | 'XFER'
  | 'OFFER';

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
    Functions: { [_ in never]: never };
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
