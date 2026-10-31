FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Tahap ini juga dipakai layanan `tools` untuk migrasi, seed, dan reset akun.
FROM deps AS build
COPY . .
RUN npm run build

FROM node:22-slim AS app
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
RUN useradd --system --uid 1001 argos && mkdir -p /data/media && chown argos /data/media
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER argos
EXPOSE 3000
CMD ["node", "server.js"]
