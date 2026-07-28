/*
 * PD-Docs content loader. Reads content/docs/**\/*.md at BUILD TIME only —
 * every consumer route is force-static, so no fs call ever runs on the
 * Worker. The .md files are the single source of truth: the HTML pages,
 * the raw-markdown endpoints, /llms.txt, and /llms-full.txt all derive
 * from the same file read, which is what guarantees the markdown-parity
 * ("Observability") checks in the PD-Docs AFDocs strategy can never drift.
 */

import fs from 'fs';
import path from 'path';

export type DocFrontmatter = {
    title: string;
    description: string;
    category: string;
    keywords: string[];
    last_updated: string;
};

export type DocPage = {
    /* URL slug relative to /docs — '' for the root Introduction page. */
    slug: string;
    frontmatter: DocFrontmatter;
    /* Markdown body with the frontmatter block stripped. */
    body: string;
    /* Raw file content (frontmatter + body) — served at the .md URLs. */
    raw: string;
};

export type NavSection = {
    title: string;
    /* Section landing slug or null when the section has no landing page. */
    items: { slug: string; label: string }[];
};

const CONTENT_ROOT = path.join(process.cwd(), 'content', 'docs');

/* Sidebar order is deliberate (audience-first, per the PD-Docs IA spec) —
   directory listing order is not. Every page must appear here; the loader
   throws at build time when a file on disk is missing from the manifest or
   vice versa, so the nav, /llms.txt, and the page tree can never disagree. */
const NAV_MANIFEST: { title: string; slugs: string[] }[] = [
    {
        title: 'Start Here',
        slugs: ['', 'quickstart'],
    },
    {
        title: 'Public & Private',
        slugs: ['whats-public', 'whats-private'],
    },
    {
        title: 'For Artists',
        slugs: [
            'for-artists/how-pd-works',
            'for-artists/submit-a-project',
            'for-artists/the-mint-flow',
            'for-artists/royalties',
        ],
    },
    {
        title: 'PD Studio',
        slugs: [
            'studio/overview',
            'studio/upload-and-testing',
            'studio/publishing',
            'studio/the-artist-dashboard',
        ],
    },
    {
        title: 'For Collectors',
        slugs: [
            'for-collectors/how-pd-works',
            'for-collectors/wallet-setup',
            'for-collectors/the-secondary-market',
        ],
    },
    {
        title: 'Fair Draw',
        slugs: [
            'fair-draw/overview',
            'fair-draw/how-a-drop-settles',
            'fair-draw/fair-play',
        ],
    },
    {
        title: 'The App',
        slugs: [
            'app/overview',
            'app/the-shell',
            'app/projects-and-minting',
            'app/outputs',
            'app/identity-and-profiles',
            'app/collector-tools',
            'app/spell-book',
            'app/achievements',
            'app/discovery',
            'app/settings-and-display',
        ],
    },
    {
        title: 'PriceOS Suite',
        slugs: ['suite'],
    },
    {
        title: 'Command Stone',
        slugs: ['command-stone'],
    },
    {
        title: 'To-Dos & Workflows',
        slugs: ['todos-and-workflows'],
    },
    {
        title: 'Cartography',
        slugs: ['cartography'],
    },
    {
        title: 'The Rewind',
        slugs: ['rewind'],
    },
    {
        title: 'Composer',
        slugs: ['composer'],
    },
    {
        title: 'Lists',
        slugs: ['lists'],
    },
    {
        title: 'The Fingerprint',
        slugs: ['fingerprint'],
    },
    {
        title: 'Rarity Labs',
        slugs: ['rarity-labs'],
    },
    {
        title: 'The Marketplace',
        slugs: ['marketplace'],
    },
    {
        title: 'PriceScore',
        slugs: ['pricescore'],
    },
    {
        title: 'The Dispatch',
        slugs: ['dispatch'],
    },
    {
        title: 'The Exchange',
        slugs: ['exchange'],
    },
    {
        title: 'Takeover',
        slugs: ['takeover'],
    },
    {
        title: 'Factions',
        slugs: ['factions'],
    },
    {
        title: 'Pings',
        slugs: ['pings/overview', 'pings/controls', 'pings/artist-push'],
    },
    {
        title: 'Stickers',
        slugs: [
            'stickers/overview',
            'stickers/the-store',
            'stickers/the-marketplace',
            'stickers/the-binder-and-your-profile',
            'stickers/the-sticker-channel',
        ],
    },
    {
        title: 'Keychains',
        slugs: [
            'keychains/overview',
            'keychains/the-depanneur',
            'keychains/the-living-charm',
        ],
    },
    {
        title: 'The Gnomes',
        slugs: [
            'gnomes/overview',
            'gnomes/the-awakening',
            'gnomes/the-mushroom-market',
            'gnomes/the-gnomewallet',
        ],
    },
    {
        title: 'Build on PD',
        slugs: ['building-on-pd', 'mcp'],
    },
    {
        title: 'Smart Contracts',
        slugs: [
            'contracts/overview',
            'contracts/pd-factory',
            'contracts/pd-project',
            'contracts/payment-splitter',
            'contracts/pd-stickers',
            'contracts/library-registry',
        ],
    },
    {
        title: '$PRICE Token',
        slugs: [
            'price-token/overview',
            'price-token/tokenomics',
            'price-token/no-platform-utility',
            'price-token/contract',
        ],
    },
    {
        title: 'Reference',
        slugs: ['reference/glossary', 'privacy-and-terms'],
    },
];

