# syntax=docker/dockerfile:1

# Multi-stage image for the Nomarc Next.js app.
# Build context is the repo root, which holds package.json.
# In Dokploy set Build Type = Dockerfile and Base Directory = /.

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
# Cap the Node heap so a memory spike fails inside Node (a clear error) instead
# of tripping the kernel OOM killer on a small VPS. Override via the
# NODE_MAX_OLD_SPACE_SIZE build arg on larger hosts.
ARG NODE_MAX_OLD_SPACE_SIZE=4096
ENV NODE_OPTIONS="--max-old-space-size=${NODE_MAX_OLD_SPACE_SIZE}"
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are inlined into the client bundle at build time and cannot
# be supplied at runtime, so they must arrive as build args.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_AUTH_URL
ARG NEXT_PUBLIC_BETTER_AUTH_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_R2_PUBLIC_DOMAIN
ARG NEXT_PUBLIC_UPLOADS_URL
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_AUTH_URL=${NEXT_PUBLIC_AUTH_URL} \
    NEXT_PUBLIC_BETTER_AUTH_URL=${NEXT_PUBLIC_BETTER_AUTH_URL} \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL} \
    NEXT_PUBLIC_R2_PUBLIC_DOMAIN=${NEXT_PUBLIC_R2_PUBLIC_DOMAIN} \
    NEXT_PUBLIC_UPLOADS_URL=${NEXT_PUBLIC_UPLOADS_URL} \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}

RUN npm run build

# ---- runtime ----
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/app/uploads \
    PRIVATE_UPLOAD_DIR=/app/uploads/private
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && mkdir -p /app/uploads/private \
  && chown -R nextjs:nodejs /app
# `public` and `.next/static` are not traced into standalone/, so copy them in
# beside the server bundle that standalone/ already contains.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
# Local uploads live on a mounted volume at /app/uploads (STORAGE_BACKEND=local).
CMD ["node", "server.js"]
