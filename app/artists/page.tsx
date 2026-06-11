// /artists — the artists directory. Lists every WHITELISTED Artist (the
// allowlist table is the sim stand-in for the on-chain whitelist — a wallet
// absent from it simply isn't on this page), with live status and links to
// their profile and Projects:
//
//   ☼  active        (whitelisted, mintable now)
//   ☽  in cooldown   (60-day cooldown, fires at UPLOAD — core PD spec)
//
// Projects still come from the registry (frontend-canonical); the allowlist
// + cooldown signal come from the DB, so this page renders per-request.

import type { Metadata } from 'next';
import Link from 'next/link';
import { allProjects } from '../../lib/project/registry';
import { getAllowlistedArtists, type AllowlistedArtist } from '../../lib/artists/allowlist';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Artists · Price Discussion',
  alternates: { canonical: '/artists' },
};

const VS15 = '︎';

export default async function ArtistsPage() {
  // Whitelist first — an artist with zero Projects still belongs here.
  let artists: AllowlistedArtist[] = [];
  try {
    artists = await getAllowlistedArtists();
  } catch {
    artists = [];
  }

  // Group registry Projects by artist handle for the per-row project links.
  const byArtist = new Map<string, { slug: string; displayName: string; outputs: number }[]>();
  for (const p of allProjects()) {
    const list = byArtist.get(p.artistHandle.toLowerCase()) ?? [];
    list.push({ slug: p.slug, displayName: p.displayName, outputs: p.outputs });
    byArtist.set(p.artistHandle.toLowerCase(), list);
  }

  return (
    <section className="artists-page" aria-label="Artists">
      <h1 className="project-title"><span>Artists</span></h1>
      <ul className="artists-list">
        {artists.map((a) => {
          const handle = a.handle ?? `${a.address.slice(0, 6)}…${a.address.slice(-4)}`;
          const projects = a.handle ? byArtist.get(a.handle.toLowerCase()) ?? [] : [];
          const glyph = a.status === 'cooldown' ? '☽' : '☼';
          const glyphTitle = a.status === 'cooldown' ? 'In cooldown' : 'Active';
          return (
            <li key={a.address} className="artist-row">
              <span className="artist-status" title={glyphTitle} aria-label={glyphTitle}>
                {glyph + VS15}
              </span>{' '}
              <Link className="profile-link" href={`/${a.handle ?? a.address}`}>@{handle}</Link>
              <span className="artist-projects">
                {projects.length === 0 ? (
                  <span className="artist-project-count"> — no Projects yet</span>
                ) : (
                  projects.map((pr, i) => (
                    <span key={pr.slug}>
                      {i > 0 ? ' · ' : ' — '}
                      <Link className="hover-link" href={`/art/${pr.slug}`}>{pr.displayName}</Link>
                      <span className="artist-project-count"> ({pr.outputs})</span>
                    </span>
                  ))
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
