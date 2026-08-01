# ─── Builder Stage ───
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/ws/ ./apps/ws/

RUN npm ci --workspace @mizpah-pulse/ws

# ─── Runner Stage ───
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/ws ./apps/ws

USER nodejs

EXPOSE 3001

CMD ["node", "--import", "tsx", "apps/ws/src/index.ts"]
