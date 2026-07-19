/*
 * The Keeper's Journal — the Gnome's dated, timestamped life (Brendon,
 * 2026-07-19): a timeline under the figure where the keeper's thoughts and
 * milestones read like he's alive down there.
 *
 * Companion to lib/project/gnome.ts (the casting) and gnomeVoice.ts (what he
 * says out loud). This file is what he WRITES: the diary. Same discipline as
 * the rest of the Gnome — $0, no fetch, deterministic:
 *
 *   • THE CASTING + the early milestones are seeded per slug and FROZEN —
 *     the same project always shows the same early life, forever.
 *   • DAILY THOUGHTS are seeded per (slug, viewer-local day) — a new entry
 *     appears each day (the alive part), and it's stable all day. Consecutive
 *     days are guaranteed different lines (the walkPick discipline from
 *     lib/dispatch/voice.ts).
 *   • TODAY'S entry is the live one: the keeper's current market mood
 *     (the same mining/wary/content read the panel header wears) with the
 *     REAL minted / listed numbers woven in. He writes it at his seeded
 *     morning hour — before that hour, today's page is honestly blank.
 *
 * Instants are true instants (ms); the panel renders them viewer-local via
 * the shared feed stamp formatters (the clock-times-are-viewer-local rule).
 */

import { mulberry32, hashString, pick } from '../art/rng';
import type { GnomeTemperament } from './gnome';

export type GnomeJournalMood = 'mining' | 'wary' | 'content';

export interface GnomeJournalEntry {
  /** True instant, ms. Render viewer-local. */
  ts: number;
  /** Bold label riding the feed's type column (THE CASTING, NIGHT WATCH…). */
  title: string;
  body: string;
  /** Node glyph — canonical vocabulary only: ✶ born (the casting), ⊟ Note
      (a written entry). VS-15 appended at render. */
  glyph: '✶' | '⊟';
}

export interface GnomeJournalFacts {
  minted: number;
  supply: number;
  listedCount: number;
  mood: GnomeJournalMood;
  /** The keeper's cast name (woven into the casting entry). */
  name: string;
}

const DAY_MS = 86_400_000;

/* ── The casting — the first page (seeded per slug, frozen) ───────────────── */

const CASTING_LINES = [
  'Woke inside the hill with my name already on me: %NAME%. The vein was here first. Now, so am I.',
  'The rock opened and there I was — %NAME%, keeper. Nobody asked if I wanted the post. The post asked for me.',
  'First entry. Name: %NAME%. Post: keeper of this vein. Duration: the foreseeable ever.',
] as const;

/* ── Early milestones (seeded per slug, frozen — append only) ─────────────── */

const ERA_MILESTONES: readonly { title: string; body: string }[] = [
  { title: 'FIRST LAMP', body: 'Lit the first lamp at the mouth of the vein. It has not gone out since.' },
  { title: 'THE DOOR', body: 'Hung the door. A mine without a door is just a hole; a door makes it a house.' },
  { title: 'NAMING THE SEAMS', body: 'Walked the tunnels and named every seam out loud. Stone listens better once it has been introduced.' },
  { title: 'THE HOARD BEGUN', body: 'Set the first gem at my feet. One is not a hoard, but every hoard was one once.' },
  { title: 'A VISITOR', body: 'First stranger at the door today. Watched their hands the whole time. Clean hands. They may return.' },
  { title: 'THE LONG SHIFT', body: 'Dug through the night and into the next. Time moves differently under the hill; I let it.' },
  { title: 'COUNTING NIGHT', body: 'Counted the stones twice by lamplight. Same number both times. A good night.' },
  { title: 'WEATHER BELOW', body: 'Rain above, they say. Down here the weather is always stone. I prefer a reliable climate.' },
  { title: 'THE KETTLE', body: 'Mended the kettle. A keeper who cannot make tea cannot make judgments.' },
  { title: 'BOOT REPAIR', body: 'Resoled the left boot. The right one is jealous. Boots are like that.' },
];

/* ── Daily thoughts — one per temperament family, rotated day to day ──────── */

