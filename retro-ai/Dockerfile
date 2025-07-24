# syntax=docker.io/docker/dockerfile:1

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Generate build info with version, timestamp, and commit hash
RUN npm run version:alpha

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Install production dependencies in a separate stage
FROM base AS prod-deps
WORKDIR /app
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./

# Copy Prisma schema to generate client in production deps
COPY prisma ./prisma
RUN \
  if [ -f yarn.lock ]; then yarn install --frozen-lockfile --production && yarn cache clean; \
  elif [ -f package-lock.json ]; then npm ci --omit=dev && npm cache clean --force; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm install --frozen-lockfile --prod && pnpm store prune; \
  else echo "Lockfile not found." && exit 1; \
  fi
# Generate Prisma client for production
RUN npx prisma generate

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy built Next.js application
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

# Copy custom server
COPY --from=builder --chown=nextjs:nodejs /app/server.js ./server.js

# Copy lib directory with socket authentication modules
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib

# Copy production dependencies from separate stage
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy package.json for runtime
COPY --from=builder /app/package.json ./package.json

# Copy Prisma schema and generated client
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run database migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]