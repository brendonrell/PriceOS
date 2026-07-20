-- ── TAG PAINT (Brendon, 2026-07-20) ─────────────────────────────────────────
--   • tag_paint  text — the profile owner's all-tags paint override
--     ('black' | 'white' | 'hothurt' | 'attention' | 'blue'; null = each tag
--     wears its own colour). Validated against lib/tags/catalog TAG_PAINTS by
--     /api/me; PUBLIC read (the painted pills show to every visitor).
-- Additive, non-destructive.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS tag_paint text;

GRANT SELECT (tag_paint)
  ON public.users TO anon, authenticated;

-- ── Extend app_merge_user_state to write tag_paint ───────────────────────────
-- Same atomic per-key merge as before; one scalar key added on top of the
-- 20260719_profile_tags definition.
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
    tag_paint = CASE WHEN p_patch ? 'tag_paint'
      THEN (CASE WHEN p_patch->'tag_paint' = 'null'::jsonb THEN NULL ELSE p_patch->>'tag_paint' END)
      ELSE tag_paint END,
    showcase = CASE WHEN p_patch ? 'showcase' THEN p_patch->'showcase' ELSE showcase END,
    showcase_style = CASE WHEN p_patch ? 'showcase_style' THEN p_patch->>'showcase_style' ELSE showcase_style END
  WHERE address = p_address
  RETURNING *;
$$;

REVOKE EXECUTE ON FUNCTION public.app_merge_user_state(text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.app_merge_user_state(text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.app_merge_user_state(text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.app_merge_user_state(text, jsonb) TO service_role;
