/*
 * /api/me/cart — the SIWE-auth'd user's Cart, stored per-user in cart_items.
 *   GET → { items: [{ slug, id }] }
 *   PUT → replace the whole cart (body { items })
 * Owner-scoped via the session address; see lib/collections/collectionRoute.
 */
import { collectionGET, collectionPUT } from '@/lib/collections/collectionRoute';

export const dynamic = 'force-dynamic';

export const GET = collectionGET('cart_items');
export const PUT = collectionPUT('cart_items', 100);
