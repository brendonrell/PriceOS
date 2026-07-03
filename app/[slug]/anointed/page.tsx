// Profile sub-route — /{handle}/anointed.
// Renders only for valid profile handles; numeric/reserved/invalid → 404.
// One account = ONE Anointment (a Pledge of Fealty): which Project, through
// which Output conduit, when placed, and whether the 60-day lock still holds.
// Server component, mirrors the sibling sub-routes' shape + CSS classes
// (proof / proof-logo / proof-status).
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveProfileHandle } from '@/lib/slug';
import { getUserProfileByHandle } from '@/lib/profile/getUserProfileByHandle';
import { getSupabaseAnon } from '@/lib/supabase';
import { ANOINT_LOCK_DAYS } from '@/lib/anoint/levels';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

interface Pledge {
  project_id: string;
  output_token_id: string;
  placed_at: string;
}

/** Resolve handle → address → the user's single Anointment (or null). Anon
 *  client, RLS-bound, reads only. Returns null when the user has no pledge;
 *  the page renders the empty state for that. */
async function getPledge(handle: string): Promise<Pledge | null> {
  const profile = await getUserProfileByHandle(handle);
  if (!profile) return null;

  const supabase = getSupabaseAnon();
  const { data, error } = await supabase
    .from('anointments')
    .select('project_id, output_token_id, placed_at')
    // user_address is the PK — at most one row. Not in the generated types.
    .eq('user_address' as never, profile.address)
    .maybeSingle();
  if (error) throw new Error(error.message);

  // Cast around Supabase typed-client `never` inference on the new table.
  return (data ?? null) as Pledge | null;
}

export default async function ProfileAnointedPage(props: Props) {
  const params = await props.params;
  const handle = resolveProfileHandle(params.slug);
  if (!handle) notFound();

  const pledge = await getPledge(handle);

  let locked = false;
  let placedLabel = '';
  if (pledge) {
    const placed = new Date(pledge.placed_at);
    const unlocksAtMs = placed.getTime() + ANOINT_LOCK_DAYS * 24 * 60 * 60 * 1000;
    locked = Date.now() < unlocksAtMs;
    placedLabel = placed.toISOString().slice(0, 10);
  }

  return (
    <main className="proof">
      <h1 className="proof-logo">anointed</h1>
      {!pledge ? (
        <p className="proof-status">
          <strong>/{handle}/anointed</strong>
          <br />
          {handle} hasn&rsquo;t placed their Anointment yet.
        </p>
      ) : (
        <p className="proof-status">
          <strong>/{handle}/anointed</strong>
          <br />
          {handle} anointed <strong>{pledge.project_id}</strong> through output #
          {pledge.output_token_id}.
          <br />
          Placed {placedLabel} — {locked ? 'LOCKED' : 'unlocked'}.
        </p>
      )}
    </main>
  );
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const handle = resolveProfileHandle(params.slug);
  if (!handle) return { title: 'Not Found · Price Discussion' };
  return {
    title: `${handle}'s anointed · Price Discussion`,
    alternates: { canonical: `/${handle}/anointed` },
  };
}
