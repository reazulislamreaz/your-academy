# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

FROM base AS deps
# argon2 native binding needs a C toolchain + Python for node-gyp
RUN apk add --no-cache python3 make g++
# Use Node headers shipped in the official image (avoid unofficial-builds.nodejs.org)
ENV npm_config_nodedir=/usr/local
# Include devDependencies (prisma CLI, typescript) even if host NODE_ENV=production
ENV NODE_ENV=development
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm install --filter @your-academy/backend... --frozen-lockfile --store-dir /pnpm/store

# Production-only node_modules for the runtime image (no Nest CLI / TypeScript / Jest).
# `prisma` is a production dependency, so the one-shot migrate service keeps its CLI.
FROM base AS prod-deps
RUN apk add --no-cache python3 make g++
ENV npm_config_nodedir=/usr/local
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY backend/prisma backend/prisma
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm install --filter @your-academy/backend... --prod --frozen-lockfile --store-dir /pnpm/store \
  && pnpm --filter @your-academy/backend exec prisma generate --schema prisma/schema.prisma

FROM base AS build
COPY --from=deps /app /app
COPY shared shared
COPY backend backend
RUN pnpm --filter @your-academy/shared build && pnpm --filter @your-academy/backend build

FROM node:20-alpine AS runner
# Marks images built from this repo: deploy cleanup leaves them to its own version
# retention (scripts/deploy.sh) instead of the generic `docker image prune`.
LABEL com.your-academy.app="true"
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S youracademy && adduser -S youracademy -G youracademy
COPY --from=build /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/shared/node_modules ./shared/node_modules
COPY --from=prod-deps /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/shared/package.json ./shared/package.json
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
# Writable upload storage for the non-root runtime user
RUN mkdir -p /app/backend/storage/question-imports \
  && chown -R youracademy:youracademy /app/backend/storage
# prisma CLI must remain available for the one-shot migrate service
USER youracademy
WORKDIR /app/backend
EXPOSE 5000
HEALTHCHECK --interval=10s --timeout=5s --retries=5 CMD node -e "fetch('http://127.0.0.1:5000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
