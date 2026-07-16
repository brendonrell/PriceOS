'use client';

/*
 * gossip — the GOSSIP PROTOCOL spell's template engine (Atlas: "feed events
 * rewritten as plain-English rumors").
 *
 * When `spell_gossip` is on, FeedActorLine (the ONE shared feed sentence —
 * project feed · profile feed · artwork page feed · Starred Tx rows) swaps its
 * plain ledger sentence for a rumor from the pools below. The data never
 * changes — same actor link (Spite Book treatment intact), same token link,
 * same real price — only the telling does: the ledger starts talking like the
 * group chat.
 *
 * Deterministic on purpose: the rumor for an event is seeded from its id, so a
 * row keeps its rumor across re-renders and reads identically in every feed it
 * appears in. The Tribunal is untouched — it renders its own case-file markup,
 * so the court record stays sworn while the feeds whisper.
 */

import React, { type ReactNode } from 'react';
import type { FeedEvent } from './feedRow';

/* One rumor template: given the actor node, the token node, and the price
 * label ("0.25 ETH", or null when the event carries none), speak. Every
 * template must read clean in BOTH price states. */
type RumorTemplate = (a: ReactNode, t: ReactNode, p: string | null) => ReactNode;

const RUMORS: Record<FeedEvent['type'], RumorTemplate[]> = {
    MINT: [
        (a, t, p) => <>word is {a} just took {t} home{p ? <> · {p}, allegedly</> : null}</>,
        (a, t, p) => <>{a} minted {t} and told absolutely everyone{p ? <> it was only {p}</> : null}</>,
        (a, t, p) => <>sources say {a} was first in line for {t}{p ? <> · {p} well spent</> : null}</>,
        (a, t, p) => <>a little bird saw {a} leaving with {t}{p ? <> · {p} lighter</> : null}</>,
        (a, t, p) => <>{a} swears {t} chose them{p ? <> · the {p} says otherwise</> : null}</>,
        (a, t) => <>{a} quietly minted {t} · it stayed quiet for four seconds</>,
        (a, t, p) => <>heard {a} couldn&apos;t sleep until {t} was theirs{p ? <> · {p} later, they sleep fine</> : null}</>,
    ],
    LIST: [
        (a, t, p) => <>{a} is quietly shopping {t} around{p ? <> · asking {p}, apparently</> : null}</>,
        (a, t, p) => <>heard {a} put {t} on the block{p ? <> at {p}</> : null} · draw your own conclusions</>,
        (a, t, p) => <>{a} insists listing {t} &apos;isn&apos;t about the money&apos;{p ? <> · it&apos;s {p}</> : null}</>,
        (a, t, p) => <>rumor is {a} wants out of {t}{p ? <> · {p} takes it</> : null}</>,
        (a, t, p) => <>{a} listed {t}{p ? <> at {p}</> : null} and is now watching the room</>,
        (a, t, p) => <>they say {a} named a number for {t}{p ? <> · {p}, take it or leave it</> : null}</>,
        (a, t, p) => <>{a} floated {t}{p ? <> at {p}</> : null} · &apos;just testing the waters,&apos; apparently</>,
    ],
    SALE: [
        (a, t, p) => p
            ? <>{a} paid {p} for {t} and we&apos;re all pretending that&apos;s normal</>
            : <>{a} closed on {t} · numbers undisclosed, naturally</>,
        (a, t, p) => <>confirmed by two anons: {a} bought {t}{p ? <> for {p}</> : null}</>,
        (a, t, p) => <>{a} swooped {t}{p ? <> for {p}</> : null} before anyone could talk them out of it</>,
        (a, t, p) => <>word travels fast · {t} belongs to {a} now{p ? <> and {p} changed hands</> : null}</>,
        (a, t, p) => <>{a} said they were &apos;just looking&apos; · {t} says otherwise{p ? <> · {p}</> : null}</>,
        (a, t, p) => <>don&apos;t repeat this, but {a} got {t}{p ? <> for {p}</> : null}</>,
        (a, t, p) => <>{a} bought {t}{p ? <> at {p}</> : null} · the group chat has thoughts</>,
    ],
    XFER: [
        (a, t) => <>{t} slipped into {a}&apos;s wallet overnight · no one saw a thing</>,
        (a, t) => <>{a} moved {t} in the dead of night</>,
        (a, t) => <>don&apos;t ask why {t} just changed hands · {a} isn&apos;t telling</>,
        (a, t) => <>{t} now lives with {a} · no receipts, no comment</>,
        (a, t) => <>{a} came into possession of {t} · &apos;a gift,&apos; they say</>,
        (a, t) => <>{t} was seen entering {a}&apos;s wallet · make of that what you will</>,
        (a, t) => <>{t} went to {a} · quietly, which is never quiet here</>,
    ],
};

/* FNV-1a over the event id — stable template pick per event, everywhere. */
function rumorSeed(id: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < id.length; i++) {
        h ^= id.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

/* Token link out of the star blob's `${slug}-${id}` token_id — mirrors
 * feedRow's feedSlug/feedLocalId (split on the LAST hyphen; slugs may carry
 * hyphens of their own). Kept local so gossip stays a leaf module. */
function rumorToken(fe: FeedEvent): ReactNode {
    const tokenId = fe.star.tokenId;
    const i = tokenId ? tokenId.lastIndexOf('-') : -1;
    if (!tokenId || i < 0) return <span className="f-highlight">a certain piece</span>;
    const slug = tokenId.slice(0, i);
    const lid = tokenId.slice(i + 1);
    return (
        <a className="f-highlight" href={`/art/${slug}/${lid}`} onClick={(e) => e.stopPropagation()}>#{lid}</a>
    );
}

/** The rumor sentence for one feed event. `actor` arrives prebuilt from
 *  FeedActorLine so the Spite Book treatment stays in exactly one place. */
export function GossipLine({ fe, actor }: { fe: FeedEvent; actor: ReactNode }) {
    const pool = RUMORS[fe.type] ?? RUMORS.XFER;
    const tpl = pool[rumorSeed(fe.id) % pool.length];
    const price = fe.price && fe.star.priceEth ? `${fe.star.priceEth} ETH` : null;
    return <>{tpl(actor, rumorToken(fe), price)}</>;
}
