/*
 * p5.brush library-registry bundler — produces the single self-contained
 * blob PDLibraryRegistry needs to bless "p5.brush" as its own Language,
 * distinct from the existing "p5.js" entry.
 *
 *   node scripts/bundle-p5-brush-library.js
 *
 * WHY A SEPARATE BUNDLE, NOT AN ADDITION TO THE p5.js ENTRY:
 * A Project binds at most one registry entry (PDFactory.createProject
 * takes a single libraryId), and entries don't compose at render time.
 * p5.brush.js is a p5 addon — it needs p5 already loaded as a global
 * before it runs — so the only way to offer "p5.brush" as a bindable
 * Language is to ship p5 core + the addon together as one blob, the same
 * way `<script src="p5.js">` then `<script src="p5.brush.js">` would run
 * in a page. This script does that concatenation, then gzips, base64s,
 * and chunks it exactly the way the registry stores every entry.
 *
 * VERSION NOTE: p5.brush declares a peerDependency on p5 ^2.2 — it is
 * NOT compatible with the p5.js 1.11.3 already finalized as the "p5.js"
 * entry (that's the v1.x line). This bundle pins its own p5 v2.x core,
 * so the two entries carry different, independently-versioned p5
 * builds. That's expected and fine — they're separate Language entries.
 *
 * Output -> assets/library-registry/p5-brush/
 *   manifest.json   name, version, byte sizes, chunk count, sha256
 *   chunk-00.b64 .. chunk-NN.b64   base64 text, one per SSTORE2 write
 *
 * manifest.json's fields map directly onto PDLibraryRegistry's calls:
 *   createLibrary(manifest.name, manifest.version, manifest.chunkCount)
 *   appendChunk(libraryId, <bytes of each chunk file, in order>)
 *   finalize(libraryId)
 * (Exact createLibrary signature/arg order per the deployed contract —
 * confirm against pd-contracts ABI before calling; this script only
 * prepares the data, it doesn't touch the chain.)
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'library-registry', 'p5-brush');
const SSTORE2_CHUNK_CEILING = 24575; // EVM data-contract size limit, base64 bytes per chunk

function readDep(pkg, relPath) {
    const full = path.join(ROOT, 'node_modules', pkg, relPath);
    if (!fs.existsSync(full)) {
        throw new Error(
            `Missing ${pkg}/${relPath} — run "npm install p5@^2.2 p5.brush" first ` +
            `(both are build-time-only deps for this script; the frontend itself ` +
            `never imports p5, the chain does).`
        );
    }
    return fs.readFileSync(full, 'utf8');
}

function versions() {
    const p5Pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/p5/package.json'), 'utf8'));
    const brushPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/p5.brush/package.json'), 'utf8'));
    return { p5: p5Pkg.version, brush: brushPkg.version };
}

function main() {
    fs.mkdirSync(OUT, { recursive: true });

    const { p5: p5Version, brush: brushVersion } = versions();

    // p5.brush's own dist already inlines its dependency on simplex-noise
    // (confirmed by inspecting dist/p5.brush.js — no separate bundling
    // needed here). Order matters: p5 core must execute before the addon.
    const p5Core = readDep('p5', 'lib/p5.min.js');
    const brushAddon = readDep('p5.brush', 'dist/p5.brush.js');

    const combined =
        p5Core.trim().replace(/;?$/, ';') + '\n' +
        brushAddon.trim().replace(/;?$/, ';') + '\n';

    const gz = zlib.gzipSync(combined, { level: 9 });
    const b64 = gz.toString('base64');

    const chunks = [];
    for (let i = 0; i < b64.length; i += SSTORE2_CHUNK_CEILING) {
        chunks.push(b64.slice(i, i + SSTORE2_CHUNK_CEILING));
    }

    chunks.forEach((chunk, i) => {
        const name = `chunk-${String(i).padStart(2, '0')}.b64`;
        fs.writeFileSync(path.join(OUT, name), chunk, 'utf8');
    });

    const manifest = {
        name: 'p5.brush',
        version: brushVersion,
        language: `p5.brush ${brushVersion}`,          // the Output "Language" attribute this entry sets
        bundledCore: { library: 'p5.js', version: p5Version }, // NOT the same p5.js as the existing registry entry
        sourceBytes: combined.length,
        gzipBytes: gz.length,
        base64Bytes: b64.length,
        chunkCount: chunks.length,
        chunkCeilingBytes: SSTORE2_CHUNK_CEILING,
        sha256OfSource: crypto.createHash('sha256').update(combined).digest('hex'),
        generatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

    console.log(`p5.brush ${brushVersion} (+ p5 ${p5Version} core) bundled:`);
    console.log(`  source ${manifest.sourceBytes.toLocaleString()} B -> gzip ${manifest.gzipBytes.toLocaleString()} B -> base64 ${manifest.base64Bytes.toLocaleString()} B`);
    console.log(`  ${manifest.chunkCount} chunk(s) written to ${path.relative(ROOT, OUT)}/`);
}

main();
