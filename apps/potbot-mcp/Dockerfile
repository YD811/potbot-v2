# Build PotBot MCP HTTP+SSE server image (apps/potbot-mcp).
# Multi-stage so the final image only carries dist/ + production deps.
#
# Build: docker build -f apps/potbot-mcp/Dockerfile -t potbot-mcp:latest .
# Run:   docker run --rm -p 3002:3002 -e X402_ENABLED=false potbot-mcp:latest

FROM node:20-alpine AS deps
WORKDIR /app
# Copy workspace manifests first to maximise cache hits.
COPY package.json package-lock.json turbo.json ./
COPY apps/potbot-mcp/package.json ./apps/potbot-mcp/
RUN npm ci --workspaces --include-workspace-root --no-audit --no-fund

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/potbot-mcp/node_modules ./apps/potbot-mcp/node_modules
COPY package.json package-lock.json turbo.json ./
COPY apps/potbot-mcp ./apps/potbot-mcp
RUN cd apps/potbot-mcp && npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Only ship the compiled server + its production deps.
COPY --from=build /app/apps/potbot-mcp/dist ./dist
COPY --from=build /app/apps/potbot-mcp/package.json ./package.json
COPY --from=build /app/apps/potbot-mcp/.env.example ./.env.example
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3002
# Default to HTTP+SSE transport (the stdio bin is not useful in a hosted env).
CMD ["node", "dist/http.js"]
