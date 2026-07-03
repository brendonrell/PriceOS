import { getIndexerSupabase } from "./supabase";
import { resolveHandle } from "./writes";

// ---------------------------------------------------------------------------
// Directed pings from ON-CHAIN events — the indexer-side mirror of the app's
// lib/pings/createPing.ts. Without this, indexer writes bypass the pings
// system entirely: a real on-chain sale or mint reaches the events feed but
// the seller/artist never gets an inbox notification.
//
// Semantics mirrored from the app (same kinds, same recipients):
//   • SALE  → ping the SELLER, actor = buyer, amount = sale price.
//   • MINT  → ping the ARTIST on 1000-multiple milestones only (a hot drop
//             pinging the artist per-collect is noise) — same rule as
//             PriceOS app/api/project/[slug]/mint/route.ts.
//
// Differences, deliberate:
//   • Recipients must already be PD users (pings.recipient_address FKs
//     users.address). On-chain counterparties who've never touched PD are
//     skipped — nothing to notify.
//   • Muted pairs are respected (same check as the app).
//   • No native (3D) push — the web-push keys + sender live in the app; the
//     inbox row is the deliverable here. Best-effort: a ping failure never
//     fails the indexing write it rides on.
// ---------------------------------------------------------------------------

async function isPdUser(address: string): Promise<boolean> {
  const { data, error } = await getIndexerSupabase()
    .from("users")
    .select("address")
    .eq("address", address.toLowerCase())
    .maybeSingle();
  if (error) return false;
  return data !== null;
}

async function isMuted(recipient: string, actor: string): Promise<boolean> {
  const { data, error } = await getIndexerSupabase()
    .from("muted")
    .select("muted_address")
    .eq("user_address", recipient.toLowerCase())
    .eq("muted_address", actor.toLowerCase())
    .maybeSingle();
  if (error) return false;
  return data !== null;
}

/** Ping the seller of an on-chain Seaport sale. Best-effort. */
export async function pingSellerOnSale(args: {
  seller: string;
  buyer: string;
  projectId: string;
  tokenId: string;
  priceEth: string;
}): Promise<void> {
  try {
    const seller = args.seller.toLowerCase();
    const buyer = args.buyer.toLowerCase();
    if (seller === buyer) return;
    if (!(await isPdUser(seller))) return;
    if (await isMuted(seller, buyer)) return;

    const [actorName, projRes] = await Promise.all([
      resolveHandle(buyer),
      getIndexerSupabase().from("projects").select("handle").eq("id", args.projectId).maybeSingle(),
    ]);
    const projectHandle = (projRes.data?.handle as string | null) ?? null;

    const { error } = await getIndexerSupabase().from("pings").insert({
      recipient_address: seller,
      kind: "SALE",
      actor_address: buyer,
      actor_name: actorName,
      project_id: args.projectId,
      token_id: args.tokenId,
      amount_eth: Number(args.priceEth),
      data: projectHandle ? { project_handle: projectHandle } : {},
      read: false,
    });
    if (error) console.error("indexer: sale ping failed:", error.message);
  } catch (err) {
    console.error(
      "indexer: sale ping error:",
      err instanceof Error ? err.message : err,
    );
  }
}

/** Ping the artist when minted_count crosses a 1000-multiple. Reads the
 *  post-bump count itself; call only after a FRESH mint insert. Best-effort. */
export async function pingArtistOnMintMilestone(
  projectId: string,
): Promise<void> {
  try {
    const { data: proj } = await getIndexerSupabase()
      .from("projects")
      .select("minted_count, artist_address, handle")
      .eq("id", projectId)
      .maybeSingle();
    const mintedNow = (proj?.minted_count as number | null) ?? 0;

    const prev = mintedNow - 1;
    const kPrev = Math.floor(prev / 1000);
    const kNow = Math.floor(mintedNow / 1000);
    if (!(mintedNow >= 1000 && kNow > kPrev)) return;
    const milestone = kNow * 1000;

    const artist =
      (proj?.artist_address as string | null)?.toLowerCase() ?? null;
    if (!artist || !(await isPdUser(artist))) return;

    const { error } = await getIndexerSupabase().from("pings").insert({
      recipient_address: artist,
      kind: "MINT",
      actor_address: null, // project-level milestone, not a single collector
      project_id: projectId,
      data: {
        milestone,
        count: mintedNow,
        ...(proj?.handle ? { project_handle: proj.handle } : {}),
      },
      read: false,
    });
    if (error)
      console.error("indexer: mint milestone ping failed:", error.message);
  } catch (err) {
    console.error(
      "indexer: mint milestone ping error:",
      err instanceof Error ? err.message : err,
    );
  }
}
