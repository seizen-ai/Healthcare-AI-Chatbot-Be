FROM node:22-bookworm-slim

WORKDIR /app

# ── Install dependencies at the /app root level ──────────
# This ensures that files in /app/shared/ can properly resolve node_modules
COPY crawler-service/package*.json ./
RUN npm install

# ── Bake Playwright Chromium into the image ──────────────
RUN npx playwright install --with-deps chromium

# ── Bake the embedding model into the image ──────────────
COPY crawler-service/scripts/download-models.mjs ./crawler-service/scripts/
RUN node crawler-service/scripts/download-models.mjs

# ── Copy shared modules (Kafka, Redis, Events) ───────────
COPY shared/ ./shared/

# ── Copy crawler-service source ──────────────────────────
COPY crawler-service/ ./crawler-service/

# ── Copy package.json into crawler-service for npm scripts
COPY crawler-service/package*.json ./crawler-service/

EXPOSE 5001

WORKDIR /app/crawler-service
CMD ["npm", "run", "dev"]
