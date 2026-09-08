import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnon, getSupabaseService, PUBLIC_USER_COLUMNS, type UserRow } from '@/lib/supabase';
import { getUserOwnedProjectsCount, getUserHoldings } from '@/lib/profile/getUserHoldings';
import { buildAutoShowcase, showcaseSlotsEqual } from '@/lib/profile/autoShowcase';
import { badRequest, notFound, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export interface UserProfileResponse extends UserRow {
  follower_count: number;
  following_count: number;
}

export async function GET(_req: NextRequest, props: { params: Promise<{ address: string }> }): Promise<NextResponse> {
  const params = await props.params;
  const address = params.address.toLowerCase();
  if (!ADDRESS_RE.test(address)) {
    return badRequest('Invalid Ethereum address');
  }

  try {
    const supabase = getSupabaseAnon();

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select(PUBLIC_USER_COLUMNS)
      .eq('address', address)
      .maybeSingle();

    if (userErr) return serverError(userErr.message);
    if (!user) return notFound('User not found');

    const userRow = user as UserRow;

    // Pre-claim: no handle → no follows possible (follows.* is keyed on
    // @name, not wallet). Skip the follows queries and return zero counts.
    let follower_count = 0;
    let following_count = 0;
    if (userRow.handle !== null) {
      const [followersRes, followingRes] = await Promise.all([
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_name', userRow.handle),
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_name', userRow.handle),
      ]);

      if (followersRes.error) return serverError(followersRes.error.message);
      if (followingRes.error) return serverError(followingRes.error.message);

      follower_count = followersRes.count ?? 0;
      following_count = followingRes.count ?? 0;
    }

    // Project edges (Brendon 2026-06-14): every project you HOLD follows you
    // (so it counts among your followers — sell the bag and the count drops),
    // and every project you explicitly FOLLOW counts toward your following.
    // Keyed on address, so these run regardless of @name claim. Uses the same
    // getUserOwnedProjectsCount helper as the profile page and Friend
    // Inspector (paged, excludes hidden test projects) so all three surfaces
    // agree (Brendon 2026-08-16).
    const [heldProjects, projFollowRes] = await Promise.all([
      getUserOwnedProjectsCount(address),
      supabase
        .from('project_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_address', address),
    ]);
    if (projFollowRes.error) return serverError(projFollowRes.error.message);
    follower_count += heldProjects;
    following_count += projFollowRes.count ?? 0;

    const response: UserProfileResponse = {
      ...userRow,
      follower_count,
      following_count,
    };

    // Same auto-fill catch-up as the SSR profile page (see
    // lib/profile/getUserProfileByHandle.ts for the full rationale) — this
    // route is the client-side live-refresh channel, so covering it too
    // means a visitor who's already sitting on someone's profile when a
    // mint lands sees the Showcase catch up on the very next refresh, not
    // just on their next full page load.
    //
    // showcase_user_set / showcase_auto_locked aren't in PUBLIC_USER_COLUMNS
    // (no anon column GRANT for them — userRow can't see them), so they get
    // their own service-role read here rather than trusting anything off
    // the anon-selected row for the lock check.
    try {
      const svc = getSupabaseService();
      const { data: flagRow } = await svc
        .from('users')
        .select('showcase, showcase_user_set, showcase_auto_locked')
        .eq('address', address)
        .maybeSingle();
      const flags = flagRow as { showcase?: UserRow['showcase']; showcase_user_set?: boolean; showcase_auto_locked?: boolean } | null;
      if (flags && !flags.showcase_user_set && !flags.showcase_auto_locked) {
        const holdings = await getUserHoldings(address);
        const auto = holdings?.length
          ? buildAutoShowcase(holdings.map((h) => ({ slug: h.slug, token_id: h.token_id, mint_ts: h.mint_ts })))
          : null;
        if (auto && flags.showcase && !showcaseSlotsEqual(auto.slots, flags.showcase.slots)) {
          const patch: Record<string, unknown> = { showcase: { slots: auto.slots } };
          if (auto.distinctProjects >= 6) patch.showcase_auto_locked = true;
          await svc.from('users').update(patch as never).eq('address', address);
          response.showcase = { slots: auto.slots };
        }
      }
    } catch { /* best-effort — stored showcase stands on any failure */ }

    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
