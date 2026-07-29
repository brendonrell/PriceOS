import { getSupabaseAnon, getSupabaseService, PUBLIC_USER_COLUMNS, type UserRow } from '@/lib/supabase';
import { getUserOwnedProjectsCount, getUserSpendEth } from './getUserHoldings';
import { teamStyleIndex } from '@/lib/tags/catalog';

/** Profile row plus follower/following counts — the shape both the
 *  /api/user/by-handle route and the server-rendered profile page use. */
export interface UserProfileData extends UserRow {
  follower_count: number;
  following_count: number;
  /** Distinct projects this wallet owns pieces from (collectors' "N owned"). */
  owned_projects: number;
  /** Cumulative ETH spent acquiring Outputs over the account's lifetime. */
  volume_spent_eth: number;
  /** DEACTIVATE (Spell Book) — the owner has turned on the public "deactivated"
   *  display. Derived server-side from their own saved setting; a visitor sees
   *  the deactivated shell, while the owner still sees their real profile. */
  deactivated: boolean;
  /** Tag ids the owner switched ON — one array lifted from the private settings
   *  envelope server-side so every visitor renders the same tag row. Tags are
   *  OFF by default, so an empty array means a bare profile (Brendon,
   *  2026-07-26). */
  shown_tags: string[];
  /** Tag ids the owner switched OFF (darks a default-on project tag). */
  tags_off: string[];
  /** Which of the twelve WTBS-family chip treatments the owner cycled to —
   *  lifted from the same private envelope so visitors see the owner's pick
   *  (Brendon, 2026-07-26). */
  team_tag_style: number;
}

// Handle shape mirrors lib/slug.ts: ASCII alphanumerics, underscore, hyphen.
const HANDLE_RE = /^[a-z0-9_-]+$/;
const ADDRESS_RE = /^0x[0-9a-f]{40}$/;

/**
 * Resolve a wallet address to its owner's permanent handle. Addresses are
 * stored lowercase (SIWE session lowercases throughout), so we lowercase the
 * input and match exactly. Returns null when the address is malformed, has no
 * row, or the row has no handle. Throws on a real DB error. Anon client, RLS.
 */
export async function getHandleByAddress(
  rawAddress: string
): Promise<string | null> {
  const address = rawAddress.toLowerCase();
  if (!ADDRESS_RE.test(address)) return null;

  const supabase = getSupabaseAnon();
  const { data, error } = await supabase
    .from('users')
    .select('handle')
    .eq('address', address)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const row = data as { handle: string | null } | null;
  return row?.handle ?? null;
}

/**
 * Look up a public profile by its permanent handle, with follower/following
 * counts. Returns null when the handle is malformed or no row matches.
 * Throws on a real DB error so callers can distinguish "no user" from
 * "lookup failed." Safe server-side (anon client, RLS-bound, reads only).
 */
export async function getUserProfileByHandle(
  rawHandle: string
): Promise<UserProfileData | null> {
  const handle = rawHandle.toLowerCase();
  if (!HANDLE_RE.test(handle)) return null;

  const supabase = getSupabaseAnon();

  const { data: user, error: userErr } = await supabase
    .from('users')
    .select(PUBLIC_USER_COLUMNS)
    .eq('handle', handle)
    .maybeSingle();

  if (userErr) throw new Error(userErr.message);
  if (!user) return null;

  const userRow = user as UserRow;
  const userHandle = userRow.handle as string;

  const [followersRes, followingRes] = await Promise.all([
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_name', userHandle),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_name', userHandle),
  ]);

  if (followersRes.error) throw new Error(followersRes.error.message);
  if (followingRes.error) throw new Error(followingRes.error.message);

  // Distinct projects owned + lifetime spend — best-effort (never fail the
  // profile lookup over an aggregate query).
  let ownedProjects = 0;
  let volumeSpent = 0;
  try {
    const addr = (userRow.address ?? '').toLowerCase();
    if (addr) {
      [ownedProjects, volumeSpent] = await Promise.all([
        getUserOwnedProjectsCount(addr),
        getUserSpendEth(addr),
      ]);
    }
  } catch { /* leave 0 */ }

  // DEACTIVATE — the owner's public "deactivated profile" display, derived from
  // their own saved Spell Book flag (settings.notifs.spell_invisible). Read with
  // the service key server-side so the private settings envelope is never
  // exposed — only this one boolean leaves the server. Best-effort → false.
  let deactivated = false;
  let shownTags: string[] = [];
  let tagsOff: string[] = [];
  let teamTagStyle = 0;
  try {
    const svc = getSupabaseService();
    const { data: dRow } = await svc
      .from('users')
      .select('settings')
      .eq('handle', userHandle)
      .maybeSingle();
    const s = (dRow as { settings?: { notifs?: Record<string, unknown>; shownTags?: unknown; tagsOff?: unknown; teamTagStyle?: unknown } } | null)?.settings;
    deactivated = !!(s?.notifs?.spell_invisible);
    if (Array.isArray(s?.shownTags)) shownTags = s.shownTags.filter((x): x is string => typeof x === 'string');
    if (Array.isArray(s?.tagsOff)) tagsOff = s.tagsOff.filter((x): x is string => typeof x === 'string');
    teamTagStyle = teamStyleIndex(s?.teamTagStyle);
  } catch { /* leave defaults */ }

  return {
    ...userRow,
    follower_count: followersRes.count ?? 0,
    following_count: followingRes.count ?? 0,
    owned_projects: ownedProjects,
    volume_spent_eth: volumeSpent,
    deactivated,
    shown_tags: shownTags,
    tags_off: tagsOff,
    team_tag_style: teamTagStyle,
  };
}
