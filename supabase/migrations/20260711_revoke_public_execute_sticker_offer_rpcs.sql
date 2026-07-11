-- Security fix (2026-07-11 app audit): lock the four value-moving SECURITY
-- DEFINER trade RPCs to the SERVER (service_role) only.
--
-- These four were reachable directly with the PUBLIC anon key (shipped in the
-- browser) via /rest/v1/rpc/, bypassing every route-level SIWE check. Because
-- they take the actor identity as a text argument and run as definer (RLS
-- bypassed), any anonymous caller could pass ANY wallet and force sticker
-- buys/accepts/swaps or accept a collection/trait offer on someone else's
-- token. The three main money RPCs (app_mint / app_buy / app_accept_offer)
-- were already locked to postgres + service_role; these newer four were missed.
--
-- The app only ever calls these through getSupabaseService() (service_role),
-- which keeps its own EXECUTE, so this is subtractive only — no legitimate
-- path changes. Mirrors the grant posture of the three locked money RPCs.

REVOKE EXECUTE ON FUNCTION public.app_sticker_buy(text, uuid, integer)            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.app_sticker_accept(text, uuid, integer)         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.app_sticker_swap_accept(text, uuid)             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.app_accept_criteria_offer(text, text, text, uuid) FROM PUBLIC, anon, authenticated;