/* Minimal frontmatter parser for the subset the authoring conventions use:
   quoted string values and a flat ["a", "b"] keyword array. Failing loud on
   a malformed block is the desired behavior — it breaks the build, not the
   live site. */
function parseFrontmatter(raw: string, file: string): { fm: DocFrontmatter; body: string } {
    const match = raw.match(/^---\n([\s\S]*?)\n---\n/);
    if (!match) throw new Error(`docs: ${file} is missing a frontmatter block`);
    const fm: Record<string, string | string[]> = {};
    for (const line of match[1].split('\n')) {
        if (!line.trim()) continue;
        const idx = line.indexOf(':');
        if (idx === -1) throw new Error(`docs: ${file} has a malformed frontmatter line: ${line}`);
        const key = line.slice(0, idx).trim();
        let value = line.slice(idx + 1).trim();
        if (value.startsWith('[')) {
            fm[key] = value
                .replace(/^\[|\]$/g, '')
                .split(',')
                .map((s) => s.trim().replace(/^"|"$/g, ''))
                .filter(Boolean);
        } else {
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            fm[key] = value;
        }
    }
    for (const req of ['title', 'description', 'category', 'keywords', 'last_updated']) {
        if (!fm[req]) throw new Error(`docs: ${file} frontmatter is missing "${req}"`);
    }
    return {
        fm: fm as unknown as DocFrontmatter,
        body: raw.slice(match[0].length),
    };
}

function slugToFile(slug: string): string {
    return path.join(CONTENT_ROOT, slug === '' ? 'index.md' : `${slug}.md`);
}

let cache: DocPage[] | null = null;

/* Every doc page, in manifest (sidebar) order. */
export function getAllDocs(): DocPage[] {
    if (cache) return cache;

    const manifestSlugs = NAV_MANIFEST.flatMap((s) => s.slugs);

    /* Manifest ↔ disk must match exactly. */
    const onDisk: string[] = [];
    const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name.endsWith('.md')) {
                const rel = path.relative(CONTENT_ROOT, full).replace(/\.md$/, '');
                onDisk.push(rel === 'index' ? '' : rel);
            }
        }
    };
    walk(CONTENT_ROOT);
    for (const s of onDisk) {
        if (!manifestSlugs.includes(s)) throw new Error(`docs: ${s || 'index'}.md is on disk but not in NAV_MANIFEST`);
    }

    cache = manifestSlugs.map((slug) => {
        const file = slugToFile(slug);
        if (!fs.existsSync(file)) throw new Error(`docs: NAV_MANIFEST lists "${slug}" but ${file} does not exist`);
        const raw = fs.readFileSync(file, 'utf8');
        const { fm, body } = parseFrontmatter(raw, file);
        return { slug, frontmatter: fm, body, raw };
    });

    /* Every internal /docs link must resolve to a real page (Brendon,
       2026-07-25 — "keep the link checker around").
       WHY THIS EXISTS: the manifest↔disk check above proves every page is
       reachable, and says NOTHING about whether the links between them point
       anywhere. Moving the Lists page during the highlight-section pass left
       its inbound links aimed at a slug that no longer existed and the build
       stayed green. A dead link inside our own docs now fails the build.
       Anchors (#…) and the markdown-parity .md twins are legitimate. */
    const known = new Set(manifestSlugs);
    const dead: string[] = [];
    for (const page of cache) {
        for (const [, href] of page.body.matchAll(/\]\((\/docs[^)\s]*)\)/g)) {
            const target = href.slice('/docs'.length).split('#')[0].replace(/\.md$/, '').replace(/^\/|\/$/g, '');
            if (!known.has(target)) dead.push(`${page.slug || 'index'}.md → ${href}`);
        }
    }
    if (dead.length) {
        throw new Error(`docs: ${dead.length} internal link(s) point at pages that do not exist:\n  ${dead.join('\n  ')}`);
    }

    return cache;
}

export function getDoc(slug: string): DocPage | null {
    return getAllDocs().find((d) => d.slug === slug) ?? null;
}

/* Sidebar sections with per-page labels (the frontmatter title, with any
   long "Section — Detail" form trimmed to the detail for compact nav).
   The Feature Atlas (/docs/features) is a registry-driven catalog page, not
   a markdown file — its nav entry is spliced in after The App. */
export function getNav(): NavSection[] {
    const docs = getAllDocs();
    const sections = NAV_MANIFEST.map((section) => ({
        title: section.title,
        items: section.slugs.map((slug) => {
            const doc = docs.find((d) => d.slug === slug)!;
            const t = doc.frontmatter.title;
            return { slug, label: t.includes(' — ') ? t.split(' — ')[1] : t };
        }),
    }));
    const appIdx = sections.findIndex((s) => s.title === 'The App');
    sections.splice(appIdx + 1, 0, {
        title: 'Feature Atlas',
        items: [{ slug: 'features', label: 'The Atlas — every feature, numbered' }],
    });
    return sections;
}
