'use client';

/*
 * RewindHome — the home surface docked at a past PriceDay.
 *
 * Renders inside the same Hero chrome as the live home, but every number and
 * list is the as-of state from /api/rewind. Read-only: project rows navigate
 * (their pages dock at the same day via RewindContext), nothing commercial
 * renders. "As-of data or nothing — never a silent mix" (Rewind spec).
 */

import { useEffect, useState } from 'react';
import { useRewind } from '../../lib/state/RewindContext';
import { getProject, projectColorway } from '../../lib/project/registry';

interface RewindHomePayload {
  day: number;
  date: string;
  stats: { projects: number; volume_eth: string; minted: number };
  uploads: { slug: string; title: string; minted: number; supply: number }[];
  minting_now: { slug: string; title: string; minted: number; supply: number }[];
  day_log: {
    mints: number; sales: number; volume_eth: number; uploads: number;
    top_sale: { slug: string; id: number; eth: number } | null;
  };
}

function ProjectRow({ p }: { p: { slug: string; title: string; minted: number; supply: number } }) {
  const color = projectColorway(p.slug) ?? getProject(p.slug)?.colorway ?? undefined;
  return (
    <a className="rw-project-row" href={`/art/${p.slug}`}>
      <span className="rw-dot" style={color ? { background: color } : undefined} aria-hidden="true" />
      <span className="rw-name">{p.title}</span>
      <span className="rw-count">{p.minted}/{p.supply || '?'}</span>
    </a>
  );
}

export default function RewindHome() {
  const { day } = useRewind();
  const [data, setData] = useState<RewindHomePayload | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (day == null) return;
    let dead = false;
    setData(null);
    setFailed(false);
    fetch(`/api/rewind?day=${day}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => { if (!dead) setData(j as RewindHomePayload); })
      .catch(() => { if (!dead) setFailed(true); });
    return () => { dead = true; };
  }, [day]);

  if (day == null) return null;
  if (failed) {
    return <div className="rw-body"><div className="rw-empty">THE RECORD IS UNREACHABLE — TRY AGAIN</div></div>;
  }
  if (!data) {
    // House rule: always feel moving forward.
    return <div className="rw-body"><div className="rw-loading" aria-label="Charting the day">CONSULTING THE RECORD<span className="rw-ellipsis" /></div></div>;
  }

  const log = data.day_log;
  const logBits: string[] = [];
  if (log.uploads > 0) logBits.push(`${log.uploads} UPLOAD${log.uploads === 1 ? '' : 'S'}`);
  if (log.mints > 0) logBits.push(`${log.mints} MINT${log.mints === 1 ? '' : 'S'}`);
  if (log.sales > 0) logBits.push(`${log.sales} SALE${log.sales === 1 ? '' : 'S'}`);
  if (log.volume_eth > 0) logBits.push(`Ξ${log.volume_eth} MOVED`);

  return (
    <div className="rw-body">
      <div className="hero-line stats-row">
        <span className="stat-item">
          <span className="stat-icon stat-icon-box">⬚&#xFE0E;</span>{' '}
          <span className="stat-val">{data.stats.projects} PRO</span>
        </span>
        <span className="stat-item stat-item-vol">
          <span className="stat-icon-eth">⟠&#xFE0E;</span>{' '}
          <span className="stat-val stat-val-vol">{Math.round(Number(data.stats.volume_eth) || 0)} VOL</span>
        </span>
        <span className="stat-item stat-item-owners">
          <span className="stat-icon stat-icon-owners">⌗&#xFE0E;</span>{' '}
          <span className="stat-val stat-val-owners">{data.stats.minted} NFT<span style={{ fontSize: '0.72em' }}>s</span></span>
        </span>
      </div>

      <div className="rw-daylog">
        {logBits.length > 0 ? (
          <>
            <span className="rw-daylog-line">{logBits.join(' · ')}</span>
            {log.top_sale && (
              <a className="rw-daylog-top" href={`/art/${log.top_sale.slug}/${log.top_sale.id}`}>
                {'✶︎'} DAY&apos;S TOP: {(getProject(log.top_sale.slug)?.displayName ?? log.top_sale.slug).toUpperCase()} #{log.top_sale.id} · Ξ{log.top_sale.eth}
              </a>
            )}
          </>
        ) : (
          <span className="rw-daylog-line">A QUIET DAY. THE RECORD KEEPS IT ANYWAY.</span>
        )}
      </div>

      {data.minting_now.length > 0 && (
        <div className="rw-section">
          <div className="rw-section-head">NOW MINTING — AS IT STOOD</div>
          {data.minting_now.map((p) => <ProjectRow key={p.slug} p={p} />)}
        </div>
      )}
      {data.uploads.length > 0 && (
        <div className="rw-section">
          <div className="rw-section-head">NEW GEN ART — AS IT STOOD</div>
          {data.uploads.map((p) => <ProjectRow key={p.slug} p={p} />)}
        </div>
      )}
      {data.minting_now.length === 0 && data.uploads.length === 0 && (
        <div className="rw-empty">BEFORE THE FIRST PROJECT. THE SEA WAS EMPTY.</div>
      )}
    </div>
  );
}
