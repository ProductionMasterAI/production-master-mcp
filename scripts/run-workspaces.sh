#!/usr/bin/env bash
set -euo pipefail
# Runs an npm script across all workspaces. No-op while packages/* is empty
# (scaffold state) so CI can be green pre-population; STRICT once any workspace
# exists — a failing workspace script fails the build. Do not add '|| true'.
script="${1:?usage: run-workspaces.sh <npm-script>}"
cd "$(dirname "$0")/.."
if ! ls packages/*/package.json >/dev/null 2>&1; then
  echo "run-workspaces: no workspaces yet — skipping '${script}'"
  exit 0
fi
# npm's --workspaces flag runs scripts in glob order, not dependency order.
# mcp-server resolves @production-master/mcp-tool-router's TYPES via its
# compiled dist/ (through node_modules), not TS project references — so
# router must be *built* first regardless of which script this invocation
# runs (a "typecheck" pass on router alone would not emit dist/*.d.ts).
if [ -f packages/mcp-tool-router/package.json ]; then
  npm run build --workspace=@production-master/mcp-tool-router --if-present
fi
npm run "$script" --workspaces --if-present
