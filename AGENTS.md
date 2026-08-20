# Ábrelo Development Instructions

## Product

Ábrelo is a reusable interactive digital gift creator.

The application must not be designed exclusively around birthdays.
Birthday is one experience/template built on top of the generic gift system.

Core concepts:

- Creator
- GiftConfig
- Runtime
- Exporter

The Creator is used by the person creating the gift.

The Runtime is the experience seen by the recipient.

The Runtime must never expose editing or configuration controls.

GiftConfig must remain serializable and portable.

---

## Git workflow

All development work must follow a milestone-based workflow.

### Main branch

Never implement milestone features directly on `main`.

`main` should remain stable.

### Starting a milestone

Before starting:

1. Switch to `main`.
2. Pull the latest changes from `origin/main`.
3. Verify that the working tree is clean.
4. Create a new milestone branch.

Branch naming:

`milestone/<number>-<short-description>`

Examples:

- `milestone/1-creator-runtime-separation`
- `milestone/2-gift-config`
- `milestone/3-envelope-interactions`
- `milestone/4-letter-ticket-reveal`

One milestone must use one branch.

Do not mix unrelated work into the milestone branch.

---

### Working tree safety

Never discard, reset, overwrite, or stash existing uncommitted work unless
explicitly instructed.

If the working tree is not clean before starting a milestone:

1. Inspect the existing changes.
2. Determine whether they belong to current work.
3. Report the situation before switching branches or modifying those changes.

Never use destructive Git commands to obtain a clean working tree.

---

## Commits

Use focused and descriptive commits.

Do not commit:

- `node_modules/`
- generated build artifacts
- vendored third-party dependencies unless explicitly required

When intentionally adding or updating dependencies, commit the corresponding
`package.json` and lockfile changes.

---

## Validation

Before considering a milestone complete:

- review the full diff against `main`
- run available tests
- run TypeScript type checking
- run linting if configured
- run the production build
- run relevant Tauri validation when possible
- fix errors introduced by the milestone

---

## Pull Requests

When a milestone is complete:

1. Commit all intended changes.
2. Push the milestone branch.
3. Create a Pull Request against `main`.

PR title:

`Milestone <number>: <name>`

The PR description must include:

## Goal

What the milestone was intended to accomplish.

## Changes

Main implementation changes.

## Architecture

Relevant architecture decisions or changes.

## Testing

Tests and commands executed and their results.

## Files

Important files added, modified, moved, or removed.

## Known limitations

Anything intentionally incomplete or deferred.

## Next milestone

What should logically happen next.

---

## Important

Never merge a Pull Request unless explicitly instructed.

After creating the PR, stop and report:

- branch name
- PR number
- PR URL
- commits created
- summary of changes
- validation performed
- known issues

Do not begin another milestone until the current milestone has been reviewed and merged, unless explicitly instructed otherwise.

---

## Architecture principles

Keep these concepts separated:

- Creator
- GiftConfig
- Runtime
- Exporter

Avoid coupling Creator UI directly to Runtime components.

Keep UI state separate from persisted gift configuration.

Prefer small reusable React components.

Use TypeScript types for persisted configuration.

Avoid unnecessary dependencies.

Avoid premature abstractions.

---

## UX principles

The gift should feel like interacting with a physical object.

Prefer:

- subtle animation
- tactile interactions
- paper and envelope metaphors
- anticipation
- deliberate pacing
- polished microinteractions

Avoid:

- frustrating game mechanics
- excessive instructions
- childish presentation
- generic dashboard design
- unnecessary animations
- excessive gradients

---

## Distribution principles

The recipient Runtime must be web-first and mobile-first.

A gift must eventually be shareable through a URL and open directly in a
mobile browser without requiring installation.

The web Runtime is the primary recipient experience.

Native desktop builds are optional secondary distribution formats.

Do not architect Runtime around Tauri-specific APIs.

Runtime components should remain portable to a normal web deployment.

Tauri is an optional native distribution layer, not a requirement for
experiencing a gift.

Recipient interactions must support touch devices and must not rely on hover.

All Runtime UI must be responsive and designed mobile-first.

The recipient should be able to open a shared gift from common messaging
channels such as WhatsApp, Telegram, Messages, email, or a QR code with minimal
friction.

Opening a gift must not require:
- installing an application
- downloading an executable
- creating an account
- understanding technical file formats

The intended recipient flow is:

Creator
→ Publish gift
→ Shareable URL
→ Recipient opens URL
→ Gift Runtime starts

Example:

`https://abrelo.app/g/<gift-id>`

Gift URLs should use non-predictable identifiers rather than exposing personal
information such as recipient names, occasions, or gift contents in the URL.

The Runtime should feel like an immersive gift experience rather than a normal
website.

Avoid unnecessary recipient-facing elements such as:
- application navigation
- dashboards
- configuration controls
- account UI
- visible editor controls
- traditional website chrome when it is not needed

The Runtime should make good use of the available viewport and support mobile
safe areas.

Important Runtime interactions must work with:
- touch
- pointer/mouse
- keyboard where reasonable

Do not make core interactions depend on:
- hover
- right click
- desktop-only gestures
- precise mouse movement

Touch interactions should tolerate:
- interrupted touches
- accidental movement
- pointer cancellation
- different screen sizes
- portrait orientation
- landscape orientation when practical

The first user interaction may be used intentionally to unlock browser-restricted
capabilities such as audio playback.

For example, a recipient may first see a simple entry state such as:

"Te llegó algo."

followed by:

"Abrir regalo"

After that interaction, the immersive Runtime experience can begin.

Future publishing capabilities may include:
- copy shareable link
- native Web Share API integration
- QR code generation
- optional PIN protection
- expiration dates
- limited availability
- optional opening limits

Do not implement these future capabilities unless they belong to the current
milestone.

Design current architecture so they can be added later without coupling the
Runtime to a specific backend or native platform.

---

## Current scope

The first supported gift experience is:

Intro
→ sealed envelope
→ wax seal interaction
→ open envelope
→ pull out card
→ birthday letter
→ reveal
→ premium "Vale por..." ticket
→ confetti

Do not add additional gift types unless explicitly requested.
