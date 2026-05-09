# PriceOS API Spec

Production base: `https://api.pricediscussion.com`
Stack: Next.js 14 (App Router) on Vercel serverless · Supabase (Postgres) · Alchemy (chain reads)

## Auth model

Reads are open — no API key, no auth required.
Write operations (follows, mark-notifications-read, future stars/wishlist writes) require a SIWE (Sign-In With Ethereum) session, stored in an httpOnly encrypted cookie via `iron-session`.

## Cache TTLs (encoded as Next.js `revalidate`)

| Surface | TTL | Used by |
|---|---|---|
| Collection stats | 15s | `GET /api/collection/[id]`, `GET /api/token/[id]` |
| Feed events | 5s | `GET /api/feed`, `GET /api/collection/[id]/feed` |
| Artist info / cooldown | 30s | `GET /api/artist/[address]` |
| Token traits | 300s | `GET /api/collection/[id]/tokens` |
| $PRICE balance | 10s | `GET /api/price/[address]` |
| Search | 60s | `GET /api/search` |
| Platform stats | 60s | `GET /api/stats` |
| User profile | dynamic | `GET /api/user/[address]` (writes invalidate immediately) |
| All `POST` / `DELETE` | dynamic | force-dynamic |

## Status legend

- **ready-to-build** — wired to Supabase / chain. Works once env vars are set.
- **blocked-on-indexer** — returns typed mock data matching the spec. Replace with Supabase queries once the indexer populates the relevant table.

## Error response shape

Every non-2xx response uses this envelope (see `lib/errors.ts`):

```ts
interface ApiError {
  error: string;
  code: 'NOT_FOUND' | 'UNAUTHORIZED' | 'BAD_REQUEST' | 'SERVER_ERROR' | 'RATE_LIMITED';
  details?: unknown;
}
```

## Rate limiting

Edge middleware (`middleware.ts`) applies a 100 req/min per-IP cap on every `/api/*` route. The current implementation is an in-memory `Map` per instance (good enough for dev / abuse blunting); production should swap in Upstash Redis. See the comment at the top of `middleware.ts` for the swap pseudocode.

---

## Supabase-direct routes

### `GET /api/user/[address]`

Profile data plus follower / following counts.

- **Auth:** none
- **Source:** `users`, `follows` (Supabase)
- **Cache:** dynamic
- **Status:** ready-to-build

```ts
// Path params
interface Params { address: string; } // 0x[40-hex]

// Response (200)
interface UserProfileResponse {
  address: string;
  ens_name: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  follower_count: number;
  following_count: number;
}
```

Errors: `400 BAD_REQUEST` (invalid address), `404 NOT_FOUND` (user row missing), `500 SERVER_ERROR`.

---

### `POST /api/follows`

Follow a wallet. Idempotent — re-posting the same `{follower, target}` pair is a no-op.

- **Auth:** SIWE (follower address taken from session, not the body)
- **Source:** `follows` (Supabase, service role)
- **Cache:** dynamic
- **Status:** ready-to-build

```ts
interface FollowRequestBody { target: string; } // 0x[40-hex], must differ from caller

// Response (201)
interface FollowResponse {
  follower_address: string;
  following_address: string;
  created_at: string;
}
```

Errors: `400 BAD_REQUEST` (invalid target / self-follow / bad JSON), `401 UNAUTHORIZED` (no SIWE session).

---

### `DELETE /api/follows?target=0x...`

Unfollow a wallet. Idempotent — deleting a row that doesn't exist returns 200 with `{ ok: true }`.

- **Auth:** SIWE
- **Source:** `follows` (Supabase, service role)
- **Cache:** dynamic
- **Status:** ready-to-build

```ts
// Query: ?target=0x[40-hex]

// Response (200)
interface UnfollowResponse {
  ok: true;
  follower_address: string;
  following_address: string;
}
```

Errors: `400 BAD_REQUEST`, `401 UNAUTHORIZED`.

---

### `GET /api/follows/[address]`

Followers + following lists for a given address.

- **Auth:** none
- **Source:** `follows` (Supabase)
- **Cache:** dynamic
- **Status:** ready-to-build

```ts
interface Params { address: string; }

// Response (200)
interface FollowsListResponse {
  address: string;
  followers: string[];          // addresses following `address`
  following: string[];          // addresses `address` follows
  follower_count: number;
  following_count: number;
}
```

Errors: `400 BAD_REQUEST`.

---

### `GET /api/notifications/[address]`

Notification list for a wallet. Caller must be authenticated as that wallet — cross-account reads are rejected with 401.

