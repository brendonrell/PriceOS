/*
 * The Gnome's voice — greetings + the Appraiser's written case.
 *
 * Companion to lib/project/gnome.ts (the casting): this file is what the
 * guardian SAYS. Two duties:
 *
 *   • GREETINGS — tap the Gnome and it speaks, in-temperament, with different
 *     lines for strangers vs holders. Lines rotate per tap (seeded start so a
 *     project's gnome doesn't always open with the same words).
 *
 *   • THE APPRAISAL — the Favour → Appraiser feature (ClickUp 86baka0hc):
 *     if you hold the Gnome's Favour (held ≥ FAVOUR_DAYS without listing),
 *     it makes a real written case for your piece — an argument built ONLY
 *     from true, checkable facts (isolation rank, Fate, edition, tenure,
 *     the live door price), voiced by temperament. Never a price prediction;
 *     it argues character, not targets.
 *
 * Deterministic (voice-kit discipline, same as lib/dispatch/voice.ts): the
 * appraisal is seeded per (slug, tokenId) so a piece's case is stable; only
 * the live numbers inside it move with the market.
 */

import { mulberry32, hashString, pick } from '../art/rng';
import type { GnomeTemperament } from './gnome';

/** Days a piece must be held — unbroken, unlisted — to earn the Favour. */
export const FAVOUR_DAYS = 7;

/* ── Greetings ────────────────────────────────────────────────────────────── */

type Audience = 'stranger' | 'holder';

const GREETINGS: Record<GnomeTemperament, Record<Audience, readonly string[]>> = {
  GRUFF: {
    stranger: [
      'Mind the boots. This vein is spoken for.',
      'Tourists. The stones don’t care for gawking.',
      'You’ll buy, or you’ll move along.',
    ],
    holder: [
      'Oh. It’s you. …The good lamp’s by the door.',
      'You hold. Fine. I don’t say that to everyone.',
    ],
  },
  KINDLY: {
    stranger: [
      'Come in, come in — mind the low beam.',
      'Have a look, friend. The stones like company.',
      'No rush at all. Beauty keeps.',
    ],
    holder: [
      'Ah, one of ours! Your piece asked after you.',
      'Welcome home. I kept it dusted.',
    ],
  },
  MERRY: {
    stranger: [
      'Ha! A visitor! The vein sings today.',
      'Welcome! Mind the gem dust — it gets everywhere.',
      'Stay a while! The acoustics down here are superb.',
    ],
    holder: [
      'The collector returns! Drinks on the hoard!',
      'There you are! Your stone hums when you’re near, you know.',
    ],
  },
  WARY: {
    stranger: [
      'Hm. You’re not from this seam.',
      'I count the stones twice when strangers call.',
      'Step where I step. No further.',
    ],
    holder: [
      'You again. Good. I remember who holds.',
      'The door knows your knock now. Come through.',
    ],
  },
  STOIC: {
    stranger: [
      'The vein is deep. Take your time.',
      'Stone doesn’t hurry. Neither do I.',
      'Look. That is permitted.',
    ],
    holder: [
      'You hold. That is enough.',
      'The stone remembers your hands. So do I.',
    ],
  },
  SLY: {
    stranger: [
      'Looking’s free. Wanting costs.',
      'I know what every stone here is worth. Do you?',
      'The best pieces? Not on display, friend.',
    ],
    holder: [
      'Ah, my favourite accomplice.',
      'Yours is the one I’d have kept. Don’t repeat that.',
    ],
  },
  DOTING: {
    stranger: [
      'Oh! Careful, they’re delicate — well, they’re stone. But still.',
      'Each one’s my favourite. Don’t tell the others.',
      'You have kind eyes. The stones notice these things.',
    ],
    holder: [
      'Oh, it’s YOU! Your piece has been so good today.',
      'I tucked yours in facing the lamp. It likes the lamp.',
    ],
  },
  GRUMPY: {
    stranger: [
      'What. WHAT. …Fine, look around.',
      'The last visitor whistled. Don’t whistle.',
      'If you must browse, browse quietly.',
    ],
    holder: [
      'You. Hmph. …I polished yours. Don’t mention it.',
      'Took you long enough. It’s fine. Everything’s fine.',
    ],
  },
  HEARTY: {
    stranger: [
      'HO! Big day in the mine, friend!',
      'Grab a lamp — the good seams run deep!',
      'You look like you could swing a pick!',
    ],
    holder: [
      'HO! A holder! The best kind of company!',
      'Pull up a crate — yours is the pride of the rack!',
    ],
  },
  SOLEMN: {
    stranger: [
      'These stones will outlast us all.',
      'Walk softly. This is old rock.',
      'Every piece here was born once. Remember that.',
    ],
    holder: [
      'You keep the stone. The stone keeps you.',
      'Few hold. Fewer understand why. You may.',
    ],
  },
  IMPISH: {
    stranger: [
      'Psst. Want to see something shiny?',
      'I hid three gems in this room. You’ll never find them.',
      'Careful where you stand. Or don’t. It’s funnier.',
    ],
    holder: [
      'Shh — I moved your piece an inch. Did you notice?',
      'I told the others yours is cursed so they’d stop touching it. You’re welcome.',
    ],
  },
  STALWART: {
    stranger: [
      'The hoard is watched. Day and night.',
      'Nothing leaves this vein without my say.',
      'You’re safe here. So are the stones.',
    ],
    holder: [
      'Holder on deck. Post secure.',
      'Your piece is under my watch. It has never been safer.',
    ],
  },
};

