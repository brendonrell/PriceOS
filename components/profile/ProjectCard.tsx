'use client';

/*
 * ProjectCard — a Project tile for the artist's profile "Created" tab. Renders
 * the Project's signature Artwork (Output #1) as the thumbnail, the name, and
 * the supply, linking to /art/{slug}. Reuses the gallery card classes so it
 * lays out in #gallery like an Output card.
 */

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { renderArtwork } from '../../lib/project/registry';

export default function ProjectCard({
  slug,
  displayName,
  outputs,
}: {
  slug: string;
  displayName: string;
  outputs: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    try {
      const { aspect } = renderArtwork(c, slug, 1, 400);
      if (wrapRef.current) wrapRef.current.style.aspectRatio = String(aspect);
    } catch {
      /* ignore */
    }
  }, [slug]);
  return (
    <Link href={`/art/${slug}`} className="output-card project-card" style={{ display: 'block', textDecoration: 'none' }}>
      <div className="canvas-wrapper" ref={wrapRef}>
        <canvas ref={canvasRef} className="output-canvas visible" />
      </div>
      <div className="meta">
        <span className="meta-id">{displayName}</span>
        <span className="meta-owner">{outputs} Outputs</span>
      </div>
    </Link>
  );
}
