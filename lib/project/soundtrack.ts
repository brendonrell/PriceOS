/*
 * Soundtrack normalisation. The only accepted soundtrack on PD is a public
 * YouTube playlist; artists may paste a full URL or a bare playlist id.
 *
 * FAIL-SOFT IS THE CONTRACT: a malformed value must never throw and must
 * never break the page — `normalizePlaylistId` returns null and callers omit
 * the soundtrack surface. (Brendon: "we want these to not break ideally.")
 */

/* YouTube playlist ids: letters, digits, -, _ ; typically prefixed PL / OLAK
   / RDCLAK etc. We accept the broad id charset rather than enforce a prefix,
   so private-naming quirks don't reject a valid public list. */
const PLAYLIST_ID_RE = /^[A-Za-z0-9_-]{10,64}$/;

/**
 * Coerce a user-supplied soundtrack value (full URL or bare id) into a bare
 * YouTube playlist id. Returns null for anything we can't confidently parse.
 */
export function normalizePlaylistId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  // Bare id already?
  if (PLAYLIST_ID_RE.test(value)) return value;

  // URL form — pull ?list= (or &list=) without relying on the URL parser
  // succeeding (paste artefacts, missing scheme, etc.).
  const m = value.match(/[?&]list=([A-Za-z0-9_-]{10,64})/);
  if (m) return m[1];

  return null;
}

/** Embeddable player URL for a playlist id (used by an <iframe>, if rendered). */
export function playlistEmbedUrl(playlistId: string): string {
  return `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(playlistId)}`;
}

/** Canonical public watch URL for a playlist id (used by an outbound link). */
export function playlistWatchUrl(playlistId: string): string {
  return `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`;
}
