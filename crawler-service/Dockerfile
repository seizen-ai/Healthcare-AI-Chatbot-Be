FROM node:22-bookworm-slim

WORKDIR /app

# ── Install crawler-service deps ─────────────────────────
COPY crawler-service/package*.json ./crawler-service/
RUN cd crawler-service && npm install

# ── Bake Playwright Chromium into the image ──────────────
RUN npx playwright install --with-deps chromium

# ── Bake the embedding model into the image ──────────────
COPY crawler-service/scripts/download-models.mjs ./crawler-service/scripts/
RUN cd crawler-service && node scripts/download-models.mjs

# ── Copy shared modules (Kafka, Redis, Events) ───────────
COPY shared/ ./shared/

# ── Copy crawler-service source ──────────────────────────
COPY crawler-service/ ./crawler-service/

EXPOSE 5001

WORKDIR /app/crawler-service
CMD ["node", "server.js"]
