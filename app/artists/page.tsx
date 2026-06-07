// /artists — the artists directory. Lists every whitelisted Artist with
// links to their profile and their Projects. Sourced from the Project
// registry (one entry per Project; grouped by artist).

import type { Metadata } from 'next';
import Link from 'next/link';
import { allProjects } from '../../lib/project/registry';

export const metadata: Metadata = {
  title: 'Artists · Price Discussion',
  alternates: { canonical: '/artists' },
};

export default function ArtistsPage() {
  // Group Projects by artist handle.
  const byArtist = new Map<string, { slug: string; displayName: string; outputs: number }[]>();
  for (const p of allProjects()) {
    const list = byArtist.get(p.artistHandle) ?? [];
    list.push({ slug: p.slug, displayName: p.displayName, outputs: p.outputs });
    byArtist.set(p.artistHandle, list);
  }
  const artists = [...byArtist.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <section className="artists-page" aria-label="Artists">
      <h1 className="project-title"><span>Artists</span></h1>
      <ul className="artists-list">
        {artists.map(([handle, projects]) => (
          <li key={handle} className="artist-row">
            <Link className="profile-link" href={`/${handle}`}>@{handle}</Link>
            <span className="artist-projects">
              {projects.map((pr, i) => (
                <span key={pr.slug}>
                  {i > 0 ? ' · ' : ' — '}
                  <Link className="hover-link" href={`/art/${pr.slug}`}>{pr.displayName}</Link>
                  <span className="artist-project-count"> ({pr.outputs})</span>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
