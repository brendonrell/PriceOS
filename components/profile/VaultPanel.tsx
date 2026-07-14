'use client';

/*
 * VaultPanel — THE VAULT (+More › Vault), the King Mode consolidation surface
 * (Atlas › King Candidates spec, built 2026-07-13). One canonical home per
 * wallet: a near-black vault door that slides open like a MiniDisc shutter.
 * Ships ZERO new verbs — every facet is an existing system rendered in place:
 *
 *   · the SEAL on the door   = the wallet's forged Sigil (faction ink), else
 *                              its faction mark, else the bare ‰
 *   · the VERDICT LINE       = faction · pieces held · days under oath — the
 *                              closed door is a flex or an indictment before
 *                              anyone opens it (spec: never cut this)
 *   · the APPRAISAL PLATES   = PD Rarity (lib/output/rarity — the character
 *                              sheet's own math) under every held piece
 *   · ENTERING a piece       = the artwork page (tap a plate)
 *
 * PUBLIC on every profile — "drop a link to anyone's vault" is the point.
 * The near-black stage is the SPEC's call (the vault door is near-black by
 * definition, like the Composer's pinned-dark stage); chrome on it is
 * full-strength bone/faction ink, nothing faint.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import SigilArt from '../SigilArt';
import { PerMilleMark } from '../shell/PerMilleMark';
import { factionForLogo } from '../../lib/factions/factions';
import { pdRarity, pdRarityRank } from '../../lib/output/rarity';
import { getProject } from '../../lib/project/registry';
import { SIGIL_BONE } from '../../lib/sigil/sigil';
import type { MyPledge } from '../../lib/anoint/useAnoint';
import type { Holding } from './profilePageShared';

const VS15 = '︎';

export default function VaultPanel({
    address,
    handle,
    isOwnProfile,
    holdings,
    ownedCount,
    ownerLogo,
    sigilForged,
}: {
    address: string;
    handle: string;
    isOwnProfile: boolean;
    holdings: Holding[];
    ownedCount: number;
    ownerLogo: string | null | undefined;
    sigilForged: boolean;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [sliding, setSliding] = useState(false);
    const [pledge, setPledge] = useState<MyPledge | null>(null);

    /* The oath — this wallet's anointment tenure (public read, any profile). */
    useEffect(() => {
        const addr = address?.toLowerCase();
        if (!addr) return;
        let cancelled = false;
        fetch(`/api/anoint?me=${addr}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d: { anointment?: MyPledge | null } | null) => {
                if (!cancelled) setPledge(d?.anointment ?? null);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [address]);

    const faction = factionForLogo(ownerLogo);
    const ink = faction?.hex ?? SIGIL_BONE;

    const oathDays = useMemo(() => {
        if (!pledge?.placed_at) return null;
        const t = Date.parse(pledge.placed_at);
        if (Number.isNaN(t)) return null;
        return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
    }, [pledge]);

    const pieces = Math.max(ownedCount, holdings.length);

    /* The verdict line — readable while the door is still shut. */
    const verdict = [
        faction ? faction.name.toUpperCase() : 'UNALIGNED',
        `${pieces} ${pieces === 1 ? 'PIECE' : 'PIECES'}`,
        ...(oathDays != null ? [`OATH ${oathDays}D`] : []),
    ].join(' · ');

    /* Appraisal plates — newest holdings first, PD Rarity per piece. */
    const plates = useMemo(
        () =>
            holdings.map((h) => {
                const p = getProject(h.slug);
                const r = pdRarity(h.slug, h.token_id);
                const rank = pdRarityRank(h.slug, h.token_id);
                return {
                    key: `${h.slug}:${h.token_id}`,
                    slug: h.slug,
                    id: h.token_id,
                    name: p?.displayName ?? h.slug.toUpperCase(),
                    score: r?.score ?? null,
                    rank,
                };
            }),
        [holdings],
    );

    const unseal = () => {
        if (open || sliding) return;
        setSliding(true);
        window.setTimeout(() => { setSliding(false); setOpen(true); }, 420);
    };

    return (
        <section className="vault-stage" aria-label="The Vault">
            {!open ? (
                <div
                    className={`vault-door${sliding ? ' is-sliding' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={unseal}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); unseal(); }
                    }}
                    title="Unseal the vault"
                >
                    <span className="vault-inner-seal" style={{ color: ink }}>
                        {sigilForged ? (
                            <SigilArt address={address} hex={ink} />
                        ) : faction ? (
                            `⚐${VS15}`
                        ) : (
                            <PerMilleMark className="vault-permille" />
                        )}
                    </span>
                    <span className="vault-inner-verdict">{verdict}</span>
                    <span className="vault-reseal">TAP TO UNSEAL</span>
                </div>
            ) : (
                <div className="vault-inner">
                    <div className="vault-inner-head">
                        <span className="vault-inner-seal" style={{ color: ink }}>
                            {sigilForged ? <SigilArt address={address} hex={ink} /> : faction ? `⚐${VS15}` : <PerMilleMark className="vault-permille" />}
                        </span>
                        <span className="vault-inner-verdict">{verdict}</span>
                        <span
                            className="vault-reseal"
                            role="button"
                            tabIndex={0}
                            onClick={() => setOpen(false)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(false); }
                            }}
                            title="Reseal"
                        >
                            {'×'}{VS15} RESEAL
                        </span>
                    </div>
                    {plates.length === 0 ? (
                        <div className="vault-empty">
                            {isOwnProfile
                                ? 'An empty vault. Collect a piece and it hangs here with its appraisal.'
                                : `@${handle} holds nothing on the walls yet.`}
                        </div>
                    ) : (
                        <div className="vault-plates">
                            {plates.map((pl) => (
                                <div
                                    key={pl.key}
                                    className="vault-plate"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => router.push(`/art/${pl.slug}/${pl.id}`)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            router.push(`/art/${pl.slug}/${pl.id}`);
                                        }
                                    }}
                                    title={`Enter ${pl.name} #${pl.id}`}
                                >
                                    <span className="vault-plate-name">
                                        {pl.name} <b>#{pl.id}</b>
                                    </span>
                                    <span className="vault-plate-appraisal">
                                        {pl.score != null ? `RARITY ${pl.score}` : '—'}
                                        {pl.rank ? ` · #${pl.rank.rank} OF ${pl.rank.total}` : ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
