FROM node:22-bookworm-slim

WORKDIR /app

# ── Install dependencies at the /app root level ──────────
# This ensures that files in /app/shared/ can properly resolve node_modules
COPY core-service/package*.json ./
RUN npm install

# ── Copy shared modules (Kafka, Redis, Events) ───────────
COPY shared/ ./shared/

# ── Copy core-service source ─────────────────────────────
COPY core-service/ ./core-service/

# ── Copy package.json into core-service for npm scripts ──
COPY core-service/package*.json ./core-service/

EXPOSE 5000

WORKDIR /app/core-service
CMD ["npm", "run", "dev"]