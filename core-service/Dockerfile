FROM node:22-bookworm-slim

WORKDIR /app

# ── Install core-service deps ─────────────────────────
COPY core-service/package*.json ./core-service/
RUN cd core-service && npm install

# ── Copy shared modules (Kafka, Redis, Events) ───────────
COPY shared/ ./shared/

# ── Copy core-service source ──────────────────────────
COPY core-service/ ./core-service/

EXPOSE 5000

WORKDIR /app/core-service
CMD ["npm", "run", "dev"]