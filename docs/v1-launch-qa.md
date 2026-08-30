# V1 launch QA

Date: 2026-08-30

## Release decision

**READY TO LAUNCH**

No open P0 or P1 issue was found. The launch checks used the controlled production endpoints documented in the production runbook:

- Creator: `https://abrelo-creator-production.pages.dev`
- Worker and recipient Runtime: `https://abrelo-publish-production.ianvargas16.workers.dev`

The final Worker version is `e2cd570a-54d0-4188-a212-921d308ee2f7`. The unchanged Creator Pages deployment is `eaca0211-3623-4e60-9f5c-ee9fab28de24`. The previous healthy Worker version, available for rollback, is `c17ea810-4b71-4f83-a3e9-89212892d796`.

## Launch checklist

- [x] Production Creator and Worker configuration validates against dedicated production resources.
- [x] Creator creates, edits, previews, publishes, and shares an immutable gift snapshot.
- [x] All five templates initialize independent editable gifts: Cumpleanos, Aniversario, Gracias, Invitacion, and Animo.
- [x] Themes, title, message, recipient, sender, letter, voucher, background, audio, and memories update the Creator preview.
- [x] Background and audio upload controls reject unsupported or oversized files without replacing a valid pending file.
- [x] Memory images can be added, captioned, reordered, removed, published, and read through Worker-owned routes.
- [x] Preview controls remain outside the recipient Runtime.
- [x] Published URLs remain immutable after local edits; republishing creates a new snapshot.
- [x] Copy-link and QR actions contain only the public gift URL.
- [x] Recipient variants without media, with background, with audio, with memories, and with all media return the expected assets.
- [x] Silent gifts do not create or request audio before recipient interaction.
- [x] Unknown gifts and missing media return safe, friendly `404` responses.
- [x] Social metadata is generic, canonical, noindex, and does not disclose gift contents.
- [x] Production CORS accepts only the exact production Creator origin and rejects staging.
- [x] Recipient responses retain CSP, no-referrer, nosniff, frame restrictions, permissions restrictions, and private/no-store caching.
- [x] R2 buckets remain private and internal bucket names or object keys are absent from public responses.
- [x] Production and staging D1/R2 bindings remain distinct. Production QA did not change the staging D1 count.
- [x] Native publication and audio rate-limit bindings are deployed with environment-specific namespaces.
- [x] Worker logs use request IDs and privacy-safe event categories without GiftFile bodies or personal content.
- [x] Automated tests, typechecks, web builds, Runtime boundary checks, Worker dry runs, deployment preflights, production smoke checks, and the macOS Tauri app bundle pass.
- [x] No root horizontal overflow was found at 320, 375, 390, 768, or 1280 CSS pixels.

## Production QA

Controlled production publications covered these combinations:

| Variant | Background | Audio | Memories | Result |
| --- | --- | --- | --- | --- |
| JSON-only | no | no | no | publish and recipient read passed |
| Background | yes | no | no | background route and Runtime layer passed |
| Audio | no | yes | no | private audio route and safe headers passed |
| Memories | no | no | two | ordered memory routes and captions passed |
| Full media | yes | yes | five | all Worker-owned asset routes passed |
| Sparse fields | no | no | no | neutral recipient fallbacks passed |

Every variant returned recipient HTML for `GET` and `HEAD`, an exact canonical URL, generic Open Graph/Twitter metadata, `X-Request-Id`, `X-Content-Type-Options: nosniff`, and private/no-store caching. Cover, audio, and memory routes returned only their safe allowlisted content types. Gift pages never exposed project metadata, template IDs, local-storage markers, R2 keys, or bucket names.

The production D1 record count moved from 2 to 9 because seven controlled immutable QA gifts were intentionally published. The staging D1 count remained 13. R2 dashboard summary metrics can lag; direct private asset reads through the Worker confirmed that each expected production object was available.

## Interaction and responsive QA

