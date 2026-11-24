# syntax=docker/dockerfile:1

# --- build the static client -------------------------------------------------
FROM oven/bun:1.4.4-alpine AS build
WORKDIR /app

# Dependency layer first so source edits do not reinstall packages.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json tsconfig.server.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src
COPY server ./server
RUN bun run build
# Typecheck estrito do servidor antes de empacotar o runtime.
RUN bun run typecheck:server
# Syntax/import check for the TS server; Bun needs no node_modules at runtime.
RUN bun build server/index.ts --target=bun --outdir=/tmp/server-check

# --- runtime: Bun executes TypeScript directly, no client node_modules needed -
FROM oven/bun:1.4.4-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=8788

# Unprivileged runtime user. The server only needs read access to its files.
RUN addgroup -S -g 10001 app \
    && adduser -S -u 10001 -G app -H app

COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/package.json ./package.json
COPY --from=build --chown=app:app /app/server ./server
COPY --from=build --chown=app:app /app/src/shared ./src/shared

USER app

EXPOSE 8788
STOPSIGNAL SIGTERM

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT:-8788}/healthz" || exit 1

CMD ["bun", "server/index.ts"]
