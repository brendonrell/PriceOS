-- Profile Tags + @name font + platform user numbers (Brendon 2026-07-19).
--
-- Adds four PUBLIC columns to public.users:
--   • profile_tags  jsonb  — the persona ids the user self-applied (pick-your-owns)
--   • granted_tags  jsonb  — admin-assigned tag ids (OG, WTBS, Team…); NOT self-writable
--   • name_font     text   — the user's chosen @name Unicode font id (null = default)
--   • user_number   int    — sequential platform number, by join order (Brendon = #1)
--
-- profile_tags + name_font are written by the owner through /api/me (the merge
-- RPC below handles them). granted_tags + user_number are set out-of-band /
-- by trigger and can never be written through the self-PATCH path.

-- ── Columns ──────────────────────────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS profile_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS granted_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS name_font    text,
  ADD COLUMN IF NOT EXISTS user_number  integer;

-- ── Public read (MUST mirror PUBLIC_USER_COLUMNS in lib/supabase.ts) ─────────
GRANT SELECT (profile_tags, granted_tags, name_font, user_number)
  ON public.users TO anon, authenticated;

-- ── Platform user numbers ────────────────────────────────────────────────────
-- Backfill by join order: earliest account = #1 (address as a stable tiebreak).
WITH ordered AS (
  SELECT address, row_number() OVER (ORDER BY created_at ASC, address ASC) AS n
  FROM public.users
)
UPDATE public.users u
  SET user_number = o.n
  FROM ordered o
  WHERE u.address = o.address AND u.user_number IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_user_number_idx ON public.users (user_number);

-- New signups get the next number. MAX+1 (not a sequence) keeps the backfill and
-- live inserts in one line; the unique index above is the race guard at PD's
-- signup volume — a rare collision fails the insert and the client retries.
CREATE OR REPLACE FUNCTION public.assign_user_number()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_number IS NULL THEN
    SELECT COALESCE(MAX(user_number), 0) + 1 INTO NEW.user_number FROM public.users;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_user_number ON public.users;
CREATE TRIGGER trg_assign_user_number
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_user_number();

-- ── Extend app_merge_user_state to write profile_tags + name_font ────────────
-- Same atomic per-key merge as before; two scalar/jsonb keys added. granted_tags
-- and user_number are deliberately NOT handled here — not self-writable.
CREATE OR REPLACE FUNCTION public.app_merge_user_state(p_address text, p_patch jsonb)
RETURNS SETOF public.users
LANGUAGE sql
AS $$
  UPDATE public.users SET
    settings = CASE WHEN p_patch ? 'settings'
      THEN COALESCE(settings, '{}'::jsonb) || (p_patch->'settings') ELSE settings END,
    calendar_state = CASE WHEN p_patch ? 'calendar_state'
      THEN COALESCE(calendar_state, '{}'::jsonb) || (p_patch->'calendar_state') ELSE calendar_state END,
    grid_presets = CASE WHEN p_patch ? 'grid_presets'
      THEN COALESCE(grid_presets, '{}'::jsonb) || (p_patch->'grid_presets') ELSE grid_presets END,
    workspaces = CASE WHEN p_patch ? 'workspaces'
      THEN COALESCE(workspaces, '{}'::jsonb) || (p_patch->'workspaces') ELSE workspaces END,
    setup_codes = CASE WHEN p_patch ? 'setup_codes'
      THEN COALESCE(setup_codes, '{}'::jsonb) || (p_patch->'setup_codes') ELSE setup_codes END,
    sticker_state = CASE WHEN p_patch ? 'sticker_state'
      THEN COALESCE(sticker_state, '{}'::jsonb) || (p_patch->'sticker_state') ELSE sticker_state END,
    familiar_config = CASE WHEN p_patch ? 'familiar_config'
      THEN (CASE WHEN p_patch->'familiar_config' = 'null'::jsonb THEN NULL
            ELSE COALESCE(familiar_config, '{}'::jsonb) || (p_patch->'familiar_config') END)
      ELSE familiar_config END,
    ens_name = CASE WHEN p_patch ? 'ens_name'
      THEN (CASE WHEN p_patch->'ens_name' = 'null'::jsonb THEN NULL ELSE p_patch->>'ens_name' END)
      ELSE ens_name END,
    profile_hex = CASE WHEN p_patch ? 'profile_hex'
      THEN (CASE WHEN p_patch->'profile_hex' = 'null'::jsonb THEN NULL ELSE p_patch->>'profile_hex' END)
      ELSE profile_hex END,
    profile_logo = CASE WHEN p_patch ? 'profile_logo'
      THEN (CASE WHEN p_patch->'profile_logo' = 'null'::jsonb THEN NULL ELSE p_patch->>'profile_logo' END)
      ELSE profile_logo END,
    profile_sprite_hex = CASE WHEN p_patch ? 'profile_sprite_hex'
      THEN (CASE WHEN p_patch->'profile_sprite_hex' = 'null'::jsonb THEN NULL ELSE p_patch->>'profile_sprite_hex' END)
      ELSE profile_sprite_hex END,
    profile_tags = CASE WHEN p_patch ? 'profile_tags'
      THEN (CASE WHEN p_patch->'profile_tags' = 'null'::jsonb THEN '[]'::jsonb ELSE p_patch->'profile_tags' END)
      ELSE profile_tags END,
    name_font = CASE WHEN p_patch ? 'name_font'
      THEN (CASE WHEN p_patch->'name_font' = 'null'::jsonb THEN NULL ELSE p_patch->>'name_font' END)
      ELSE name_font END,
    showcase = CASE WHEN p_patch ? 'showcase' THEN p_patch->'showcase' ELSE showcase END,
    showcase_style = CASE WHEN p_patch ? 'showcase_style' THEN p_patch->>'showcase_style' ELSE showcase_style END
  WHERE address = p_address
  RETURNING *;
$$;

REVOKE EXECUTE ON FUNCTION public.app_merge_user_state(text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.app_merge_user_state(text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.app_merge_user_state(text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.app_merge_user_state(text, jsonb) TO service_role;
