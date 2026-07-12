// /dispatch/[date] — the permanent archive. A cited URL resolves forever;
// editions are immutable rows keyed by publication date (YYYY-MM-DD).
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseService } from '@/lib/supabase';
import type { DispatchBody } from '@/lib/dispatch/build.server';
import DispatchPage from '../DispatchPage';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function generateMetadata(props: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await props.params;
  return {
    title: `The Dispatch · ${date} · Price Discussion`,
    alternates: { canonical: `/dispatch/${date}` },
  };
}

export default async function DispatchByDate(props: { params: Promise<{ date: string }> }) {
  const { date } = await props.params;
  if (!DATE_RE.test(date)) notFound();

  const db = getSupabaseService();
  const { data } = await db
    .from('dispatches')
    .select('day, body')
    .eq('cal_date', date)
    .maybeSingle();
  const row = data as { day: number; body: DispatchBody } | null;
  if (!row) notFound();

  const [prevRes, nextRes] = await Promise.all([
    db.from('dispatches').select('cal_date').lt('day', row.day).order('day', { ascending: false }).limit(1).maybeSingle(),
    db.from('dispatches').select('cal_date').gt('day', row.day).order('day', { ascending: true }).limit(1).maybeSingle(),
  ]);
  const prev = (prevRes.data as { cal_date: string } | null)?.cal_date ?? null;
  const next = (nextRes.data as { cal_date: string } | null)?.cal_date ?? null;

  return <DispatchPage body={row.body} nav={{ prev, next }} />;
}
