// Tiny stable fingerprint for error de-duplication (djb2 over the parts that
// identify a bug, not the parts that vary per hit). Shared by the client
// beacon and the server sink so the same fault always lands on one row.

export function errorFingerprint(kind: string, route: string | null, message: string): string {
  const basis = `${kind}|${route ?? ''}|${message.slice(0, 200)}`;
  let h = 5381;
  for (let i = 0; i < basis.length; i++) {
    h = ((h << 5) + h + basis.charCodeAt(i)) | 0;
  }
  return `${kind}:${(h >>> 0).toString(36)}`;
}
