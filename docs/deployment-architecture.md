# Deployment architecture

Ábrelo se despliega como una aplicación serverless de Cloudflare. Esta guía define la frontera de responsabilidades antes de añadir medios binarios, como audio personal.

## System architecture

```text
Creator (React + Vite)
  -> POST /api/gifts
  -> Worker
  -> D1 immutable GiftFile snapshot

Recipient
  -> GET /g/<opaque-id>
  -> Worker + recipient Runtime shell
  -> GiftFile bootstrap

Optional media
  -> private R2 GIFT_ASSETS
  -> Worker-owned GET /g/<opaque-id>/audio or /cover
```

The Creator runs as a React/Vite application. The Worker owns the publish API, recipient routing, authorization boundary, and recipient Runtime shell. GitHub hosts source and CI; Wrangler validates, migrates, and deploys each Worker environment.

## Environment separation

| Environment | Creator | Worker | D1 | R2 |
| --- | --- | --- | --- | --- |
| development | `localhost:1420` | `localhost:8787` | local simulator | local/dev binding `abrelo-gift-assets-development` |
| staging | Cloudflare Pages | dedicated `workers.dev` Worker | `abrelo-published-gifts-staging` | `abrelo-gift-assets-staging` |
| production | `abrelo-creator-production.pages.dev` | `abrelo-publish-production.ianvargas16.workers.dev` | `abrelo-published-gifts-production` | `abrelo-gift-assets-production` |

Every remote environment declares its own `vars`, static asset binding, D1 database, and `GIFT_ASSETS` R2 binding. These bindings are intentionally repeated because Wrangler does not inherit them into named environments. Staging and production must never share a Worker name, D1 database, R2 bucket, recipient URL, or Creator origin allowlist.

Production is independently provisioned and uses exact production-only origins and bindings. The current `pages.dev` and `workers.dev` endpoints support controlled launch verification. A final custom product domain and its zone-level WAF policy remain a deliberate release gate; no unconfirmed domain is encoded in the application.

## Storage responsibilities

### D1

D1 stores a small immutable record per published gift:

- opaque gift ID;
- canonical serialized `GiftFile` JSON;
- creation timestamp;
- future small media references or metadata only.

It does not store binary uploads or public media URLs that reveal internal storage keys.

### R2

`GIFT_ASSETS` is a private R2 binding for optional binary media. No R2 public bucket URL is part of the product contract. Audio and cover uploads use internal keys derived from the server-generated opaque gift ID. Those keys are never embedded in `GiftFile`, returned as public URLs, logged, or exposed to a recipient.

Published `GiftConfig` stores only the media metadata needed by Runtime: MIME type and byte size for an optional background image, and MIME type for audio. Presence of that metadata selects a fixed Worker-owned route; it is intentionally not an R2 object locator. The `/cover` path remains the stable transport route for background images published since Milestone 28. Current local memory photos remain in their existing compatible format and are outside this foundation milestone.

## Publishing and recipient assets

The publishing API remains JSON-only when no new binary is attached:

```text
POST /api/gifts
Content-Type: application/json
GiftFile -> Worker -> D1 -> /g/<opaque-id>
```

Gifts with audio or a background image use a bounded multipart request containing canonical `gift` JSON plus at most one `audio` and one legacy-named `coverImage` transport part. The field name remains stable for deployed Creator compatibility; the canonical GiftConfig field is `backgroundImage`. The Worker validates every part before writing, uploads private objects first, persists the immutable D1 snapshot last, and deletes every uploaded object if a later upload or D1 persistence fails. Gifts without newly attached binary media continue to use the original JSON flow.

The intended recipient asset contract is:

```text
GET /g/<opaque-id>/audio
  -> Worker validates the opaque ID and resolved snapshot
  -> Worker resolves the private R2 object
  -> Worker streams a safe media response
```

Background images use the compatible `GET /g/<opaque-id>/cover` route. Both routes validate the opaque gift ID, require corresponding public metadata in the immutable snapshot, resolve an internal deterministic key, and stream with a safe allowlisted `Content-Type` and `X-Content-Type-Options: nosniff`.

The route is owned by the same Worker as `/g/<opaque-id>`. It must not become an R2 public URL, a bucket listing, or a searchable media API.

## Local and remote operations

Local development uses Vite at port `1420`, the Worker at port `8787`, local D1, and the development R2 binding. Apply local D1 migrations before starting the Worker:

```bash
npm run db:migrate:local
npm run dev:worker
npm run dev
```

Staging is the first remote deployment target. Provision its D1 database and R2 bucket, configure only the staging values in Wrangler, then run:

```bash
npm run validate:deploy:config
npm run validate:deploy:staging
npm run db:migrate:staging
npm run deploy:staging
```

Production uses explicit confirmation and a production-specific Creator build:

```bash
npm run validate:deploy:production
npm run db:migrate:production -- --confirm-production
npm run deploy:production -- --confirm-production
npm run deploy:creator:production -- --confirm-production
```

The production Creator bundle is built from the validated Worker origin and rejected if staging or local API references remain. The production Pages project is deployed independently from the Git-integrated staging project.

## Cost and security baseline

The MVP assumes low-volume Cloudflare free-tier or pay-as-you-go usage. D1 holds small JSON snapshots; R2 holds optional binary media and therefore needs monitoring for storage, operation, and egress costs before broad launch. Asset lifecycle, quotas, deletion, and retention policy are deferred.

Keep R2 private, use opaque IDs, retain exact CORS allowlists, do not provide list/search endpoints, and preserve recipient `noindex`, no-referrer, CSP, and no-store headers. CORS is not authentication or an abuse boundary; anonymous publishing still requires WAF/rate limiting before broad exposure.

Accounts and authentication are intentionally deferred. If introduced later, they should authorize Creator publication and media lifecycle actions at the Worker boundary without exposing R2 directly or changing the recipient's anonymous open flow.
