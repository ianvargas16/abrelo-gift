# Production readiness

This runbook covers safe operation of the anonymous Ábrelo publishing service. It does not provision accounts, authentication, analytics, expiration, or deletion.

## Architecture

```text
Creator (configured API origin)
  -> POST /api/gifts
  -> Cloudflare Worker for the selected environment
  -> environment-specific D1 database

Recipient
  -> GET /g/<opaque-id>
  -> the same environment Worker
  -> dist-runtime/runtime.html + safely injected GiftFile

Future optional media
  -> private environment-specific R2 bucket
  -> Worker-owned /g/<opaque-id>/audio route
```

The Worker serves the existing recipient Runtime. Staging and production must never share D1, R2, public origins, Creator origins, or Worker deployments.

## Environment model

| Environment | Worker | D1 | R2 | URL policy | Purpose |
| --- | --- | --- | --- | --- |
| development | `abrelo-publish-development` | local D1 simulator | `abrelo-gift-assets-development` | HTTP allowed only for local origins | local development |
| staging | `abrelo-publish-staging` | `abrelo-published-gifts-staging` | `abrelo-gift-assets-staging` | non-local HTTPS | first remote release and verification |
| production | `abrelo-publish-production` | `abrelo-published-gifts-production` | `abrelo-gift-assets-production` | non-local HTTPS | controlled public operation |

`ENVIRONMENT`, `PUBLIC_BASE_URL`, `ALLOWED_ORIGINS`, the static asset binding, D1, and the private `GIFT_ASSETS` R2 binding are declared separately for each Wrangler environment. Wrangler bindings and `vars` are non-inheritable; do not remove the repeated environment blocks.

Staging is provisioned and must pass its deployment preflight. Production values under `.invalid` and `REPLACE_WITH_...` are deliberate placeholders; `npm run validate:deploy:production` must fail until independent production resources are configured.

## Cloudflare provisioning

Authenticate Wrangler through the operator's normal Cloudflare profile. Never commit tokens, account IDs, or credentials.

Create independent databases:

```bash
npx wrangler d1 create abrelo-published-gifts-staging
npx wrangler d1 create abrelo-published-gifts-production
```

Create independent private buckets. Do not enable public bucket access or use bucket URLs in GiftFiles:

```bash
npx wrangler r2 bucket create abrelo-gift-assets-staging
npx wrangler r2 bucket create abrelo-gift-assets-production
```

Copy each returned database ID into only its matching `wrangler.jsonc` environment. Do not copy the staging ID into production or production data into a development machine.

Choose the initial public origins. A confirmed `workers.dev` origin is acceptable for controlled staging and production testing. A custom domain may be used only after ownership and routing are confirmed. Set each `PUBLIC_BASE_URL` to the exact recipient origin that will serve `/g/<id>`; never guess or hardcode an unconfirmed domain.

Set `ALLOWED_ORIGINS` to a comma-separated list of exact HTTPS Creator origins. It is a browser CORS policy, not authentication and not an abuse-control boundary. Wildcards, paths, queries, hashes, HTTP remote origins, and localhost are rejected outside development.

### Temporary Pages preview authorization

Cloudflare Pages creates deployment-specific origins such as `https://<deployment-id>.abrelo-creator-staging.pages.dev`. When a pull request needs end-to-end publishing QA, copy the exact HTTPS origin from that Pages deployment, append only that origin to `env.staging.vars.ALLOWED_ORIGINS`, run the staging configuration tests and preflight, and redeploy the staging Worker. Keep the stable staging Creator origin in the list.

Never authorize `*.pages.dev`, reflect an unvalidated request origin, or add a preview origin to production. Remove or replace obsolete preview origins after QA so the committed staging allowlist remains deliberate and reviewable.

Run preflight after configuration:

```bash
npm run validate:deploy:config
npm run validate:deploy:staging
npm run validate:deploy:production
```

## Migrations

Migrations use the `DB` binding selected by an explicit Wrangler environment:

```bash
npm run db:migrate:local
npm run db:migrate:staging
npm run db:migrate:production -- --confirm-production
```

Production requires the literal `--confirm-production` argument and a passing production preflight. Apply staging migrations first and verify the application before production. Prefer additive, forward-compatible migrations because immutable published URLs must remain readable by a rolled-back Worker.

## Deployment commands

```bash
npm run deploy:staging
npm run deploy:production -- --confirm-production
```

Each command runs the target preflight. Deploy commands then build `dist-runtime`, run the Runtime boundary/bootstrap contract check, and invoke Wrangler with the explicit environment. Production cannot deploy the default development configuration and cannot run without explicit confirmation.

`npm run build:worker` performs credential-free Wrangler dry runs for development, staging, and production. It validates bundle/configuration compatibility but does not make placeholder remote resources deployable; target preflight remains mandatory.

After deployment, use the actual origin returned/configured for that environment:

```bash
npm run smoke:deployment -- https://actual-staging-worker.example
npm run smoke:deployment -- https://actual-production-worker.example
```

The smoke test is non-mutating. It checks an unknown opaque gift (`404` recipient HTML and security headers), confirms `GET /api/gifts` remains `405` with no listing, and validates that the canonical `/runtime` response contains exactly one bootstrap placeholder. Every request disables redirect following so a staging check cannot pass against another deployment. It never publishes a gift.

