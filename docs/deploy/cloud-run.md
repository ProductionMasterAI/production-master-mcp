# Deploy on Google Cloud Run

Run your own `production-master-mcp` Streamable HTTP endpoint on [Cloud Run](https://cloud.google.com/run). The service is a stateless relay: it holds no credentials, keeps no session between requests, and scales to zero when idle.

Placeholders used throughout — replace them with your own values:

| Placeholder | Meaning |
|-------------|---------|
| `PROJECT_ID` | Your Google Cloud project |
| `REGION` | A Cloud Run region, e.g. `europe-west1` |
| `VERSION` | A published image tag, e.g. `0.1.1` ([releases](https://github.com/ProductionMasterAI/production-master-mcp/releases)) |
| `PM_API_HOST` | Host of the Production Master hosted API your account uses |

## What the container needs

| Setting | Value |
|---------|-------|
| `PM_API_URL` | **Required.** `https://PM_API_HOST`. The server exits at startup without it, so a misconfigured revision never becomes ready. |
| Port | Cloud Run injects `PORT` (8080 by default) and the server listens on it, bound to `0.0.0.0`. Don't set `PM_MCP_HTTP_PORT` on Cloud Run — it would override `PORT`. |
| Health | `GET /health` → `200 {"status":"ok"}`. No bearer, no call to the hosted service — safe for startup and liveness probes. |
| Credentials | None. Do **not** set `PM_SESSION_JWT` (stdio only) or any token on the service. |

Every `POST /mcp` builds a fresh MCP server for that one request and reads the caller's bearer from that request alone, so instances need no session affinity and any instance can serve any request.

## Prerequisites

```sh
gcloud config set project PROJECT_ID
# Option C (build it yourself) additionally needs Cloud Build — see that section.
gcloud services enable run.googleapis.com artifactregistry.googleapis.com

# A runtime identity with no roles: the server calls no Google APIs.
gcloud iam service-accounts create pm-mcp-runtime \
  --display-name="production-master-mcp runtime"
```

## 1. Choose an image source

The published image is `ghcr.io/productionmasterai/production-master-mcp` (public, `linux/amd64` — Cloud Run runs Linux x86_64 images). Tags are immutable version tags (`0.1.1`) and commit tags (`sha-<short>`); there is no `latest`. Pin a version, or a digest (`...@sha256:<digest>`) so a redeploy can never pull different bytes.

### Option A — Artifact Registry remote repository (recommended)

A remote repository proxies ghcr.io and caches what it pulls, so your deployments keep working if ghcr.io is briefly unavailable. Google recommends this for images that live on GitHub Container Registry.

```sh
gcloud artifacts repositories create ghcr-remote \
  --repository-format=docker \
  --location=REGION \
  --mode=remote-repository \
  --remote-repo-config-desc="GitHub Container Registry" \
  --remote-docker-repo=https://ghcr.io
```

Image path for Cloud Run:

```
REGION-docker.pkg.dev/PROJECT_ID/ghcr-remote/productionmasterai/production-master-mcp:VERSION
```

### Option B — straight from ghcr.io

Cloud Run can deploy public GitHub Container Registry images directly, so `ghcr.io/productionmasterai/production-master-mcp:VERSION` works as the image. Cloud Run caches those images for up to an hour and you depend on ghcr.io's availability at deploy and scale-up time; prefer Option A for anything you rely on.

### Option C — build and push to Artifact Registry yourself

To run your own build of this repository (for example, a fork), build it with Cloud Build — no local Docker needed. This option also needs the Cloud Build and Compute Engine APIs, which Google's [Cloud Build quickstart](https://docs.cloud.google.com/build/docs/build-push-docker-image) lists as prerequisites:

```sh
gcloud services enable cloudbuild.googleapis.com compute.googleapis.com
gcloud artifacts repositories create pm-mcp \
  --repository-format=docker --location=REGION
gcloud builds submit \
  --tag REGION-docker.pkg.dev/PROJECT_ID/pm-mcp/production-master-mcp:VERSION
```

## 2. Deploy

### With the example manifest

[`deploy/cloud-run/service.yaml`](../../deploy/cloud-run/service.yaml) sets scale-to-zero (`minScale: 0`), a `maxScale` cap, concurrency 80, a 300s request timeout, startup and liveness probes on `/health`, and the no-role runtime identity. Copy it, replace the placeholders (`RUNTIME_SA_NAME` is `pm-mcp-runtime` from the prerequisites), then:

```sh
gcloud run services replace service.yaml --region=REGION
```

### Or with flags

```sh
gcloud run deploy production-master-mcp \
  --region=REGION \
  --image=REGION-docker.pkg.dev/PROJECT_ID/ghcr-remote/productionmasterai/production-master-mcp:VERSION \
  --set-env-vars=PM_API_URL=https://PM_API_HOST \
  --service-account=pm-mcp-runtime@PROJECT_ID.iam.gserviceaccount.com \
  --min-instances=0 --max-instances=10 --concurrency=80 --timeout=300 \
  --no-allow-unauthenticated
```

These flags configure no probe on `/health`; use the manifest if you want the HTTP startup and liveness probes.

### Check it

```sh
URL="$(gcloud run services describe production-master-mcp \
  --region=REGION --format='value(status.url)')"
```

If you made the service public (see [Auth](#3-auth)):

```sh
curl -fsS "$URL/health"                     # {"status":"ok"}
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$URL/mcp" \
  -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","method":"tools/list","id":1}'   # 401: no bearer
```

If you kept IAM on, add `-H "Authorization: Bearer $(gcloud auth print-identity-token)"` to the health check.

## 3. Auth

Two layers, and they are independent:

1. **Your Production Master token** — always in the `Authorization: Bearer <token>` header of each MCP request. The server forwards it opaquely to `PM_API_URL` and stores nothing; a request without one gets `401` before any tool runs. The hosted service decides what the token may do.
2. **Who may reach the Cloud Run URL at all** — your choice:

**Public URL.** Anyone can reach the endpoint, but every tool call still needs a valid Production Master token.

```sh
gcloud run services add-iam-policy-binding production-master-mcp \
  --region=REGION --member=allUsers --role=roles/run.invoker
```

(An organization policy restricting `allUsers` bindings will refuse this; use the IAM option instead.)

**IAM-restricted URL.** Keep `--no-allow-unauthenticated` and grant `roles/run.invoker` to the people or service accounts that should connect. Because `Authorization` already carries the Production Master token, callers send their Google identity token in **`X-Serverless-Authorization`** instead — Cloud Run checks that header and leaves `Authorization` for the server:

```sh
curl -X POST "$URL/mcp" \
  -H "X-Serverless-Authorization: Bearer $(gcloud auth print-identity-token)" \
  -H "Authorization: Bearer $PM_TOKEN" \
  -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

Identity tokens expire after about an hour, so an MCP client needs a header helper that mints both headers at connect time rather than a static header.

### Keeping the token in Secret Manager

The token is the **client's**, so it belongs where the client runs — never in the service's environment. To keep it out of config files, store it in Secret Manager and read it when the client connects:

```sh
printf '%s' "$PM_TOKEN" | gcloud secrets create pm-mcp-token --data-file=-
gcloud secrets add-iam-policy-binding pm-mcp-token \
  --member=user:YOU@EXAMPLE.COM --role=roles/secretmanager.secretAccessor

# at connect time, e.g. inside a client header helper:
gcloud secrets versions access latest --secret=pm-mcp-token
```

## 4. Connect a client

Point any MCP client at `$URL/mcp` with your bearer, exactly as in [Quick Start → Option A](../user/quick-start.md#option-a--connect-over-http-post-mcp). For Claude Code with a public URL:

```sh
claude mcp add --transport http production-master "$URL/mcp" \
  --header "Authorization: Bearer \${PM_SESSION_JWT}"
```

With an IAM-restricted URL, use a header helper that returns both `Authorization` and `X-Serverless-Authorization` (see above).

## Notes

- **Cold starts.** With `minScale: 0` the first request after idle waits for an instance to start; set `minScale: 1` if that latency matters more than idle cost.
- **Only `POST /mcp`.** The endpoint is stateless: `GET` and `DELETE /mcp` return `405`, which is expected.
- **Long tool calls.** If tool calls fail at about the request timeout, raise `timeoutSeconds` (up to 3600).
- **Updating.** Change the image tag (or digest) and run `gcloud run services replace` again; Cloud Run rolls out a new revision only once its startup probe passes.
