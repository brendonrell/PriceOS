'use client';

/*
 * TakeoverBanners — the public inscription layer of HOSTILE TAKEOVER.
 *
 * Renders the takeovers touching a wallet (profile pages) as full-strength
 * banner chips: active windows with a live countdown, then the permanent
 * marks — TAKEOVER COMPLETED / PARTIAL on the caster, YIELDED / WITHSTOOD
 * on the target (WITHSTOOD wears for 180 days; the API handles windows).
 * Renders nothing when there is nothing to inscribe.
 */

import { useEffect, useState } from 'react';
import { getProject } from '../../lib/project/registry';
import type { TakeoverRow } from '../../app/api/takeover/route';

function who(handle: string | null | undefined, addr: string): string {
  return handle ? `@${handle}` : `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function hoursLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 3_600_000));
}

export default function TakeoverBanners({ address }: { address: string }) {
  const [rows, setRows] = useState<TakeoverRow[]>([]);

  useEffect(() => {
    let dead = false;
    fetch(`/api/takeover?address=${encodeURIComponent(address.toLowerCase())}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!dead && j?.takeovers) setRows(j.takeovers as TakeoverRow[]); })
      .catch(() => { /* no inscriptions today */ });
    return () => { dead = true; };
  }, [address]);

  if (rows.length === 0) return null;
  const me = address.toLowerCase();

  return (
    <div className="tko-banners">
      {rows.map((t) => {
        const casting = t.caster_address.toLowerCase() === me;
        const title = getProject(t.project_id)?.displayName ?? t.project_id;
        const pair = `${who(t.caster_handle, t.caster_address)} → ${who(t.target_handle, t.target_address)}`;
        let label: string;
        let cls = '';
        if (t.status === 'active') {
          label = `${casting ? 'TAKEOVER' : 'UNDER TAKEOVER'} · ${pair} · ${t.token_count} ${title} · Ξ${t.price_eth} each · ${hoursLeft(t.expires_at)}h`;
          cls = ' is-active';
        } else if (t.status === 'completed') {
          label = `${casting ? 'TAKEOVER COMPLETED' : 'YIELDED TAKEOVER'} · ${pair} · ${t.token_count} ${title}`;
        } else if (t.status === 'partial') {
          label = `TAKEOVER PARTIAL · ${t.accepted_count} of ${t.token_count} yielded · ${pair} · ${title}`;
        } else {
          label = `${casting ? 'TAKEOVER REBUFFED' : 'WITHSTOOD TAKEOVER'} · ${pair} · ${t.token_count} ${title}`;
          cls = casting ? '' : ' is-withstood';
        }
        return (
          <a key={t.id} className={`tko-banner${cls}`} href={`/art/${t.project_id}`}>
            <span className="tko-glyph">{'⚑︎'}</span> {label}
          </a>
        );
      })}
    </div>
  );
}
