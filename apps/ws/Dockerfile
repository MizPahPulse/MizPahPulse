# ─── Builder Stage ───
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/ws/ ./apps/ws/

# package-lock.json is required for `npm ci` — without it the build fails
# with EUSAGE. --include-workspace-root installs the root's devDependencies
# (e.g. husky) whose `prepare` script npm otherwise runs without installing.
# HUSKY=0 skips installing Git hooks (there is no .git inside the image).
ENV HUSKY=0
RUN npm ci --workspace @mizpah-pulse/ws --include-workspace-root

# ─── Runner Stage ───
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HUSKY=0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/ws ./apps/ws

USER nodejs

EXPOSE 3001

CMD ["node", "--import", "tsx", "apps/ws/src/index.ts"]