const DAILY_THOUGHTS: Record<GnomeTemperament, readonly string[]> = {
  GRUFF: [
    'Swept the entry. Someone tracked in opinions again.',
    'A stone hummed off-key all morning. Told it to stop. It stopped.',
    'Visitors asked questions. I answered one. Rationing.',
  ],
  KINDLY: [
    'Left the lamp burning by the small stones tonight. They sleep better lit.',
    'Told the young seam a story about the old one. Both listened.',
    'A visitor smiled at the third shelf today. I have not stopped thinking about it.',
  ],
  MERRY: [
    'Sang the counting song twice through. The echoes joined on the second verse!',
    'Found a pebble shaped exactly like my uncle. Kept it. Obviously.',
    'Danced the lamp-lighting jig. No witnesses. A shame — it was my best one.',
  ],
  WARY: [
    'Three sets of footsteps by the door. Counted four. Investigating.',
    'Re-checked the locks. Then re-checked the checks. All holds.',
    'A shadow moved wrong by the west seam. It was mine. Logged it anyway.',
  ],
  STOIC: [
    'The vein said nothing today. I said nothing back. A full conversation.',
    'Sharpened the pick. It did not need it. Some work is for the worker.',
    'Stood at the door an hour. The mountain did the same. We agree.',
  ],
  SLY: [
    'Moved the best stone to a worse shelf. Now only I know which shelf matters.',
    'A visitor priced everything with their eyes. I let them be wrong.',
    'Started a rumor about the north seam. Watching who digs there now.',
  ],
  DOTING: [
    'Dusted every stone twice. The little one in the corner got three.',
    'Rearranged the shelf so the shy pieces face the lamp. They earned it.',
    'One of the stones looked lonely. Sat with it through supper.',
  ],
  GRUMPY: [
    'The drip by the east seam is back. We have history, that drip and I.',
    'Someone whistled near the door today. The door and I are both recovering.',
    'Fixed the squeaky hinge. Now it is too quiet. There is no pleasing me.',
  ],
  HEARTY: [
    'Swung the pick two hundred times before breakfast! The rock respects appetite!',
    'Cleared the south passage in one shift! Twice the dust, twice the glory!',
    'Arm-wrestled a boulder for practice. A draw. Rematch tomorrow!',
  ],
  SOLEMN: [
    'Walked the oldest tunnel today. My footsteps sounded like someone else’s. Perhaps a keeper before me.',
    'The lamp flickered at dusk. Noted, as those before me noted it.',
    'Read the marks on the first wall again. Whoever cut them cut true.',
  ],
  IMPISH: [
    'Hid a gem inside a duller stone. Someday, someone earns a very good day.',
    'Taught the echo a new word. The echo will not stop using it.',
    'Swapped two identical stones. Nothing changed. It was thrilling.',
  ],
  STALWART: [
    'Perimeter walked. Hoard counted. Watch maintained. As every day, so today.',
    'Tested every latch on the door. The door passed. It always passes. Good door.',
    'Nothing entered without my knowing. Nothing left at all. A clean shift.',
  ],
};

/* Time-of-day slot → the entry's label. Picked seeded per day. */
const DAY_SLOTS: readonly { title: string; h0: number; h1: number }[] = [
  { title: 'MORNING COUNT', h0: 5, h1: 9 },
  { title: 'MIDDAY REST', h0: 11, h1: 14 },
  { title: 'AFTER THE SHIFT', h0: 17, h1: 21 },
  { title: 'NIGHT WATCH', h0: 21, h1: 24 },
];

/* ── Today — the live page (mood + real numbers) ──────────────────────────── */

/* Same mood words the panel header wears — the journal's today entry and the
   readout always agree. */
const MOOD_TITLES: Record<GnomeJournalMood, string> = {
  mining: 'AT WORK IN THE VEIN',
  wary: 'WATCHING THE DOOR',
  content: 'KEEPING THE HOARD',
};

const TODAY_LINES: Record<GnomeJournalMood, readonly string[]> = {
  mining: [
    '%N% of the %M% stones the rock promised are out. My arms are keeping the ledger today.',
    'Still cutting — %N% of %M% free so far. The rock owes us the rest, and I collect debts.',
  ],
  wary: [
    '%L% stones stand at the door tonight. I count them going out. I will count what comes back.',
    'The door is busy — %L% posted. Busy doors need watching, and I watch.',
  ],
  content: [
    'Every stone the rock promised is out — %M% of %M%. The digging is done; the keeping never is.',
    'The vein is fully cut, %M% strong. Now the work is memory and the lamp.',
  ],
};

