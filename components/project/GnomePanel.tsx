'use client';

/*
 * components/project/GnomePanel.tsx — The Gnome (the Project's guardian).
 *
 * The render surface for lib/project/gnome.ts: every Project's one keeper,
 * cast deterministically at birth (True Name / Fate discipline), drawn as a
 * layered SVG — hat · beard · body · keepsake · palette. The cloth wears the
 * Project's colorway; the creature itself never changes. Sits in the +More
 * GNOME tab, beside the Genome — the pun is the point.
 *
 * What it DOES (Brendon's go, 2026-07-16):
 *   • MARKET MOOD — its brows + bearing read the project's day from state
 *     already on the page ($0): still minting = AT WORK IN THE VEIN; heavy
 *     listing pressure = WATCHING THE DOOR; otherwise KEEPING THE HOARD.
 *   • THE GREETING — tap it and it speaks in-temperament (speech bubble),
 *     different lines for strangers vs holders, rotating per tap.
 *   • THE FAVOUR → APPRAISER — hold a piece ≥ FAVOUR_DAYS unlisted and the
 *     Gnome writes a real case for it (lib/project/gnomeVoice), built only
 *     from true ledger/engine facts. Lose the favour, lose the appraiser.
 *
 * Same card family as Replay / Genome (readout head, card chrome), so it
 * reads as native +More furniture.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useProject } from '../../lib/state/ProjectContext';
import { useAuth } from '../../lib/state/AuthContext';
import { projectColorway } from '../../lib/project/registry';
import { getGenome } from '../../lib/output/genome';
import { readOutputFate } from '../../lib/project/fate';
import { useProjectFloor } from './useProjectMarket';
import {
    projectGnome, gnomePalette,
    HAT_LABELS, BEARD_LABELS, KEEPSAKE_LABELS,
    type ProjectGnome, type GnomePalette,
} from '../../lib/project/gnome';
import { gnomeGreeting, gnomeAppraisal, gnomeSignature } from '../../lib/project/gnomeVoice';
import { hashString } from '../../lib/art/rng';
import type { GnomeFavourResponse, GnomeFavourPiece } from '../../app/api/project/[slug]/gnome/route';

type GnomeMood = 'mining' | 'wary' | 'content';

const MOOD_STATE: Record<GnomeMood, string> = {
    mining: 'AT WORK IN THE VEIN',
    wary: 'WATCHING THE DOOR',
    content: 'KEEPING THE HOARD',
};

export default function GnomePanel() {
    const project = useProject();
    const { siweAddress } = useAuth();
    const gnome = useMemo(() => projectGnome(project.slug), [project.slug]);

    /* Re-dress on a live colorway change (artist edits custom_color) — the
       same event ProjectContext fires when the page bg repaints. */
    const [colorTick, setColorTick] = useState(0);
    useEffect(() => {
        const h = () => setColorTick((v) => v + 1);
        window.addEventListener('pd:custom-color-changed', h);
        return () => window.removeEventListener('pd:custom-color-changed', h);
    }, []);
    const palette = useMemo(
        () => gnomePalette(gnome, projectColorway(project.slug)),
        // colorTick: re-dress when the DB colour lands/changes mid-session.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [gnome, project.slug, colorTick],
    );

    /* MARKET MOOD — read from state already on the page, no fetch. */
    const { lowestFloor } = useProjectFloor();
    const listedCount = useMemo(() => {
        let n = 0;
        project.outputs.forEach((o) => { if (o.price) n++; });
        return n;
    }, [project.outputs]);
    const mood: GnomeMood = useMemo(() => {
        if (project.maxSupply > 0 && project.totalOutputs < project.maxSupply) return 'mining';
        if (project.totalOutputs >= 10 && listedCount / project.totalOutputs > 0.2) return 'wary';
        return 'content';
    }, [project.maxSupply, project.totalOutputs, listedCount]);

    /* THE FAVOUR — the wallet's tenure per held piece in this project. */
    const [favour, setFavour] = useState<GnomeFavourResponse | null>(null);
    useEffect(() => {
        setFavour(null);
        if (!siweAddress) return;
        let cancelled = false;
        const load = () => {
            fetch(`/api/project/${project.slug}/gnome?address=${siweAddress.toLowerCase()}`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => { if (!cancelled && d) setFavour(d); })
                .catch(() => {});
        };
        load();
        const onR = () => load();
        window.addEventListener('pd:project-refresh', onR);
        return () => { cancelled = true; window.removeEventListener('pd:project-refresh', onR); };
    }, [project.slug, siweAddress]);

    const isHolder = (favour?.pieces.length ?? 0) > 0;
    /* Everything favoured (rows arrive sorted by tenure) — the keeper will
       speak for any of them; longest-held leads, pills switch the case. */
    const favouredAll = useMemo(() => favour?.pieces.filter((p) => p.favoured) ?? [], [favour]);
    const [pickedId, setPickedId] = useState<number | null>(null);
    useEffect(() => { setPickedId(null); }, [project.slug, siweAddress]);
    const favoured: GnomeFavourPiece | null =
        favouredAll.find((p) => p.token_id === pickedId) ?? favouredAll[0] ?? null;
    /* The nearest hopeful when nothing is favoured yet (rows sort by tenure). */
    const closest: GnomeFavourPiece | null = !favoured && isHolder ? favour!.pieces[0] : null;

    /* THE GREETING — tap the keeper and it speaks; lines rotate per tap. */
    const [speech, setSpeech] = useState<string | null>(null);
    const tapCount = useRef(0);
    const speechTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (speechTimer.current) clearTimeout(speechTimer.current); }, []);
    const [hop, setHop] = useState(false);
    const hopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (hopTimer.current) clearTimeout(hopTimer.current); }, []);
    const onGnomeTap = () => {
        const audience = favoured ? 'favoured' as const : isHolder ? 'holder' as const : 'stranger' as const;
        const line = gnomeGreeting(project.slug, gnome.temperament, audience, tapCount.current++);
        setSpeech(line);
        if (speechTimer.current) clearTimeout(speechTimer.current);
        speechTimer.current = setTimeout(() => setSpeech(null), 4500);
        setHop(true);
        if (hopTimer.current) clearTimeout(hopTimer.current);
        hopTimer.current = setTimeout(() => setHop(false), 450);
    };

    /* Each keeper has its own rhythm — a seeded phase offset so the world's
       gnomes don't all breathe and blink in unison. */
    const rhythm = useMemo(() => {
        const h = hashString(`rhythm:${project.slug.toLowerCase()}`);
        return { bob: -((h % 56) / 10), blink: -(((h >> 8) % 52) / 10) };
    }, [project.slug]);

    /* THE APPRAISAL — the written case for the favoured piece, from real
       engine + ledger facts only. */
    const appraisal = useMemo(() => {
        if (!favoured) return null;
        const genome = getGenome(project.slug);
        const pt = genome?.byId.get(favoured.token_id) ?? null;
        const fate = readOutputFate(project.slug, favoured.token_id);
        return gnomeAppraisal(project.slug, gnome.temperament, {
            tokenId: favoured.token_id,
            isolationRank: pt ? pt.isolationRank : null,
            isolationOf: pt ? project.totalOutputs : null,
            noneAlike: pt ? pt.twins === 1 : false,
            fate: fate.fate,
            fateName: fate.primary.name,
            heldDays: favoured.held_days,
            floorEth: lowestFloor,
            listedCount,
            minted: project.totalOutputs,
            mintTs: favoured.mint_ts,
        });
    }, [favoured, project.slug, project.totalOutputs, gnome, lowestFloor, listedCount]);

    return (
        <div className="more-box-wrap">
            <div className="gnome-card">
                <div className="gnome-readout">
                    <div className="gn-head">
                        <span className="gn-state">PROJECT GUARDIAN · {MOOD_STATE[mood]}</span>
                        <span className="gn-title">{gnome.name}</span>
                    </div>
                    <div className="gn-metrics">
                        <span className="gn-metric"><b>{gnome.temperament}</b> TEMPERAMENT</span>
                    </div>
                </div>
                <div
                    className="gnome-stage"
                    role="button"
                    tabIndex={0}
                    title="Speak to the keeper"
                    onClick={onGnomeTap}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onGnomeTap(); }
                    }}
                >
                    {speech && <div className="gnome-speech">{speech}</div>}
                    <div className={hop ? 'gnome-hop-wrap gnome-hop' : 'gnome-hop-wrap'}>
                        <GnomeFigure gnome={gnome} palette={palette} mood={mood} rhythm={rhythm} />
                    </div>
                </div>
                <div className="gnome-traits">
                    {HAT_LABELS[gnome.hat]} · {BEARD_LABELS[gnome.beard]} · {KEEPSAKE_LABELS[gnome.keepsake]}
                </div>

                {favoured && appraisal && (
                    <div className="gnome-appraisal">
                        <div className="ga-head">
                            THE GNOME&rsquo;S FAVOUR · #{favoured.token_id} · HELD {favoured.held_days} DAYS
                        </div>
                        {favouredAll.length > 1 && (
                            <div className="ga-pick-row">
                                {favouredAll.map((pc) => (
                                    <button
                                        key={pc.token_id}
                                        type="button"
                                        className={`ga-pick${pc.token_id === favoured.token_id ? ' ga-pick-on' : ''}`}
                                        onClick={() => setPickedId(pc.token_id)}
                                    >
                                        #{pc.token_id}
                                    </button>
                                ))}
                            </div>
                        )}
                        <p className="ga-case">{appraisal}</p>
                        <div className="ga-sig">{gnomeSignature(gnome.name, project.slug)}</div>
                    </div>
                )}
                {closest && (
                    <div className="gnome-favour-note">
                        THE GNOME&rsquo;S FAVOUR · earned at {favour!.favour_days} days held, unlisted —
                        your closest: #{closest.token_id}, {closest.held_days} {closest.held_days === 1 ? 'day' : 'days'}
                        {closest.listed ? ' (listed — favour withheld)' : ''}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── The drawing ──────────────────────────────────────────────────────────────
   Layer order (back → front): shadow · hoard · boots · tunic · belt · arms ·
   head · beard · mustache · cheeks · eyes · brows · nose · hat · keepsake.
   The whole figure (minus its shadow) breathes on a slow bob; the eyes blink;
   the brows carry the mood. */

export function GnomeFigure({ gnome: g, palette: p, mood = 'content', rhythm }: {
    gnome: ProjectGnome; palette: GnomePalette; mood?: GnomeMood;
    /** Seeded phase offsets (s) so each keeper breathes/blinks on its own beat. */
    rhythm?: { bob: number; blink: number };
}) {
    const w = g.girth; // 0.9–1.1 — how this gnome carries itself
    const X = (off: number) => 120 + off * w;

    /* Tunic — a felt bell from shoulders to hem. */
    const tunic = `M ${X(-30)},158
        C ${X(-50)},190 ${X(-56)},225 ${X(-52)},252
        L ${X(52)},252
        C ${X(56)},225 ${X(50)},190 ${X(30)},158 Z`;

    /* Beard variants — hangs from the face, over the chest. */
    const beard = {
        round: 'M 92,128 Q 120,120 148,128 Q 156,168 120,196 Q 84,168 92,128 Z',
        forked: 'M 92,128 Q 120,120 148,128 Q 152,160 138,198 Q 132,172 120,166 Q 108,172 102,198 Q 88,160 92,128 Z',
        long: 'M 92,128 Q 120,120 148,128 Q 154,190 120,238 Q 86,190 92,128 Z',
        braided: 'M 100,128 Q 120,122 140,128 Q 146,180 120,234 Q 94,180 100,128 Z',
        curly: 'M 92,128 Q 120,120 148,128 Q 155,158 146,172 A 10 10 0 0 1 129,179 A 10 11 0 0 1 111,179 A 10 10 0 0 1 94,172 Q 85,158 92,128 Z',
    }[g.beard];

    /* Hat variants — the brim band + the crown above it. */
    const hatCrown = {
        cone: 'M 88,106 L 120,20 L 152,106 Z',
        tall: 'M 94,106 L 120,4 L 146,106 Z',
        stumpy: 'M 84,106 L 120,56 L 156,106 Z',
        bent: `M 88,106 C 92,70 100,46 114,32 C 118,18 136,14 144,24
               C 152,34 146,46 134,44 C 138,34 130,28 125,33
               C 119,39 118,50 122,62 C 128,80 140,92 152,106 Z`,
        floppy: `M 88,106 C 90,72 98,44 116,34 C 140,22 168,34 172,58
                 C 174,74 162,88 149,83 C 158,70 152,58 140,58
                 C 128,58 126,74 132,88 C 136,97 144,101 152,106 Z`,
    }[g.hat];

    /* Mood brows — two short strokes tucked under the brim.
       mining = raised (at it, happily) · wary = knit inward · content = level. */
    const brows = {
        mining: { l: 'M 100,115 L 112,112.5', r: 'M 128,112.5 L 140,115' },
        wary: { l: 'M 100,112.5 L 112,116', r: 'M 128,116 L 140,112.5' },
        content: { l: 'M 100,114 L 112,114', r: 'M 128,114 L 140,114' },
    }[mood];

    /* Right hand — the keepsake anchor (keepsake art is drawn for hx=178
       and shifted to the true hand when girth moves it). */
    const hx = X(58);
    const armY = 205;

    return (
        <svg
            className="gnome-svg"
            viewBox="0 0 240 300"
            role="img"
            aria-label={`${g.name}, this Project's guardian gnome`}
        >
            {/* Ground shadow — stays put while the gnome bobs. */}
            <ellipse cx="120" cy="272" rx={62 * w} ry="9" fill={p.ink} opacity="0.12" />

            <g
                className={`gnome-figure gnome-figure--${mood}`}
                style={rhythm ? { animationDelay: `${rhythm.bob}s` } : undefined}
            >
                {/* The hoard so far — gems at the keeper's feet. */}
                {Array.from({ length: g.hoard }).map((_, i) => {
                    const gx = [70, 55, 84][i];
                    const gy = [258, 265, 266][i];
                    return (
                        <path
                            key={i}
                            d={`M ${gx},${gy - 9} L ${gx + 8},${gy} L ${gx},${gy + 9} L ${gx - 8},${gy} Z`}
                            fill={p.gem} stroke={p.ink} strokeWidth="2"
                        />
                    );
                })}

                {/* Boots */}
                <rect x={X(-38)} y="248" width="30" height="20" rx="9" fill={p.leather} stroke={p.ink} strokeWidth="2.5" />
                <rect x={X(8)} y="248" width="30" height="20" rx="9" fill={p.leather} stroke={p.ink} strokeWidth="2.5" />

                {/* Tunic + belt */}
                <path d={tunic} fill={p.tunic} stroke={p.ink} strokeWidth="3" strokeLinejoin="round" />
                <rect x={X(-47)} y="212" width={94 * w} height="13" fill={p.leather} stroke={p.ink} strokeWidth="2" />
                <rect x="112" y="209" width="16" height="19" rx="3" fill="#c9a227" stroke={p.ink} strokeWidth="2.5" />

                {/* Arms — capsules to mitten hands */}
                <path d={`M ${X(-26)},170 L ${X(-58)},${armY}`} stroke={p.ink} strokeWidth="19" strokeLinecap="round" />
                <path d={`M ${X(-26)},170 L ${X(-58)},${armY}`} stroke={p.tunic} strokeWidth="14" strokeLinecap="round" />
                <path d={`M ${X(26)},170 L ${X(58)},${armY}`} stroke={p.ink} strokeWidth="19" strokeLinecap="round" />
                <path d={`M ${X(26)},170 L ${X(58)},${armY}`} stroke={p.tunic} strokeWidth="14" strokeLinecap="round" />
                <circle cx={X(-58)} cy={armY} r="8.5" fill={p.skin} stroke={p.ink} strokeWidth="2.5" />
                <circle cx={hx} cy={armY} r="8.5" fill={p.skin} stroke={p.ink} strokeWidth="2.5" />

                {/* Head, beard, face */}
                <circle cx="120" cy="124" r="30" fill={p.skin} stroke={p.ink} strokeWidth="2.5" />
                <path d={beard} fill={p.beard} stroke={p.ink} strokeWidth="2.5" strokeLinejoin="round" />
                {g.beard === 'braided' && (
                    <>
                        <rect x="106" y="184" width="28" height="8" rx="3" fill={p.leather} stroke={p.ink} strokeWidth="2" />
                        <rect x="109" y="208" width="22" height="8" rx="3" fill={p.leather} stroke={p.ink} strokeWidth="2" />
                    </>
                )}
                <path d="M 98,134 Q 120,124 142,134 Q 120,143 98,134 Z" fill={p.beard} stroke={p.ink} strokeWidth="2" />
                <circle cx="97" cy="130" r="6" fill="#e06a5a" opacity="0.35" />
                <circle cx="143" cy="130" r="6" fill="#e06a5a" opacity="0.35" />
                <g className="gnome-eyes" style={rhythm ? { animationDelay: `${rhythm.blink}s` } : undefined}>
                    <circle cx="106" cy="119" r="3" fill={p.ink} />
                    <circle cx="134" cy="119" r="3" fill={p.ink} />
                </g>
                <path d={brows.l} stroke={p.ink} strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d={brows.r} stroke={p.ink} strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <circle cx="120" cy="133" r={g.nose} fill={p.skin} stroke={p.ink} strokeWidth="2.5" />

                {/* Hat — crown, then the brim band over the brow. */}
                <path d={hatCrown} fill={p.hat} stroke={p.ink} strokeWidth="3" strokeLinejoin="round" />
                {g.hatPatch && (
                    <g transform="rotate(-12 120 72)">
                        <rect x="112" y="66" width="16" height="13" rx="2" fill={p.tunic} stroke={p.ink} strokeWidth="2" />
                        <line x1="112" y1="69" x2="109" y2="68" stroke={p.ink} strokeWidth="1.5" />
                        <line x1="128" y1="76" x2="131" y2="77" stroke={p.ink} strokeWidth="1.5" />
                    </g>
                )}
                <rect x="84" y="100" width="72" height="13" rx="6" fill={p.hat} stroke={p.ink} strokeWidth="3" />

                {/* The keepsake */}
                <g transform={`translate(${hx - 178},0)`}>
                    {g.keepsake === 'pickaxe' && (
                        <>
                            <path d="M 168,238 L 188,158" stroke={p.ink} strokeWidth="10" strokeLinecap="round" />
                            <path d="M 168,238 L 188,158" stroke={p.wood} strokeWidth="6" strokeLinecap="round" />
                            <path d="M 152,166 Q 184,142 214,170 Q 196,152 184,151 Q 168,152 152,166 Z"
                                fill="#8b8f96" stroke={p.ink} strokeWidth="2.5" strokeLinejoin="round" />
                        </>
                    )}
                    {g.keepsake === 'spade' && (
                        <>
                            <path d="M 178,152 L 178,222" stroke={p.ink} strokeWidth="10" strokeLinecap="round" />
                            <path d="M 178,152 L 178,222" stroke={p.wood} strokeWidth="6" strokeLinecap="round" />
                            <rect x="166" y="146" width="24" height="9" rx="4" fill={p.wood} stroke={p.ink} strokeWidth="2" />
                            <path d="M 164,220 L 192,220 Q 192,244 178,252 Q 164,244 164,220 Z"
                                fill="#8b8f96" stroke={p.ink} strokeWidth="2.5" strokeLinejoin="round" />
                        </>
                    )}
                    {g.keepsake === 'lantern' && (
                        <>
                            <circle cx="182" cy="226" r="17" fill="#ffd75e" opacity="0.28" />
                            <rect x="170" y="211" width="24" height="30" rx="5" fill={p.leather} stroke={p.ink} strokeWidth="2.5" />
                            <circle cx="182" cy="226" r="8" fill="#ffd75e" stroke={p.ink} strokeWidth="2" />
                            <path d="M 176,211 Q 182,200 188,211" fill="none" stroke={p.ink} strokeWidth="2.5" />
                        </>
                    )}
                    {g.keepsake === 'gem' && (
                        <>
                            <path d="M 182,194 L 199,212 L 182,234 L 165,212 Z"
                                fill={p.gem} stroke={p.ink} strokeWidth="2.5" strokeLinejoin="round" />
                            <path d="M 165,212 L 199,212 M 182,194 L 182,234" stroke={p.ink} strokeWidth="1.5" opacity="0.5" />
                            <path d="M 204,192 L 204,200 M 200,196 L 208,196" stroke={p.ink} strokeWidth="2" />
                        </>
                    )}
                    {g.keepsake === 'pipe' && (
                        <>
                            <path d="M 138,150 Q 156,158 166,166" fill="none" stroke={p.wood} strokeWidth="5" strokeLinecap="round" />
                            <rect x="162" y="162" width="16" height="14" rx="4" fill={p.wood} stroke={p.ink} strokeWidth="2.5" />
                            <circle cx="174" cy="148" r="4" fill={p.beard} opacity="0.5" />
                            <circle cx="180" cy="134" r="6" fill={p.beard} opacity="0.4" />
                            <circle cx="174" cy="117" r="8" fill={p.beard} opacity="0.3" />
                        </>
                    )}
                    {g.keepsake === 'mushroom' && (
                        <>
                            <rect x="196" y="246" width="13" height="20" rx="5" fill="#f0e8d8" stroke={p.ink} strokeWidth="2.5" />
                            <path d="M 186,248 Q 202,224 218,248 Z" fill="#c0392b" stroke={p.ink} strokeWidth="2.5" strokeLinejoin="round" />
                            <circle cx="196" cy="240" r="2.5" fill="#f0e8d8" />
                            <circle cx="208" cy="242" r="2" fill="#f0e8d8" />
                        </>
                    )}
                </g>
            </g>
        </svg>
    );
}
