# Publishing and sharing

Milestone 5 adds an anonymous Publish & Share MVP without changing GiftConfig or the recipient Runtime.

## Architecture

```text
Creator
  -> publishGift(GiftConfig)
  -> POST /api/gifts (canonical GiftFile)
  -> Publish Worker
  -> PublishedGiftRepository
  -> D1PublishedGiftRepository
  -> Cloudflare D1

Recipient
  -> GET /g/<opaque-id>
  -> Worker loads immutable GiftFile snapshot
  -> Worker injects it into the existing dist-runtime/runtime.html
  -> Recipient Runtime starts in a normal browser
```

Application-facing publishing code does not use SQL. `PublishedGiftRepository` exposes only `create` and `getById`; the D1 adapter owns SQL and serialization at the persistence boundary.

## D1 schema and migrations

`migrations/0001_create_published_gifts.sql` creates one table:

```sql
published_gifts(id TEXT PRIMARY KEY, gift_json TEXT NOT NULL, created_at TEXT NOT NULL)
```

The canonical complete GiftFile is stored in `gift_json`. Names, messages, titles, and other personal content are not copied into searchable columns or indexes.

Create the production database with `npx wrangler d1 create abrelo-published-gifts`, then replace the local `database_id` value in `wrangler.jsonc` with the ID returned by Cloudflare. No account ID, API token, or secret belongs in the repository.

## Configuration

Worker variables in `wrangler.jsonc`:

- `PUBLIC_BASE_URL` is the canonical origin returned by the server, without a gift path. Local development uses `http://127.0.0.1:8787`; production should use the owned deployment origin, eventually `https://abrelo.app`.
- `ALLOWED_ORIGINS` is a comma-separated exact allowlist for Creator POST requests. It includes local Vite and common Tauri origins by default. Add the hosted Creator origin before deployment.

Creator configuration:

- `VITE_PUBLISH_API_URL` overrides the publish service origin for local development and Tauri builds.
- When omitted, Creator posts to same-origin `/api/gifts`, which is the preferred hosted deployment.

These values are deployment configuration, not frontend secrets. The anonymous API must not depend on a secret embedded in Creator.

## Local development

Install dependencies:

```bash
npm install
```

Apply the migration to the local D1 simulator:

```bash
npm run db:migrate:local
```

Start the Worker and recipient assets in terminal one:

```bash
npm run dev:worker
```

Create `.env.local` from `.env.example`, then start Creator in terminal two:

```bash
npm run dev
```

Open `http://localhost:1420/#/creator`, edit the gift, and choose **Publicar regalo**. The API returns a URL such as `http://127.0.0.1:8787/g/<opaque-id>`, which can be opened in another browser context. Local D1 state is kept under ignored `.wrangler/` data.

## Build and deployment

Validate all web and Worker builds:

```bash
npm test
npm run typecheck:worker
npm run build
npm run build:runtime
npm run check:runtime-bundle
npm run build:worker
```

For production, create/configure D1, set the production public base and exact CORS origins, then run:

```bash
npx wrangler d1 migrations apply abrelo-published-gifts --remote
npm run deploy:worker
```

Wrangler uploads `dist-runtime` as static assets. The Worker runs first only for `/api/*` and `/g/*`; hashed Runtime assets remain normal static assets.

## API and privacy rules

- `POST /api/gifts` accepts JSON up to 64 KiB, validates it with the existing `parseGiftFile`, generates a 128-bit random base64url ID, stores an immutable snapshot, and returns the server-owned URL.
- `GET /g/<opaque-id>` serves the recipient shell with safely embedded JSON.
- Unknown IDs return the same unavailable experience with HTTP 404.
- `GET /api/gifts` is intentionally unsupported. There is no list, search, update, or public enumeration endpoint.

Inline JSON escapes `<`, `>`, `&`, U+2028, and U+2029 before injection. Recipient responses preserve generic metadata and add noindex, no-referrer, nosniff, frame restrictions, a restrained CSP, and no-store caching.

Gift IDs contain 128 bits of cryptographically secure randomness and reveal no personal information. They reduce practical enumeration but are not authentication credentials.

## Snapshot and sharing behavior

Every publish action creates a new record and URL. Editing Creator after publishing does not mutate prior links. Publishing again creates another ID while the earlier URL remains unchanged.

Creator can copy the returned URL, use Web Share when supported, or display a QR code. Share text is generic and the QR encodes only the opaque URL, never GiftFile content.

## Current abuse limitation

Publishing is anonymous in this MVP. Strict validation, a 64 KiB limit, method restrictions, exact-origin CORS, opaque retrieval, generic errors, and no listing reduce low-cost abuse, but they are not sufficient for a large public launch. Production should add Cloudflare rate limiting/WAF rules and operational monitoring before broad exposure. Authentication, accounts, moderation, expiration, and deletion remain intentionally deferred.