/** The Gnome speaks: line `n` (the tap counter) for this project + audience.
    Seeded start per slug so different gnomes open differently; then rotates
    through the whole pool before repeating. */
export function gnomeGreeting(
  slug: string,
  temperament: GnomeTemperament,
  audience: Audience,
  n: number,
): string {
  const pool = GREETINGS[temperament][audience];
  const start = hashString(`greet:${slug.toLowerCase()}:${audience}`) % pool.length;
  return pool[(start + n) % pool.length];
}

/* ── The Appraisal — the Favour's written case ────────────────────────────── */

export interface AppraisalFacts {
  /** Piece + project identity. */
  tokenId: number;
  /** Genome isolation, when the project has one: rank 1 = most isolated. */
  isolationRank: number | null;
  isolationOf: number | null;
  /** True when no other minted piece shares its full trait signature. */
  noneAlike: boolean;
  /** The piece's Fate word + traditional hexagram name (always present). */
  fate: string;
  fateName: string;
  /** Days the current holder has kept it (the Favour tenure). */
  heldDays: number;
  /** Live floor over the project's active listings, if any are posted. */
  floorEth: number | null;
  /** How many pieces are currently posted at the door. */
  listedCount: number;
  /** Edition size minted so far (for early-strike framing). */
  minted: number;
}

const OPENINGS: Record<GnomeTemperament, readonly string[]> = {
  GRUFF: ['You want pretty words? Here are true ones about #%ID%.', 'I don’t flatter stone. #%ID% doesn’t need it.'],
  KINDLY: ['Sit, sit. Let me tell you what you’re holding in #%ID%.', 'I’ve been hoping you’d ask about #%ID%.'],
  MERRY: ['#%ID%! Oh, this is a good one to talk about.', 'Gather round — well, it’s just you — the tale of #%ID%!'],
  WARY: ['I’ll say this once about #%ID%, and quietly.', 'Close the door. About #%ID%, then.'],
  STOIC: ['The facts of #%ID%. Nothing more is needed.', '#%ID%. I have weighed it. Listen.'],
  SLY: ['Between us — #%ID% is worth more attention than it gets.', 'You didn’t hear this appraisal of #%ID% from me.'],
  DOTING: ['Oh, #%ID% — my notes on this one run long.', 'You hold #%ID%? Then you deserve to know everything.'],
  GRUMPY: ['Fine. FINE. The case for #%ID%, since you’ve earned it.', 'I suppose #%ID% deserves saying out loud. Hmph.'],
  HEARTY: ['HO! An appraisal of #%ID%! Stand back, I get loud.', 'Big claims coming about #%ID%, friend — all of them true!'],
  SOLEMN: ['What follows about #%ID% is the truth as the rock tells it.', 'The record of #%ID%, spoken plainly.'],
  IMPISH: ['The secret file on #%ID%? Ohh, you’ve earned a peek.', 'I’m only telling you about #%ID% because it’s a good secret.'],
  STALWART: ['The full account of #%ID%, as its keeper.', 'On my watch and my word — the case for #%ID%.'],
};

