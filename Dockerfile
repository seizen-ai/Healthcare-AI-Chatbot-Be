FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./

RUN npm install

RUN npx playwright install --with-deps chromium

COPY scripts/download-models.mjs ./scripts/

RUN node scripts/download-models.mjs

COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]