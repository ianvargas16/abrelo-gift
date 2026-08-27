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

Optional binary media
  -> private Cloudflare R2 (`GIFT_ASSETS`)
  -> Worker-owned recipient asset route

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

Remote staging and production use separate Wrangler environments and separate D1 databases. Provisioning, migration, deployment, smoke testing, rollback, and abuse controls are documented in [`production.md`](production.md). No account ID, API token, or secret belongs in the repository.

Optional binary assets use a private, environment-specific `GIFT_ASSETS` R2 bucket. The API stays JSON-only for gifts without newly attached files and uses multipart for one optional audio and one optional background image. Recipient assets are served only through Worker routes rather than public R2 URLs. See [`deployment-architecture.md`](deployment-architecture.md) for the full boundary.

## Optional audio uploads

`POST /api/gifts` remains JSON-only for silent gifts. Audio publishing uses multipart form data with exactly one `gift` JSON part and one optional `audio` part. The Worker accepts only `audio/mpeg`, `audio/mp4`, `audio/wav`, and `audio/x-wav`, limits audio to 5 MiB and the complete request to a bounded size, generates the private R2 key itself, and never returns keys or bucket URLs.

The Worker validates multipart structure, audio presence, size, and MIME type before writing; binary media inspection is intentionally out of scope. It writes the private R2 object before the immutable D1 snapshot and deletes that object if snapshot persistence fails. A failed cleanup emits only a request-correlated operational event; operators must reconcile any resulting private orphan through controlled R2 operations. Recipient playback is available only through `GET /g/<opaque-id>/audio`; the bucket has no public access, listing, or search route.

## Optional background images

Background publishing reuses the same bounded multipart request and private bucket. The Worker accepts exactly one optional `coverImage` part to preserve the Milestone 28 API contract, allows only JPEG, PNG, or WebP up to 5 MiB, and verifies a lightweight format signature before any write. New published `GiftConfig` snapshots store this metadata under `backgroundImage`; the parser maps the former `coverImage` field to it for already-published gifts. The private object key is derived server-side and never serialized.

The recipient Runtime requests a configured background through the stable `GET /g/<opaque-id>/cover` route. The Worker confirms the gift and metadata, resolves private storage, and streams the image with safe headers. Gifts without background metadata create no image request and preserve their themed presentation. Upload and D1 failures share the audio rollback path so partially written media does not remain orphaned.

## Configuration

Worker variables in each `wrangler.jsonc` environment:

- `ENVIRONMENT` is exactly `development`, `staging`, or `production`.
- `PUBLIC_BASE_URL` is the canonical origin returned by the server, without a gift path. Local development uses `http://127.0.0.1:8787`; remote environments require the actual non-local HTTPS deployment origin.
- `ALLOWED_ORIGINS` is a comma-separated exact allowlist for Creator POST requests. Development includes local Vite/Tauri origins; remote environments require configured HTTPS Creator origins.

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

Remote deployment is intentionally blocked by placeholders until Cloudflare resources and exact origins are configured. Validate repository structure with:

```bash
npm run validate:deploy:config
```

Then follow the staging-first process in [`production.md`](production.md). Do not use a generic remote migration or deployment command.

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

Publishing is anonymous in this MVP. Strict validation, a 64 KiB limit, method restrictions, exact-origin CORS, opaque retrieval, generic errors, and no listing reduce low-cost abuse, but they are not sufficient for a large public launch. Cloudflare rate limiting/WAF and operational monitoring are required before broad exposure; CORS is not an abuse boundary. See [`production.md`](production.md) for the concrete rule and data-safety checklist. Authentication, accounts, moderation, expiration, and deletion remain intentionally deferred.