## Staging-first release

1. Run local tests, typechecks, Runtime checks, Worker dry-run build, and Tauri build.
2. Wait for PR CI to pass.
3. Run `npm run db:migrate:staging`.
4. Run `npm run deploy:staging`.
5. Run the smoke test against the staging origin.
6. Complete the manual staging checklist below.
7. Review Worker error logs and rate-limit observations.
8. Run `npm run db:migrate:production -- --confirm-production`.
9. Run `npm run deploy:production -- --confirm-production`.
10. Run the smoke test against the production origin.
11. Perform one controlled manual publish/open check.

Production must not be the first remote deployment.

## Manual staging checklist

1. Start Creator with `VITE_PUBLISH_API_URL` pointing to staging.
2. Publish gift A and confirm an opaque staging URL is returned.
3. Open it in a private/incognito mobile browser.
4. Complete seal, envelope, letter, reveal, ticket, and confetti.
5. Verify all four themes with representative content.
6. Verify copy, Web Share when available, and QR all use the staging URL.
7. Edit Creator and confirm URL A remains unchanged.
8. Publish again and confirm URL B is distinct.
9. Verify an unknown valid-format ID shows the safe `404` experience.
10. Check common mobile widths and reduced-motion behavior.

Persistent staging records are expected for this manual check; do not automate repeated publication in the smoke script.

## Operational logging

Worker-handled API and gift routes return `X-Request-Id`. Operational failures emit one structured JSON event containing only:

```json
{"level":"error","event":"repository_read_failed","requestId":"..."}
```

Supported categories are `repository_read_failed`, `runtime_shell_failed`, `runtime_injection_failed`, `publish_persistence_failed`, and `invalid_runtime_config`.

Never add GiftFile JSON, request bodies, names, messages, full gift URLs, credentials, or stack traces to these events. Use request ID, Worker environment/deployment metadata, HTTP status, and Cloudflare timestamps for correlation.

## Abuse controls required before broad launch

Anonymous publishing requires a Cloudflare WAF/rate-limiting rule before broad exposure. CORS does not stop scripts, command-line clients, or direct HTTP abuse.

Start with a rule matching exactly:

- method: `POST`
- path: `/api/gifts`
- characteristic: source IP while publishing remains anonymous
- initial threshold: 10 requests per 10 minutes per IP
- initial action: monitor first, then use a managed challenge or temporary block after observing legitimate traffic

When custom audio publishing is enabled, public release remains blocked until Cloudflare WAF/rate-limiting protects multipart `POST /api/gifts` and repeated `GET /g/:id/audio` abuse. Monitor request-body size near 5 MiB and investigate bursts of failed uploads. Do not use D1 as a per-request upload rate limiter: that turns abuse protection into a database cost-amplification path. If an R2 cleanup failure is logged after a failed D1 write, reconcile the possible private orphan through controlled operations; do not expose or list asset keys publicly.

Monitor rejection rates and shared-network behavior before tightening. IP limits can affect families, schools, offices, and carrier NAT users. When accounts exist, replace coarse anonymous characteristics with authenticated user-based limits. Keep the Worker 64 KiB limit, strict GiftFile validation, method restrictions, exact CORS, generic errors, and no-list behavior enabled.

## Production data safety

- D1 `gift_json` contains personal letters, names, and gift details.
- Treat D1 exports, Time Travel restores, and backups as personal data.
- Do not copy production D1 into development machines by default.
- Avoid casual `SELECT gift_json` queries; diagnose through metadata and request IDs first.
- Application logs must never contain GiftFile contents or request bodies.
- Limit Cloudflare account and database access to operators who need it.

## Security baseline

Recipient responses must retain noindex, nofollow, noarchive, nosnippet, no-referrer, nosniff, frame restrictions, Permissions-Policy, CSP, and no-store behavior. Do not add analytics or third-party scripts without a separate security/privacy review. `dist-runtime`, hashed assets, and the exact GiftFile bootstrap placeholder remain the only recipient artifact path.

## Rollback

### Worker regression

1. Stop further deployments and identify the last healthy Worker version.
2. Use Cloudflare Deployments or `npx wrangler rollback --env <staging|production>`.
3. Run the deployment smoke test against the restored origin.
4. Verify at least one existing immutable gift URL.

Worker rollback does not delete D1 records. Do not recreate or clear the database during a code rollback.

### Migration problem

Do not write destructive down migrations under incident pressure. Stop deployment, inspect the failed migration, and prefer a corrective forward migration. If data restoration is unavoidable, use D1 Time Travel for the exact affected environment with a reviewed timestamp/bookmark and Cloudflare's confirmation flow. A restore overwrites database state and must be treated as a separate production incident. Confirm code/schema compatibility before rolling back a Worker across a schema change.

## Known limitations

- Real Cloudflare database IDs, account setup, Worker origins, and Creator origins are intentionally not committed.
- Rate limiting/WAF is an operator prerequisite, not repository automation.
- There is no authentication, moderation, expiration, deletion, project history, or production data lifecycle UI.
- Smoke testing verifies safe public reads only; manual staging publication remains required.
