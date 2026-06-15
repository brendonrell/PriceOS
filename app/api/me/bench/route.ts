/*
 * /api/me/bench — the SIWE-auth'd user's Bench, stored per-user in bench_items.
 *   GET → { items: [{ slug, id }] }
 *   PUT → replace the whole bench (body { items })
 * Owner-scoped via the session address; see lib/collections/collectionRoute.
 */
import { collectionGET, collectionPUT } from '@/lib/collections/collectionRoute';

export const dynamic = 'force-dynamic';

export const GET = collectionGET('bench_items');
export const PUT = collectionPUT('bench_items', 8);