const CLOSINGS: Record<GnomeTemperament, readonly string[]> = {
  GRUFF: ['It’s good stone. That’s all I say about anything.', 'Keep it. That’s not advice, that’s a preference.'],
  KINDLY: ['Whatever the market mutters, this one was worth the digging.', 'It’s in good hands. The stone thinks so too.'],
  MERRY: ['If I could sing its number, I would — the vein already hums it.', 'A gem with a story! The best kind of heavy.'],
  WARY: ['Say nothing of this at the door. Prices have ears.', 'That’s the truth of it. Guard it like I do.'],
  STOIC: ['That is the whole of it. The stone requires no more.', 'I have said what is true. It is enough.'],
  SLY: ['Worth is what the patient know and the hasty pay for.', 'The clever thing? Knowing what you hold. Now you do.'],
  DOTING: ['Look after it. I’ll be checking, you know I will.', 'It’s special. I say that about all of them, but this time I mean it.'],
  GRUMPY: ['There. Compliments. Don’t expect this every visit.', 'A fine piece. Now stop making me sentimental.'],
  HEARTY: ['A keeper’s verdict: worth its weight and then some!', 'Proud stone, proud holder! That’s how a vein should run!'],
  SOLEMN: ['Long after the door prices fade, this record stands.', 'The stone will remember being held well.'],
  IMPISH: ['Anyway, I’ve said too much. Forget the good parts.', 'Appraisal’s free. The smugness you feel now? Also free.'],
  STALWART: ['Logged, witnessed, and under guard. My word on it.', 'So it is entered in the keeper’s ledger. So it stands.'],
};

/** Format ETH like the site (trim trailing zeros, ≤4 dp). */
function fmtEth(v: number): string {
  return String(Number(v.toFixed(4)));
}

/**
 * The Gnome's written case — assembled ONLY from facts that are true, in the
 * keeper's voice. Order: opening · evidence clauses · tenure · closing.
 * Seeded per piece so the argument is stable; live numbers stay live.
 */
export function gnomeAppraisal(
  slug: string,
  temperament: GnomeTemperament,
  f: AppraisalFacts,
): string {
  const r = mulberry32(hashString(`appraise:${slug.toLowerCase()}:${f.tokenId}`) || 1);
  const parts: string[] = [];

  parts.push(pick(OPENINGS[temperament], r).replace('%ID%', String(f.tokenId)));

  // Evidence — each clause appears only when the ledger/engine says it's true.
  if (f.isolationRank != null && f.isolationOf != null && f.isolationRank <= 10) {
    parts.push(pick([
      `It sits rank ${f.isolationRank} of ${f.isolationOf} for isolation — out on the lone edge of the seam, where the digging is hardest.`,
      `Rank ${f.isolationRank} of ${f.isolationOf} in the genome — far from the crowd, and the far stones are the ones I count at night.`,
    ], r));
  }
  if (f.noneAlike) {
    parts.push(pick([
      'There is none alike in the vein. I checked. Twice.',
      'No other piece shares its signature — a one-cut stone.',
    ], r));
  }
  if (f.tokenId <= 10 && f.minted > f.tokenId) {
    parts.push(pick([
      `Edition ${f.tokenId} — struck when the vein was young. First-cut stone carries the story of the whole dig.`,
      `One of the first ten out of the rock. The early strikes set the vein’s reputation.`,
    ], r));
  }
  parts.push(pick([
    `It was born under ${f.fate.toUpperCase()} — ${f.fateName}, in the old readings.`,
    `The casting at its birth read ${f.fate.toUpperCase()} — ${f.fateName}. The old signs don’t repeat for just anyone.`,
  ], r));
  if (f.floorEth != null && f.listedCount > 0) {
    parts.push(pick([
      `The door asks ◊${fmtEth(f.floorEth)} for lesser stones today, and yours is not among the ${f.listedCount} waiting to leave.`,
      `${f.listedCount} pieces stand at the door from ◊${fmtEth(f.floorEth)}; yours stays in the dark with me, which is where the good ones live.`,
    ], r));
  }
  parts.push(pick([
    `And you — ${f.heldDays} days you’ve kept it, never once posting it at the door. I notice such things. It’s why we’re talking.`,
    `${f.heldDays} days held, unlisted. That is how favour is earned in my mine.`,
  ], r));

  parts.push(pick(CLOSINGS[temperament], r));
  return parts.join(' ');
}

/** The signature line under the case. */
export function gnomeSignature(gnomeName: string, slug: string): string {
  return `— ${gnomeName}, keeper of @${slug}`;
}
