# Hard Constraints — production-master-mcp (PUBLIC MCP server)

These are non-negotiable rules for any agent working in this repository. CI enforces
several of them; violating one fails the build.

## 1. No secrets, ever

Never commit secrets, credentials, API keys, tokens, or `.env` files. Configuration is
read from the environment at runtime — the repo ships no baked-in credentials. If a
value looks like a secret, it does not belong in a tracked file.

## 2. Never log or persist forwarded bearer tokens

Auth is **opaque pass-through**: the server reads the caller's `Authorization: Bearer`
header, forwards it upstream to the hosted service, and drops it. Never store, cache,
log, or write a forwarded token to disk — not in traces, not in error messages, not in
tests. The server holds no credentials of its own.

## 3. No force-push to `main`

Never `git push --force` (or `-f`) to `main`. All changes land through a pull request;
`main` is only ever fast-forwarded by a merge.

## 4. No unreviewed workflow changes

Do not modify anything under `.github/workflows/` without an explicit review on the PR.
Workflow edits are a supply-chain surface and require a second set of eyes.

## 5. PUBLIC-REPO IP BOUNDARY (most important)

This repo is **public** and contains **only the MCP server** — the protocol boundary that
forwards tool calls to the hosted service over its public API. It must **never** contain:

- server-side pipeline / investigation logic,
- agent prompts or prompt templates,
- evaluation fixtures, golden datasets, or scoring harnesses,
- any LLM / model-provider SDK import (no provider client libraries of any kind),
- internal identifiers or infrastructure names from the hosted service.

All intelligence lives behind the hosted service's API and stays private. CI runs an
`ip-guard` check (a no-LLM-SDK import check plus a denylist grep for internal names);
adding any of the above fails the build. If a feature seems to need one of these, it
belongs in the private service repo, not here.

## 6. GitHub-hosted runners ONLY

CI runs on GitHub-hosted `ubuntu-latest` runners **only**. Never add a `self-hosted`
runner label to any workflow. This is public + fork-PR territory: a self-hosted label
would let a fork's PR execute untrusted code on private infrastructure.

## 7. Tool schemas come from the shared contract

Tool input/output schemas are consumed from `@production-master/mcp-tool-contract`
(published on npm) — never hand-redefined or forked into this repo. The server routes
against the contract; it does not own the tool surface.
