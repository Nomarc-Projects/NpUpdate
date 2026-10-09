# syntax=docker/dockerfile:1

# Multi-stage image for the Nomarc Next.js app.
# In Dokploy set Build Type = Dockerfile and Base Directory = /frontend
# (this file sits beside package.json, so the build context is the frontend root).

FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
# openssl/ca-certificates for Postgres TLS; the app itself needs no build toolchain
# because every native dependency (sharp, @tailwindcss/oxide) ships prebuilt binaries.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- dependencies ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---- build ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are inlined into the client bundle at build time and cannot
# be supplied at runtime, so they must arrive as build args.
# In Dokploy: Application -> Advanced -> Build Args (or Environment, which is also
# passed to the Docker build when "Build Time" is enabled).
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_AUTH_URL
ARG NEXT_PUBLIC_BETTER_AUTH_URL
ARG NEXT_PUBLIC_R2_PUBLIC_DOMAIN
ARG NEXT_PUBLIC_UPLOADS_URL
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_AUTH_URL=${NEXT_PUBLIC_AUTH_URL} \
    NEXT_PUBLIC_BETTER_AUTH_URL=${NEXT_PUBLIC_BETTER_AUTH_URL} \
    NEXT_PUBLIC_R2_PUBLIC_DOMAIN=${NEXT_PUBLIC_R2_PUBLIC_DOMAIN} \
    NEXT_PUBLIC_UPLOADS_URL=${NEXT_PUBLIC_UPLOADS_URL} \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}

RUN npm run build

# ---- runtime ----
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && chown -R nextjs:nodejs /app
# `public` and `.next/static` are not traced into standalone/, so copy them in
# beside the server bundle that standalone/ already contains.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
