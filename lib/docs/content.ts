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
            'for-collectors/hostile-takeover',
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
            'app/the-composer',
            'app/the-cartography',
            'app/the-factions',
            'app/the-rewind',
            'app/the-dispatch',
            'app/settings-and-display',
        ],
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
        slugs: ['reference/glossary'],
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
