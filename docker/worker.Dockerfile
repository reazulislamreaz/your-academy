# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY worker/package.json worker/
RUN pnpm install --filter @your-academy/worker... --frozen-lockfile=false

FROM base AS build
COPY --from=deps /app /app
COPY shared shared
COPY worker worker
RUN pnpm --filter @your-academy/shared build && pnpm --filter @your-academy/worker build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S youracademy && adduser -S youracademy -G youracademy
COPY --from=build /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/shared ./shared
COPY --from=build /app/worker ./worker
USER youracademy
WORKDIR /app/worker
CMD ["node", "dist/main.js"]
