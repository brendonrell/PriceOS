'use client';

/*
 * RewindProjectView — one Project docked at a past PriceDay.
 *
 * The rewound project page: as-of hero stats + the gallery capped to pieces
 * minted by that day (real ArtworkCards — the art is timeless; provenance is
 * what rewinds). Everything commercial is simply absent, per the Rewind
 * spec's "as-of data or nothing" rule. Unborn projects say so.
 */

import { useEffect, useState } from 'react';
import ArtworkCard from '../ArtworkCard';
import { useRewind } from '../../lib/state/RewindContext';

interface RewindProjectPayload {
  day: number;
  date: string;
  slug: string;
  title: string;
  minted: number;
  supply: number;
  holders: number;
  volume_eth: number;
  ath_eth: number;
  born: boolean;
  graduated: boolean;
  sold_out: boolean;
  minted_ids: number[];
}

export default function RewindProjectView({ slug }: { slug: string }) {
  const { day, today } = useRewind();
  const [data, setData] = useState<RewindProjectPayload | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (day == null) return;
    if (day < 1 || day > today) { setData(null); setFailed(false); return; }
    let dead = false;
    setData(null);
    setFailed(false);
    fetch(`/api/rewind?day=${day}&slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => { if (!dead) setData(j as RewindProjectPayload); })
      .catch(() => { if (!dead) setFailed(true); });
    return () => { dead = true; };
  }, [day, slug, today]);

  if (day == null) return null;
  if (day < 1) return <div className="rw-body"><div className="rw-empty">NOTHING HERE — PRICE DISCUSSION HADN&rsquo;T BEGUN.</div></div>;
  if (day > today) return <div className="rw-body"><div className="rw-empty">NOTHING HERE YET — THIS DAY HASN&rsquo;T HAPPENED.</div></div>;
  if (failed) return <div className="rw-body"><div className="rw-empty">THE RECORD IS UNREACHABLE — TRY AGAIN</div></div>;
  if (!data) return <div className="rw-body"><div className="rw-loading" aria-label="Charting the day">CONSULTING THE RECORD<span className="rw-ellipsis" /></div></div>;

  if (!data.born) {
    return (
      <div className="rw-body">
        <div className="rw-empty">NOT YET BORN ON DAY {data.day} — THIS PROJECT ARRIVES LATER.</div>
      </div>
    );
  }

  return (
    <div className="rw-body">
      <div className="hero-line stats-row">
        <span className="stat-item">
          <span className="stat-val">{data.minted}/{data.supply || '?'} MINTED</span>
        </span>
        <span className="stat-item">
          <span className="stat-icon stat-icon-owners">⌗&#xFE0E;</span>{' '}
          <span className="stat-val">{data.holders} PPL</span>
        </span>
        <span className="stat-item stat-item-vol">
          <span className="stat-icon-eth">⟠&#xFE0E;</span>{' '}
          <span className="stat-val stat-val-vol">{data.volume_eth} VOL</span>
        </span>
        {data.ath_eth > 0 && (
          <span className="stat-item">
            <span className="stat-val">ATH ◊{data.ath_eth}</span>
          </span>
        )}
      </div>
      <div className="rw-daylog">
        <span className="rw-daylog-line">
          {data.sold_out ? 'SOLD OUT BY THIS DAY' : data.graduated ? 'MINTING — GRADUATED' : 'PRE-GRADUATION — NEW UPLOAD'}
        </span>
      </div>
      {data.minted_ids.length > 0 ? (
        <section className="gallery rw-gallery" aria-label={`Pieces minted by day ${data.day}`}>
          {data.minted_ids.map((id, i) => (
            <ArtworkCard key={id} id={id} eager={i < 12} />
          ))}
        </section>
      ) : (
        <div className="rw-empty">NO PIECES MINTED YET — THE WALL WAS BARE.</div>
      )}
    </div>
  );
}