Manual browser QA used the Codex in-app Chromium environment. Creator and Preview were checked at 320, 375, 390, 768, and 1280 CSS pixels with no root horizontal overflow. The template selector, editor controls, project switching, media controls, Preview chrome, publication actions, recipient envelope, and seal retained usable sizing.

The browser automation surface could not sustain a continuous pointer hold, so the complete press-and-hold gesture was not claimed as a manual browser result. Deterministic Runtime tests cover press start, early release cancellation, pointer cancellation, successful completion, opening lockout, and stable opened state. Reduced-motion behavior is also covered by component and stylesheet tests; an operating-system-level physical-device setting was not available in this environment.

Native Web Share was unavailable in the in-app browser. Copy-link was manually verified, while Web Share availability, cancellation, failure fallback, and URL isolation are covered by automated tests. The QR control produced a downloadable PNG data URL and its encoded payload is tested as the exact public gift URL. A physical second-device QR scan was not available.

Chrome, Safari, Firefox, Edge, physical iPhone Safari, and physical Android Chrome were not independently available through the QA tooling. These are post-launch compatibility checks, not claimed results in this report.

## Abuse protection

The deployed Worker enforces native Cloudflare rate-limit bindings before publication parsing or storage writes and on repeated audio reads. Publication rejection is fail-closed and audio limiter failure is fail-open so a control-plane issue cannot break the gift page or non-audio assets. Exact thresholds and independent namespaces are validated by deployment tests.

A safe live probe sent 16 small invalid publication requests and did not observe a `429`. Cloudflare's Worker Rate Limiting API is intentionally permissive and eventually consistent across locations, so low-volume smoke traffic is not guaranteed to cross the effective local threshold. The deployed bindings, deterministic rejection tests, zero-write guarantees, and normal production publication were verified. High-volume production probing was deliberately avoided to prevent unnecessary cost or noise.

Adopting a custom domain should add zone-level WAF rules as defense in depth. It is not required for this controlled V1 launch because native Worker bindings protect the current `workers.dev` endpoints.

## Validation results

- `npm test`: 256 passed.
- `npm run test:worker`: 69 passed.
- `npm run test:deployment`: 32 passed.
- `npx tsc --noEmit`: passed.
- `npm run typecheck:worker`: passed.
- `npm run build`: passed; Creator JavaScript 294.28 kB (91.67 kB gzip), CSS 84.80 kB (15.11 kB gzip).
- `npm run build:runtime`: passed; Runtime JavaScript 222.49 kB (69.60 kB gzip), CSS 42.50 kB (8.54 kB gzip).
- `npm run check:runtime-bundle`: passed.
- `npm run build:worker`: passed for development, staging, and production.
- `npm run build:creator:production`: passed and contained only the production Worker origin.
- `npm run validate:deploy:config`: passed.
- `npm run validate:deploy:staging`: passed.
- `npm run validate:deploy:production`: passed.
- `npm run smoke:deployment -- https://abrelo-publish-production.ianvargas16.workers.dev`: passed.
- `npm run tauri build -- --bundles app`: passed after exposing the installed Rust toolchain in `PATH`.

## Remaining launch observations

These items are P2 or operational follow-ups and do not block V1:

- Run a physical-device matrix on current iPhone Safari and Android Chrome, plus standalone Chrome, Safari, Firefox, and Edge.
- Verify Web Share on a supported phone and scan the QR from a second physical device.
- Inspect WhatsApp, iMessage, Discord, and other external social-preview caches with controlled non-personal test gifts.
- Monitor native rate-limit rejections, shared-network behavior, R2 operations, and D1 writes after launch.
- Add a custom domain and reviewed zone WAF policy when DNS ownership is ready.
- Define a production data lifecycle before adding accounts, deletion, expiration, or analytics.

## Rollback readiness

If recipient or publishing behavior regresses, roll the Worker back to `c17ea810-4b71-4f83-a3e9-89212892d796`, run the production smoke check, and verify an existing immutable gift. If the Creator regresses, restore Pages deployment `eaca0211-3623-4e60-9f5c-ee9fab28de24`. The complete commands and incident constraints remain in [production.md](production.md).