/* Content mood with no known supply (nothing to count) — a supply-free page. */
const TODAY_QUIET = [
  'Quiet in the vein. The stones are where they should be. So am I.',
  'Nothing moved that I did not move myself. My favourite kind of day.',
] as const;

/* ── The engine ───────────────────────────────────────────────────────────── */

/* The casting window — the platform's software era (fixed instants so the
   early life never re-rolls or drifts). */
const CAST_WINDOW_START = Date.UTC(2026, 3, 1); // APR 1 2026
const CAST_WINDOW_END = Date.UTC(2026, 5, 15); // JUN 15 2026

function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function localDayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** The keeper's journal, oldest first. Pure of everything but the clock. */
export function gnomeJournal(
  slug: string,
  temperament: GnomeTemperament,
  facts: GnomeJournalFacts,
  now: number = Date.now(),
): GnomeJournalEntry[] {
  const key = slug.toLowerCase();
  const entries: GnomeJournalEntry[] = [];

  /* Frozen early life — draw order is a contract (same rule as the casting):
     never reorder these draws or every keeper's history rewrites itself. */
  const r = mulberry32(hashString(`gnome-journal:${key}`) || 1);
  const castTs = CAST_WINDOW_START + r() * (CAST_WINDOW_END - CAST_WINDOW_START); // 1. casting instant
  const castLine = pick(CASTING_LINES, r); // 2. casting line
  const eraCount = 3 + Math.floor(r() * 3); // 3. early milestones (3–5)

  const dailyStart = startOfLocalDay(now) - 3 * DAY_MS;
  if (castTs < dailyStart) {
    entries.push({
      ts: castTs,
      title: 'THE CASTING',
      body: castLine.replace('%NAME%', facts.name),
      glyph: '✶',
    });
  }

  const used = new Set<number>();
  let t = castTs;
  for (let i = 0; i < eraCount; i++) {
    t += (4 + r() * 12) * DAY_MS; // 4.n gap
    t += (r() - 0.5) * 0.4 * DAY_MS; // 4.n time-of-day scatter
    let idx = Math.floor(r() * ERA_MILESTONES.length); // 4.n milestone
    while (used.has(idx)) idx = (idx + 1) % ERA_MILESTONES.length;
    used.add(idx);
    if (t >= dailyStart) continue; // early life never overlaps the living days
    const m = ERA_MILESTONES[idx];
    entries.push({ ts: t, title: m.title, body: m.body, glyph: '⊟' });
  }

  /* The living days — yesterday-and-back are thoughts; today is the live
     mood page, written at the keeper's seeded morning hour. */
  const rot = hashString(`gnome-journal-rot:${key}`);
  for (let off = 3; off >= 0; off--) {
    const day = startOfLocalDay(now) - off * DAY_MS;
    const rd = mulberry32(hashString(`gnome-journal-day:${key}:${localDayKey(day)}`) || 1);
    if (off === 0) {
      const wroteAt = day + (4 + rd() * 4) * 3_600_000; // 04:00–08:00
      if (wroteAt > now) break; // today's page not written yet — honestly blank
      const pool =
        facts.mood === 'content' && facts.supply <= 0
          ? TODAY_QUIET
          : TODAY_LINES[facts.mood];
      entries.push({
        ts: wroteAt,
        title: MOOD_TITLES[facts.mood],
        body: pick(pool, rd)
          .replace(/%N%/g, String(facts.minted))
          .replace(/%M%/g, String(facts.supply))
          .replace(/%L%/g, String(facts.listedCount)),
        glyph: '⊟',
      });
    } else {
      const slot = pick(DAY_SLOTS, rd);
      const ts = day + (slot.h0 + rd() * (slot.h1 - slot.h0)) * 3_600_000;
      const pool = DAILY_THOUGHTS[temperament];
      /* Day-number rotation: consecutive days always land different lines. */
      const line = pool[(Math.floor(day / DAY_MS) + rot) % pool.length];
      entries.push({ ts, title: slot.title, body: line, glyph: '⊟' });
    }
  }

  return entries.sort((a, b) => a.ts - b.ts);
}
