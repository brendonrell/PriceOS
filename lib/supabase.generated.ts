/*
 * lib/supabase.generated.ts — GENERATED snapshot of the LIVE database schema
 * (Supabase type generator, snapshotted 2026-08-03 — fair-draw drops round).
 *
 * PURPOSE: drift detection + coverage. The hand-written types in
 * lib/supabase.ts are the curated, documented layer the app imports; THIS
 * file is the machine truth to diff against when schema questions come up.
 * Regenerate via the Supabase MCP (generate_typescript_types) in any session
 * that applies a migration — same-session, same convention as the repo
 * migration mirror (CLAUDE.md §6).
 *
 * Do NOT import from app code without a decision — the curated types stay
 * the app's contract.
 */
/* eslint-disable */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      album_items: {
        Row: {
          added_at: string
          album_id: string
          project_id: string
          token_id: string
        }
        Insert: {
          added_at?: string
          album_id: string
          project_id: string
          token_id: string
        }
        Update: {
          added_at?: string
          album_id?: string
          project_id?: string
          token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_items_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
        ]
      }
      albums: {
        Row: {
          created_at: string
          id: string
          label: string
          user_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          user_address: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          user_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "albums_user_address_fkey"
            columns: ["user_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
        ]
      }
      anointments: {
        Row: {
          output_token_id: string
          placed_at: string
          project_id: string
          updated_at: string
          user_address: string
        }
        Insert: {
          output_token_id: string
          placed_at?: string
          project_id: string
          updated_at?: string
          user_address: string
        }
        Update: {
          output_token_id?: string
          placed_at?: string
          project_id?: string
          updated_at?: string
          user_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "anointments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anointments_user_address_fkey"
            columns: ["user_address"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
        ]
      }
      app_errors: {
        Row: {
          address: string | null
          build_id: string | null
          count: number
          created_at: string
          fingerprint: string
          id: number
          kind: string
          last_seen: string
          message: string
          route: string | null
          stack_head: string | null
          ua: string | null
        }
        Insert: {
          address?: string | null
          build_id?: string | null
          count?: number
          created_at?: string
          fingerprint: string
          id?: never
          kind: string
          last_seen?: string
          message: string
          route?: string | null
          stack_head?: string | null
          ua?: string | null
        }
        Update: {
          address?: string | null
          build_id?: string | null
          count?: number
          created_at?: string
          fingerprint?: string
          id?: never
          kind?: string
          last_seen?: string
          message?: string
          route?: string | null
          stack_head?: string | null
          ua?: string | null
        }
        Relationships: []
      }
      artist_allowlist: {
        Row: {
          added_at: string
          address: string
        }
        Insert: {
          added_at?: string
          address: string
        }
        Update: {
          added_at?: string
          address?: string
        }
        Relationships: []
      }
      artist_vouches: {
        Row: {
          created_at: string
          note: string | null
          vouched: string
          voucher_wallet: string
        }
        Insert: {
          created_at?: string
          note?: string | null
          vouched: string
          voucher_wallet: string
        }
        Update: {
          created_at?: string
          note?: string | null
          vouched?: string
          voucher_wallet?: string
        }
        Relationships: []
      }
      bench_items: {
        Row: {
          added_at: string
          project_id: string
          token_id: string
          user_address: string
        }
        Insert: {
          added_at?: string
          project_id: string
          token_id: string
          user_address: string
        }
        Update: {
          added_at?: string
          project_id?: string
          token_id?: string
          user_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "bench_items_user_address_fkey"
            columns: ["user_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
        ]
      }
      book_of_conquests: {
        Row: {
          age: number
          faction: string | null
          id: number
          kind: string
          line: string
          project_id: string | null
          rival: string | null
          token_id: string | null
          ts: string
        }
        Insert: {
          age?: number
          faction?: string | null
          id?: never
          kind: string
          line: string
          project_id?: string | null
          rival?: string | null
          token_id?: string | null
          ts?: string
        }
        Update: {
          age?: number
          faction?: string | null
          id?: never
          kind?: string
          line?: string
          project_id?: string | null
          rival?: string | null
          token_id?: string | null
          ts?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount_eth: number
          created_at: string
          id: string
          label: string
          period: string
          user_address: string
        }
        Insert: {
          amount_eth: number
          created_at?: string
          id?: string
          label: string
          period?: string
          user_address: string
        }
        Update: {
          amount_eth?: number
          created_at?: string
          id?: string
          label?: string
          period?: string
          user_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_user_address_fkey"
            columns: ["user_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
        ]
      }
      calendar_items: {
        Row: {
          created_at: string
          date_key: string
          id: string
          owner_address: string | null
          remind: string
          scope: string
          time_label: string | null
          title: string
        }
        Insert: {
          created_at?: string
          date_key: string
          id?: string
          owner_address?: string | null
          remind?: string
          scope?: string
          time_label?: string | null
          title: string
        }
        Update: {
          created_at?: string
          date_key?: string
          id?: string
          owner_address?: string | null
          remind?: string
          scope?: string
          time_label?: string | null
          title?: string
        }
        Relationships: []
      }
      calls: {
        Row: {
          claim_type: string
          created_at: string
          floor_at_call: number | null
          floor_at_resolve: number | null
          id: number
          project_id: string
          resolved_at: string | null
          status: string
          target_eth: number
          user_address: string
          window_end: string
        }
        Insert: {
          claim_type: string
          created_at?: string
          floor_at_call?: number | null
          floor_at_resolve?: number | null
          id?: never
          project_id: string
          resolved_at?: string | null
          status?: string
          target_eth: number
          user_address: string
          window_end: string
        }
        Update: {
          claim_type?: string
          created_at?: string
          floor_at_call?: number | null
          floor_at_resolve?: number | null
          id?: never
          project_id?: string
          resolved_at?: string | null
          status?: string
          target_eth?: number
          user_address?: string
          window_end?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          added_at: string
          project_id: string
          token_id: string
          user_address: string
        }
        Insert: {
          added_at?: string
          project_id: string
          token_id: string
          user_address: string
        }
        Update: {
          added_at?: string
          project_id?: string
          token_id?: string
          user_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_user_address_fkey"
            columns: ["user_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
        ]
      }
      dispatches: {
        Row: {
          body: Json
          cal_date: string
          created_at: string
          day: number
        }
        Insert: {
          body: Json
          cal_date: string
          created_at?: string
          day: number
        }
        Update: {
          body?: Json
          cal_date?: string
          created_at?: string
          day?: number
        }
        Relationships: []
      }
      drop_entries: {
        Row: {
          band: number | null
          created_at: string
          drop_id: number
          id: number
          seats: number
          signed_order: string
          status: string
          tx_hash: string | null
          wallet: string
        }
        Insert: {
          band?: number | null
          created_at?: string
          drop_id: number
          id?: never
          seats?: number
          signed_order: string
          status?: string
          tx_hash?: string | null
          wallet: string
        }
        Update: {
          band?: number | null
          created_at?: string
          drop_id?: number
          id?: never
          seats?: number
          signed_order?: string
          status?: string
          tx_hash?: string | null
          wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "drop_entries_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "drops"
            referencedColumns: ["id"]
          },
        ]
      }
      drops: {
        Row: {
          beacon_block: number | null
          beacon_hash: string | null
          commitment: string | null
          created_at: string
          id: number
          project_address: string
          project_id: string
          seal_seconds: number | null
          status: string
          supply: number
          transcript: Json | null
          window_close: string
          window_open: string
        }
        Insert: {
          beacon_block?: number | null
          beacon_hash?: string | null
          commitment?: string | null
          created_at?: string
          id?: never
          project_address: string
          project_id: string
          seal_seconds?: number | null
          status?: string
          supply: number
          transcript?: Json | null
          window_close: string
          window_open: string
        }
        Update: {
          beacon_block?: number | null
          beacon_hash?: string | null
          commitment?: string | null
          created_at?: string
          id?: never
          project_address?: string
          project_id?: string
          seal_seconds?: number | null
          status?: string
          supply?: number
          transcript?: Json | null
          window_close?: string
          window_open?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          from_address: string | null
          id: string
          log_index: number | null
          price_eth: number | null
          project_id: string
          sale_direction: string | null
          timestamp: number
          to_address: string | null
          token_id: string
          tx_hash: string | null
          type: string
        }
        Insert: {
          from_address?: string | null
          id?: string
          log_index?: number | null
          price_eth?: number | null
          project_id: string
          sale_direction?: string | null
          timestamp: number
          to_address?: string | null
          token_id: string
          tx_hash?: string | null
          type: string
        }
        Update: {
          from_address?: string | null
          id?: string
          log_index?: number | null
          price_eth?: number | null
          project_id?: string
          sale_direction?: string | null
          timestamp?: number
          to_address?: string | null
          token_id?: string
          tx_hash?: string | null
          type?: string
        }
        Relationships: []
      }
      faction_oaths: {
        Row: {
          address: string
          defected_at: string | null
          defections: number
          faction: string
          prev_faction: string | null
          sworn_at: string
          updated_at: string
        }
        Insert: {
          address: string
          defected_at?: string | null
          defections?: number
          faction: string
          prev_faction?: string | null
          sworn_at?: string
          updated_at?: string
        }
        Update: {
          address?: string
          defected_at?: string | null
          defections?: number
          faction?: string
          prev_faction?: string | null
          sworn_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_address: string
          follower_name: string
          following_address: string
          following_name: string
        }
        Insert: {
          created_at?: string
          follower_address: string
          follower_name: string
          following_address: string
          following_name: string
        }
        Update: {
          created_at?: string
          follower_address?: string
          follower_name?: string
          following_address?: string
          following_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_address_fkey"
            columns: ["follower_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
          {
            foreignKeyName: "follows_following_address_fkey"
            columns: ["following_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
        ]
      }
      game_scores: {
        Row: {
          address: string
          best: number
          game: string
          updated_at: string
        }
        Insert: {
          address: string
          best?: number
          game: string
          updated_at?: string
        }
        Update: {
          address?: string
          best?: number
          game?: string
          updated_at?: string
        }
        Relationships: []
      }
      gnome_deals: {
        Row: {
          ask_eth: number
          buyer_address: string
          created_at: string
          id: string
          project_id: string
          seller_address: string
          settled_at: string | null
          status: string
          tx_hash: string | null
        }
        Insert: {
          ask_eth: number
          buyer_address: string
          created_at?: string
          id?: string
          project_id: string
          seller_address: string
          settled_at?: string | null
          status?: string
          tx_hash?: string | null
        }
        Update: {
          ask_eth?: number
          buyer_address?: string
          created_at?: string
          id?: string
          project_id?: string
          seller_address?: string
          settled_at?: string | null
          status?: string
          tx_hash?: string | null
        }
        Relationships: []
      }
      gnomes: {
        Row: {
          ask_eth: number | null
          awakened_at: string
          listed_at: string | null
          owner_address: string
          project_id: string
          rarity: string
          token_id: number
        }
        Insert: {
          ask_eth?: number | null
          awakened_at?: string
          listed_at?: string | null
          owner_address: string
          project_id: string
          rarity: string
          token_id: number
        }
        Update: {
          ask_eth?: number | null
          awakened_at?: string
          listed_at?: string | null
          owner_address?: string
          project_id?: string
          rarity?: string
          token_id?: number
        }
        Relationships: []
      }
      grail_pins: {
        Row: {
          created_at: string
          priority: number
          project_id: string
          token_id: string
          user_address: string
        }
        Insert: {
          created_at?: string
          priority?: number
          project_id: string
          token_id: string
          user_address: string
        }
        Update: {
          created_at?: string
          priority?: number
          project_id?: string
          token_id?: string
          user_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "grail_pins_user_address_fkey"
            columns: ["user_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
        ]
      }
      holders: {
        Row: {
          acquired_at: string
          owner_address: string
          project_id: string
          token_id: string
        }
        Insert: {
          acquired_at?: string
          owner_address: string
          project_id: string
          token_id: string
        }
        Update: {
          acquired_at?: string
          owner_address?: string
          project_id?: string
          token_id?: string
        }
        Relationships: []
      }
      home_news_cards: {
        Row: {
          active: boolean
          created_at: string
          glyph: string | null
          href: string | null
          id: number
          meta: string | null
          position: number
          tag: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          glyph?: string | null
          href?: string | null
          id?: number
          meta?: string | null
          position?: number
          tag: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          glyph?: string | null
          href?: string | null
          id?: number
          meta?: string | null
          position?: number
          tag?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      idempotency_keys: {
        Row: {
          address: string
          created_at: string
          key: string
          response: Json | null
          route: string
          status: number | null
        }
        Insert: {
          address: string
          created_at?: string
          key: string
          response?: Json | null
          route: string
          status?: number | null
        }
        Update: {
          address?: string
          created_at?: string
          key?: string
          response?: Json | null
          route?: string
          status?: number | null
        }
        Relationships: []
      }
      listings: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          end_time: number | null
          listed_at: string | null
          order_hash: string | null
          order_json: Json | null
          price_eth: number
          project_id: string
          seller_address: string
          source: string
          start_time: number | null
          token_id: string
          tx_hash: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          end_time?: number | null
          listed_at?: string | null
          order_hash?: string | null
          order_json?: Json | null
          price_eth: number
          project_id: string
          seller_address: string
          source?: string
          start_time?: number | null
          token_id: string
          tx_hash?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          end_time?: number | null
          listed_at?: string | null
          order_hash?: string | null
          order_json?: Json | null
          price_eth?: number
          project_id?: string
          seller_address?: string
          source?: string
          start_time?: number | null
          token_id?: string
          tx_hash?: string | null
        }
        Relationships: []
      }
      marks: {
        Row: {
          kind: string
          owner_address: string
          project_id: string
          seq: number
          struck: boolean
          token_id: string
          ts: number
        }
        Insert: {
          kind: string
          owner_address: string
          project_id: string
          seq: number
          struck?: boolean
          token_id: string
          ts: number
        }
        Update: {
          kind?: string
          owner_address?: string
          project_id?: string
          seq?: number
          struck?: boolean
          token_id?: string
          ts?: number
        }
        Relationships: []
      }
      marks_crypt: {
        Row: {
          original_seq: number
          owner_address: string
          project_id: string
          struck_at: string
          struck_by: string | null
          token_id: string
        }
        Insert: {
          original_seq: number
          owner_address: string
          project_id: string
          struck_at?: string
          struck_by?: string | null
          token_id: string
        }
        Update: {
          original_seq?: number
          owner_address?: string
          project_id?: string
          struck_at?: string
          struck_by?: string | null
          token_id?: string
        }
        Relationships: []
      }
      muted: {
        Row: {
          created_at: string
          muted_address: string
          user_address: string
        }
        Insert: {
          created_at?: string
          muted_address: string
          user_address: string
        }
        Update: {
          created_at?: string
          muted_address?: string
          user_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "muted_muted_address_fkey"
            columns: ["muted_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
          {
            foreignKeyName: "muted_user_address_fkey"
            columns: ["user_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
        ]
      }
      notes: {
        Row: {
          body: string
          created_at: string
          id: string
          scope: Database["public"]["Enums"]["note_scope"]
          scope_id: string
          updated_at: string
          user_address: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          scope: Database["public"]["Enums"]["note_scope"]
          scope_id: string
          updated_at?: string
          user_address: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          scope?: Database["public"]["Enums"]["note_scope"]
          scope_id?: string
          updated_at?: string
          user_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_user_address_fkey"
            columns: ["user_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
        ]
      }
      offers: {
        Row: {
          bidder_address: string
          created_at: string
          criteria: Json | null
          currency: string
          end_time: number | null
          id: string
          order_hash: string | null
          order_json: Json | null
          price_eth: number
          project_id: string
          resolved_at: string | null
          scope: string
          source: string
          start_time: number | null
          status: string
          takeover_id: string | null
          token_id: string | null
          tx_hash: string | null
        }
        Insert: {
          bidder_address: string
          created_at?: string
          criteria?: Json | null
          currency?: string
          end_time?: number | null
          id?: string
          order_hash?: string | null
          order_json?: Json | null
          price_eth: number
          project_id: string
          resolved_at?: string | null
          scope?: string
          source?: string
          start_time?: number | null
          status?: string
          takeover_id?: string | null
          token_id?: string | null
          tx_hash?: string | null
        }
        Update: {
          bidder_address?: string
          created_at?: string
          criteria?: Json | null
          currency?: string
          end_time?: number | null
          id?: string
          order_hash?: string | null
          order_json?: Json | null
          price_eth?: number
          project_id?: string
          resolved_at?: string | null
          scope?: string
          source?: string
          start_time?: number | null
          status?: string
          takeover_id?: string | null
          token_id?: string | null
          tx_hash?: string | null
        }
        Relationships: []
      }
      output_follows: {
        Row: {
          created_at: string
          follower_address: string
          follower_name: string | null
          project_id: string
          token_id: string
        }
        Insert: {
          created_at?: string
          follower_address: string
          follower_name?: string | null
          project_id: string
          token_id: string
        }
        Update: {
          created_at?: string
          follower_address?: string
          follower_name?: string | null
          project_id?: string
          token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "output_follows_follower_address_fkey"
            columns: ["follower_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
          {
            foreignKeyName: "output_follows_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      output_views: {
        Row: {
          first_viewed_at: string
          last_viewed_at: string
          project_id: string
          token_id: number
          viewer_name: string
          views: number
        }
        Insert: {
          first_viewed_at?: string
          last_viewed_at?: string
          project_id: string
          token_id: number
          viewer_name: string
          views?: number
        }
        Update: {
          first_viewed_at?: string
          last_viewed_at?: string
          project_id?: string
          token_id?: number
          viewer_name?: string
          views?: number
        }
        Relationships: []
      }
      outputs: {
        Row: {
          accent_color: string | null
          accent_share: number | null
          air: number | null
          air_band: string | null
          artist: string | null
          aspect: string | null
          birth_season: string | null
          birth_time_of_day: string | null
          birth_weekday: string | null
          brightness: number | null
          brightness_band: string | null
          color_count: number | null
          color_temperature: string | null
          complexity: number | null
          complexity_band: string | null
          contrast: number | null
          contrast_band: string | null
          dominant_color: string | null
          fate: string | null
          fate_changing: number | null
          fate_count: number | null
          fate_glyph: string | null
          fate_hexagram: number | null
          fate_hexagram_name: string | null
          fate_lower: string | null
          fate_rank: number | null
          fate_stable: boolean | null
          fate_transformed: string | null
          fate_upper: string | null
          geometry: number | null
          geometry_band: string | null
          gravity: string | null
          lunar_illumination: number | null
          lunar_phase: string | null
          minted_at: string | null
          natal_element: string | null
          natal_harmony: string | null
          natal_modality: string | null
          natal_moon: string | null
          natal_polarity: string | null
          natal_rising: string | null
          natal_ruler: string | null
          natal_sun: string | null
          orientation: string | null
          palette_band: string | null
          palette_count: number | null
          pattern: string | null
          price_day: string | null
          primary_trait_class: string | null
          primary_trait_name: string | null
          primary_trait_value: string | null
          project_id: string
          project_name: string | null
          rarity: string | null
          rarity_bits: number | null
          rarity_score: number | null
          saturation: number | null
          saturation_band: string | null
          scene: string | null
          shape_count: number | null
          shapes: Json | null
          supply: number | null
          symmetry: number | null
          symmetry_band: string | null
          texture: number | null
          texture_band: string | null
          token_id: string
          tone_mood: string | null
          trait_count: number | null
          trait_pct: number | null
          trait_rank: number | null
          true_name: string | null
          updated_at: string | null
          warmth: number | null
          warmth_band: string | null
        }
        Insert: {
          accent_color?: string | null
          accent_share?: number | null
          air?: number | null
          air_band?: string | null
          artist?: string | null
          aspect?: string | null
          birth_season?: string | null
          birth_time_of_day?: string | null
          birth_weekday?: string | null
          brightness?: number | null
          brightness_band?: string | null
          color_count?: number | null
          color_temperature?: string | null
          complexity?: number | null
          complexity_band?: string | null
          contrast?: number | null
          contrast_band?: string | null
          dominant_color?: string | null
          fate?: string | null
          fate_changing?: number | null
          fate_count?: number | null
          fate_glyph?: string | null
          fate_hexagram?: number | null
          fate_hexagram_name?: string | null
          fate_lower?: string | null
          fate_rank?: number | null
          fate_stable?: boolean | null
          fate_transformed?: string | null
          fate_upper?: string | null
          geometry?: number | null
          geometry_band?: string | null
          gravity?: string | null
          lunar_illumination?: number | null
          lunar_phase?: string | null
          minted_at?: string | null
          natal_element?: string | null
          natal_harmony?: string | null
          natal_modality?: string | null
          natal_moon?: string | null
          natal_polarity?: string | null
          natal_rising?: string | null
          natal_ruler?: string | null
          natal_sun?: string | null
          orientation?: string | null
          palette_band?: string | null
          palette_count?: number | null
          pattern?: string | null
          price_day?: string | null
          primary_trait_class?: string | null
          primary_trait_name?: string | null
          primary_trait_value?: string | null
          project_id: string
          project_name?: string | null
          rarity?: string | null
          rarity_bits?: number | null
          rarity_score?: number | null
          saturation?: number | null
          saturation_band?: string | null
          scene?: string | null
          shape_count?: number | null
          shapes?: Json | null
          supply?: number | null
          symmetry?: number | null
          symmetry_band?: string | null
          texture?: number | null
          texture_band?: string | null
          token_id: string
          tone_mood?: string | null
          trait_count?: number | null
          trait_pct?: number | null
          trait_rank?: number | null
          true_name?: string | null
          updated_at?: string | null
          warmth?: number | null
          warmth_band?: string | null
        }
        Update: {
          accent_color?: string | null
          accent_share?: number | null
          air?: number | null
          air_band?: string | null
          artist?: string | null
          aspect?: string | null
          birth_season?: string | null
          birth_time_of_day?: string | null
          birth_weekday?: string | null
          brightness?: number | null
          brightness_band?: string | null
          color_count?: number | null
          color_temperature?: string | null
          complexity?: number | null
          complexity_band?: string | null
          contrast?: number | null
          contrast_band?: string | null
          dominant_color?: string | null
          fate?: string | null
          fate_changing?: number | null
          fate_count?: number | null
          fate_glyph?: string | null
          fate_hexagram?: number | null
          fate_hexagram_name?: string | null
          fate_lower?: string | null
          fate_rank?: number | null
          fate_stable?: boolean | null
          fate_transformed?: string | null
          fate_upper?: string | null
          geometry?: number | null
          geometry_band?: string | null
          gravity?: string | null
          lunar_illumination?: number | null
          lunar_phase?: string | null
          minted_at?: string | null
          natal_element?: string | null
          natal_harmony?: string | null
          natal_modality?: string | null
          natal_moon?: string | null
          natal_polarity?: string | null
          natal_rising?: string | null
          natal_ruler?: string | null
          natal_sun?: string | null
          orientation?: string | null
          palette_band?: string | null
          palette_count?: number | null
          pattern?: string | null
          price_day?: string | null
          primary_trait_class?: string | null
          primary_trait_name?: string | null
          primary_trait_value?: string | null
          project_id?: string
          project_name?: string | null
          rarity?: string | null
          rarity_bits?: number | null
          rarity_score?: number | null
          saturation?: number | null
          saturation_band?: string | null
          scene?: string | null
          shape_count?: number | null
          shapes?: Json | null
          supply?: number | null
          symmetry?: number | null
          symmetry_band?: string | null
          texture?: number | null
          texture_band?: string | null
          token_id?: string
          tone_mood?: string | null
          trait_count?: number | null
          trait_pct?: number | null
          trait_rank?: number | null
          true_name?: string | null
          updated_at?: string | null
          warmth?: number | null
          warmth_band?: string | null
        }
        Relationships: []
      }
      ping_cursors: {
        Row: {
          broadcast_seen_at: number
          updated_at: string
          user_address: string
        }
        Insert: {
          broadcast_seen_at?: number
          updated_at?: string
          user_address: string
        }
        Update: {
          broadcast_seen_at?: number
          updated_at?: string
          user_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "ping_cursors_user_address_fkey"
            columns: ["user_address"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
        ]
      }
      pings: {
        Row: {
          actor_address: string | null
          actor_name: string | null
          amount_eth: number | null
          created_at: string
          data: Json
          group_key: string | null
          id: string
          kind: string
          project_id: string | null
          read: boolean
          recipient_address: string
          token_id: string | null
          updated_at: string
        }
        Insert: {
          actor_address?: string | null
          actor_name?: string | null
          amount_eth?: number | null
          created_at?: string
          data?: Json
          group_key?: string | null
          id?: string
          kind: string
          project_id?: string | null
          read?: boolean
          recipient_address: string
          token_id?: string | null
          updated_at?: string
        }
        Update: {
          actor_address?: string | null
          actor_name?: string | null
          amount_eth?: number | null
          created_at?: string
          data?: Json
          group_key?: string | null
          id?: string
          kind?: string
          project_id?: string | null
          read?: boolean
          recipient_address?: string
          token_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pings_recipient_address_fkey"
            columns: ["recipient_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          added_at: string
          portfolio_id: string
          project_id: string
          token_id: string
        }
        Insert: {
          added_at?: string
          portfolio_id: string
          project_id: string
          token_id: string
        }
        Update: {
          added_at?: string
          portfolio_id?: string
          project_id?: string
          token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          created_at: string
          id: string
          label: string
          user_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          user_address: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          user_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolios_user_address_fkey"
            columns: ["user_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
        ]
      }
      price_anchors: {
        Row: {
          anchor_eth: number
          created_at: string
          id: string
          note: string | null
          project_id: string
          user_address: string
        }
        Insert: {
          anchor_eth: number
          created_at?: string
          id?: string
          note?: string | null
          project_id: string
          user_address: string
        }
        Update: {
          anchor_eth?: number
          created_at?: string
          id?: string
          note?: string | null
          project_id?: string
          user_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_anchors_user_address_fkey"
            columns: ["user_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
        ]
      }
      price_predictions: {
        Row: {
          created_at: string
          floor_eth: number
          project_id: string
          updated_at: string
          wallet: string
          window_key: string
        }
        Insert: {
          created_at?: string
          floor_eth: number
          project_id: string
          updated_at?: string
          wallet: string
          window_key: string
        }
        Update: {
          created_at?: string
          floor_eth?: number
          project_id?: string
          updated_at?: string
          wallet?: string
          window_key?: string
        }
        Relationships: []
      }
      project_follows: {
        Row: {
          created_at: string
          follower_address: string
          follower_name: string | null
          project_id: string
        }
        Insert: {
          created_at?: string
          follower_address: string
          follower_name?: string | null
          project_id: string
        }
        Update: {
          created_at?: string
          follower_address?: string
          follower_name?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_follows_follower_address_fkey"
            columns: ["follower_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
          {
            foreignKeyName: "project_follows_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          all_time_high_eth: number
          artist_address: string
          contract_address: string | null
          cooldown_until: string | null
          custom_color: string | null
          description: string | null
          floor_price_eth: number | null
          graduated_at: string | null
          handle: string | null
          id: string
          max_supply: number | null
          milestones: Json
          mint_price_eth: number
          minted_count: number
          price_sprite: string | null
          project_no: number | null
          royalty_receiver: string | null
          showcase_caption: string | null
          showcase_ids: Json
          showcase_layout: string | null
          showcase_titles: boolean
          sold_out_at: string | null
          soundtrack: string | null
          title: string
          traits: Json
          uploaded_at: string | null
          volume_eth: number
        }
        Insert: {
          all_time_high_eth?: number
          artist_address: string
          contract_address?: string | null
          cooldown_until?: string | null
          custom_color?: string | null
          description?: string | null
          floor_price_eth?: number | null
          graduated_at?: string | null
          handle?: string | null
          id: string
          max_supply?: number | null
          milestones?: Json
          mint_price_eth?: number
          minted_count?: number
          price_sprite?: string | null
          project_no?: number | null
          royalty_receiver?: string | null
          showcase_caption?: string | null
          showcase_ids?: Json
          showcase_layout?: string | null
          showcase_titles?: boolean
          sold_out_at?: string | null
          soundtrack?: string | null
          title: string
          traits?: Json
          uploaded_at?: string | null
          volume_eth?: number
        }
        Update: {
          all_time_high_eth?: number
          artist_address?: string
          contract_address?: string | null
          cooldown_until?: string | null
          custom_color?: string | null
          description?: string | null
          floor_price_eth?: number | null
          graduated_at?: string | null
          handle?: string | null
          id?: string
          max_supply?: number | null
          milestones?: Json
          mint_price_eth?: number
          minted_count?: number
          price_sprite?: string | null
          project_no?: number | null
          royalty_receiver?: string | null
          showcase_caption?: string | null
          showcase_ids?: Json
          showcase_layout?: string | null
          showcase_titles?: boolean
          sold_out_at?: string | null
          soundtrack?: string | null
          title?: string
          traits?: Json
          uploaded_at?: string | null
          volume_eth?: number
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_address: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_address: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_address?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_address_fkey"
            columns: ["user_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
        ]
      }
      search_log: {
        Row: {
          created_at: string
          hits: number
          id: string
          q: string
        }
        Insert: {
          created_at?: string
          hits?: number
          id?: string
          q: string
        }
        Update: {
          created_at?: string
          hits?: number
          id?: string
          q?: string
        }
        Relationships: []
      }
      season_standings: {
        Row: {
          final_place: number | null
          final_score: number
          season_id: number
          user_address: string
        }
        Insert: {
          final_place?: number | null
          final_score?: number
          season_id: number
          user_address: string
        }
        Update: {
          final_place?: number | null
          final_score?: number
          season_id?: number
          user_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_standings_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_standings_user_address_fkey"
            columns: ["user_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          ends_at: string | null
          id: number
          label: string
          starts_at: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: number
          label: string
          starts_at: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: number
          label?: string
          starts_at?: string
        }
        Relationships: []
      }
      sentinel_fires: {
        Row: {
          fire_key: string
          fired_at: string
          wallet: string
        }
        Insert: {
          fire_key: string
          fired_at?: string
          wallet: string
        }
        Update: {
          fire_key?: string
          fired_at?: string
          wallet?: string
        }
        Relationships: []
      }
      social_snapshots: {
        Row: {
          address: string
          created_at: string
          day: number
          followers: number
          following: number
          holdings: number
          price_score: number
        }
        Insert: {
          address: string
          created_at?: string
          day: number
          followers?: number
          following?: number
          holdings?: number
          price_score?: number
        }
        Update: {
          address?: string
          created_at?: string
          day?: number
          followers?: number
          following?: number
          holdings?: number
          price_score?: number
        }
        Relationships: []
      }
      starred_artists: {
        Row: {
          artist_address: string
          created_at: string
          user_address: string
        }
        Insert: {
          artist_address: string
          created_at?: string
          user_address: string
        }
        Update: {
          artist_address?: string
          created_at?: string
          user_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "starred_artists_user_address_fkey"
            columns: ["user_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
        ]
      }
      sticker_events: {
        Row: {
          from_address: string | null
          id: string
          price_eth: number | null
          qty: number
          sheet_id: string
          timestamp: number
          to_address: string | null
          tx_hash: string | null
          type: string
        }
        Insert: {
          from_address?: string | null
          id?: string
          price_eth?: number | null
          qty?: number
          sheet_id: string
          timestamp: number
          to_address?: string | null
          tx_hash?: string | null
          type: string
        }
        Update: {
          from_address?: string | null
          id?: string
          price_eth?: number | null
          qty?: number
          sheet_id?: string
          timestamp?: number
          to_address?: string | null
          tx_hash?: string | null
          type?: string
        }
        Relationships: []
      }
      sticker_fee_config: {
        Row: {
          creator_address: string
          id: number
          platform_address: string
          updated_at: string
        }
        Insert: {
          creator_address: string
          id: number
          platform_address: string
          updated_at?: string
        }
        Update: {
          creator_address?: string
          id?: number
          platform_address?: string
          updated_at?: string
        }
        Relationships: []
      }
      sticker_holdings: {
        Row: {
          owner_address: string
          qty: number
          sheet_id: string
          updated_at: string
        }
        Insert: {
          owner_address: string
          qty?: number
          sheet_id: string
          updated_at?: string
        }
        Update: {
          owner_address?: string
          qty?: number
          sheet_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sticker_listings: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          end_time: number | null
          id: string
          order_hash: string | null
          order_json: Json | null
          price_eth: number
          qty: number
          qty_start: number
          seller_address: string
          sheet_id: string
          source: string
          tx_hash: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          end_time?: number | null
          id?: string
          order_hash?: string | null
          order_json?: Json | null
          price_eth: number
          qty: number
          qty_start: number
          seller_address: string
          sheet_id: string
          source?: string
          tx_hash?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          end_time?: number | null
          id?: string
          order_hash?: string | null
          order_json?: Json | null
          price_eth?: number
          qty?: number
          qty_start?: number
          seller_address?: string
          sheet_id?: string
          source?: string
          tx_hash?: string | null
        }
        Relationships: []
      }
      sticker_offers: {
        Row: {
          bidder_address: string
          created_at: string
          currency: string
          end_time: number | null
          id: string
          order_hash: string | null
          order_json: Json | null
          price_eth: number
          qty: number
          qty_start: number
          sheet_id: string
          source: string
          status: string
          tx_hash: string | null
        }
        Insert: {
          bidder_address: string
          created_at?: string
          currency?: string
          end_time?: number | null
          id?: string
          order_hash?: string | null
          order_json?: Json | null
          price_eth: number
          qty: number
          qty_start: number
          sheet_id: string
          source?: string
          status?: string
          tx_hash?: string | null
        }
        Update: {
          bidder_address?: string
          created_at?: string
          currency?: string
          end_time?: number | null
          id?: string
          order_hash?: string | null
          order_json?: Json | null
          price_eth?: number
          qty?: number
          qty_start?: number
          sheet_id?: string
          source?: string
          status?: string
          tx_hash?: string | null
        }
        Relationships: []
      }
      sticker_sheet_collabs: {
        Row: {
          added_by: string
          collab_address: string
          collab_handle: string | null
          created_at: string
          sheet_id: string
        }
        Insert: {
          added_by: string
          collab_address: string
          collab_handle?: string | null
          created_at?: string
          sheet_id: string
        }
        Update: {
          added_by?: string
          collab_address?: string
          collab_handle?: string | null
          created_at?: string
          sheet_id?: string
        }
        Relationships: []
      }
      sticker_swaps: {
        Row: {
          created_at: string
          end_time: number | null
          give_qty: number
          give_sheet: string
          id: string
          proposer_address: string
          status: string
          want_qty: number
          want_sheet: string
        }
        Insert: {
          created_at?: string
          end_time?: number | null
          give_qty: number
          give_sheet: string
          id?: string
          proposer_address: string
          status?: string
          want_qty: number
          want_sheet: string
        }
        Update: {
          created_at?: string
          end_time?: number | null
          give_qty?: number
          give_sheet?: string
          id?: string
          proposer_address?: string
          status?: string
          want_qty?: number
          want_sheet?: string
        }
        Relationships: []
      }
      sticker_wants: {
        Row: {
          created_at: string
          owner_address: string
          sheet_id: string
        }
        Insert: {
          created_at?: string
          owner_address: string
          sheet_id: string
        }
        Update: {
          created_at?: string
          owner_address?: string
          sheet_id?: string
        }
        Relationships: []
      }
      takeover_acceptances: {
        Row: {
          accepted_at: string
          price_eth: number
          takeover_id: string
          token_id: string
        }
        Insert: {
          accepted_at?: string
          price_eth: number
          takeover_id: string
          token_id: string
        }
        Update: {
          accepted_at?: string
          price_eth?: number
          takeover_id?: string
          token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "takeover_acceptances_takeover_id_fkey"
            columns: ["takeover_id"]
            isOneToOne: false
            referencedRelation: "takeovers"
            referencedColumns: ["id"]
          },
        ]
      }
      takeovers: {
        Row: {
          accepted_count: number
          cast_at: string
          caster_address: string
          expires_at: string
          id: string
          price_eth: number
          project_id: string
          resolved_at: string | null
          status: string
          target_address: string
          token_count: number
          token_ids: Json
        }
        Insert: {
          accepted_count?: number
          cast_at?: string
          caster_address: string
          expires_at: string
          id?: string
          price_eth: number
          project_id: string
          resolved_at?: string | null
          status?: string
          target_address: string
          token_count: number
          token_ids: Json
        }
        Update: {
          accepted_count?: number
          cast_at?: string
          caster_address?: string
          expires_at?: string
          id?: string
          price_eth?: number
          project_id?: string
          resolved_at?: string | null
          status?: string
          target_address?: string
          token_count?: number
          token_ids?: Json
        }
        Relationships: []
      }
      todos: {
        Row: {
          body: string
          created_at: string
          done: boolean
          due_date: string | null
          id: string
          user_address: string
        }
        Insert: {
          body: string
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          user_address: string
        }
        Update: {
          body?: string
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          user_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "todos_user_address_fkey"
            columns: ["user_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
        ]
      }
      trades: {
        Row: {
          counter_of: string | null
          counterparty_address: string
          created_at: string
          decided_at: string | null
          end_time: number | null
          get: Json
          get_eth: number
          give: Json
          give_eth: number
          id: string
          order_hash: string | null
          order_json: Json | null
          proposer_address: string
          source: string
          status: string
          tx_hash: string | null
        }
        Insert: {
          counter_of?: string | null
          counterparty_address: string
          created_at?: string
          decided_at?: string | null
          end_time?: number | null
          get?: Json
          get_eth?: number
          give?: Json
          give_eth?: number
          id?: string
          order_hash?: string | null
          order_json?: Json | null
          proposer_address: string
          source?: string
          status?: string
          tx_hash?: string | null
        }
        Update: {
          counter_of?: string | null
          counterparty_address?: string
          created_at?: string
          decided_at?: string | null
          end_time?: number | null
          get?: Json
          get_eth?: number
          give?: Json
          give_eth?: number
          id?: string
          order_hash?: string | null
          order_json?: Json | null
          proposer_address?: string
          source?: string
          status?: string
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_counter_of_fkey"
            columns: ["counter_of"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          unlocked_at: string
          user_address: string
        }
        Insert: {
          achievement_id: string
          unlocked_at?: string
          user_address: string
        }
        Update: {
          achievement_id?: string
          unlocked_at?: string
          user_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_address_fkey"
            columns: ["user_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
        ]
      }
      users: {
        Row: {
          account_level: number
          address: string
          calendar_state: Json
          created_at: string
          discord_accent_color: number | null
          discord_avatar: string | null
          discord_id: string | null
          discord_in_server: boolean | null
          discord_username: string | null
          ens_name: string | null
          familiar_config: Json | null
          formulas: Json
          granted_tags: Json
          grid_presets: Json
          handle: string | null
          name_font: string | null
          nemesis_address: string | null
          price_held: number
          price_hold_rank: number | null
          price_rank: number
          price_score: number
          price_sprite: string | null
          price_sprite_resolved: Json | null
          price_streak: number
          profile_hex: string | null
          profile_logo: string | null
          profile_sprite_hex: string | null
          profile_tags: Json
          settings: Json
          setup_codes: Json
          showcase: Json
          showcase_style: string
          sigil_forged_at: string | null
          sigil_hidden: boolean
          signature_hex: string | null
          sim_eth_balance: number
          sticker_state: Json | null
          streak_best: number
          streak_last_active: string | null
          tag_paint: string | null
          user_number: number | null
          workspaces: Json
        }
        Insert: {
          account_level?: number
          address: string
          calendar_state?: Json
          created_at?: string
          discord_accent_color?: number | null
          discord_avatar?: string | null
          discord_id?: string | null
          discord_in_server?: boolean | null
          discord_username?: string | null
          ens_name?: string | null
          familiar_config?: Json | null
          formulas?: Json
          granted_tags?: Json
          grid_presets?: Json
          handle?: string | null
          name_font?: string | null
          nemesis_address?: string | null
          price_held?: number
          price_hold_rank?: number | null
          price_rank?: number
          price_score?: number
          price_sprite?: string | null
          price_sprite_resolved?: Json | null
          price_streak?: number
          profile_hex?: string | null
          profile_logo?: string | null
          profile_sprite_hex?: string | null
          profile_tags?: Json
          settings?: Json
          setup_codes?: Json
          showcase?: Json
          showcase_style?: string
          sigil_forged_at?: string | null
          sigil_hidden?: boolean
          signature_hex?: string | null
          sim_eth_balance?: number
          sticker_state?: Json | null
          streak_best?: number
          streak_last_active?: string | null
          tag_paint?: string | null
          user_number?: number | null
          workspaces?: Json
        }
        Update: {
          account_level?: number
          address?: string
          calendar_state?: Json
          created_at?: string
          discord_accent_color?: number | null
          discord_avatar?: string | null
          discord_id?: string | null
          discord_in_server?: boolean | null
          discord_username?: string | null
          ens_name?: string | null
          familiar_config?: Json | null
          formulas?: Json
          granted_tags?: Json
          grid_presets?: Json
          handle?: string | null
          name_font?: string | null
          nemesis_address?: string | null
          price_held?: number
          price_hold_rank?: number | null
          price_rank?: number
          price_score?: number
          price_sprite?: string | null
          price_sprite_resolved?: Json | null
          price_streak?: number
          profile_hex?: string | null
          profile_logo?: string | null
          profile_sprite_hex?: string | null
          profile_tags?: Json
          settings?: Json
          setup_codes?: Json
          showcase?: Json
          showcase_style?: string
          sigil_forged_at?: string | null
          sigil_hidden?: boolean
          signature_hex?: string | null
          sim_eth_balance?: number
          sticker_state?: Json | null
          streak_best?: number
          streak_last_active?: string | null
          tag_paint?: string | null
          user_number?: number | null
          workspaces?: Json
        }
        Relationships: []
      }
      wallets: {
        Row: {
          address: string
          events_count: number
          first_seen_at: string
          last_active_at: string
          volume_eth: number
        }
        Insert: {
          address: string
          events_count?: number
          first_seen_at?: string
          last_active_at?: string
          volume_eth?: number
        }
        Update: {
          address?: string
          events_count?: number
          first_seen_at?: string
          last_active_at?: string
          volume_eth?: number
        }
        Relationships: []
      }
      war_meta: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      war_state: {
        Row: {
          conquered_at: string | null
          conquered_by: string | null
          grips: Json
          leader_faction: string | null
          leader_since: string | null
          project_id: string
          siege_faction: string | null
          siege_since: string | null
          status: string
          updated_at: string
        }
        Insert: {
          conquered_at?: string | null
          conquered_by?: string | null
          grips?: Json
          leader_faction?: string | null
          leader_since?: string | null
          project_id: string
          siege_faction?: string | null
          siege_since?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          conquered_at?: string | null
          conquered_by?: string | null
          grips?: Json
          leader_faction?: string | null
          leader_since?: string | null
          project_id?: string
          siege_faction?: string | null
          siege_since?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      artist_notes: {
        Row: {
          artist_address: string | null
          body: string | null
          created_at: string | null
          id: string | null
          updated_at: string | null
          user_address: string | null
        }
        Insert: {
          artist_address?: string | null
          body?: string | null
          created_at?: string | null
          id?: string | null
          updated_at?: string | null
          user_address?: string | null
        }
        Update: {
          artist_address?: string | null
          body?: string | null
          created_at?: string | null
          id?: string | null
          updated_at?: string | null
          user_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_user_address_fkey"
            columns: ["user_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
        ]
      }
      artwork_notes: {
        Row: {
          body: string | null
          created_at: string | null
          id: string | null
          token_key: string | null
          updated_at: string | null
          user_address: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string | null
          token_key?: string | null
          updated_at?: string | null
          user_address?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string | null
          token_key?: string | null
          updated_at?: string | null
          user_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_user_address_fkey"
            columns: ["user_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
        ]
      }
      day_notes: {
        Row: {
          body: string | null
          created_at: string | null
          day: string | null
          id: string | null
          updated_at: string | null
          user_address: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          day?: string | null
          id?: string | null
          updated_at?: string | null
          user_address?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          day?: string | null
          id?: string | null
          updated_at?: string | null
          user_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_user_address_fkey"
            columns: ["user_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["address"]
          },
        ]
      }
    }
    Functions: {
      app_accept_criteria_offer: {
        Args: {
          p_offer_id: string
          p_owner: string
          p_slug: string
          p_token: string
        }
        Returns: Json
      }
      app_accept_offer: {
        Args: {
          p_offer_id: string
          p_owner: string
          p_slug: string
          p_token: string
        }
        Returns: Json
      }
      app_bump_error: { Args: { p_fingerprint: string }; Returns: undefined }
      app_buy: {
        Args: { p_buyer: string; p_slug: string; p_token: string }
        Returns: Json
      }
      app_execute_trade: {
        Args: { p_acceptor: string; p_trade_id: string }
        Returns: Json
      }
      app_merge_user_state: {
        Args: { p_address: string; p_patch: Json }
        Returns: {
          account_level: number
          address: string
          calendar_state: Json
          created_at: string
          discord_accent_color: number | null
          discord_avatar: string | null
          discord_id: string | null
          discord_in_server: boolean | null
          discord_username: string | null
          ens_name: string | null
          familiar_config: Json | null
          formulas: Json
          granted_tags: Json
          grid_presets: Json
          handle: string | null
          name_font: string | null
          nemesis_address: string | null
          price_held: number
          price_hold_rank: number | null
          price_rank: number
          price_score: number
          price_sprite: string | null
          price_sprite_resolved: Json | null
          price_streak: number
          profile_hex: string | null
          profile_logo: string | null
          profile_sprite_hex: string | null
          profile_tags: Json
          settings: Json
          setup_codes: Json
          showcase: Json
          showcase_style: string
          sigil_forged_at: string | null
          sigil_hidden: boolean
          signature_hex: string | null
          sim_eth_balance: number
          sticker_state: Json | null
          streak_best: number
          streak_last_active: string | null
          tag_paint: string | null
          user_number: number | null
          workspaces: Json
        }[]
        SetofOptions: {
          from: "*"
          to: "users"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      app_mint: {
        Args: {
          p_address: string
          p_fee: number
          p_max_supply: number
          p_price: number
          p_qty: number
          p_slug: string
        }
        Returns: Json
      }
      app_ping_wishlist_fanout: { Args: { p_rows: Json }; Returns: number }
      app_prune_errors: {
        Args: { p_keep_days: number; p_row_cap: number }
        Returns: undefined
      }
      app_prune_idempotency: {
        Args: { p_keep_hours: number }
        Returns: undefined
      }
      app_sticker_accept: {
        Args: { p_offer: string; p_qty: number; p_seller: string }
        Returns: Json
      }
      app_sticker_buy: {
        Args: { p_buyer: string; p_listing: string; p_qty: number }
        Returns: Json
      }
      app_sticker_swap_accept: {
        Args: { p_acceptor: string; p_swap: string }
        Returns: Json
      }
      apply_sale: {
        Args: { p_price_eth: number; p_project_id: string }
        Returns: undefined
      }
      increment_minted_count: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      output_view_stats: {
        Args: { p_project: string; p_token: number; p_viewer: string }
        Returns: {
          mutual_viewers: number
          total_viewers: number
          total_views: number
        }[]
      }
      recompute_floor: { Args: { p_project_id: string }; Returns: undefined }
      record_output_view: {
        Args: { p_project: string; p_token: number; p_viewer: string }
        Returns: undefined
      }
      sticker_fee_recipients: {
        Args: { p_sheet: string }
        Returns: {
          creator_address: string
          platform_address: string
        }[]
      }
      upsert_holder: {
        Args: {
          p_acquired_at: string
          p_owner_address: string
          p_project_id: string
          p_token_id: string
        }
        Returns: undefined
      }
      zero_out: { Args: { p_id: string }; Returns: undefined }
    }
    Enums: {
      note_scope: "artwork" | "artist" | "day"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      note_scope: ["artwork", "artist", "day"],
    },
  },
} as const
