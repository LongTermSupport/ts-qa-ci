# Supply-chain hardening

The 2026 npm landscape is hostile. Worm-style attacks weaponise a freshly-published
package version within 5–30 minutes of upload (TanStack May 2026 — 42 packages, 84
malicious versions). A project that installs during that window with no protections
is exposed to credential exfiltration on install.

These defences are **configuration**, not code — so they rot silently unless
something asserts them. ts-qa-ci's `supplyChain` check (Phase 0, read-only,
fail-fast) audits your package-manager config on every run and fails the pipeline
the moment a mandatory protection is missing — exactly like a lint rule fails on a
bad pattern.

## pnpm is required

The bake window (`minimumReleaseAge`) is a pnpm-only feature, and mixing in
npm/yarn would silently bypass it. The audit fails any project not pinned to pnpm
via an exact `packageManager` (e.g. `"pnpm@11.1.2"`).

## What the audit enforces

| Check                      | Requirement                                                          | Where                 |
| -------------------------- | -------------------------------------------------------------------- | --------------------- |
| Pinned pnpm                | `packageManager: "pnpm@<x.y.z>"`                                     | `package.json`        |
| Bake window                | `minimumReleaseAge` ≥ floor (default 4320 min / 3 days)              | `pnpm-workspace.yaml` |
| No blanket install scripts | `dangerouslyAllowAllBuilds` not `true` (allowlist via `allowBuilds`) | `pnpm-workspace.yaml` |
| Lockfile-drift fails       | `verifyDepsBeforeRun: error`                                         | `pnpm-workspace.yaml` |
| Public registry only       | `registry` (if set) is `https://registry.npmjs.org/`                 | `.npmrc`              |

pnpm 10.16+ reads pnpm-level settings from `pnpm-workspace.yaml` even in a
single-package (non-workspace) layout; the audit also honours kebab-case
equivalents in `.npmrc`.

## Git dependencies are fine

First-party, SHA-pinned git dependencies (e.g.
`github:LongTermSupport/ts-qa-ci#<sha>`) are a **sanctioned channel** and are never
flagged — ts-qa-ci itself is consumed that way and is not published to the public
registry. The "public registry only" check governs only the configured `registry=`
URL (guarding against a rogue redirect), never individual git deps.

## Scaffolding

`ts-qa init` writes compliant starter `pnpm-workspace.yaml` and `.npmrc` files
(never overwriting existing ones). Review and adjust the `allowBuilds` allowlist for
your project's legitimate native-build deps.

## Configuration

Raise the required bake-window floor in `tsQaConfig/ts-qa.json`:

```json
{
  "supplyChain": { "minReleaseAgeMinutes": 10080 }
}
```

Disable the check entirely (rare — e.g. a package that is itself npm-based,
git-consumed tooling rather than a pnpm application) via `disabledTools`:

```json
{
  "disabledTools": ["supplyChain"]
}
```

Every disabled tool is logged on every run — the opt-out is never silent.

## `minimumReleaseAgeExclude` is not for convenience

The only legitimate bypass class is a **verified security patch** whose changelog
and git diff have been manually reviewed. Treat that list like firewall holes — add
sparingly, audit on every install. It is not for typo fixes or "I want the latest".
