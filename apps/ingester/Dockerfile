# ─── Builder Stage ───
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/ingester/ ./apps/ingester/

RUN npm ci --workspace @mizpah-pulse/ingester
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# ─── Runner Stage ───
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/ingester ./apps/ingester

USER nodejs

CMD ["node", "--import", "tsx", "apps/ingester/src/index.ts"]
