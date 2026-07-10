# @longtermsupport/ts-qa-ci

Orchestrated QA/CI pipeline for TypeScript/React projects — the TypeScript analogue of [`lts/php-qa-ci`](https://github.com/LongTermSupport/php-qa-ci).

```bash
npm install --save-dev @longtermsupport/ts-qa-ci
npx ts-qa init      # scaffold tsQaConfig/
npx ts-qa           # run the full pipeline
```

One command runs formatting, linting (including a Component-Driven Development rule tier), type-checking, structural/architecture checks, and tests — auto-fixing locally, failing the gate on any pending diff in CI. A fast Rust-based pre-filter (oxlint) catches obvious problems before anything slower runs.

## Docs

- [`docs/pipeline.md`](docs/pipeline.md) — the 5-phase pipeline and the read-only/CI-write duality
- [`docs/configuration.md`](docs/configuration.md) — the config cascade, `tsQaConfig/`, Tier A exemptions
- [`docs/cdd-rules.md`](docs/cdd-rules.md) — Component-Driven Development rule set
- [`docs/coding-standards.md`](docs/coding-standards.md) — what the always-on rules assume, and why
- [`docs/tools.md`](docs/tools.md) — every tool orchestrated, one page
- [`docs/github-actions.md`](docs/github-actions.md) — CI install and workflow setup

## Claude Code integration

```bash
npx ts-qa deploy-skills
```

Pushes this package's skills/agents into `.claude/`, and registers a hooks-daemon project-handler if one is detected (never writes classic hook files when a daemon is present).

## Status

v0.1.0 — pre-publish. Currently being dogfooded on [`lts-commerce-site`](https://github.com/LongTermSupport/lts-commerce-site) before wider rollout. See that repo's `CLAUDE/Plan/011-ts-qa-ci-package/PLAN.md` for the build plan and progress.
