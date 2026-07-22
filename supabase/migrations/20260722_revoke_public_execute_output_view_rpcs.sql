-- Security fix (2026-07-22 full-app audit): lock the two SECURITY DEFINER
-- output-view RPCs to the SERVER (service_role) only.
--
-- Both were reachable directly with the PUBLIC anon key (shipped in the
-- browser) via /rest/v1/rpc/, bypassing the SIWE-gated /api/output-views route.
-- Because they take the viewer identity as a text argument and run as definer
-- (RLS on output_views bypassed), any anonymous caller could:
--   * record_output_view  — pass ANY @name and forge view rows / inflate view
--                           counts under a victim's identity (their History
--                           shows Outputs they never opened).
--   * output_view_stats   — pass ANY @name and read per-output viewer counts +
--                           probe mutual-follow relationships for arbitrary
--                           users.
-- Same class as the four sticker/offer RPCs locked in
-- 20260711_revoke_public_execute_sticker_offer_rpcs.sql; these two were missed.
--
-- The app only ever calls these through getSupabaseService() (service_role),
-- which keeps its own EXECUTE, so this is subtractive only — no legitimate
-- path changes. Mirrors the grant posture of the locked money/sticker RPCs.

REVOKE EXECUTE ON FUNCTION public.record_output_view(text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.output_view_stats(text, integer, text)  FROM PUBLIC, anon, authenticated;
