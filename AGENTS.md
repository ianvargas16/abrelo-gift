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

## Commits

Use focused and descriptive commits.

Do not commit:

- dependencies
- build artifacts
- secrets
- temporary files
- editor-specific files unless required by the project

Avoid large unrelated commits.

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