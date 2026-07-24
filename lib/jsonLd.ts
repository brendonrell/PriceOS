// Safe serialisation for <script type="application/ld+json"> blocks.
//
// JSON.stringify escapes " and \ but NOT < or /, and the HTML tokenizer ends a
// <script> element on the literal bytes `</script` wherever they appear —
// including inside a JSON string value. So any DB-sourced field in a structured
// -data object can close the script element and inject markup (security review
// 2026-07-24, finding H1: the Artwork page's `scene` sentence, writable by any
// signed-in wallet, reached this sink unescaped).
//
// The \uXXXX forms below are valid JSON and parse back to the original
// characters, so consumers (search engines, agents, assistive tech) read exactly
// the same structured data — only the raw bytes in the HTML change.
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
