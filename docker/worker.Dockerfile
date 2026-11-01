# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY worker/package.json worker/
RUN pnpm install --filter @confiro/worker... --frozen-lockfile=false

FROM base AS build
COPY --from=deps /app /app
COPY shared shared
COPY worker worker
RUN pnpm --filter @confiro/shared build && pnpm --filter @confiro/worker build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S confiro && adduser -S confiro -G confiro
COPY --from=build /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/shared ./shared
COPY --from=build /app/worker ./worker
USER confiro
WORKDIR /app/worker
CMD ["node", "dist/main.js"]
