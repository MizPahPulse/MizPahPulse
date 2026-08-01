# ─── Builder Stage ───
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace config
COPY package.json turbo.json tsconfig.base.json ./
COPY .prettierrc .prettierignore ./

# Copy all packages and apps
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Build the Next.js app
RUN npx turbo run build --filter=@mizpah-pulse/web

# ─── Runner Stage ───
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built artifacts
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD ["node", "apps/web/server.js"]
