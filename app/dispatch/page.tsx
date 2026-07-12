// /dispatch — this morning's paper (latest printed edition).
import type { Metadata } from 'next';
import { getSupabaseService } from '@/lib/supabase';
import type { DispatchBody } from '@/lib/dispatch/build.server';
import DispatchPage from './DispatchPage';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'The Dispatch · Price Discussion',
  description: "PD's morning paper — yesterday, on the record.",
  alternates: { canonical: '/dispatch' },
};

export default async function DispatchLatest() {
  let body: DispatchBody | null = null;
  let prev: string | null = null;
  try {
    const db = getSupabaseService();
    const { data } = await db
      .from('dispatches')
      .select('day, body')
      .order('day', { ascending: false })
      .limit(2);
    const rows = (data ?? []) as { day: number; body: DispatchBody }[];
    body = rows[0]?.body ?? null;
    prev = rows[1]?.body.cal_date ?? null;
  } catch { /* renders the pressroom-empty state */ }

  if (!body) {
    return (
      <main className="dispatch-page">
        <header className="dp-masthead">
          <div className="dp-paper-name">THE PD DISPATCH</div>
          <div className="dp-edition-line">FIRST EDITION PRINTS TOMORROW AT 9AM</div>
        </header>
      </main>
    );
  }
  return <DispatchPage body={body} nav={{ prev, next: null }} />;
}
