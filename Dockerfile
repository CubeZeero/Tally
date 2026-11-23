# Tally — self-hostable subscription tracker (multi-stage, slim runtime)

# ---- deps: install all dependencies ----
FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- builder: generate client + build standalone output ----
FROM node:22-slim AS builder
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL=file:/data/tally.db
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
# Pre-generate the baseline schema SQL so the runtime needs no Prisma CLI.
RUN node node_modules/prisma/build/index.js migrate diff \
  --from-empty --to-schema-datamodel prisma/schema.prisma --script > scripts/init.sql

# ---- runner: minimal runtime image ----
FROM node:22-slim AS runner
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates tzdata gosu \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV TZ=Asia/Tokyo
ENV PORT=6400
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/data/tally.db
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js standalone server + static assets.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# public/ (PWA manifest icons, service worker) is not traced into standalone.
COPY --from=builder /app/public ./public

# Prisma client + query engine (only what the running app needs), plus the
# generated baseline SQL and the tiny startup script that applies it.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
# nodemailer is loaded via runtime require (hidden from the bundler), so it is
# not traced into standalone — copy it in explicitly (it has no dependencies).
COPY --from=builder /app/node_modules/nodemailer ./node_modules/nodemailer
COPY --from=builder /app/scripts/init-db.mjs ./init-db.mjs
COPY --from=builder /app/scripts/init.sql ./init.sql

COPY scripts/docker-entrypoint.sh /usr/local/bin/tally-entrypoint
RUN chmod 755 /usr/local/bin/tally-entrypoint \
  && mkdir -p /data /app/.next/cache \
  && chown node:node /data /app/.next/cache
VOLUME /data
EXPOSE 6400

# Apply the schema (idempotent) then start the standalone server.
ENTRYPOINT ["/usr/local/bin/tally-entrypoint"]
CMD ["node", "server.js"]
