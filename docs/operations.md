# Operations

## Current hosting contract

The initial GitHub Pages target is `https://csml-iit-ucl.github.io/csml-website/`; the shared preview target is `https://csml-iit-ucl.github.io/csml-website/dev/`. The repository is currently private, so Pages availability depends on the owner's GitHub plan. `deploy.yml` reads the actual origin/base path from `actions/configure-pages` at build time, so this target tracks the repository's current name and the org's real Pages settings automatically — including a future rename or custom domain — rather than being hardcoded. `SITE_ORIGIN` and `SITE_BASE_PATH` remain available as manual overrides (e.g. for local testing) and would need to be revisited if a custom domain for a future IIT domain is configured.

This Phase 1 implementation is cache-only. Builds do not contact OpenAlex or blog sources. The live Bluesky feed reads the public API directly from the visitor's browser (no proxy, no credentials) and is enabled. There is no live X feed - the homepage links directly to the X profile instead (see `README.md#live-social-feeds`). CV submission is not enabled; it needs an approved hosted form.

## Bootstrap exception

The maintainer explicitly authorized direct `main` pushes while the site is below v1.0 for initial testing. This is a temporary bootstrap exception. It does not authorize force pushes, secret exposure, automatic data promotion, or a permanent change to the documented `dev -> main` release policy. Before routine editorial use, create the long-lived `dev` branch and enable the reviewed main ruleset described in `AGENTS.md`.

## Recovery

- A failed build must leave the last deployed Pages artifact in place.
- Rebuild from the exact committed content and cache snapshot; do not fetch live data during recovery.
- Never force-push `main` or `dev` to roll back. Revert through the normal branch and PR path once protection is enabled.
- The current Phase 1 Pages workflow is an initial single-production build. Combined root + `/dev/` composition and sibling preservation are Phase 2 acceptance gates and must be completed before the preview is treated as production infrastructure.

## Secrets

No production secret is currently required. Future `OPENALEX_API_KEY` use is limited to the explicit collector and a protected main-only environment. X and CV-service credentials must remain in their separately approved services. Rotate compromised credentials at the provider, replace the protected secret, and verify logs/artifacts contain no value before resuming automation.
