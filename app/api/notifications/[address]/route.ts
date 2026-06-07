import { NextResponse } from 'next/server';
import { getSupabaseService, type NotificationRow } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError, unauthorized } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export interface NotificationsListResponse {
  address: string;
  unread_count: number;
  notifications: NotificationRow[];
  next_cursor: string | null;
}

export const GET = requireAuth<{ address: string }>(
  async (req, { params }, authAddress) => {
    const address = params.address.toLowerCase();
    if (!ADDRESS_RE.test(address)) {
      return badRequest('Invalid Ethereum address');
    }
    if (address !== authAddress) {
      return unauthorized('Cannot read notifications for another address');
    }

    const url = new URL(req.url);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT))
    );
    const cursor = url.searchParams.get('cursor');

    try {
      const supabase = getSupabaseService();

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('recipient_address', address)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (cursor) query = query.lt('created_at', cursor);

      const { data: notifications, error } = await query;
      if (error) return serverError(error.message);

      const { count, error: countErr } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_address', address)
        .eq('read', false);

      if (countErr) return serverError(countErr.message);

      const list = (notifications ?? []) as Array<{ created_at: string } & Record<string, unknown>>;
      const response: NotificationsListResponse = {
        address,
        unread_count: count ?? 0,
        notifications: list as unknown as NotificationsListResponse['notifications'],
        next_cursor: list.length === limit ? list[list.length - 1].created_at : null,
      };
      return NextResponse.json(response);
    } catch (err) {
      return serverError(err instanceof Error ? err.message : 'Unknown error');
    }
  }
);
