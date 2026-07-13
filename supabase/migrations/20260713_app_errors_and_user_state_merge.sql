-- MIRROR of live migration 20260713…_app_errors_and_user_state_merge
-- (applied 2026-07-13 — hardening items 4 + 9, Architect Report §3.3 + §3.4).

-- ── app_errors: the error-visibility sink ────────────────────────────────────
-- Written ONLY by the service role (the /api/telemetry route + serverError());
-- no client role can read or write it. Retention enforced by the route.
CREATE TABLE IF NOT EXISTS public.app_errors (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  kind       text NOT NULL CHECK (kind IN ('client','server')),
  route      text,
  message    text NOT NULL,
  stack_head text,
  build_id   text,
  ua         text,
  address    text,
  fingerprint text NOT NULL,
  count      integer NOT NULL DEFAULT 1,
  last_seen  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS app_errors_fingerprint_idx ON public.app_errors (fingerprint);
CREATE INDEX IF NOT EXISTS app_errors_last_seen_idx ON public.app_errors (last_seen);
ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: RLS on + zero policies = anon/authenticated locked
-- out; service_role bypasses RLS.

-- ── app_merge_user_state: atomic per-key merge for /api/me PATCH ────────────
-- Fixes last-write-wins clobber: jsonb || merges the PROVIDED top-level keys
-- into the stored envelope in ONE statement. Proven on a scratch row at apply
-- time: sibling keys survive, scalars apply, anon EXECUTE = false.
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
    showcase = CASE WHEN p_patch ? 'showcase' THEN p_patch->'showcase' ELSE showcase END,
    showcase_style = CASE WHEN p_patch ? 'showcase_style' THEN p_patch->>'showcase_style' ELSE showcase_style END
  WHERE address = p_address
  RETURNING *;
$$;

REVOKE EXECUTE ON FUNCTION public.app_merge_user_state(text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.app_merge_user_state(text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.app_merge_user_state(text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.app_merge_user_state(text, jsonb) TO service_role;
