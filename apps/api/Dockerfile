# PotBot API — Production Docker Image
FROM node:22-alpine AS base
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json ./
RUN npm install --frozen-lockfile --production

# Build
FROM base AS builder
COPY package.json tsconfig.json ./
RUN npm install --frozen-lockfile
COPY src/ ./src/
RUN npm run build

# Production image
FROM base AS runner
ENV NODE_ENV=production

COPY --from=deps    /app/node_modules ./node_modules
COPY --from=builder /app/dist         ./dist
COPY package.json ./

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S potbot -u 1001
USER potbot

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
