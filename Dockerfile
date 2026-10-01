# syntax=docker/dockerfile:1

# ---- build ----------------------------------------------------------------
# Node runs `next build`; bun is only the package manager (bun.lock).
FROM node:22-alpine AS build
COPY --from=oven/bun:1-alpine /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
# No API key exists at build time. This also fails the build if a key-shaped
# string ended up in the output, or an API route / NEXT_PUBLIC secret exists.
RUN bun run build && node scripts/check-secret.mjs

# ---- run ------------------------------------------------------------------
FROM node:22-alpine AS run
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static

USER app
EXPOSE 3000

# TCP check only: requesting `/` would call OpenRouter on every probe.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('net').connect(3000,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))"

# OPENROUTER_API_KEY is supplied at run time only (never ARG/ENV in the image).
CMD ["node", "server.js"]
