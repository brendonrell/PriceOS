-- AI artist / placeholder accounts move to the 1000+ block; real humans get
-- 1–999 first-come (Brendon, 2026-07-24: "push them to 1000 just to be safe").
--
-- Today every user_number 2–55 except #22 (the deployer) is a placeholder AI /
-- model account that gets deleted before launch — so the low numbers Brendon
-- wants for real invitees are occupied. This frees them:
--   • #1  stays Brendon (reserved)
--   • #22 stays the deployer wallet (reserved)
--   • every other current account is pushed to 1000, 1001, … (order preserved)
--   • new signups fill the SMALLEST free number ≥2, skipping reserved #22 and
--     staying below the 1000 AI block — so the next real joiner is #2, then #3…
--
-- Any AI artist seeded from here on must insert an EXPLICIT user_number ≥ 1000
-- so it bypasses the human gap-fill below.

-- ── Push all non-reserved accounts into the 1000+ block, order preserved ──────
-- Targets are all ≥1000 and the current max is 55, so no collision with the
-- unique index users_user_number_idx during the update.
WITH movers AS (
  SELECT address, row_number() OVER (ORDER BY user_number ASC) - 1 AS offset
  FROM public.users
  WHERE user_number IS NOT NULL
    AND user_number NOT IN (1, 22)
)
UPDATE public.users u
  SET user_number = 1000 + m.offset
  FROM movers m
  WHERE u.address = m.address;

-- ── New signups fill the lowest free HUMAN slot ──────────────────────────────
-- Smallest free integer in [2, 999], skipping reserved #22 (#1 is never handed
-- out — it's Brendon's). The 1000+ AI block is left untouched.
CREATE OR REPLACE FUNCTION public.assign_user_number()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  next_n integer;
BEGIN
  IF NEW.user_number IS NULL THEN
    SELECT s.n INTO next_n
    FROM generate_series(2, 999) AS s(n)
    WHERE s.n <> 22
      AND NOT EXISTS (SELECT 1 FROM public.users WHERE user_number = s.n)
    ORDER BY s.n
    LIMIT 1;
    NEW.user_number := next_n;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_user_number ON public.users;
CREATE TRIGGER trg_assign_user_number
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_user_number();