- **Auth:** SIWE (path address must match session address)
- **Source:** `notifications` (Supabase, service role)
- **Cache:** dynamic
- **Status:** ready-to-build

```ts
interface Params { address: string; }
// Query: ?limit=50&cursor=<ISO timestamp from previous page's last notification>

interface NotificationsListResponse {
  address: string;
  unread_count: number;
  notifications: NotificationRow[];
  next_cursor: string | null;
}

interface NotificationRow {
  id: string;
  recipient_address: string;
  event_id: string;
  type: 'FOLLOW' | 'MINT' | 'LIST' | 'SALE' | 'XFER' | 'OFFER';
  read: boolean;
  created_at: string;
}
```

Errors: `400 BAD_REQUEST`, `401 UNAUTHORIZED` (no session OR session-address mismatch).

---

### `POST /api/notifications/read`

Mark notifications read in bulk. Scoped to the caller — passing a notification ID that belongs to another address is silently ignored (won't update the row).

- **Auth:** SIWE
- **Source:** `notifications` (Supabase, service role)
- **Cache:** dynamic
- **Status:** ready-to-build

```ts
interface MarkReadRequestBody { ids: string[]; } // 1..200 notification IDs

// Response (200)
interface MarkReadResponse {
  ok: true;
  updated: number; // number of rows actually changed
}
```

Errors: `400 BAD_REQUEST` (empty array, > 200 IDs, bad JSON), `401 UNAUTHORIZED`.

---

### `GET /api/search?q=`

Full-text search over collections (by title) and users (by ENS / display name / address). Min query length: 2 chars. Max results per category: 20.

- **Auth:** none
- **Source:** `collections`, `users` (Supabase, ILIKE)
- **Cache:** 60s ISR
- **Status:** ready-to-build

```ts
// Query: ?q=<string, min 2 chars>

interface SearchResponse {
  query: string;
  collections: Array<{
    id: string;
    title: string;
    artist_address: string;
    minted_count: number;
    max_supply: number;
  }>;
  users: Array<{
    address: string;
    ens_name: string | null;
    display_name: string | null;
  }>;
}
```

Errors: `400 BAD_REQUEST`.

Future: when collection / user counts grow past a few thousand rows, swap ILIKE for Postgres `tsvector` + GIN index, or move to a dedicated search service (Meilisearch / Typesense). Response shape stays the same.

---

## Indexer-derived routes (mocked)

Each route below currently returns typed mock data shaped to match the production response. The mock reflects the Kiki genesis collection (2,222 editions, ~$22 mint price) with the locked trait names (Palette / Mode / Encounter / State).

### `GET /api/collection/[id]`

- **Auth:** none
- **Source:** `collections` (Supabase, indexer-written)
- **Cache:** 15s ISR
- **Status:** blocked-on-indexer

```ts
interface Params { id: string; }

interface CollectionResponse {
  id: string;
  artist_address: string;
  title: string;
  description: string;
  minted_count: number;
  max_supply: number;
  floor_price_eth: string;
  volume_eth: string;
  all_time_high_eth: string;
  cooldown_until: string | null;     // ISO; null while primary still open
  primary_active: boolean;
  traits: Array<{ name: string; values: string[] }>;
}
```

---

### `GET /api/collection/[id]/tokens`

- **Auth:** none
- **Source:** `tokens` (derived view; indexer-written)
- **Cache:** 300s ISR
- **Status:** blocked-on-indexer

```ts
interface Params { id: string; }
// Query: ?page=1&page_size=24 (max 100)

interface CollectionTokensResponse {
  collection_id: string;
  total: number;
  page: number;
  page_size: number;
  tokens: TokenSummary[];
}

interface TokenSummary {
  id: string;                       // "{collection_id}-{edition}"
  collection_id: string;
  edition: number;
  owner: string;
  minter: string;
  list_price_eth: string | null;
  last_sale_eth: string | null;
  traits: { Palette: string; Mode: string; Encounter: string; State: string };
}
```

---

### `GET /api/collection/[id]/feed`

- **Auth:** none
- **Source:** `events` filtered by `collection_id` (indexer-written)
- **Cache:** 5s ISR
- **Status:** blocked-on-indexer

```ts
interface Params { id: string; }
// Query: ?limit=20

interface CollectionFeedResponse {
  collection_id: string;
  events: EventRow[];
  next_cursor: string | null;       // ISO timestamp of oldest event in page
}

interface EventRow {
  id: string;
  type: 'MINT' | 'LIST' | 'SALE' | 'XFER';
  collection_id: string;
  token_id: string | null;
  from_address: string | null;
  to_address: string | null;
  price_eth: string | null;
  timestamp: string;
}
```

---

### `GET /api/token/[id]`

Token detail plus full event history.

- **Auth:** none
- **Source:** derived `tokens` view + `events` (indexer-written)
- **Cache:** 15s ISR
- **Status:** blocked-on-indexer

```ts
interface Params { id: string; }    // "{collection_id}-{edition}"

interface TokenDetailResponse {
  id: string;
  collection_id: string;
  edition: number;
  owner: string;
  minter: string;
  minted_at: string;
  list_price_eth: string | null;
  last_sale_eth: string | null;
  traits: { Palette: string; Mode: string; Encounter: string; State: string };
  history: EventRow[];
}
```

---

### `GET /api/artist/[address]`

Artist profile, cooldown status (60-day enforcement), and their collections.

- **Auth:** none
- **Source:** `users` + `collections` (Supabase, indexer-written for cooldown)
- **Cache:** 30s ISR
- **Status:** blocked-on-indexer

```ts
interface Params { address: string; }

interface ArtistResponse {
  address: string;
  ens_name: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cooldown_until: string | null;     // ISO; mint-end + 60 days
  cooldown_active: boolean;
  cooldown_days_remaining: number;
  collections: Array<{
    id: string;
    title: string;
    minted_count: number;
    max_supply: number;
    floor_price_eth: string | null;
    volume_eth: string;
  }>;
  total_volume_eth: string;
}
```

---

### `GET /api/feed`

Global activity feed. Filterable by collection and event type.

- **Auth:** none
- **Source:** `events` (indexer-written)
- **Cache:** 5s ISR
- **Status:** blocked-on-indexer

```ts
// Query:
//   ?limit=20                                 (max 100)
//   ?types=MINT,SALE                          (default: all four types)
//   ?collection_id=kiki                       (optional, scopes to one collection)

interface GlobalFeedResponse {
  events: EventRow[];
  next_cursor: string | null;
  filter: {
    types: Array<'MINT' | 'LIST' | 'SALE' | 'XFER'>;
    collection_id: string | null;
  };
}
```

---

### `GET /api/stats`

Platform-wide totals.

- **Auth:** none
- **Source:** `collections` + `events` aggregates (indexer-written; likely a materialized view)
- **Cache:** 60s ISR
- **Status:** blocked-on-indexer

```ts
interface PlatformStatsResponse {
  total_collections: number;
  total_minted: number;
  total_holders: number;
  total_volume_eth: string;
  primary_volume_eth: string;
  secondary_volume_eth: string;
  active_artists: number;
  artists_in_cooldown: number;
}
```

---

## Chain-read routes

### `GET /api/price/[address]`

$PRICE ERC-20 balance via Alchemy `eth_call → balanceOf(address)`. No indexer dependency — this is a direct chain read.

- **Auth:** none
- **Source:** Ethereum mainnet via Alchemy JSON-RPC
- **Cache:** 10s ISR
- **Status:** ready-to-build (returns `0` until `PRICE_TOKEN_ADDRESS` is set)

```ts
interface Params { address: string; }

interface PriceBalanceResponse {
  address: string;
  token_address: string;
  balance_wei: string;
  balance_formatted: string;       // human-readable, 18 decimals stripped
  decimals: number;                // 18
}
```

Errors: `400 BAD_REQUEST` (invalid address), `500 SERVER_ERROR` (Alchemy upstream failure).

---

## Environment variables

Required for full functionality:

| Var | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase routes | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Read routes | Subject to RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Write routes | Server-only — never bundle into client |
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | `/api/price/[address]` | Mainnet endpoint |
| `SIWE_SESSION_SECRET` | SIWE auth | 32+ char string for cookie encryption |
| `PRICE_TOKEN_ADDRESS` | `/api/price/[address]` | $PRICE ERC-20 address (set once deployed) |

## Future routes (not in this scaffold)

These are referenced in the auth lifecycle and will land alongside the wallet-connect UI:

- `POST /api/auth/nonce` — issue a CSRF-safe nonce, write into the SIWE session.
- `POST /api/auth/verify` — verify `{ message, signature }`, write the recovered address into the session.
- `POST /api/auth/logout` — destroy the session cookie.

Stars and wishlist write routes (`POST/DELETE /api/stars`, `POST/DELETE /api/wishlist`) follow the same pattern as `/api/follows` once the read surfaces are designed.
