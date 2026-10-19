# Contributing

Thanks for your interest in improving **production-master-mcp**. This is the standalone MCP server for the Production Master hosted service — contributions here touch the transport layer (HTTP + stdio), auth pass-through, and tool routing, never investigation logic (that lives on the service).

## Ground rules

- **Scope**: keep changes on the MCP-server side. No model/provider SDKs, no analysis logic, no service-side behavior — CI's `ip-guard` job enforces this and will fail the build if disallowed content lands.
- **Never touch tokens**: auth is opaque bearer pass-through. Never log, store, or persist a forwarded token.
- **One concern per PR**: small, reviewable changes merge fastest.
- **Green CI required**: every check must pass before merge, including lint, typecheck, tests, and `ip-guard`.

## Workflow

1. **Fork** the repository to your own account.
2. **Branch** from `main` using a descriptive prefix:
   - `feat/<short-description>` for new functionality
   - `fix/<short-description>` for bug fixes
   - `docs/<short-description>` for documentation-only changes
   - `chore/<short-description>` for tooling and housekeeping
3. **Develop** — see [Development setup](#development-setup) below.
4. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/) (see below).
5. **Open a PR** against `main`, fill in the description, and wait for CI.

## Development setup

Requires Node.js 22 or later; `.nvmrc` pins the version CI uses.

```sh
nvm use          # Node version from .nvmrc
npm ci           # or: make install
npm run build
npm run lint
npm run typecheck
npm test
```

`make help` lists the same tasks as Makefile targets.

## Commit convention

Format:

```
<type>(<scope>): <short summary>

[optional body explaining what and why]

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

Example:

```
feat(transport): add stdio transport alongside streamable HTTP

Let clients that can't reach an HTTP endpoint launch the server
as a local subprocess and speak MCP over stdio.

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Pull request process

1. Ensure the branch is up to date with `main`.
2. Confirm locally that `npm run build`, `npm run lint`, and `npm test` all pass.
3. Open the PR with a clear title (Conventional Commit style) and a description of what changed and why.
4. Update [CHANGELOG.md](../CHANGELOG.md) under `## [Unreleased]` for any user-facing change.
5. Address review feedback; keep the branch green.
6. A maintainer merges once all checks — including `ip-guard` — pass and the review is approved.

## Releasing

Maintainers only. A release is a version-bump PR, then a `v*` tag on its merge commit.
Pushing the tag is the whole publish step. Don't create the GitHub release by hand,
because the release workflow creates it.

1. **Open a release PR** titled `chore(release): vX.Y.Z` (SemVer):
   - Bump the version with
     `npm version X.Y.Z --no-git-tag-version --workspaces --include-workspace-root`.
     This updates `package.json`, `packages/mcp-server/package.json` and `package-lock.json`.
     The server reads the version it reports to MCP clients from
     `packages/mcp-server/package.json`.
   - In [CHANGELOG.md](../CHANGELOG.md), move the `[Unreleased]` entries under
     `## [X.Y.Z] - YYYY-MM-DD`, leave an empty `[Unreleased]`, and update the compare
     links at the bottom.
   - Update the version badge in the [README](../README.md) and any example image tags
     in the docs.
2. **Merge it** once CI is green.
3. **Wait for the `Publish image` run on `main` to finish.** It publishes
   `ghcr.io/productionmasterai/production-master-mcp:sha-<short>` for the merge commit.
4. **Tag that commit and push the tag:**

   ```sh
   git fetch origin
   git tag vX.Y.Z <merge-commit-sha>
   git push origin vX.Y.Z
   ```

The tag triggers two workflows:

- **`release.yml`** checks that the tag matches the version in
  `packages/mcp-server/package.json`, then builds and runs the tests. It publishes
  `@production-master/mcp` to npm through trusted publishing (OIDC; no npm token exists
  for this package), then creates the GitHub release with generated notes.
- **`publish-image.yml`** adds the `X.Y.Z` tag to the image already published for that
  commit, without rebuilding it. Every published image is smoke-tested before it is
  pushed and carries a signed build-provenance attestation. Image tags are immutable: an
  existing tag is never moved to a different digest, and there is no `latest`.

## Reporting issues

Open a GitHub issue with steps to reproduce, your MCP client and version, the transport you used (HTTP or stdio), the server version, and any relevant (redacted) output. Never paste secrets, tokens, or service credentials into an issue.
