-- Reserve platform user number #22 for the deployer wallet (Brendon,
-- 2026-07-19: "I am PD user #1, let's reserve 22 for deployer wallet").
--
-- @pricediscussion (pricediscussion.eth, 0x146034ec…15b9b8 — the deployer /
-- platform wallet) joined 55th, so it wears #55; #22 landed on the umbra-ai
-- NPC account by join order. This swaps the two numbers — a pure exchange,
-- nobody else's number moves, and the #1–22 individual number tags stay
-- honest (umbra-ai at #55 falls under the FIRST 100 tag instead).
--
-- The unique index users_user_number_idx forces the three-step swap.

UPDATE public.users SET user_number = NULL
  WHERE lower(address) = '0xa200000000000000000000000000000000000004'  -- umbra-ai (#22)
    AND user_number = 22;

UPDATE public.users SET user_number = 22
  WHERE lower(address) = '0x146034ec25c277f30f63933b151297689e15b9b8'  -- @pricediscussion (deployer)
    AND user_number = 55;

UPDATE public.users SET user_number = 55
  WHERE lower(address) = '0xa200000000000000000000000000000000000004'
    AND user_number IS NULL;
