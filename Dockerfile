# Container image for the Streamable HTTP transport (`POST /mcp`, `GET /health`).
#
# Runs exactly the published package's entrypoint with `--http`. It holds no
# credentials: every request carries its caller's own bearer, which is relayed
# to the hosted API and never stored. The one required setting is PM_API_URL
# (the hosted service's public origin); the server refuses to start without it.
#
#   PM_API_URL        required, e.g. https://api.example.com
#   PM_MCP_HTTP_PORT  optional, default 3000

FROM node:22.15.0-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/mcp-server/package.json packages/mcp-server/
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY packages/mcp-server packages/mcp-server
RUN npm run build --workspace packages/mcp-server

FROM node:22.15.0-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/mcp-server/package.json packages/mcp-server/
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund --workspace packages/mcp-server \
  && npm cache clean --force
COPY --from=build /app/packages/mcp-server/dist packages/mcp-server/dist
USER node
EXPOSE 3000
CMD ["node", "packages/mcp-server/dist/bin.js", "--http"]
